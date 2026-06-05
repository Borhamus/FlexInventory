"""
app/database_manager/router.py
─────────────────────────────
Módulo de gestión de base de datos para el tenant owner.
Endpoints:
  GET  /database/status          → estado de la conexión con Drive y config
  GET  /database/oauth/url       → genera URL de autorización Google
  GET  /database/oauth/callback  → recibe code, guarda refresh_token
  POST /database/backup/now      → backup manual → sube a Drive
  POST /database/restore         → restaura desde el archivo en Drive
  DELETE /database/reset         → borra todos los datos del tenant
  PATCH /database/config         → actualiza configuración de backups automáticos
  GET  /database/disconnect      → desconecta Drive (borra refresh_token)
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Annotated

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.Core.auth import get_current_user
from app.Core.models import Users, Tenant, UserRole
from app.db_config import get_db, get_tenant_db_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/database", tags=["Base de Datos"])

# ── Variables de entorno ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/database/oauth/callback")

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_API_URL    = "https://www.googleapis.com/drive/v3"
DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3"

SCOPES = "https://www.googleapis.com/auth/drive.file"

# ── Dependencias ────────────────────────────────────────────────────────────
db_dep   = Annotated[Session, Depends(get_db)]
user_dep = Annotated[dict,    Depends(get_current_user)]


def _require_tenant_owner(current_user: user_dep, db: db_dep) -> tuple[Users, Tenant]:
    """Solo el tenant owner puede acceder a este módulo."""
    if current_user["role"] != UserRole.tenant:
        raise HTTPException(status_code=403, detail="Solo el administrador puede acceder a este módulo.")
    user   = db.query(Users).filter(Users.id == current_user["id"]).first()
    tenant = db.query(Tenant).filter(Tenant.id == current_user["tenant_id"]).first()
    if not user or not tenant:
        raise HTTPException(status_code=404, detail="Usuario o tenant no encontrado.")
    return user, tenant


# ── Helpers de Google OAuth2 ────────────────────────────────────────────────
def _get_access_token(refresh_token: str) -> str:
    """Obtiene un access_token fresco usando el refresh_token guardado."""
    resp = requests.post(GOOGLE_TOKEN_URL, data={
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type":    "refresh_token",
    })
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo renovar el token de Google Drive. Reconectá tu cuenta.")
    return resp.json()["access_token"]


def _get_or_create_folder(access_token: str, name: str, parent_id: str | None = None) -> str:
    """Obtiene o crea una carpeta en Drive. Devuelve su ID."""
    headers = {"Authorization": f"Bearer {access_token}"}
    query   = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"

    resp = requests.get(f"{DRIVE_API_URL}/files", headers=headers, params={"q": query, "fields": "files(id,name)"})
    files = resp.json().get("files", [])
    if files:
        return files[0]["id"]

    # Crear carpeta
    metadata = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        metadata["parents"] = [parent_id]
    resp = requests.post(f"{DRIVE_API_URL}/files", headers={**headers, "Content-Type": "application/json"},
                         data=json.dumps(metadata))
    return resp.json()["id"]


def _upload_to_drive(access_token: str, filename: str, content: str, folder_id: str, file_id: str | None = None) -> str:
    """
    Sube o actualiza un archivo JSON en Drive.
    Si file_id existe → PATCH (actualiza). Si no → POST (crea).
    Devuelve el file_id del archivo en Drive.
    """
    headers  = {"Authorization": f"Bearer {access_token}"}
    metadata = {"name": filename}
    if not file_id:
        metadata["parents"] = [folder_id]

    # Multipart upload
    boundary = "flexinventory_boundary"
    body = (
        f"--{boundary}\r\n"
        f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
        f"--{boundary}\r\n"
        f"Content-Type: application/json\r\n\r\n"
        f"{content}\r\n"
        f"--{boundary}--"
    )
    headers["Content-Type"] = f"multipart/related; boundary={boundary}"

    if file_id:
        url  = f"{DRIVE_UPLOAD_URL}/files/{file_id}?uploadType=multipart"
        resp = requests.patch(url, headers=headers, data=body.encode())
    else:
        url  = f"{DRIVE_UPLOAD_URL}/files?uploadType=multipart"
        resp = requests.post(url, headers=headers, data=body.encode())

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Error subiendo a Drive: {resp.text}")
    return resp.json()["id"]


def _download_from_drive(access_token: str, file_id: str) -> dict:
    """Descarga el contenido JSON de un archivo en Drive."""
    headers = {"Authorization": f"Bearer {access_token}"}
    resp    = requests.get(f"{DRIVE_API_URL}/files/{file_id}?alt=media", headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo descargar el backup desde Drive.")
    return resp.json()


# ── Helper: exportar BD del tenant ─────────────────────────────────────────
def export_tenant_data(tenant: Tenant, db_public: Session) -> dict:
    """
    Exporta TODOS los datos del tenant a un dict serializable:
    - Schema public: users, custom_roles, role_permissions del tenant
    - Schema del tenant: inventarios, items, catálogos, catalogo_item
    """
    from app.tenant.models import Inventario, Item, Catalogo, catalogo_item

    # Datos del schema public
    users = db_public.query(Users).filter(Users.tenant_id == tenant.id).all()
    roles = db_public.query(__import__('app.Core.models', fromlist=['CustomRole']).CustomRole)\
                     .filter_by(tenant_id=tenant.id).all()

    from app.Core.models import CustomRole, RolePermission
    roles     = db_public.query(CustomRole).filter_by(tenant_id=tenant.id).all()
    role_ids  = [r.id for r in roles]
    role_perms = db_public.query(RolePermission).filter(RolePermission.role_id.in_(role_ids)).all() if role_ids else []

    public_data = {
        "users": [
            {
                "id": u.id, "username": u.username, "hashed_password": u.hashed_password,
                "email": u.email, "role": u.role, "custom_role_id": u.custom_role_id,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "custom_roles": [
            {"id": r.id, "name": r.name, "description": r.description}
            for r in roles
        ],
        "role_permissions": [
            {"role_id": p.role_id, "resource": p.resource, "action": p.action}
            for p in role_perms
        ],
    }

    # Datos del schema del tenant
    with get_tenant_db_context(tenant.schema_name) as tdb:
        inventarios = tdb.query(Inventario).all()
        items       = tdb.query(Item).all()
        catalogos   = tdb.query(Catalogo).all()

        # catalogo_item (tabla intermedia)
        ci_rows = tdb.execute(text("SELECT catalogo_id, item_id FROM catalogo_item")).fetchall()

        tenant_data = {
            "inventarios": [
                {
                    "id": i.id, "nombre": i.nombre,
                    "atributos": i.atributos,
                    "creado_en": i.creado_en.isoformat() if i.creado_en else None,
                }
                for i in inventarios
            ],
            "items": [
                {
                    "id": it.id, "nombre": it.nombre, "cantidad": it.cantidad,
                    "inventario_id": it.inventario_id, "atributos": it.atributos,
                    "creado_en": it.creado_en.isoformat() if it.creado_en else None,
                }
                for it in items
            ],
            "catalogos": [
                {"id": c.id, "nombre": c.nombre, "descripcion": c.descripcion}
                for c in catalogos
            ],
            "catalogo_item": [
                {"catalogo_id": row[0], "item_id": row[1]}
                for row in ci_rows
            ],
        }

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "tenant_name": tenant.name,
        "schema":      tenant.schema_name,
        "public":      public_data,
        "tenant":      tenant_data,
    }


# ── Helper: restaurar BD del tenant ────────────────────────────────────────
def restore_tenant_data(tenant: Tenant, data: dict, db_public: Session):
    """
    Restaura los datos exportados. BORRA TODO primero y reconstruye.
    ADVERTENCIA: operación destructiva e irreversible.
    """
    from app.Core.models import CustomRole, RolePermission

    public  = data.get("public", {})
    tdata   = data.get("tenant", {})

    # ── Schema public ──
    # Borrar en orden para respetar FK
    db_public.query(RolePermission).filter(
        RolePermission.role_id.in_(
            [r["id"] for r in public.get("custom_roles", [])]
        )
    ).delete(synchronize_session=False)
    db_public.query(Users).filter(Users.tenant_id == tenant.id).delete(synchronize_session=False)
    db_public.query(CustomRole).filter(CustomRole.tenant_id == tenant.id).delete(synchronize_session=False)
    db_public.flush()

    # Reinsertar roles
    for r in public.get("custom_roles", []):
        db_public.add(CustomRole(id=r["id"], tenant_id=tenant.id, name=r["name"], description=r.get("description")))
    db_public.flush()

    # Reinsertar permisos
    for p in public.get("role_permissions", []):
        db_public.add(RolePermission(role_id=p["role_id"], resource=p["resource"], action=p["action"]))
    db_public.flush()

    # Reinsertar usuarios
    for u in public.get("users", []):
        db_public.add(Users(
            id=u["id"], username=u["username"], hashed_password=u["hashed_password"],
            email=u.get("email"), role=u["role"], custom_role_id=u.get("custom_role_id"),
            tenant_id=tenant.id, is_active=u.get("is_active", True),
        ))
    db_public.commit()

    # ── Schema del tenant ──
    with get_tenant_db_context(tenant.schema_name) as tdb:
        tdb.execute(text("DELETE FROM catalogo_item"))
        tdb.execute(text("DELETE FROM item"))
        tdb.execute(text("DELETE FROM catalogo"))
        tdb.execute(text("DELETE FROM inventario"))
        tdb.flush()

        for inv in tdata.get("inventarios", []):
            tdb.execute(text(
                "INSERT INTO inventario (id, nombre, atributos, creado_en) VALUES (:id, :nombre, :atributos::jsonb, :creado_en)"
            ), {"id": inv["id"], "nombre": inv["nombre"],
                "atributos": json.dumps(inv.get("atributos", {})),
                "creado_en": inv.get("creado_en")})

        for it in tdata.get("items", []):
            tdb.execute(text(
                "INSERT INTO item (id, nombre, cantidad, inventario_id, atributos, creado_en) "
                "VALUES (:id, :nombre, :cantidad, :inventario_id, :atributos::jsonb, :creado_en)"
            ), {"id": it["id"], "nombre": it["nombre"], "cantidad": it["cantidad"],
                "inventario_id": it["inventario_id"],
                "atributos": json.dumps(it.get("atributos", {})),
                "creado_en": it.get("creado_en")})

        for cat in tdata.get("catalogos", []):
            tdb.execute(text(
                "INSERT INTO catalogo (id, nombre, descripcion) VALUES (:id, :nombre, :descripcion)"
            ), {"id": cat["id"], "nombre": cat["nombre"], "descripcion": cat.get("descripcion")})

        for ci in tdata.get("catalogo_item", []):
            tdb.execute(text(
                "INSERT INTO catalogo_item (catalogo_id, item_id) VALUES (:catalogo_id, :item_id)"
            ), ci)

        tdb.commit()


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/backup/list")
def list_backups(current_user: user_dep, db: db_dep):
    """
    Lista todos los backups disponibles en el Drive del tenant.
    Devuelve:
      - El archivo current.json (etiquetado como "Actual")
      - Todos los archivos de la carpeta backups/, ordenados de más nuevo a más antiguo
    """
    user, tenant = _require_tenant_owner(current_user, db)
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Drive no conectado.")

    access_token = _get_access_token(tenant.google_refresh_token)
    headers      = {"Authorization": f"Bearer {access_token}"}

    result = []

    # 1. Archivo actual (current.json)
    if tenant.google_drive_file_id:
        resp = requests.get(
            f"{DRIVE_API_URL}/files/{tenant.google_drive_file_id}",
            headers=headers,
            params={"fields": "id,name,modifiedTime,size"}
        )
        if resp.status_code == 200:
            f = resp.json()
            result.append({
                "file_id":       f["id"],
                "name":          "Actual (current.json)",
                "modified_time": f.get("modifiedTime"),
                "size":          f.get("size"),
                "is_current":    True,
            })

    # 2. Backups históricos de la carpeta backups/
    if tenant.google_drive_folder_id:
        resp = requests.get(
            f"{DRIVE_API_URL}/files",
            headers=headers,
            params={
                "q":       f"'{tenant.google_drive_folder_id}' in parents and trashed=false",
                "fields":  "files(id,name,modifiedTime,size)",
                "orderBy": "modifiedTime desc",   # más nuevo primero
            }
        )
        if resp.status_code == 200:
            for f in resp.json().get("files", []):
                result.append({
                    "file_id":       f["id"],
                    "name":          f["name"],
                    "modified_time": f.get("modifiedTime"),
                    "size":          f.get("size"),
                    "is_current":    False,
                })

    return {"backups": result}


@router.post("/restore/{file_id}")
def restore_from_drive_by_id(file_id: str, current_user: user_dep, db: db_dep):
    """
    Restaura la BD del tenant desde un archivo específico del Drive.
    Reemplaza el endpoint /restore anterior.
    ADVERTENCIA: operación destructiva, reemplaza todos los datos actuales.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Drive no conectado.")

    access_token = _get_access_token(tenant.google_refresh_token)
    data         = _download_from_drive(access_token, file_id)

    restore_tenant_data(tenant, data, db)
    return {"message": "Base de datos restaurada exitosamente desde Drive."}


@router.get("/status")
def get_status(current_user: user_dep, db: db_dep):
    """Estado de la conexión con Drive y configuración de backups."""
    user, tenant = _require_tenant_owner(current_user, db)
    return {
        "drive_connected":    bool(tenant.google_refresh_token),
        "backup_auto_enabled": tenant.backup_auto_enabled,
        "backup_daily_hour":  tenant.backup_daily_hour,
        "backup_monthly_day": tenant.backup_monthly_day,
        "drive_file_id":      tenant.google_drive_file_id,
        "drive_folder_id":    tenant.google_drive_folder_id,
    }


@router.get("/oauth/url")
def get_oauth_url(current_user: user_dep, db: db_dep):
    """Genera la URL de autorización de Google para conectar Drive."""
    _require_tenant_owner(current_user, db)
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID no configurado en el servidor.")

    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         SCOPES,
        "access_type":   "offline",
        "prompt":        "consent",          # fuerza siempre devolver refresh_token
        "state":         str(current_user["tenant_id"]),
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": f"{GOOGLE_AUTH_URL}?{query}"}


@router.get("/oauth/callback")
def oauth_callback(code: str, state: str, db: db_dep):
    """
    Callback de Google OAuth2. Recibe el code, lo canjea por tokens
    y guarda el refresh_token en la DB del tenant.
    Redirige al frontend al finalizar.
    """
    # Canjear code por tokens
    resp = requests.post(GOOGLE_TOKEN_URL, data={
        "code":          code,
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "grant_type":    "authorization_code",
    })
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Error obteniendo tokens de Google: {resp.text}")

    tokens        = resp.json()
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=502, detail="Google no devolvió refresh_token. Revocá el acceso en tu cuenta de Google y reintentá.")

    # Guardar en la DB
    tenant_id = int(state)
    tenant    = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")

    tenant.google_refresh_token = refresh_token
    db.commit()

    # Redirigir al frontend
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/dashboard/database?connected=true")


@router.post("/backup/now")
def backup_now(current_user: user_dep, db: db_dep):
    """
    Backup manual: exporta toda la BD del tenant y la sube a Drive.
    Crea/actualiza dos archivos:
      - FlexInventory Storage/current.json  (siempre el más reciente)
      - FlexInventory Storage/backups/backup_YYYY-MM-DD_HH-MM.json
    """
    user, tenant = _require_tenant_owner(current_user, db)
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Drive no conectado. Conectá tu cuenta de Google primero.")

    access_token = _get_access_token(tenant.google_refresh_token)

    # Crear estructura de carpetas si no existe
    root_folder_id    = _get_or_create_folder(access_token, "FlexInventory Storage")
    backups_folder_id = _get_or_create_folder(access_token, "backups", root_folder_id)

    # Exportar datos
    data    = export_tenant_data(tenant, db)
    content = json.dumps(data, ensure_ascii=False, indent=2)

    # Subir/actualizar current.json
    current_file_id = _upload_to_drive(
        access_token, "current.json", content,
        root_folder_id, tenant.google_drive_file_id
    )

    # Subir backup con timestamp
    ts          = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M")
    backup_name = f"backup_{ts}.json"
    _upload_to_drive(access_token, backup_name, content, backups_folder_id)

    # Guardar IDs en la DB
    tenant.google_drive_file_id   = current_file_id
    tenant.google_drive_folder_id = backups_folder_id
    db.commit()

    return {"message": f"Backup completado correctamente.", "filename": backup_name}



@router.delete("/reset")
def reset_database(current_user: user_dep, db: db_dep):
    """
    Elimina TODOS los datos del tenant (inventarios, items, catálogos, usuarios empleados, roles).
    El tenant owner y el tenant mismo NO se eliminan.
    ADVERTENCIA: irreversible.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    from app.Core.models import CustomRole, RolePermission

    # Borrar schema del tenant
    with get_tenant_db_context(tenant.schema_name) as tdb:
        tdb.execute(text("DELETE FROM catalogo_item"))
        tdb.execute(text("DELETE FROM item"))
        tdb.execute(text("DELETE FROM catalogo"))
        tdb.execute(text("DELETE FROM inventario"))
        tdb.commit()

    # Borrar empleados y roles en schema public (NO borrar el tenant owner)
    employees = db.query(Users).filter(
        Users.tenant_id == tenant.id,
        Users.role      != UserRole.tenant
    ).all()
    for emp in employees:
        db.delete(emp)

    roles = db.query(CustomRole).filter(CustomRole.tenant_id == tenant.id).all()
    for role in roles:
        db.delete(role)

    db.commit()
    return {"message": "Base de datos eliminada. Solo queda el administrador."}


class BackupConfig(BaseModel):
    backup_auto_enabled: bool
    backup_daily_hour:   int   # cada cuántas horas (ej: 24 = una vez al día)
    backup_monthly_day:  int   # día del mes para el backup mensual (1-28)


@router.patch("/config")
def update_backup_config(body: BackupConfig, current_user: user_dep, db: db_dep):
    """Actualiza la configuración de backups automáticos del tenant."""
    user, tenant = _require_tenant_owner(current_user, db)

    if not (1 <= body.backup_daily_hour <= 168):
        raise HTTPException(status_code=422, detail="backup_daily_hour debe estar entre 1 y 168 horas.")
    if not (1 <= body.backup_monthly_day <= 28):
        raise HTTPException(status_code=422, detail="backup_monthly_day debe estar entre 1 y 28.")
    if body.backup_auto_enabled and not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Conectá tu Drive antes de activar los backups automáticos.")

    tenant.backup_auto_enabled = body.backup_auto_enabled
    tenant.backup_daily_hour   = body.backup_daily_hour
    tenant.backup_monthly_day  = body.backup_monthly_day
    db.commit()

    # Recargar el scheduler con la nueva config
    from app.database_manager.scheduler import reload_tenant_jobs
    reload_tenant_jobs(tenant)

    return {"message": "Configuración de backups actualizada."}


@router.get("/disconnect")
def disconnect_drive(current_user: user_dep, db: db_dep):
    """Desconecta Google Drive del tenant (borra el refresh_token)."""
    user, tenant = _require_tenant_owner(current_user, db)
    tenant.google_refresh_token  = None
    tenant.google_drive_file_id  = None
    tenant.google_drive_folder_id = None
    tenant.backup_auto_enabled   = False
    db.commit()
    return {"message": "Google Drive desconectado."}
