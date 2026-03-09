from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.Core.models import Resource, Action


# ==================== Tenant ====================

class TenantCreate(BaseModel):
    name:           str      = Field(..., min_length=3, max_length=255)
    owner_username: str      = Field(..., min_length=3, max_length=50)
    owner_email:    EmailStr
    owner_password: str      = Field(..., min_length=8)

class TenantResponse(BaseModel):
    id:          int
    tenant_id:   str
    name:        str
    schema_name: str
    is_active:   bool
    created_at:  datetime
    updated_at:  datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Permisos ====================

class PermissionOut(BaseModel):
    id:       int
    resource: str
    action:   str
    model_config = ConfigDict(from_attributes=True)

class PermissionIn(BaseModel):
    resource: Resource
    action:   Action


# ==================== Roles personalizados ====================

class CustomRoleCreate(BaseModel):
    name:        str            = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class CustomRoleUpdate(BaseModel):
    name:        Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class CustomRoleResponse(BaseModel):
    id:          int
    name:        str
    description: Optional[str]
    permissions: List[PermissionOut] = []
    created_at:  datetime
    updated_at:  datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Empleados ====================

class CreateEmployeeRequest(BaseModel):
    username: str            = Field(..., min_length=3, max_length=50)
    password: str            = Field(..., min_length=8)
    email:    Optional[EmailStr] = None

class AssignRoleRequest(BaseModel):
    custom_role_id: Optional[int] = Field(
        None,
        description="ID del rol a asignar. Enviar null para quitar el rol."
    )

class UserResponse(BaseModel):
    id:             int
    username:       str
    email:          Optional[str]
    role:           str
    custom_role_id: Optional[int]
    tenant_id:      int
    is_active:      bool
    created_at:     datetime
    updated_at:     datetime
    model_config = ConfigDict(from_attributes=True)