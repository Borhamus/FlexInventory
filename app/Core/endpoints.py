from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import re

from app.db_config import get_db, create_tenant_schema
from app.Core import models, schemas
from app.Core.auth import bcrypt_context

router = APIRouter(prefix="/tenants", tags=["Tenants"])


def generate_schema_name(tenant_name: str) -> str:
    schema = re.sub(r"[^a-z0-9]", "_", tenant_name.lower())
    return f"tenant_{schema}"[:63]


# ==========================================
# Endpoints públicos de registro de tenant
# ==========================================

@router.post("/", response_model=schemas.TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(tenant_data: schemas.TenantCreate, db: Session = Depends(get_db)):
    """
    Registro público: crea el tenant + su usuario owner (role=tenant).

    Flujo:
    1. Valida que email y username no existan.
    2. Crea el registro Tenant.
    3. Crea el usuario owner vinculado al tenant (tenant_id).
    4. Crea el schema físico en PostgreSQL con las tablas del tenant.
    """
    # 1. Validaciones previas
    if db.query(models.Users).filter(models.Users.email == tenant_data.owner_email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado.")

    if db.query(models.Users).filter(models.Users.username == tenant_data.owner_username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso.")

    schema_name = generate_schema_name(tenant_data.name)

    if db.query(models.Tenant).filter(models.Tenant.schema_name == schema_name).first():
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un tenant con ese nombre. Schema generado: {schema_name}",
        )

    try:
        # 2. Crear Tenant
        new_tenant = models.Tenant(name=tenant_data.name, schema_name=schema_name)
        db.add(new_tenant)
        db.flush()  # obtenemos new_tenant.id sin commitear aún

        # 3. Crear usuario owner vinculado al tenant
        owner = models.Users(
            username        = tenant_data.owner_username,
            email           = tenant_data.owner_email,
            hashed_password = bcrypt_context.hash(tenant_data.owner_password),
            tenant_id       = new_tenant.id,          # ← vínculo clave
            role            = models.UserRole.tenant,
            is_active       = True,
        )
        db.add(owner)
        db.commit()

        # 4. Crear schema físico con tablas del tenant
        create_tenant_schema(schema_name)

        db.refresh(new_tenant)
        return new_tenant

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear tenant: {str(e)}")


@router.get("/", response_model=List[schemas.TenantResponse])
def list_tenants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Tenant).offset(skip).limit(limit).all()


@router.get("/{tenant_id}", response_model=schemas.TenantResponse)
def get_tenant(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    return tenant