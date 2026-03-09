from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db_config import Base
import enum
import uuid


# ==========================================
# Enums
# ==========================================
class UserRole(str, enum.Enum):
    tenant   = "tenant"    # Dueño del tenant — acceso total, intocable
    employee = "employee"  # Acceso según custom_role asignado


# ==========================================
# Recursos y acciones disponibles para permisos
# ==========================================
class Resource(str, enum.Enum):
    inventarios = "inventarios"
    items       = "items"
    catalogos   = "catalogos"
    empleados   = "empleados"
    roles       = "roles"


class Action(str, enum.Enum):
    create = "create"
    read   = "read"
    update = "update"
    delete = "delete"


# ==========================================
# Tenant
# ==========================================
class Tenant(Base):
    __tablename__  = "tenants"
    __table_args__ = {'schema': 'public'}

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    name        = Column(String(255), nullable=False)
    schema_name = Column(String(63), unique=True, nullable=False)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at  = Column(TIMESTAMP, server_default=func.current_timestamp(),
                         onupdate=func.current_timestamp())

    users        = relationship("Users", back_populates="tenant")
    custom_roles = relationship("CustomRole", back_populates="tenant",
                                cascade="all, delete-orphan")


# ==========================================
# Roles personalizados por tenant
# ==========================================
class CustomRole(Base):
    """
    Rol definido por el tenant o un empleado con permiso 'roles:create'.
    Ej: 'jefe de depósito', 'auditor', 'jefe de área'.
    Cada rol tiene N permisos (resource + action).
    """
    __tablename__  = "custom_roles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_custom_role_tenant_name"),
        {'schema': 'public'},
    )

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("public.tenants.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at  = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at  = Column(TIMESTAMP, server_default=func.current_timestamp(),
                         onupdate=func.current_timestamp())

    tenant      = relationship("Tenant", back_populates="custom_roles")
    permissions = relationship("RolePermission", back_populates="role",
                               cascade="all, delete-orphan")
    users       = relationship("Users", back_populates="custom_role")


# ==========================================
# Permisos asignados a un rol
# ==========================================
class RolePermission(Base):
    """
    Cada fila = un permiso: el rol X puede hacer la acción Y sobre el recurso Z.
    Ejemplos:
      role_id=3, resource='items',    action='create'
      role_id=3, resource='empleados', action='read'
      role_id=3, resource='roles',    action='update'
    """
    __tablename__  = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "resource", "action",
                         name="uq_role_resource_action"),
        {'schema': 'public'},
    )

    id       = Column(Integer, primary_key=True, index=True)
    role_id  = Column(Integer, ForeignKey("public.custom_roles.id", ondelete="CASCADE"),
                      nullable=False, index=True)
    resource = Column(String(50), nullable=False)  # valor del enum Resource
    action   = Column(String(50), nullable=False)  # valor del enum Action

    role = relationship("CustomRole", back_populates="permissions")


# ==========================================
# Usuarios
# ==========================================
class Users(Base):
    """
    Tabla unificada de usuarios en schema public.

    role = "tenant"   → dueño, creado al registrar el tenant.
                        Bypasea todos los permisos. Intocable por empleados.
    role = "employee" → accede solo a lo que indique su custom_role.
                        Sin custom_role asignado = sin acceso a nada.
    """
    __tablename__  = "users"
    __table_args__ = {'schema': 'public'}

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    email           = Column(String, unique=True, nullable=True)

    tenant_id      = Column(Integer, ForeignKey("public.tenants.id"), nullable=False)
    role           = Column(String, default=UserRole.employee, nullable=False)
    custom_role_id = Column(Integer, ForeignKey("public.custom_roles.id",
                            ondelete="SET NULL"), nullable=True)

    is_active  = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    tenant      = relationship("Tenant", back_populates="users")
    custom_role = relationship("CustomRole", back_populates="users")