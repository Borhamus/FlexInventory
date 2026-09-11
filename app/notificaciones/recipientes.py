"""
app/notificaciones/recipientes.py
───────────────────────────────────
Quién recibe las notificaciones de un tenant. Vive en el schema public
(Users/CustomRole/RolePermission), no en el schema del tenant.

Destinatarios = dueño del tenant (siempre, no tiene RolePermission — mismo
criterio que require_tenant_owner: el owner nunca queda afuera de nada) +
empleados activos cuyo custom_role tenga el permiso notificaciones:read
(configurable desde la sección de Roles existente, sin UI nueva: agregar el
Resource "notificaciones" ahí fue toda la wiring que hizo falta).
"""

from typing import List
from sqlalchemy.orm import Session

from app.Core.models import Action, Resource, RolePermission, UserRole, Users


def resolver_destinatarios(tenant_id: int, db: Session) -> List[Users]:
    owner = (
        db.query(Users)
        .filter(Users.tenant_id == tenant_id, Users.role == UserRole.tenant, Users.is_active == True)
        .first()
    )

    empleados = (
        db.query(Users)
        .join(RolePermission, RolePermission.role_id == Users.custom_role_id)
        .filter(
            Users.tenant_id == tenant_id,
            Users.role == UserRole.employee,
            Users.is_active == True,
            RolePermission.resource == Resource.notificaciones,
            RolePermission.action == Action.read,
        )
        .all()
    )

    return ([owner] if owner else []) + empleados


def resolver_destinatarios_email(tenant_id: int, db: Session) -> List[Users]:
    """Mismo set que resolver_destinatarios, filtrado a quienes pueden recibir mail de verdad."""
    return [u for u in resolver_destinatarios(tenant_id, db) if u.email and u.email_verified]
