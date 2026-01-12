from database import Base
from sqlalchemy import Column, Integer, String, ForeignKey
import enum

class UserRole(str, enum.Enum):
    tenant = "tenant"
    employee = "employee"

class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.employee) # Campo para el tipo de usuario
    
    # Autorreferencia: Si es empleado, apunta al ID del tenant.
    # Si es tenant, este campo es NULL.
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)