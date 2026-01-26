from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db_config import Base
import enum
import uuid

class UserRole(str, enum.Enum):
    tenant = "tenant"
    notenant = "notenant"

class Tenant(Base):
    """Tabla de tenants en schema public"""
    __tablename__ = "tenants"
    __table_args__ = {'schema': 'public'}
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    schema_name = Column(String(63), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relación con usuarios
    users = relationship("Users", back_populates="tenant")

class Users(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    
    # Relación con tenant
    tenant_id = Column(Integer, ForeignKey("public.tenants.id"), nullable=True)
    
    role = Column(String, default=UserRole.notenant)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relación
    tenant = relationship("Tenant", back_populates="users")
    
    # Mantener owner_id por compatibilidad (lo removeremos después)
    owner_id = Column(Integer, ForeignKey("public.users.id"), nullable=True)