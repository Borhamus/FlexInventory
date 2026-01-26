from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime

# ==================== Schemas para Tenant ====================

class TenantCreate(BaseModel):
    """Crear un nuevo tenant con su usuario owner"""
    name: str = Field(..., min_length=3, max_length=255, description="Nombre del tenant/empresa")
    owner_username: str = Field(..., min_length=3, max_length=50)
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8)

class TenantResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    schema_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ==================== Schemas para Users ====================

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    role: str
    tenant_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)