from database import Base
from sqlalchemy import Column, Integer, String, ForeignKey
import enum

class UserRole(str, enum.Enum):
    tenant = "tenant"
    administrator = "administrator" 
    employee = "employee"

class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    
    # Asegúrate de tener estas dos columnas:
    role = Column(String, default=UserRole.employee) 
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)