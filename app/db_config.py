from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema
from contextlib import contextmanager
import os
import re
from dotenv import load_dotenv

load_dotenv()

db_port = os.getenv("DB_PORT", "5432")

DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://stockuser:stockpass123@localhost:{db_port}/stock_manager")

# Engine principal
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# DOS bases declarativas
Base = declarative_base()        # Para schema 'public'
TenantBase = declarative_base()  # Para schemas de tenants

# Solo minúsculas, dígitos y guión bajo (formato que produce generate_schema_name).
# Defensa en profundidad contra inyección SQL al interpolar el nombre del schema.
_SCHEMA_NAME_RE = re.compile(r"^[a-z0-9_]{1,63}$")

def _validate_schema_name(tenant_schema: str) -> str:
    if not _SCHEMA_NAME_RE.match(tenant_schema or ""):
        raise ValueError(f"Nombre de schema inválido: {tenant_schema!r}")
    return tenant_schema


# ── search_path por transacción, no por sesión ──────────────────────────────
# El search_path vive en la CONEXIÓN, no en la Session. Antes se seteaba una
# sola vez al abrir la sesión, y eso se rompía así:
#
#   1. get_tenant_db_context hacía SET search_path TO tenant_x
#   2. el endpoint hacía db.commit() (por ejemplo items.py, antes de correr el
#      motor de notificaciones)
#   3. al commitear, la Session devuelve la conexión al pool
#   4. lo que venía después (db.refresh, el motor, la serialización de la
#      respuesta) pedía una conexión nueva — y si otro request se había
#      llevado la nuestra, tocaba otra, sin el SET
#   5. -> psycopg2.errors.UndefinedTable: relation "item" does not exist
#
# Era intermitente porque solo pasa si hay algo más consumiendo conexiones en
# paralelo (el scheduler de notificaciones corre en este mismo proceso cada
# pocos minutos). Con una sola conexión en juego el pool devolvía siempre la
# misma y no se notaba.
#
# La solución es no depender de que la conexión "recuerde" nada: este listener
# corre cada vez que la Session abre una transacción — incluida la que se abre
# después de un commit, sobre otra conexión — y deja el search_path explícito.
# El schema se lee de session.info, que setea get_tenant_db_context.
#
# Las sesiones sin tenant (get_db, schema public) también pasan por acá y
# fijan "public": así una conexión que quedó con el search_path de un tenant
# no se le filtra a una consulta de tablas públicas.
@event.listens_for(SessionLocal, "after_begin")
def _fijar_search_path(session, transaction, connection):
    schema = session.info.get("tenant_schema") or "public"
    # Revalidar acá también: el valor sale de session.info y termina
    # interpolado en el SQL. Es barato y no depende de quién lo haya puesto.
    _validate_schema_name(schema)
    connection.exec_driver_sql(f"SET search_path TO {schema}")


def get_db():
    """Dependency para obtener sesión de BD en schema public"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_tenant_db_context(tenant_schema: str):
    """Context manager para operaciones en schema de tenant"""
    _validate_schema_name(tenant_schema)
    db = SessionLocal()
    # Marca la sesión: el listener de arriba lo aplica en cada transacción.
    db.info["tenant_schema"] = tenant_schema
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        # Ya no se restaura el search_path a mano: lo fija el listener en cada
        # transacción. Aquel "SET search_path TO public" en el finally era
        # además una fuente de fugas — si lanzaba (sesión ya abortada), se
        # comía la excepción original y se saltaba el db.close(), dejando la
        # conexión fuera del pool para siempre.
        db.close()

def create_tenant_schema(tenant_schema: str) -> bool:
    """
    Crear esquema para un nuevo tenant y sus tablas.
    Usa schema_translate_map para crear las tablas en el schema correcto (SQLAlchemy 2.0).
    """
    # Importar modelos de tenant aquí para asegurar que estén registrados en TenantBase
    from app.tenant import models as tenant_models  # noqa: F401

    _validate_schema_name(tenant_schema)
    try:
        # 1. Crear el schema
        with engine.begin() as conn:
            conn.execute(CreateSchema(tenant_schema, if_not_exists=True))

        # 2. Crear las tablas del tenant dentro del nuevo schema.
        #    schema_translate_map mapea None (tablas sin schema explícito) al schema del tenant.
        with engine.begin() as conn:
            conn = conn.execution_options(schema_translate_map={None: tenant_schema})
            TenantBase.metadata.create_all(conn)

        print(f"Schema '{tenant_schema}' creado exitosamente")
        return True
    except Exception as e:
        print(f"Error creando schema {tenant_schema}: {str(e)}")
        raise