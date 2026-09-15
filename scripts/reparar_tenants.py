"""
scripts/reparar_tenants.py
──────────────────────────
Repara los schemas de tenant que quedaron inconsistentes por un restore de
backup hecho con la versión vieja del código (ver sanear_schema_tenant en
app/database_manager/router.py):

  1. Columnas JSONB en NULL — el restore insertaba con SQL crudo y omitía
     `notificaciones_config`, y el `default={}` de los modelos es del ORM, no
     del DDL. Con NULL, los response models de Inventario e Item no validaban
     y TODO listado devolvía 500: los inventarios "no aparecían" aunque
     estuvieran en la base.
  2. Secuencias de id desalineadas — las filas se reinsertan con id explícito
     y eso no avanza el serial, así que el próximo alta chocaba con
     "duplicate key" hasta consumir a mano los ids ya ocupados.

Es idempotente: sobre un schema sano no cambia nada, se puede correr las
veces que haga falta.

Uso, desde la raíz del proyecto:

    python -m scripts.reparar_tenants            # aplica los cambios
    python -m scripts.reparar_tenants --dry-run  # solo informa, no escribe
"""

import argparse
import sys

from sqlalchemy import text

from app.db_config import SessionLocal, get_tenant_db_context
from app.Core.models import Tenant
from app.database_manager.router import sanear_schema_tenant


def _diagnostico(tdb) -> dict:
    """Cuenta lo que está mal, para poder informarlo antes y después."""
    nulls = 0
    for tabla, columnas in (
        ("inventario", ("atributos", "roles_atributos", "unidades", "notificaciones_config", "bloques_personalizados")),
        ("item",       ("atributos", "notificaciones_config")),
    ):
        for col in columnas:
            nulls += tdb.execute(
                text(f"SELECT count(*) FROM {tabla} WHERE {col} IS NULL")
            ).scalar() or 0

    desalineadas = []
    for tabla in ("inventario", "item", "catalogo"):
        # El nombre de la secuencia lo da la propia base (viene calificado con
        # el schema), así que interpolarlo es seguro. last_value/is_called se
        # leen de la secuencia en sí: pg_sequences no expone is_called.
        seq = tdb.execute(text(f"SELECT pg_get_serial_sequence('{tabla}', 'id')")).scalar()
        if not seq:
            continue
        max_id = tdb.execute(text(f"SELECT coalesce(max(id), 0) FROM {tabla}")).scalar() or 0
        last_value, is_called = tdb.execute(text(f"SELECT last_value, is_called FROM {seq}")).first()
        # El próximo id que entregaría la secuencia hoy.
        proximo = last_value + 1 if is_called else last_value
        if max_id and proximo <= max_id:
            desalineadas.append(f"{tabla} (próximo id {proximo} <= max {max_id})")

    return {"nulls": nulls, "desalineadas": desalineadas}


def main() -> int:
    parser = argparse.ArgumentParser(description="Repara schemas de tenant tras un restore viejo.")
    parser.add_argument("--dry-run", action="store_true", help="Solo informa, no escribe.")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()  # noqa: E712
    finally:
        db.close()

    if not tenants:
        print("No hay tenants activos.")
        return 0

    con_problemas = 0
    for tenant in tenants:
        print(f"\n── {tenant.name}  ({tenant.schema_name})")
        try:
            with get_tenant_db_context(tenant.schema_name) as tdb:
                antes = _diagnostico(tdb)

                if not antes["nulls"] and not antes["desalineadas"]:
                    print("   ya estaba sano, no se tocó nada.")
                    continue

                con_problemas += 1
                if antes["nulls"]:
                    print(f"   {antes['nulls']} columna(s) JSONB en NULL")
                for d in antes["desalineadas"]:
                    print(f"   secuencia desalineada: {d}")

                if args.dry_run:
                    print("   --dry-run: no se escribió nada.")
                    continue

                sanear_schema_tenant(tdb)
                tdb.flush()
                despues = _diagnostico(tdb)
                print(f"   reparado → NULLs: {despues['nulls']}, "
                      f"secuencias desalineadas: {len(despues['desalineadas'])}")
        except Exception as e:
            print(f"   ERROR: {type(e).__name__}: {e}")
            print("   (se sigue con los demás tenants)")

    print(f"\nListo. Tenants con problemas: {con_problemas} de {len(tenants)}.")
    if args.dry_run:
        print("Fue un --dry-run: no se escribió nada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
