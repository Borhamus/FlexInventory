"""
Dependencias de tenant y permisos.

Flujo base:
  JWT → tenant_id → Tenant → schema DB session

Flujo con permisos:
  JWT → usuario activo → verificar resource+action en su custom_role
  El tenant owner bypasea toda verificación de permisos.

Reglas inamovibles (hardcoded, no delegables a permisos):
  - Ningún empleado puede tocar al usuario tenant owner
  - Ningún empleado puede quitarse su propio custom_role
"""

from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant, Users, UserRole, RolePermission


from app.Core.auth import get_current_user

async def get_tenant_from_token(
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Tenant:
    tenant = (
        db.query(Tenant)
        .filter(Tenant.id == current_user["tenant_id"], Tenant.is_active == True)
        .first()
    )
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant del usuario no encontrado o inactivo.",
        )
    return tenant


# ----------------------------------------
# Verificar usuario activo
# ----------------------------------------
async def get_verified_context(
    current_user: Annotated[dict, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_tenant_from_token)],
    db: Session = Depends(get_db),
) -> dict:
    user = db.query(Users).filter(
        Users.id        == current_user["id"],
        Users.tenant_id == current_user["tenant_id"],
        Users.is_active == True,
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo.",
        )
    return {"user": user, "tenant": tenant}


# ----------------------------------------
# Sesión apuntando al schema del tenant
# ----------------------------------------
def get_tenant_db(tenant: Annotated[Tenant, Depends(get_tenant_from_token)]):
    with get_tenant_db_context(tenant.schema_name) as db:
        yield db


# ----------------------------------------
# Verificación de permisos granulares
# ----------------------------------------
def _check_permission(resource: str, action: str, context: dict, db: Session) -> dict:
    """
    Lógica central:
    - tenant   → bypass total
    - employee sin custom_role → 403 sin acceso
    - employee con custom_role → verifica resource+action en role_permissions
    """
    user: Users = context["user"]

    if user.role == UserRole.tenant:
        return context

    if user.custom_role_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés un rol asignado. Contactá al dueño del tenant.",
        )

    permission = db.query(RolePermission).filter(
        RolePermission.role_id  == user.custom_role_id,
        RolePermission.resource == resource,
        RolePermission.action   == action,
    ).first()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tenés permiso para '{action}' en '{resource}'.",
        )

    return context


def require_permission(resource: str, action: str):
    """
    Factory de dependencias para proteger endpoints por permiso.

    Uso:
        @router.post("/inventarios/")
        def create_inventario(
            _: dict = Depends(require_permission("inventarios", "create")),
            db: Session = Depends(get_tenant_db),
        ): ...
    """
    async def dependency(
        context: Annotated[dict, Depends(get_verified_context)],
        db: Session = Depends(get_db),
    ) -> dict:
        return _check_permission(resource, action, context, db)
    return dependency


# ----------------------------------------
# Dependencia exclusiva del tenant owner
# (para operaciones que NUNCA se pueden delegar)
# ----------------------------------------
async def require_tenant_owner(
    context: Annotated[dict, Depends(get_verified_context)],
) -> dict:
    """
    Reservado para acciones que el tenant owner nunca puede delegar,
    como modificar su propio perfil de owner o gestión de developer.
    Para el resto, usar require_permission().
    """
    if context["user"].role != UserRole.tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el dueño del tenant puede realizar esta acción.",
        )
    return context