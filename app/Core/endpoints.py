from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import re

from app.db_config import get_db, create_tenant_schema
from app.Core import models, schemas
from passlib.context import CryptContext

router = APIRouter(prefix="/tenants", tags=["Tenants"])

# Contexto para hashear passwords
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_schema_name(tenant_name: str) -> str:
    """Generar nombre de esquema válido desde el nombre del tenant"""
    # Convertir a minúsculas, reemplazar espacios y caracteres especiales
    schema = re.sub(r'[^a-z0-9]', '_', tenant_name.lower())
    schema = f"tenant_{schema}"
    return schema[:63]  # Límite de PostgreSQL para nombres

# ==================== ENDPOINTS ====================

@router.post("/", response_model=schemas.TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_data: schemas.TenantCreate,
    db: Session = Depends(get_db)
):
    """
    Crear un nuevo tenant con su esquema y usuario owner
    
    Este endpoint crea:
    1. Un registro en la tabla tenants
    2. Un usuario owner para ese tenant
    3. Un esquema en PostgreSQL con las tablas de la aplicación
    """
    # Verificar si el email ya existe
    existing_user = db.query(models.Users).filter(
        models.Users.email == tenant_data.owner_email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Verificar si el username ya existe
    existing_username = db.query(models.Users).filter(
        models.Users.username == tenant_data.owner_username
    ).first()
    
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está en uso"
        )
    
    # Generar nombre de esquema
    schema_name = generate_schema_name(tenant_data.name)
    
    # Verificar si el esquema ya existe
    existing_tenant = db.query(models.Tenant).filter(
        models.Tenant.schema_name == schema_name
    ).first()
    
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un tenant con ese nombre. Schema generado: {schema_name}"
        )
    
    try:
        # 1. Crear registro del tenant
        new_tenant = models.Tenant(
            name=tenant_data.name,
            schema_name=schema_name
        )
        db.add(new_tenant)
        db.flush()  # Para obtener el ID sin hacer commit
        
        # 2. Crear usuario owner
        owner_user = models.Users(
            username=tenant_data.owner_username,
            email=tenant_data.owner_email,
            hashed_password=bcrypt_context.hash(tenant_data.owner_password),
            tenant_id=new_tenant.id,
            role=models.UserRole.tenant,  # El owner es tipo "tenant"
            is_active=True
        )
        db.add(owner_user)
        db.commit()
        
        # 3. Crear esquema físico en la BD con sus tablas
        create_tenant_schema(schema_name)
        
        db.refresh(new_tenant)
        
        print(f"✅ Tenant '{tenant_data.name}' creado exitosamente")
        print(f"   - Schema: {schema_name}")
        print(f"   - Owner: {tenant_data.owner_username}")
        
        return new_tenant
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al crear tenant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear tenant: {str(e)}"
        )

@router.get("/", response_model=List[schemas.TenantResponse])
def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Listar todos los tenants"""
    tenants = db.query(models.Tenant).offset(skip).limit(limit).all()
    return tenants

@router.get("/{tenant_id}", response_model=schemas.TenantResponse)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db)
):
    """Obtener información de un tenant específico por su tenant_id (UUID)"""
    tenant = db.query(models.Tenant).filter(
        models.Tenant.tenant_id == tenant_id
    ).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant no encontrado"
        )
    
    return tenant