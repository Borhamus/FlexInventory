"""
app/database_manager/scheduler.py
──────────────────────────────────
Scheduler de backups automáticos y de evaluación de notificaciones, ambos
usando APScheduler. Se inicializa al arrancar FastAPI.

Jobs por tenant (backups):
  - daily_{tenant_id}:   cada N horas (configurable)
  - monthly_{tenant_id}: el día D de cada mes a las 03:00 UTC

Job global (notificaciones):
  - evaluar_notificaciones: cada N minutos (NOTIFICACIONES_INTERVALO_MINUTOS,
    default 5 — una alerta que tarda una hora en aparecer deja de sentirse
    como alerta), un único job que itera todos los tenants — a diferencia de
    los backups, no hay una preferencia de horario por tenant que justifique
    un job por tenant acá.
"""

import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger    = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="UTC")


def _run_backup_for_tenant(tenant_id: int):
    """
    Función que ejecuta el backup automático de un tenant.
    Obtiene su propia sesión de DB para no depender del request cycle.

    La lógica del backup en sí (datos + fotos) vive en
    app.database_manager.router.ejecutar_backup() — la usa tanto este job
    como el endpoint manual POST /backup/now, para no mantener la misma
    lógica escrita en dos lugares (antes estaba duplicada acá).
    """
    from app.db_config import SessionLocal
    from app.Core.models import Tenant
    from app.database_manager.router import ejecutar_backup

    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_active == True).first()
        if not tenant or not tenant.google_refresh_token or not tenant.backup_auto_enabled:
            return

        logger.info(f"[Scheduler] Iniciando backup automático para tenant {tenant.name} ({tenant_id})")
        resultado = ejecutar_backup(tenant, db)
        logger.info(f"[Scheduler] Backup automático completado: {resultado['filename']}")

    except Exception as e:
        logger.error(f"[Scheduler] Error en backup automático del tenant {tenant_id}: {e}")
        db.rollback()
    finally:
        db.close()


def _evaluar_notificaciones_todos_los_tenants():
    """
    Corre el motor de notificaciones (app.notificaciones.motor) para cada
    tenant activo y, si salieron notificaciones nuevas, manda un digest por
    email a quienes tengan notificaciones:read y su email verificado. Un
    tenant que falla no frena a los demás — mismo criterio de aislamiento
    que _run_backup_for_tenant.
    """
    from app.db_config import SessionLocal, get_tenant_db_context
    from app.Core.models import Tenant
    from app.notificaciones.motor import evaluar_notificaciones_tenant
    from app.notificaciones.recipientes import resolver_destinatarios_email
    from app.notificaciones.email import enviar_digest_notificaciones

    db = SessionLocal()  # sesión en schema public — vive toda la función, se usa para resolver destinatarios por tenant
    try:
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()

        total_nuevas = 0
        for tenant in tenants:
            try:
                with get_tenant_db_context(tenant.schema_name) as tdb:
                    nuevas = evaluar_notificaciones_tenant(tdb)
                    total_nuevas += len(nuevas)
                    # Los mensajes se extraen DENTRO del with: al salir, el
                    # context manager cierra la sesión tdb y los objetos
                    # Notificacion quedan "detached" — acceder a sus atributos
                    # después de eso dispara un refresh contra una sesión ya
                    # cerrada.
                    mensajes = [n.mensaje for n in nuevas]

                if mensajes:
                    for usuario in resolver_destinatarios_email(tenant.id, db):
                        try:
                            enviar_digest_notificaciones(usuario.email, tenant.name, mensajes)
                        except Exception as e:
                            logger.error(f"[Scheduler] Error mandando digest a {usuario.email}: {e}")
            except Exception as e:
                logger.error(f"[Scheduler] Error evaluando notificaciones del tenant {tenant.id}: {e}")

        logger.info(f"[Scheduler] Notificaciones evaluadas en {len(tenants)} tenant(s), {total_nuevas} nueva(s).")
    finally:
        db.close()


def reload_tenant_jobs(tenant):
    """
    Remueve los jobs actuales del tenant y los recrea con la config nueva.
    Llamado desde el endpoint PATCH /database/config.
    """
    daily_id   = f"daily_{tenant.id}"
    monthly_id = f"monthly_{tenant.id}"

    # Remover jobs existentes si los hay
    for job_id in (daily_id, monthly_id):
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)

    if not tenant.backup_auto_enabled or not tenant.google_refresh_token:
        logger.info(f"[Scheduler] Backups automáticos desactivados para tenant {tenant.id}")
        return

    # Job diario: cada N horas
    scheduler.add_job(
        _run_backup_for_tenant,
        trigger=IntervalTrigger(hours=tenant.backup_daily_hour),
        id=daily_id,
        args=[tenant.id],
        replace_existing=True,
        name=f"Backup diario - Tenant {tenant.id}",
    )

    # Job mensual: el día D de cada mes a las 03:00 UTC
    scheduler.add_job(
        _run_backup_for_tenant,
        trigger=CronTrigger(day=tenant.backup_monthly_day, hour=3, minute=0),
        id=monthly_id,
        args=[tenant.id],
        replace_existing=True,
        name=f"Backup mensual - Tenant {tenant.id}",
    )

    logger.info(
        f"[Scheduler] Jobs programados para tenant {tenant.id}: "
        f"cada {tenant.backup_daily_hour}h y el día {tenant.backup_monthly_day} de cada mes."
    )


def init_scheduler():
    """
    Arranca el scheduler y carga los jobs de todos los tenants
    que tengan backup_auto_enabled=True. Llamado al iniciar FastAPI.
    """
    from app.db_config import SessionLocal
    from app.Core.models import Tenant

    scheduler.start()
    logger.info("[Scheduler] APScheduler iniciado.")

    intervalo_minutos = int(os.getenv("NOTIFICACIONES_INTERVALO_MINUTOS", "5"))
    scheduler.add_job(
        _evaluar_notificaciones_todos_los_tenants,
        trigger=IntervalTrigger(minutes=intervalo_minutos),
        id="evaluar_notificaciones",
        replace_existing=True,
        name="Evaluar notificaciones (todos los tenants)",
    )
    logger.info(f"[Scheduler] Job de notificaciones programado cada {intervalo_minutos} min.")

    db = SessionLocal()
    try:
        tenants = db.query(Tenant).filter(
            Tenant.is_active          == True,
            Tenant.backup_auto_enabled == True,
        ).all()

        for tenant in tenants:
            reload_tenant_jobs(tenant)

        logger.info(f"[Scheduler] {len(tenants)} tenant(s) con backups automáticos cargados.")
    finally:
        db.close()


def shutdown_scheduler():
    """Apaga el scheduler limpiamente al cerrar FastAPI."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[Scheduler] APScheduler detenido.")
