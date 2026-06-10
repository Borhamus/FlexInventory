"""
Endpoints de gestión de tenants.
Estan Protegidos con X-Developer-Key — solo para el desarrollodores, no accesibles por usuarios logueados normales.
"""

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
import re
import os
import secrets
from app.db_config import get_db, create_tenant_schema, engine
from app.Core import models, schemas
from app.Core.auth import bcrypt_context

router = APIRouter(prefix="/tenants", tags=["Tenants (Developer)"])

# ——— API Key de developer ———
api_key_header = APIKeyHeader(name="X-Developer-Key", auto_error=False)

def verify_developer_key(key: str = Security(api_key_header)):
    expected = os.getenv("DEVELOPER_API_KEY")
    # Falla cerrado: si la env no está configurada o no llegó el header, denegar.
    # secrets.compare_digest evita timing attacks en la comparación.
    if not expected or not key or not secrets.compare_digest(key, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido. Se requiere X-Developer-Key válida.",
        )
    return key


def generate_schema_name(tenant_name: str) -> str:
    schema = re.sub(r"[^a-z0-9]", "_", tenant_name.lower())
    return f"tenant_{schema}"[:63]


# ==========================================
# Endpoints — requieren developer key
# ==========================================

@router.post("/", response_model=schemas.TenantResponse, status_code=201,
             dependencies=[Depends(verify_developer_key)])
def create_tenant(tenant_data: schemas.TenantCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo tenant y crea su schema de base de datos aislado.

    Requiere el header `X-Developer-Key` — no es accesible por usuarios finales.
    Al crearse el tenant, se genera automáticamente un usuario owner con `role=tenant`
    que tiene acceso total y no puede ser modificado por empleados.

    **Ejemplo de request:**
    ```json
    {
      "name": "Ferretería Central",
      "owner_username": "admin_ferreteria",
      "owner_email": "admin@ferreteria.com",
      "owner_password": "password123"
    }
    ```

    **Ejemplo de response:**
    ```json
    {
      "id": 1,
      "tenant_id": "uuid-generado",
      "name": "Ferretería Central",
      "schema_name": "tenant_ferreteri_a_central",
      "is_active": true,
      "created_at": "2026-03-08T10:00:00",
      "updated_at": "2026-03-08T10:00:00"
    }
    ```
    """
    if db.query(models.Users).filter(models.Users.email == tenant_data.owner_email).first():
        raise HTTPException(400, detail="El email ya está registrado.")
    if db.query(models.Users).filter(models.Users.username == tenant_data.owner_username).first():
        raise HTTPException(400, detail="El nombre de usuario ya está en uso.")

    schema_name = generate_schema_name(tenant_data.name)
    if db.query(models.Tenant).filter(models.Tenant.schema_name == schema_name).first():
        raise HTTPException(400, detail=f"Ya existe un tenant con ese nombre. Schema: {schema_name}")

    try:
        new_tenant = models.Tenant(name=tenant_data.name, schema_name=schema_name)
        db.add(new_tenant)
        db.flush()

        owner = models.Users(
            username        = tenant_data.owner_username,
            email           = tenant_data.owner_email,
            hashed_password = bcrypt_context.hash(tenant_data.owner_password),
            tenant_id       = new_tenant.id,
            role            = models.UserRole.tenant,
            is_active       = True,
        )
        db.add(owner)

        # Crear el schema ANTES del commit: si falla, el rollback revierte
        # tenant + owner y no queda un tenant huérfano en public.
        create_tenant_schema(schema_name)
        db.commit()
        db.refresh(new_tenant)
        return new_tenant

    except Exception as e:
        db.rollback()
        # Compensación: si el schema llegó a crearse pero el commit falló,
        # eliminarlo para no dejar un schema huérfano. (schema_name ya fue
        # verificado como inexistente más arriba y está sanitizado.)
        try:
            with engine.begin() as conn:
                conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
        except Exception:
            pass
        raise HTTPException(500, detail=f"Error al crear tenant: {str(e)}")


@router.get("/", response_model=List[schemas.TenantResponse],
            dependencies=[Depends(verify_developer_key)])
def list_tenants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lista todos los tenants registrados en el sistema.

    Requiere el header `X-Developer-Key`. Soporta paginación con `skip` y `limit`.

    **Ejemplo de response:**
    ```json
    [
      { "id": 1, "name": "Ferretería Central", "is_active": true, ... },
      { "id": 2, "name": "Librería Norte",     "is_active": true, ... }
    ]
    ```
    """
    return db.query(models.Tenant).offset(skip).limit(limit).all()


@router.get("/{tenant_id}", response_model=schemas.TenantResponse,
            dependencies=[Depends(verify_developer_key)])
def get_tenant(tenant_id: int, db: Session = Depends(get_db)):
    """
    Devuelve el detalle de un tenant por su ID interno.

    Requiere el header `X-Developer-Key`.

    **Ejemplo:** `GET /tenants/1`
    """
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(404, detail="Tenant no encontrado.")
    return tenant