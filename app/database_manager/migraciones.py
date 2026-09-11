"""
app/database_manager/migraciones.py
────────────────────────────────────
No hay Alembic en este proyecto: las tablas de cada tenant solo se crean
una vez, al registrarse (create_tenant_schema en db_config.py), corriendo
TenantBase.metadata.create_all() contra el schema de ESE tenant. Un tenant
que ya existía antes de agregar una columna nueva al modelo se queda con
la tabla vieja para siempre si nadie corre un ALTER TABLE a mano.

run_migrations() resuelve eso: por cada tenant activo, aplica los cambios
de schema que falten con `ADD COLUMN IF NOT EXISTS` (idempotente — correrlo
de nuevo no rompe nada, incluso sobre un tenant creado recién con
create_tenant_schema, que ya tiene la columna). Se invoca en el lifespan
de FastAPI, antes de init_scheduler().
"""

import logging
from sqlalchemy import text

from app.db_config import engine, _validate_schema_name

logger = logging.getLogger(__name__)


def _crear_tabla_notificaciones(conn, schema: str) -> None:
    """
    Tabla nueva (no columna) — a diferencia del resto de este archivo, se usa
    el propio modelo de SQLAlchemy (`Notificacion.__table__.create()`) en vez
    de escribir el CREATE TABLE a mano en texto: el índice único parcial es
    fácil de tipear distinto en el modelo y en una migración de texto suelta,
    y acá el modelo queda como única fuente de verdad. Mismo mecanismo que ya
    usa create_tenant_schema() para crear todo TenantBase.metadata, pero
    acotado a esta tabla sola (checkfirst=True: no rompe si ya existe).
    """
    from app.notificaciones.models import Notificacion

    conn = conn.execution_options(schema_translate_map={None: schema})
    Notificacion.__table__.create(conn, checkfirst=True)


def run_migrations() -> None:
    from app.db_config import SessionLocal
    from app.Core.models import Tenant

    # Las tablas `tenants`/`users` viven en el schema public (una sola, no
    # una por tenant) — se migran aparte, antes del loop de abajo.
    with engine.begin() as conn:
        conn.execute(text(
            'ALTER TABLE public.tenants '
            'ADD COLUMN IF NOT EXISTS google_drive_images_file_id VARCHAR(255)'
        ))
        conn.execute(text(
            'ALTER TABLE public.tenants '
            'ADD COLUMN IF NOT EXISTS google_drive_root_folder_id VARCHAR(255)'
        ))
        conn.execute(text(
            'ALTER TABLE public.users '
            'ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false'
        ))

    db = SessionLocal()
    try:
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    finally:
        db.close()

    for tenant in tenants:
        try:
            schema = _validate_schema_name(tenant.schema_name)
        except ValueError:
            logger.error(f"[Migraciones] schema_name inválido para tenant {tenant.id}, se omite")
            continue

        with engine.begin() as conn:
            conn.execute(text(
                f'ALTER TABLE "{schema}".inventario '
                f"ADD COLUMN IF NOT EXISTS roles_atributos JSONB DEFAULT '{{}}'::jsonb"
            ))
            conn.execute(text(
                f'ALTER TABLE "{schema}".inventario '
                f"ADD COLUMN IF NOT EXISTS bloques_personalizados JSONB DEFAULT '[]'::jsonb"
            ))
            conn.execute(text(
                f'ALTER TABLE "{schema}".item '
                f"ADD COLUMN IF NOT EXISTS imagen VARCHAR(500)"
            ))
            conn.execute(text(
                f'ALTER TABLE "{schema}".inventario '
                f"ADD COLUMN IF NOT EXISTS fotos_habilitadas BOOLEAN NOT NULL DEFAULT true"
            ))
            conn.execute(text(
                f'ALTER TABLE "{schema}".inventario '
                f"ADD COLUMN IF NOT EXISTS notificaciones_config JSONB DEFAULT '{{}}'::jsonb"
            ))
            conn.execute(text(
                f'ALTER TABLE "{schema}".item '
                f"ADD COLUMN IF NOT EXISTS notificaciones_config JSONB DEFAULT '{{}}'::jsonb"
            ))
            _crear_tabla_notificaciones(conn, schema)

    logger.info(f"[Migraciones] roles_atributos verificado en {len(tenants)} tenant(s).")
