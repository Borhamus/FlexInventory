from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema
from contextlib import contextmanager
import os
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
    db = SessionLocal()
    try:
        # Establecer search_path al esquema del tenant
        db.execute(text(f"SET search_path TO {tenant_schema}"))
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        # Restaurar search_path a public
        db.execute(text("SET search_path TO public"))
        db.close()

def create_tenant_schema(tenant_schema: str) -> bool:
    """
    Crear esquema para un nuevo tenant y sus tablas.
    Usa schema_translate_map para crear las tablas en el schema correcto (SQLAlchemy 2.0).
    """
    # Importar modelos de tenant aquí para asegurar que estén registrados en TenantBase
    from app.tenant import models as tenant_models  # noqa: F401

    try:
        # 1. Crear el schema
        with engine.begin() as conn:
            conn.execute(CreateSchema(tenant_schema, if_not_exists=True))

        # 2. Crear las tablas del tenant dentro del nuevo schema.
        #    schema_translate_map mapea None (tablas sin schema explícito) al schema del tenant.
        with engine.begin() as conn:
            conn = conn.execution_options(schema_translate_map={None: tenant_schema})
            TenantBase.metadata.create_all(conn)

        print(f"✅ Schema '{tenant_schema}' creado exitosamente")
        return True
    except Exception as e:
        print(f"❌ Error creando schema {tenant_schema}: {str(e)}")
        raise