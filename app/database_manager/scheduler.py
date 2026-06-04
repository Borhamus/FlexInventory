"""
app/database_manager/scheduler.py
──────────────────────────────────
Scheduler de backups automáticos usando APScheduler.
Se inicializa al arrancar FastAPI y recarga los jobs de cada tenant
que tenga backup_auto_enabled=True.

Jobs por tenant:
  - daily_{tenant_id}:   cada N horas (configurable)
  - monthly_{tenant_id}: el día D de cada mes a las 03:00 UTC
"""

import json
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger    = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="UTC")


def _run_backup_for_tenant(tenant_id: int):
    """
    Función que ejecuta el backup automático de un tenant.
    Obtiene su propia sesión de DB para no depender del request cycle.
    """
    from app.db_config import SessionLocal
    from app.Core.models import Tenant
    from app.database_manager.router import (
        export_tenant_data, _get_access_token,
        _get_or_create_folder, _upload_to_drive
    )

    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_active == True).first()
        if not tenant or not tenant.google_refresh_token or not tenant.backup_auto_enabled:
            return

        logger.info(f"[Scheduler] Iniciando backup automático para tenant {tenant.name} ({tenant_id})")

        access_token      = _get_access_token(tenant.google_refresh_token)
        root_folder_id    = _get_or_create_folder(access_token, "FlexInventory Storage")
        backups_folder_id = _get_or_create_folder(access_token, "backups", root_folder_id)

        data    = export_tenant_data(tenant, db)
        content = json.dumps(data, ensure_ascii=False, indent=2)

        # Actualizar current.json
        current_file_id = _upload_to_drive(
            access_token, "current.json", content,
            root_folder_id, tenant.google_drive_file_id
        )

        # Backup con timestamp
        ts          = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M")
        backup_name = f"backup_{ts}.json"
        _upload_to_drive(access_token, backup_name, content, backups_folder_id)

        # Actualizar IDs
        tenant.google_drive_file_id   = current_file_id
        tenant.google_drive_folder_id = backups_folder_id
        db.commit()

        logger.info(f"[Scheduler] Backup automático completado: {backup_name}")

    except Exception as e:
        logger.error(f"[Scheduler] Error en backup automático del tenant {tenant_id}: {e}")
        db.rollback()
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
