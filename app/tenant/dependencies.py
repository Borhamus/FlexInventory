"""
Dependencias de tenant para los endpoints de inventario/items/catálogos.

Flujo de autenticación en cada request a /tenant/*:
  1. JWT  → get_current_user       → dict con tenant_id del usuario
  2. Header X-Tenant-ID            → get_tenant_from_header → objeto Tenant
  3. Comparar ambos tenant_id      → verify_user_belongs_to_tenant
  4. get_tenant_db                 → sesión apuntando al schema correcto
"""

from typing import Annotated
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant, Users, UserRole
from app.Core.auth import get_current_user


# ----------------------------------------
# 1. Resolver tenant desde header
# ----------------------------------------
async def get_tenant_from_header(
    x_tenant_id: Annotated[str, Header()],
    db: Session = Depends(get_db),
) -> Tenant:
    """
    Busca el Tenant por su UUID público (x_tenant_id).
    Lanza 404 si no existe o está inactivo.
    """
    tenant = (
        db.query(Tenant)
        .filter(Tenant.tenant_id == x_tenant_id, Tenant.is_active == True)
        .first()
    )
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant no encontrado o inactivo.",
        )
    return tenant


# ----------------------------------------
# 2. Verificar que el usuario pertenece al tenant
# ----------------------------------------
async def verify_user_belongs_to_tenant(
    current_user: Annotated[dict, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_tenant_from_header)],
    db: Session = Depends(get_db),
) -> dict:
    """
    Compara el tenant_id del JWT con el tenant solicitado en el header.
    - Si no coinciden → 403
    - Si el usuario no existe en BD → 401
    Devuelve {"user": <Users>, "tenant": <Tenant>} para uso posterior.
    """
    # El tenant_id del token debe coincidir con el tenant del header
    if current_user["tenant_id"] != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este tenant.",
        )

    # Verificación adicional: el usuario debe existir y estar activo
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
def get_tenant_db(tenant: Annotated[Tenant, Depends(get_tenant_from_header)]):
    """
    Abre una sesión de SQLAlchemy con search_path = schema del tenant.
    Usar como dependencia en todos los endpoints de inventario/items/catálogos.

    Ejemplo:
        @router.get("/inventarios/")
        def list_inventarios(db: Session = Depends(get_tenant_db)):
            ...
    """
    with get_tenant_db_context(tenant.schema_name) as db:
        yield db


# ----------------------------------------
# 4. Dependencias compuestas por rol
# ----------------------------------------
async def require_tenant_access(
    context: Annotated[dict, Depends(verify_user_belongs_to_tenant)],
) -> dict:
    """Cualquier usuario activo del tenant puede usar este endpoint"""
    return context


async def require_editor_or_above(
    context: Annotated[dict, Depends(verify_user_belongs_to_tenant)],
) -> dict:
    """Solo tenant owner, admin o editor pueden modificar datos"""
    role = context["user"].role
    if role not in (UserRole.tenant, UserRole.admin, UserRole.editor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol editor, admin o tenant para modificar datos.",
        )
    return context


async def require_admin_or_above(
    context: Annotated[dict, Depends(verify_user_belongs_to_tenant)],
) -> dict:
    """Solo tenant owner o admin pueden eliminar o gestionar empleados"""
    role = context["user"].role
    if role not in (UserRole.tenant, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol admin o tenant para esta acción.",
        )
    return context