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


def run_migrations() -> None:
    from app.db_config import SessionLocal
    from app.Core.models import Tenant

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

    logger.info(f"[Migraciones] roles_atributos verificado en {len(tenants)} tenant(s).")
