from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema
from contextlib import contextmanager
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://stockuser:stockpass123@localhost:5432/stock_manager")

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
    Crear esquema para un nuevo tenant y sus tablas
    
    Args:
        tenant_schema: Nombre del esquema a crear
        
    Returns:
        True si se creó exitosamente
    """
    # Importar modelos de tenant aquí para registrarlos en TenantBase
    from app.tenant import models as tenant_models
    
    try:
        with engine.connect() as conn:
            # Crear esquema
            conn.execute(CreateSchema(tenant_schema, if_not_exists=True))
            conn.commit()
            
            # Cambiar al nuevo esquema
            conn.execute(text(f"SET search_path TO {tenant_schema}"))
            conn.commit()
            
        # Crear todas las tablas del tenant en el nuevo esquema
        # Importante: esto usa una nueva conexión con el search_path correcto
        with engine.begin() as conn:
            conn.execute(text(f"SET search_path TO {tenant_schema}"))
            TenantBase.metadata.create_all(bind=conn)
            
        print(f"✅ Schema '{tenant_schema}' creado exitosamente")
        return True
    except Exception as e:
        print(f"❌ Error creando schema {tenant_schema}: {str(e)}")
        raise