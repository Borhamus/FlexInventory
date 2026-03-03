"""
Dependencias de tenant para los endpoints de inventario/items/catálogos.

Flujo de autenticación en cada request:
  1. JWT → get_current_user → dict con tenant_id (int) del usuario
  2. get_tenant_from_token  → busca el objeto Tenant usando ese tenant_id
  3. get_tenant_db          → sesión apuntando al schema correcto

No se requiere ningún header extra. El tenant se infiere del JWT.
"""

from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant, Users, UserRole
from app.Core.auth import get_current_user


# ----------------------------------------
# 1. Resolver tenant desde el JWT
# ----------------------------------------
async def get_tenant_from_token(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Tenant:
    """
    Obtiene el objeto Tenant usando el tenant_id guardado en el JWT.
    No requiere ningún header adicional.
    Lanza 404 si el tenant no existe o está inactivo.
    """
    tenant = (
        db.query(Tenant)
        .filter(
            Tenant.id == current_user["tenant_id"],
            Tenant.is_active == True,
        )
        .first()
    )
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant del usuario no encontrado o inactivo.",
        )
    return tenant


# ----------------------------------------
# 2. Verificar que el usuario está activo
# ----------------------------------------
async def get_verified_context(
    current_user: Annotated[dict, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_tenant_from_token)],
    db: Session = Depends(get_db),
) -> dict:
    """
    Verifica que el usuario del JWT sigue activo en BD.
    Devuelve {"user": <Users>, "tenant": <Tenant>} para uso posterior.
    """
    user = db.query(Users).filter(
        Users.id        == current_user["id"],
        Users.is_active == True,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo.",
        )

    return {"user": user, "tenant": tenant}


# ----------------------------------------
# 3. Sesión de BD apuntando al schema del tenant
# ----------------------------------------
def get_tenant_db(tenant: Annotated[Tenant, Depends(get_tenant_from_token)]):
    """
    Abre una sesión de SQLAlchemy con search_path = schema del tenant.
    El tenant se resuelve automáticamente desde el JWT.
    """
    with get_tenant_db_context(tenant.schema_name) as db:
        yield db


# ----------------------------------------
# 4. Dependencias compuestas por rol
# ----------------------------------------
async def require_tenant_access(
    context: Annotated[dict, Depends(get_verified_context)],
) -> dict:
    """Cualquier usuario activo del tenant puede usar este endpoint."""
    return context


async def require_editor_or_above(
    context: Annotated[dict, Depends(get_verified_context)],
) -> dict:
    """Solo tenant owner, admin o editor pueden crear/modificar datos."""
    role = context["user"].role
    if role not in (UserRole.tenant, UserRole.admin, UserRole.editor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol editor, admin o tenant para modificar datos.",
        )
    return context


async def require_admin_or_above(
    context: Annotated[dict, Depends(get_verified_context)],
) -> dict:
    """Solo tenant owner o admin pueden eliminar o gestionar empleados."""
    role = context["user"].role
    if role not in (UserRole.tenant, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol admin o tenant para esta acción.",
        )
    return context