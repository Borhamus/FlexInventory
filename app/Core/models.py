from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db_config import Base
import enum
import uuid


# ==========================================
# Enums centralizados — ÚNICA definición
# ==========================================
class UserRole(str, enum.Enum):
    tenant  = "tenant"       # Dueño / administrador del tenant
    admin   = "admin"        # Empleado con permisos amplios
    viewer  = "viewer"       # Empleado solo lectura
    editor  = "editor"       # Empleado puede crear/editar pero no eliminar


class Tenant(Base):
    """Registro de cada tenant en el schema public"""
    __tablename__ = "tenants"
    __table_args__ = {'schema': 'public'}

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    name        = Column(String(255), nullable=False)
    schema_name = Column(String(63), unique=True, nullable=False)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at  = Column(TIMESTAMP, server_default=func.current_timestamp(),
                         onupdate=func.current_timestamp())

    users = relationship("Users", back_populates="tenant")


class Users(Base):
    """
    Tabla unificada de usuarios.

    - role = "tenant"  → dueño del tenant, creado al registrar el tenant
    - role = "admin" | "editor" | "viewer" → empleados creados por el tenant owner
    Todos los usuarios llevan tenant_id para saber a qué esquema pertenecen.
    """
    __tablename__ = "users"
    __table_args__ = {'schema': 'public'}

    id               = Column(Integer, primary_key=True, index=True)
    username         = Column(String, unique=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    email            = Column(String, unique=True, nullable=True)  # empleados pueden no tener email

    # Todos los usuarios pertenecen a un tenant
    tenant_id = Column(Integer, ForeignKey("public.tenants.id"), nullable=False)

    role      = Column(String, default=UserRole.viewer, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    tenant = relationship("Tenant", back_populates="users")