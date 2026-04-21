"""
Endpoints de gestión de roles y empleados.

Todos los endpoints usan require_permission() — cualquier empleado con el
permiso correspondiente puede ejecutarlos, igual que el tenant owner.

Reglas inamovibles (validadas en código, no bypasseables por permisos):
  - Nadie puede tocar al usuario con role='tenant' (ni desactivarlo, ni quitarle rol)
  - Nadie puede quitarse su propio custom_role
"""

from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db_config import get_db
from app.Core.models import CustomRole, RolePermission, Users, UserRole, Resource, Action
from app.Core.schemas import (
    CustomRoleCreate, CustomRoleUpdate, CustomRoleResponse,
    PermissionIn, UserResponse, AssignRoleRequest,
    CreateEmployeeRequest, ChangePasswordRequest, UpdateUsernameRequest, UpdateEmailRequest,
)
from app.tenant.dependencies import require_permission, get_verified_context
from app.Core.auth import bcrypt_context

router = APIRouter()

db_dep = Annotated[Session, Depends(get_db)]


# ============================================================
# ROLES — CRUD
# ============================================================

@router.post("/roles/", response_model=CustomRoleResponse, status_code=201, tags=["Roles"])
def create_role(
    body: CustomRoleCreate,
    ctx: Annotated[dict, Depends(require_permission("roles", "create"))],
    db: db_dep,
):
    """
    Crea un nuevo rol personalizado para el tenant. El rol nace sin permisos;
    usá `POST /roles/{role_id}/permissions` para asignarle permisos luego.

    Requiere permiso `roles:create` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "name": "Jefe de deposito", "description": "Gestiona el stock" }
    ```

    **Ejemplo de response:**
    ```json
    { "id": 3, "name": "Jefe de deposito", "permissions": [], ... }
    ```
    """
    tenant_id = ctx["tenant"].id

    if db.query(CustomRole).filter(
        CustomRole.tenant_id == tenant_id,
        CustomRole.name      == body.name,
    ).first():
        raise HTTPException(400, detail=f"Ya existe un rol llamado '{body.name}'.")

    role = CustomRole(tenant_id=tenant_id, name=body.name, description=body.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/roles/", response_model=List[CustomRoleResponse], tags=["Roles"])
def list_roles(
    ctx: Annotated[dict, Depends(require_permission("roles", "read"))],
    db: db_dep,
):
    """
    Lista todos los roles del tenant con sus permisos asignados.

    Requiere permiso `roles:read` (o ser tenant owner).

    **Ejemplo de response:**
    ```json
    [
      {
        "id": 3,
        "name": "Jefe de deposito",
        "permissions": [
          { "id": 1, "resource": "items", "action": "read" },
          { "id": 2, "resource": "items", "action": "create" }
        ]
      }
    ]
    ```
    """
    return db.query(CustomRole).filter(CustomRole.tenant_id == ctx["tenant"].id).all()


@router.get("/roles/{role_id}", response_model=CustomRoleResponse, tags=["Roles"])
def get_role(
    role_id: int,
    ctx: Annotated[dict, Depends(require_permission("roles", "read"))],
    db: db_dep,
):
    """
    Devuelve el detalle de un rol específico, incluyendo todos sus permisos.

    Requiere permiso `roles:read` (o ser tenant owner).

    **Ejemplo:** `GET /roles/3`
    """
    return _get_role_or_404(role_id, ctx["tenant"].id, db)


@router.put("/roles/{role_id}", response_model=CustomRoleResponse, tags=["Roles"])
def update_role(
    role_id: int,
    body: CustomRoleUpdate,
    ctx: Annotated[dict, Depends(require_permission("roles", "update"))],
    db: db_dep,
):
    """
    Edita el nombre o descripción de un rol existente. Los campos son opcionales;
    solo se actualiza lo que se envíe.

    Requiere permiso `roles:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "name": "Supervisor de stock", "description": "Nuevo texto" }
    ```
    """
    role = _get_role_or_404(role_id, ctx["tenant"].id, db)

    if body.name and body.name != role.name:
        if db.query(CustomRole).filter(
            CustomRole.tenant_id == ctx["tenant"].id,
            CustomRole.name      == body.name,
        ).first():
            raise HTTPException(400, detail=f"Ya existe un rol llamado '{body.name}'.")
        role.name = body.name

    if body.description is not None:
        role.description = body.description

    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=204, tags=["Roles"])
def delete_role(
    role_id: int,
    ctx: Annotated[dict, Depends(require_permission("roles", "delete"))],
    db: db_dep,
):
    """
    Elimina un rol del tenant. Los empleados que tenían ese rol asignado quedan
    automáticamente sin rol (`custom_role_id = null`), perdiendo todo acceso hasta
    que se les asigne uno nuevo.

    Requiere permiso `roles:delete` (o ser tenant owner).

    **Ejemplo:** `DELETE /roles/3`
    """
    role = _get_role_or_404(role_id, ctx["tenant"].id, db)
    db.delete(role)
    db.commit()


# ============================================================
# ROLES — Permisos
# ============================================================

@router.post("/roles/{role_id}/permissions", response_model=CustomRoleResponse, status_code=201, tags=["Roles"])
def add_permission(
    role_id: int,
    body: PermissionIn,
    ctx: Annotated[dict, Depends(require_permission("roles", "update"))],
    db: db_dep,
):
    """
    Agrega un permiso (recurso + acción) a un rol. Si el permiso ya existe, se ignora sin error.

    Recursos disponibles: `inventarios`, `items`, `catalogos`, `empleados`, `roles`.
    Acciones disponibles: `create`, `read`, `update`, `delete`.

    Requiere permiso `roles:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "resource": "items", "action": "create" }
    ```

    **Ejemplo de response:** el rol completo con todos sus permisos actualizados.
    """
    role = _get_role_or_404(role_id, ctx["tenant"].id, db)

    exists = db.query(RolePermission).filter(
        RolePermission.role_id  == role_id,
        RolePermission.resource == body.resource.value,
        RolePermission.action   == body.action.value,
    ).first()

    if not exists:
        db.add(RolePermission(
            role_id  = role_id,
            resource = body.resource.value,
            action   = body.action.value,
        ))
        db.commit()

    db.refresh(role)
    return role


@router.delete("/roles/{role_id}/permissions", status_code=204, tags=["Roles"])
def remove_permission(
    role_id: int,
    body: PermissionIn,
    ctx: Annotated[dict, Depends(require_permission("roles", "update"))],
    db: db_dep,
):
    """
    Quita un permiso específico de un rol. Si el permiso no existe, devuelve 404.

    Requiere permiso `roles:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "resource": "items", "action": "delete" }
    ```
    """
    _get_role_or_404(role_id, ctx["tenant"].id, db)

    perm = db.query(RolePermission).filter(
        RolePermission.role_id  == role_id,
        RolePermission.resource == body.resource.value,
        RolePermission.action   == body.action.value,
    ).first()

    if not perm:
        raise HTTPException(404, detail="El permiso no existe en este rol.")

    db.delete(perm)
    db.commit()


# ============================================================
# EMPLEADOS — CRUD
# ============================================================

@router.post("/empleados/", response_model=UserResponse, status_code=201, tags=["Empleados"])
def create_employee(
    body: CreateEmployeeRequest,
    ctx: Annotated[dict, Depends(require_permission("empleados", "create"))],
    db: db_dep,
):
    """
    Crea un nuevo empleado dentro del tenant. El empleado nace sin rol asignado,
    por lo que no tendrá acceso a ningún recurso hasta que se le asigne un `custom_role`
    con `PUT /empleados/{id}`.

    Requiere permiso `empleados:create` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    {
      "username": "maria_gomez",
      "password": "password123",
      "email": "maria@empresa.com"
    }
    ```
    """
    tenant_id = ctx["tenant"].id

    if db.query(Users).filter(Users.username == body.username).first():
        raise HTTPException(400, detail="El nombre de usuario ya está en uso.")

    if body.email and db.query(Users).filter(Users.email == body.email).first():
        raise HTTPException(400, detail="El email ya está registrado.")

    new_user = Users(
        username        = body.username,
        hashed_password = bcrypt_context.hash(body.password),
        email           = body.email,
        role            = UserRole.employee,
        tenant_id       = tenant_id,
        is_active       = True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/empleados/", response_model=List[UserResponse], tags=["Empleados"])
def list_employees(
    ctx: Annotated[dict, Depends(require_permission("empleados", "read"))],
    db: db_dep,
):
    """
    Lista todos los empleados del tenant, excluyendo al tenant owner.

    Requiere permiso `empleados:read` (o ser tenant owner).

    **Ejemplo de response:**
    ```json
    [
      { "id": 4, "username": "maria_gomez", "role": "employee", "custom_role_id": 3, "is_active": true, ... }
    ]
    ```
    """
    return (
        db.query(Users)
        .filter(
            Users.tenant_id == ctx["tenant"].id,
            Users.role      != UserRole.tenant,
        )
        .all()
    )


@router.get("/empleados/{employee_id}", response_model=UserResponse, tags=["Empleados"])
def get_employee(
    employee_id: int,
    ctx: Annotated[dict, Depends(require_permission("empleados", "read"))],
    db: db_dep,
):
    """
    Devuelve el detalle de un empleado específico del tenant.

    Requiere permiso `empleados:read` (o ser tenant owner).

    **Ejemplo:** `GET /empleados/4`
    """
    return _get_employee_or_404(employee_id, ctx["tenant"].id, db)


@router.put("/empleados/{employee_id}", response_model=UserResponse, tags=["Empleados"])
def update_employee(
    employee_id: int,
    body: AssignRoleRequest,
    ctx: Annotated[dict, Depends(require_permission("empleados", "update"))],
    db: db_dep,
):
    """
    Asigna o quita el rol personalizado de un empleado.

    - Para asignar un rol, enviá el `custom_role_id` del rol deseado.
    - Para quitarle el rol (dejarlo sin acceso), enviá `custom_role_id: null`.

    Restricciones inamovibles:
    - No se puede modificar al tenant owner.
    - Un empleado no puede quitarse su propio rol.

    Requiere permiso `empleados:update` (o ser tenant owner).

    **Ejemplo — asignar rol:**
    ```json
    { "custom_role_id": 3 }
    ```

    **Ejemplo — quitar rol:**
    ```json
    { "custom_role_id": null }
    ```
    """
    requester: Users = ctx["user"]
    employee = _get_employee_or_404(employee_id, ctx["tenant"].id, db)

    # Regla 1: no tocar al tenant owner
    if employee.role == UserRole.tenant:
        raise HTTPException(403, detail="No se puede modificar al dueño del tenant.")

    # Regla 2: no quitarse el propio rol
    if employee.id == requester.id and body.custom_role_id is None:
        raise HTTPException(403, detail="No podés quitarte tu propio rol.")

    if body.custom_role_id is not None:
        role = db.query(CustomRole).filter(
            CustomRole.id        == body.custom_role_id,
            CustomRole.tenant_id == ctx["tenant"].id,
        ).first()
        if not role:
            raise HTTPException(404, detail="Rol no encontrado en este tenant.")

    employee.custom_role_id = body.custom_role_id
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/empleados/{employee_id}", status_code=204, tags=["Empleados"])
def deactivate_employee(
    employee_id: int,
    ctx: Annotated[dict, Depends(require_permission("empleados", "delete"))],
    db: db_dep,
):
    """
    Desactiva un empleado (`is_active = false`). No elimina el registro de la base de datos.
    Un empleado desactivado no puede autenticarse ni operar en el sistema.

    Restricciones inamovibles:
    - No se puede desactivar al tenant owner.
    - Un empleado no puede desactivarse a sí mismo.

    Requiere permiso `empleados:delete` (o ser tenant owner).

    **Ejemplo:** `DELETE /empleados/4`
    """
    requester: Users = ctx["user"]
    employee = _get_employee_or_404(employee_id, ctx["tenant"].id, db)

    if employee.role == UserRole.tenant:
        raise HTTPException(403, detail="No se puede desactivar al dueño del tenant.")

    if employee.id == requester.id:
        raise HTTPException(403, detail="No podés desactivarte a vos mismo.")

    employee.is_active = False
    db.commit()


@router.patch("/empleados/{employee_id}/password", status_code=204, tags=["Empleados"])
def change_employee_password(
    employee_id: int,
    body: ChangePasswordRequest,
    ctx: Annotated[dict, Depends(require_permission("empleados", "update"))],
    db: db_dep,
):
    """
    Cambia la contraseña de un empleado.

    Restricciones:
    - No se puede cambiar la contraseña del tenant owner.
    - Un empleado no puede cambiar su propia contraseña desde acá
      (para eso existiría un endpoint de perfil propio).

    Requiere permiso `empleados:update` (o ser tenant owner).
    """
    requester: Users = ctx["user"]
    employee = _get_employee_or_404(employee_id, ctx["tenant"].id, db)

    if employee.role == UserRole.tenant:
        raise HTTPException(403, detail="No se puede modificar la contraseña del dueño del tenant.")

    if employee.id == requester.id and requester.role != UserRole.tenant:
        raise HTTPException(403, detail="Usá el endpoint de perfil para cambiar tu propia contraseña.")

    employee.hashed_password = bcrypt_context.hash(body.new_password)
    db.commit()


@router.patch("/empleados/{employee_id}/activate", response_model=UserResponse, tags=["Empleados"])
def activate_employee(
    employee_id: int,
    ctx: Annotated[dict, Depends(require_permission("empleados", "update"))],
    db: db_dep,
):
    """
    Reactiva un empleado previamente desactivado.
    Requiere permiso `empleados:update` (o ser tenant owner).
    """
    employee = _get_employee_or_404(employee_id, ctx["tenant"].id, db)

    if employee.role == UserRole.tenant:
        raise HTTPException(403, detail="No se puede modificar al dueño del tenant.")

    employee.is_active = True
    db.commit()
    db.refresh(employee)
    return employee



@router.patch("/empleados/{employee_id}/username", response_model=UserResponse, tags=["Empleados"])
def update_employee_username(
    employee_id: int,
    body: UpdateUsernameRequest,
    ctx: Annotated[dict, Depends(require_permission("empleados", "update"))],
    db: db_dep,
):
    """
    Edita el nombre de usuario de un empleado.
    Requiere permiso `empleados:update` (o ser tenant owner).
    """
    employee = _get_employee_or_404(employee_id, ctx["tenant"].id, db)

    if employee.role == UserRole.tenant:
        raise HTTPException(403, detail="No se puede modificar al dueño del tenant.")

    if db.query(Users).filter(
        Users.username == body.username,
        Users.id != employee_id,
    ).first():
        raise HTTPException(400, detail="Ese nombre de usuario ya está en uso.")

    employee.username = body.username
    db.commit()
    db.refresh(employee)
    return employee

@router.patch("/empleados/{employee_id}/email", response_model=UserResponse, tags=["Empleados"])
def update_employee_email(
    employee_id: int,
    body: UpdateEmailRequest,
    ctx: Annotated[dict, Depends(require_permission("empleados", "update"))],
    db: db_dep,
):
    """
    Actualiza el email de un empleado.
    Requiere permiso `empleados:update` (o ser tenant owner).
    """
    employee = _get_employee_or_404(employee_id, ctx["tenant"].id, db)

    if employee.role == UserRole.tenant:
        raise HTTPException(403, detail="No se puede modificar al dueño del tenant.")

    if body.email and db.query(Users).filter(
        Users.email == body.email,
        Users.id != employee_id,
    ).first():
        raise HTTPException(400, detail="Ese email ya está registrado.")

    employee.email = body.email
    db.commit()
    db.refresh(employee)
    return employee


# ============================================================
# Helpers
# ============================================================

def _get_role_or_404(role_id: int, tenant_id: int, db: Session) -> CustomRole:
    role = db.query(CustomRole).filter(
        CustomRole.id        == role_id,
        CustomRole.tenant_id == tenant_id,
    ).first()
    if not role:
        raise HTTPException(404, detail="Rol no encontrado en este tenant.")
    return role


def _get_employee_or_404(employee_id: int, tenant_id: int, db: Session) -> Users:
    employee = db.query(Users).filter(
        Users.id        == employee_id,
        Users.tenant_id == tenant_id,
    ).first()
    if not employee:
        raise HTTPException(404, detail="Empleado no encontrado en este tenant.")
    return employee