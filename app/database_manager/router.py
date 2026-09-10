"""
app/database_manager/router.py
─────────────────────────────
Módulo de gestión de base de datos para el tenant owner.
Endpoints:
  GET  /database/status          → estado de la conexión con Drive y config
  GET  /database/oauth/url       → genera URL de autorización Google
  GET  /database/oauth/callback  → recibe code, guarda refresh_token
  POST /database/backup/now      → backup manual → sube a Drive
  POST /database/backup/list     → lista backups disponibles en Drive
  POST /database/restore/{id}    → restaura desde un backup específico
  DELETE /database/reset         → borra todos los datos del tenant
  PATCH /database/config         → actualiza configuración de backups automáticos
  POST /database/disconnect      → desconecta Drive (revoca y borra refresh_token)
"""
#from __future__ import annotations
import os
import re
import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Annotated, Dict, Optional, Set

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.Core.auth import get_current_user
from app.Core.models import Users, Tenant, UserRole
from app.db_config import get_db, get_tenant_db_context
from app.tenant.imagenes import UPLOADS_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/database", tags=["Base de Datos"])

# ── Variables de entorno ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/database/oauth/callback")

GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
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


def _revocar_token_google(refresh_token: str) -> None:
    """
    Revoca el permiso (grant) en Google — best-effort. Un fallo acá NO debe
    impedir la desconexión local: si Google no responde o el token ya no era
    válido, igual olvidamos el token de nuestro lado. Reconectar después
    funciona porque el flujo de OAuth usa prompt=consent y pide un token
    nuevo desde cero (ver get_oauth_url), independiente del revocado.
    """
    try:
        resp = requests.post(
            GOOGLE_REVOKE_URL,
            params={"token": refresh_token},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        if resp.status_code != 200:
            # 400 = el token ya no era válido (revocado/expirado): igual quedó
            # sin efecto, que es lo que buscábamos. Solo lo dejamos anotado.
            logger.warning(f"[Drive] revoke devolvió {resp.status_code}: {resp.text}")
    except requests.RequestException as e:
        logger.warning(f"[Drive] no se pudo contactar el endpoint de revoke de Google: {e}")


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


def _resolver_carpeta(access_token: str, id_cacheado: str | None, name: str, parent_id: str | None = None) -> str:
    """
    Resuelve una carpeta de Drive por su ID cacheado, cayendo a la búsqueda
    por nombre solo si el ID ya no sirve. Devuelve el ID resuelto (que el
    llamador debería persistir).

    Un renombre o un cambio de ubicación en Drive NO cambian el ID de una
    carpeta, así que verificar el ID cacheado sobrevive al caso que rompía
    antes (_get_or_create_folder la buscaba por nombre y, al no encontrarla
    renombrada, creaba una nueva y vacía). El fallback por nombre cubre el
    ID inválido: carpeta borrada/en la papelera, tenant sin ID todavía, o un
    ID heredado de otra cuenta de Drive (el scope drive.file hace que la
    verificación falle porque la app no ve archivos que no creó ahí).
    """
    if id_cacheado:
        resp = requests.get(
            f"{DRIVE_API_URL}/files/{id_cacheado}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"fields": "id,trashed,mimeType"},
        )
        if resp.status_code == 200:
            info = resp.json()
            # Además de existir y no estar en la papelera, tiene que ser REALMENTE
            # una carpeta: el id cacheado puede apuntar a un archivo de otro
            # esquema (google_drive_images_file_id guardaba el id del viejo
            # images.zip antes de que fuera una carpeta) — usarlo como parent
            # devuelve 403 parentNotAFolder. Si no es carpeta, buscar/crear por nombre.
            if not info.get("trashed", False) and info.get("mimeType") == "application/vnd.google-apps.folder":
                return id_cacheado

    return _get_or_create_folder(access_token, name, parent_id)


def _resolver_archivo(access_token: str, id_cacheado: str | None, name: str, folder_id: str) -> str | None:
    """
    Resuelve el id de un archivo ÚNICO (hoy: current.json) por su id
    cacheado, cayendo a la búsqueda por nombre dentro de `folder_id`. Devuelve
    None si el archivo no existe todavía, para que el llamador lo cree (POST).

    current.json está pensado como archivo único que se
    SOBRESCRIBE en el lugar (PATCH), no como histórico. _upload_to_drive hace
    PATCH solo si recibe un file_id; si venía en NULL hacía POST y creaba un
    duplicado cada vez que el id se perdía (primer backup, o un disconnect que
    nulifica los ids seguido de una reconexión). Buscar por nombre antes de
    crear garantiza que se reutilice el que ya está, en la cuenta que sea.
    """
    if id_cacheado:
        resp = requests.get(
            f"{DRIVE_API_URL}/files/{id_cacheado}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"fields": "id,trashed"},
        )
        if resp.status_code == 200 and not resp.json().get("trashed", False):
            return id_cacheado

    resp = requests.get(
        f"{DRIVE_API_URL}/files",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "q":      f"name='{name}' and '{folder_id}' in parents and trashed=false",
            "fields": "files(id)",
        },
    )
    if resp.status_code == 200:
        archivos = resp.json().get("files", [])
        if archivos:
            return archivos[0]["id"]
    return None


def _sanitizar_etiqueta(texto: str | None) -> str | None:
    """
    Sanitiza la etiqueta opcional de un backup manual antes de usarla como
    parte del nombre de archivo. Lista blanca —no lista negra—: se queda solo
    con letras, dígitos, espacios, guiones y guiones bajos, y descarta todo lo
    demás (comillas, barras, saltos de línea, unicode). Los espacios pasan a
    guiones bajos y se trunca a 40 caracteres. Si no queda nada útil, devuelve
    None y el backup usa el nombre por defecto.

    La etiqueta NUNCA llega a una query 'q=' de Drive (solo se usa como nombre
    en el metadata de la subida, que viaja como JSON): la sanitización es
    defensa en profundidad, no la única barrera.
    """
    if not texto:
        return None
    limpio = re.sub(r"[^A-Za-z0-9 _-]", "", texto)
    limpio = re.sub(r"\s+", "_", limpio.strip())
    limpio = limpio[:40]
    return limpio or None


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


# ── Helpers binarios (fotos de items) ───────────────────────────────────────
# _upload_to_drive de arriba arma el multipart como STRING y lo encodea al
# final — funciona para JSON (texto), pero no sirve para bytes de un .zip
# (no son texto UTF-8 válido). Estas dos funciones son el equivalente en
# bytes desde el principio, para el mismo protocolo de Drive.

def _upload_bytes_to_drive(access_token: str, filename: str, content: bytes, mime_type: str, folder_id: str, file_id: Optional[str] = None) -> str:
    """Igual que _upload_to_drive, pero para contenido binario (ej. un .zip)."""
    headers  = {"Authorization": f"Bearer {access_token}"}
    metadata = {"name": filename}
    if not file_id:
        metadata["parents"] = [folder_id]

    boundary = b"flexinventory_boundary"
    body = (
        b"--" + boundary + b"\r\n"
        b"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        + json.dumps(metadata).encode("utf-8") + b"\r\n"
        b"--" + boundary + b"\r\n"
        b"Content-Type: " + mime_type.encode("ascii") + b"\r\n\r\n"
        + content + b"\r\n"
        b"--" + boundary + b"--"
    )
    headers["Content-Type"] = f"multipart/related; boundary={boundary.decode()}"

    if file_id:
        url  = f"{DRIVE_UPLOAD_URL}/files/{file_id}?uploadType=multipart"
        resp = requests.patch(url, headers=headers, data=body)
    else:
        url  = f"{DRIVE_UPLOAD_URL}/files?uploadType=multipart"
        resp = requests.post(url, headers=headers, data=body)

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Error subiendo a Drive: {resp.text}")
    return resp.json()["id"]


def _download_bytes_from_drive(access_token: str, file_id: str) -> bytes:
    """Igual que _download_from_drive, pero devuelve los bytes crudos (para un .zip)."""
    headers = {"Authorization": f"Bearer {access_token}"}
    resp    = requests.get(f"{DRIVE_API_URL}/files/{file_id}?alt=media", headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo descargar las fotos desde Drive.")
    return resp.content


# ── Helpers: fotos del tenant (almacén append-only en Drive) ────────────────
# En vez de un images.zip monolítico que se pisa en cada backup (lo que hacía
# que restaurar un backup viejo trajera fotos ROTAS, issue #30), las fotos
# viven en una carpeta `images/` en Drive con UN ARCHIVO POR UUID. Como los
# nombres de archivo son uuid inmutables (app/tenant/imagenes.py), cada archivo
# es contenido único que nunca cambia: el backup sube solo los que faltan y el
# restore baja solo los que referencia el JSON. El almacén es la unión de todas
# las fotos que existieron — cualquier backup encuentra siempre sus uuid.

_MIME_POR_EXTENSION = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


def _mime_de(nombre: str) -> str:
    return _MIME_POR_EXTENSION.get(Path(nombre).suffix.lower(), "application/octet-stream")


def _carpeta_items(tenant_schema: str) -> Path:
    return UPLOADS_DIR / tenant_schema / "items"


def _uuid_de_imagen(ruta: Optional[str]) -> Optional[str]:
    """Nombre de archivo (uuid.ext) a partir de la URL guardada en Item.imagen."""
    if not ruta:
        return None
    return PurePosixPath(ruta).name


def _resolver_carpeta_imagenes(access_token: str, tenant: Tenant, root_folder_id: str) -> str:
    """
    Resuelve/crea la carpeta `images/` bajo la raíz. Reutiliza
    google_drive_images_file_id como id cacheado — antes guardaba el id del
    images.zip; ahora guarda el id de esta carpeta (mismo campo, sin migración
    de schema). El llamador persiste el id devuelto.
    """
    return _resolver_carpeta(access_token, tenant.google_drive_images_file_id, "images", root_folder_id)


def _listar_imagenes_drive(access_token: str, folder_id: str) -> Dict[str, str]:
    """Devuelve {nombre_archivo: file_id} de la carpeta images/, paginando."""
    headers = {"Authorization": f"Bearer {access_token}"}
    resultado: Dict[str, str] = {}
    page_token: Optional[str] = None
    while True:
        params = {
            "q":        f"'{folder_id}' in parents and trashed=false",
            "fields":   "nextPageToken, files(id,name)",
            "pageSize": 1000,
        }
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(f"{DRIVE_API_URL}/files", headers=headers, params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="No se pudo listar las fotos en Drive.")
        body = resp.json()
        for f in body.get("files", []):
            resultado[f["name"]] = f["id"]
        page_token = body.get("nextPageToken")
        if not page_token:
            break
    return resultado


def _sync_imagenes_a_drive(access_token: str, tenant_schema: str, folder_id: str) -> None:
    """
    Sube a images/ solo los uuid que todavía no están (append-only). Nunca
    resube los iguales ni borra nada — el almacén acumula. Más barato que el
    zip anterior, que se re-subía entero en cada backup.
    """
    carpeta = _carpeta_items(tenant_schema)
    if not carpeta.is_dir():
        return
    existentes = _listar_imagenes_drive(access_token, folder_id)
    for archivo in carpeta.iterdir():
        if not archivo.is_file() or archivo.name in existentes:
            continue
        _upload_bytes_to_drive(
            access_token, archivo.name, archivo.read_bytes(),
            _mime_de(archivo.name), folder_id, None,
        )


def _restaurar_imagenes_desde_drive(
    access_token: str, tenant_schema: str, folder_id: str, nombres_referenciados: Set[str]
) -> Set[str]:
    """
    Reconstruye uploads/{tenant_schema}/items/ con las fotos que referencia el
    backup: borra la carpeta y baja solo los uuid pedidos que existen en el
    almacén. Devuelve el conjunto de los que NO se encontraron, para que el
    llamador nulifique esos Item.imagen (red de seguridad: el restore no miente).
    """
    carpeta = _carpeta_items(tenant_schema)
    if carpeta.exists():
        shutil.rmtree(carpeta)
    carpeta.mkdir(parents=True, exist_ok=True)

    disponibles = _listar_imagenes_drive(access_token, folder_id)
    base = carpeta.resolve()
    faltantes: Set[str] = set()
    for nombre in nombres_referenciados:
        file_id = disponibles.get(nombre)
        if not file_id:
            faltantes.add(nombre)
            continue
        # Defensa en profundidad contra path traversal: el nombre sale de un
        # Item.imagen restaurado desde Drive, no confiar ciegamente.
        destino = (carpeta / nombre).resolve()
        if destino.parent != base:
            raise HTTPException(status_code=400, detail=f"Nombre de foto inválido en el backup: {nombre}")
        destino.write_bytes(_download_bytes_from_drive(access_token, file_id))
    return faltantes


# ── Helper: exportar BD del tenant ─────────────────────────────────────────
def export_tenant_data(tenant: Tenant, db_public: Session) -> dict:
    """
    Exporta TODOS los datos del tenant a un dict serializable:
    - Schema public: users, custom_roles, role_permissions del tenant
    - Schema del tenant: inventarios, items, catálogos, catalogo_item
    """
    from app.tenant.models import Inventario, Item, Catalogo
    from app.Core.models import CustomRole, RolePermission

    # Datos del schema public
    users      = db_public.query(Users).filter(Users.tenant_id == tenant.id).all()
    roles      = db_public.query(CustomRole).filter_by(tenant_id=tenant.id).all()
    role_ids   = [r.id for r in roles]
    role_perms = db_public.query(RolePermission).filter(
        RolePermission.role_id.in_(role_ids)
    ).all() if role_ids else []

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
        ci_rows     = tdb.execute(text("SELECT catalogo_id, item_id FROM catalogo_item")).fetchall()

        tenant_data = {
            "inventarios": [
                {
                    "id": i.id, "nombre": i.nombre,
                    "atributos": i.atributos,
                    "roles_atributos": i.roles_atributos,
                    "bloques_personalizados": i.bloques_personalizados,
                    "fotos_habilitadas": i.fotos_habilitadas,
                    "creado_en": i.creado_en.isoformat() if i.creado_en else None,
                }
                for i in inventarios
            ],
            "items": [
                {
                    "id": it.id, "nombre": it.nombre, "cantidad": it.cantidad,
                    "inventario_id": it.inventario_id, "atributos": it.atributos,
                    "imagen": it.imagen,
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

    FIX: usa CAST(:param AS JSONB) en lugar de :param::jsonb para evitar
    que SQLAlchemy confunda el :: con su sintaxis de parámetros nombrados.
    """
    from app.Core.models import CustomRole, RolePermission

    public = data.get("public", {})
    tdata  = data.get("tenant", {})

    # ── Schema public ──────────────────────────────────────────────────────

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
        db_public.add(CustomRole(
            id=r["id"], tenant_id=tenant.id,
            name=r["name"], description=r.get("description")
        ))
    db_public.flush()

    # Reinsertar permisos
    for p in public.get("role_permissions", []):
        db_public.add(RolePermission(
            role_id=p["role_id"], resource=p["resource"], action=p["action"]
        ))
    db_public.flush()

    # Reinsertar usuarios
    for u in public.get("users", []):
        db_public.add(Users(
            id=u["id"], username=u["username"], hashed_password=u["hashed_password"],
            email=u.get("email"), role=u["role"], custom_role_id=u.get("custom_role_id"),
            tenant_id=tenant.id, is_active=u.get("is_active", True),
        ))
    db_public.commit()

    # ── Schema del tenant ──────────────────────────────────────────────────
    with get_tenant_db_context(tenant.schema_name) as tdb:

        # Borrar en orden para respetar FK
        tdb.execute(text("DELETE FROM catalogo_item"))
        tdb.execute(text("DELETE FROM item"))
        tdb.execute(text("DELETE FROM catalogo"))
        tdb.execute(text("DELETE FROM inventario"))
        tdb.flush()

        # Reinsertar inventarios
        # CAST(:atributos AS JSONB) evita el conflicto de :: con SQLAlchemy
        # .get(..., default) en los campos agregados después del primer
        # backup (roles_atributos, bloques_personalizados,
        # fotos_habilitadas) — restaurar un backup viejo, hecho antes de que
        # existieran, no debe romperse ni dejar esos campos en NULL.
        # fotos_habilitadas default True: mismo criterio que la migración
        # de la columna, no esconder de golpe fotos que ya hubiera.
        for inv in tdata.get("inventarios", []):
            tdb.execute(
                text(
                    "INSERT INTO inventario "
                    "(id, nombre, atributos, roles_atributos, bloques_personalizados, fotos_habilitadas, creado_en) "
                    "VALUES (:id, :nombre, CAST(:atributos AS JSONB), CAST(:roles_atributos AS JSONB), "
                    "CAST(:bloques_personalizados AS JSONB), :fotos_habilitadas, :creado_en)"
                ),
                {
                    "id":        inv["id"],
                    "nombre":    inv["nombre"],
                    "atributos": json.dumps(inv.get("atributos") or {}),
                    "roles_atributos": json.dumps(inv.get("roles_atributos") or {}),
                    "bloques_personalizados": json.dumps(inv.get("bloques_personalizados") or []),
                    "fotos_habilitadas": inv.get("fotos_habilitadas", True),
                    "creado_en": inv.get("creado_en"),
                }
            )

        # Reinsertar items
        for it in tdata.get("items", []):
            tdb.execute(
                text(
                    "INSERT INTO item (id, nombre, cantidad, inventario_id, atributos, imagen, creado_en) "
                    "VALUES (:id, :nombre, :cantidad, :inventario_id, CAST(:atributos AS JSONB), :imagen, :creado_en)"
                ),
                {
                    "id":            it["id"],
                    "nombre":        it["nombre"],
                    "cantidad":      it["cantidad"],
                    "inventario_id": it["inventario_id"],
                    "atributos":     json.dumps(it.get("atributos") or {}),
                    "imagen":        it.get("imagen"),
                    "creado_en":     it.get("creado_en"),
                }
            )

        # Reinsertar catálogos
        for cat in tdata.get("catalogos", []):
            tdb.execute(
                text(
                    "INSERT INTO catalogo (id, nombre, descripcion) "
                    "VALUES (:id, :nombre, :descripcion)"
                ),
                {
                    "id":          cat["id"],
                    "nombre":      cat["nombre"],
                    "descripcion": cat.get("descripcion"),
                }
            )

        # Reinsertar relaciones catálogo-item
        for ci in tdata.get("catalogo_item", []):
            tdb.execute(
                text(
                    "INSERT INTO catalogo_item (catalogo_id, item_id) "
                    "VALUES (:catalogo_id, :item_id)"
                ),
                ci
            )

        tdb.commit()


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/status")
def get_status(current_user: user_dep, db: db_dep):
    """Estado de la conexión con Drive y configuración de backups."""
    user, tenant = _require_tenant_owner(current_user, db)
    return {
        "drive_connected":     bool(tenant.google_refresh_token),
        "backup_auto_enabled": tenant.backup_auto_enabled,
        "backup_daily_hour":   tenant.backup_daily_hour,
        "backup_monthly_day":  tenant.backup_monthly_day,
        "drive_file_id":       tenant.google_drive_file_id,
        "drive_folder_id":     tenant.google_drive_folder_id,
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
        "prompt":        "consent",
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
        raise HTTPException(
            status_code=502,
            detail="Google no devolvió refresh_token. Revocá el acceso en tu cuenta de Google y reintentá."
        )

    tenant_id = int(state)
    tenant    = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")

    tenant.google_refresh_token = refresh_token
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/dashboard/database?connected=true")


def ejecutar_backup(tenant: Tenant, db: Session, etiqueta: str | None = None) -> dict:
    """
    El backup en sí — datos + fotos — compartido entre el endpoint manual
    (POST /backup/now) y el job automático del scheduler, para no tener la
    misma lógica escrita dos veces (antes lo estaba).

    Sube a Drive:
      - FlexInventory Storage/current.json              (siempre el más reciente)
      - FlexInventory Storage/backups/backup_FECHA.json (histórico, uno por corrida)
      - FlexInventory Storage/images/<uuid>             (fotos de items — almacén
        append-only, un archivo por uuid: se suben SOLO los uuid nuevos, nunca
        se resuben los iguales ni se borra nada. Así cualquier backup viejo
        encuentra siempre sus fotos, issue #30.)

    `etiqueta` es opcional y solo la usa el backup manual: se sanitiza y se
    agrega al nombre del histórico como backup_{ts}_{etiqueta}.json, con el
    timestamp siempre adelante (unicidad + orden alfabético = cronológico).
    El scheduler la llama sin este argumento y cae al nombre por defecto.
    """
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Drive no conectado. Conectá tu cuenta de Google primero.")

    access_token      = _get_access_token(tenant.google_refresh_token)
    # Resolver por ID cacheado (con fallback por nombre): renombrar o mover las
    # carpetas en Drive deja de romper la detección. La raíz se resuelve
    # primero porque `backups` cuelga de ella (parent_id).
    root_folder_id    = _resolver_carpeta(access_token, tenant.google_drive_root_folder_id, "FlexInventory Storage")
    backups_folder_id = _resolver_carpeta(access_token, tenant.google_drive_folder_id, "backups", root_folder_id)

    data    = export_tenant_data(tenant, db)
    content = json.dumps(data, ensure_ascii=False, indent=2)

    # Actualizar current.json: resolver su id por nombre antes de subir, para
    # no crear un duplicado si el id cacheado se perdió (ver _resolver_archivo).
    current_id      = _resolver_archivo(access_token, tenant.google_drive_file_id, "current.json", root_folder_id)
    current_file_id = _upload_to_drive(
        access_token, "current.json", content,
        root_folder_id, current_id
    )

    # Crear backup con timestamp (+ etiqueta opcional en el backup manual)
    ts          = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M")
    etiqueta    = _sanitizar_etiqueta(etiqueta)
    backup_name = f"backup_{ts}_{etiqueta}.json" if etiqueta else f"backup_{ts}.json"
    _upload_to_drive(access_token, backup_name, content, backups_folder_id)

    tenant.google_drive_root_folder_id = root_folder_id
    tenant.google_drive_file_id        = current_file_id
    tenant.google_drive_folder_id      = backups_folder_id

    # Fotos de items — almacén append-only: subir solo los uuid nuevos a la
    # carpeta images/ (ver _sync_imagenes_a_drive). El id de la carpeta se
    # cachea en google_drive_images_file_id (antes: id del zip).
    images_folder_id = _resolver_carpeta_imagenes(access_token, tenant, root_folder_id)
    _sync_imagenes_a_drive(access_token, tenant.schema_name, images_folder_id)
    tenant.google_drive_images_file_id = images_folder_id

    db.commit()

    return {"message": "Backup completado correctamente.", "filename": backup_name}


class BackupRequest(BaseModel):
    # Etiqueta opcional para el nombre del backup manual. Se sanitiza en
    # ejecutar_backup (_sanitizar_etiqueta); si viene vacía o queda vacía tras
    # sanitizar, el backup usa el nombre por defecto.
    etiqueta: Optional[str] = None


@router.post("/backup/now")
def backup_now(current_user: user_dep, db: db_dep, body: Optional[BackupRequest] = None):
    """
    Backup manual: exporta toda la BD del tenant (y sus fotos) y las sube a
    Drive. Ver ejecutar_backup() para el detalle de qué archivos crea.

    El cuerpo es OPCIONAL: llamarlo sin cuerpo sigue siendo válido (así lo
    hacía el frontend antes de esta feature y no debe romperse). Con cuerpo,
    acepta una `etiqueta` opcional para el nombre del histórico.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    return ejecutar_backup(tenant, db, etiqueta=body.etiqueta if body else None)


@router.get("/backup/list")
def list_backups(current_user: user_dep, db: db_dep):
    """
    Lista todos los backups disponibles en el Drive del tenant.
    Devuelve:
      - El archivo current.json (etiquetado como "Actual"), primero
      - Todos los archivos de backups/, ordenados de más nuevo a más antiguo

    No depende de tenant.google_drive_file_id / google_drive_folder_id —
    esos campos solo se escriben DESPUÉS del primer backup (en
    ejecutar_backup), así que un tenant que nunca hizo un backup manual (o
    que reconectó Drive desde cero — disconnect_drive los vuelve a NULL)
    se quedaba con la lista siempre vacía y el botón de restaurar
    deshabilitado en el frontend, aunque ya tuviera backups viejos
    guardados en Drive de antes. Se resuelve la carpeta buscándola por
    NOMBRE en Drive (mismo mecanismo que _get_or_create_folder ya usa para
    crear backups), no por un ID cacheado que puede no existir todavía.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Drive no conectado.")

    access_token = _get_access_token(tenant.google_refresh_token)
    headers      = {"Authorization": f"Bearer {access_token}"}
    result       = []

    root_folder_id    = _resolver_carpeta(access_token, tenant.google_drive_root_folder_id, "FlexInventory Storage")
    backups_folder_id = _resolver_carpeta(access_token, tenant.google_drive_folder_id, "backups", root_folder_id)

    # 1. Archivo actual (current.json), buscado por nombre adentro de la
    # carpeta raíz — no por el file_id guardado en el tenant.
    resp = requests.get(
        f"{DRIVE_API_URL}/files",
        headers=headers,
        params={
            "q":      f"name='current.json' and '{root_folder_id}' in parents and trashed=false",
            "fields": "files(id,name,modifiedTime,size)",
        }
    )
    if resp.status_code == 200:
        files = resp.json().get("files", [])
        if files:
            f = files[0]
            result.append({
                "file_id":       f["id"],
                "name":          "Actual (current.json)",
                "modified_time": f.get("modifiedTime"),
                "size":          f.get("size"),
                "is_current":    True,
            })

    # 2. Backups históricos, dentro de la subcarpeta "backups"
    resp = requests.get(
        f"{DRIVE_API_URL}/files",
        headers=headers,
        params={
            "q":       f"'{backups_folder_id}' in parents and trashed=false",
            "fields":  "files(id,name,modifiedTime,size)",
            "orderBy": "modifiedTime desc",
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

    # Ya que estamos acá adentro con el Drive resuelto, aprovechamos para
    # sincronizar los IDs cacheados del tenant — así backup/restore que sí
    # los usan (ejecutar_backup, restore_from_drive_by_id) quedan al día
    # sin esperar al próximo backup manual. La raíz y la carpeta de backups se
    # cachean siempre (ya las resolvimos); el file_id de current.json solo si
    # apareció en la lista.
    tenant.google_drive_root_folder_id = root_folder_id
    tenant.google_drive_folder_id      = backups_folder_id
    if result and result[0]["is_current"]:
        tenant.google_drive_file_id = result[0]["file_id"]
    db.commit()

    return {"backups": result}


@router.post("/restore/{file_id}")
def restore_from_drive_by_id(file_id: str, current_user: user_dep, db: db_dep):
    """
    Restaura la BD del tenant (y sus fotos, si hay) desde un archivo
    específico del Drive. ADVERTENCIA: operación destructiva, reemplaza
    todos los datos actuales — y también el disco de fotos, si corresponde.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    if not tenant.google_refresh_token:
        raise HTTPException(status_code=400, detail="Drive no conectado.")

    access_token = _get_access_token(tenant.google_refresh_token)
    data         = _download_from_drive(access_token, file_id)

    # Fotos: se reconstruyen desde el almacén append-only images/ (issue #30),
    # ANTES de restaurar el JSON, para poder nulificar en el propio `data` los
    # Item.imagen cuyo uuid no esté en el almacén — así el restore no deja
    # imágenes rotas ni miente sobre lo que trajo.
    root_folder_id   = _resolver_carpeta(access_token, tenant.google_drive_root_folder_id, "FlexInventory Storage")
    images_folder_id = _resolver_carpeta_imagenes(access_token, tenant, root_folder_id)

    items          = data.get("tenant", {}).get("items", [])
    referenciados  = {n for it in items if (n := _uuid_de_imagen(it.get("imagen")))}
    faltantes      = _restaurar_imagenes_desde_drive(access_token, tenant.schema_name, images_folder_id, referenciados)
    if faltantes:
        for it in items:
            if _uuid_de_imagen(it.get("imagen")) in faltantes:
                it["imagen"] = None

    restore_tenant_data(tenant, data, db)

    # Cachear lo resuelto para las próximas operaciones.
    tenant.google_drive_root_folder_id  = root_folder_id
    tenant.google_drive_images_file_id  = images_folder_id
    db.commit()

    restauradas = len(referenciados) - len(faltantes)
    mensaje = "Base de datos restaurada exitosamente desde Drive."
    if restauradas:
        mensaje += f" Se restauraron {restauradas} foto(s) de artículos."
    if faltantes:
        mensaje += f" {len(faltantes)} foto(s) no se pudieron restaurar (no están en el almacén de Drive)."
    return {"message": mensaje, "fotos_restauradas": restauradas, "fotos_faltantes": len(faltantes)}


@router.delete("/reset")
def reset_database(current_user: user_dep, db: db_dep):
    """
    Elimina TODOS los datos del tenant (inventarios, items, catálogos, empleados, roles).
    El tenant owner y el tenant mismo NO se eliminan.
    ADVERTENCIA: irreversible.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    from app.Core.models import CustomRole, RolePermission

    with get_tenant_db_context(tenant.schema_name) as tdb:
        tdb.execute(text("DELETE FROM catalogo_item"))
        tdb.execute(text("DELETE FROM item"))
        tdb.execute(text("DELETE FROM catalogo"))
        tdb.execute(text("DELETE FROM inventario"))
        tdb.commit()

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
    backup_daily_hour:   int
    backup_monthly_day:  int


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

    from app.database_manager.scheduler import reload_tenant_jobs
    reload_tenant_jobs(tenant)

    return {"message": "Configuración de backups actualizada."}


@router.post("/disconnect")
def disconnect_drive(current_user: user_dep, db: db_dep):
    """
    Desconecta Google Drive del tenant: revoca el permiso en Google, borra el
    refresh_token y todos los IDs cacheados, y desprograma los backups
    automáticos.
    """
    user, tenant = _require_tenant_owner(current_user, db)
    # Revocar el grant en Google ANTES de olvidar el token (lo necesitamos para
    # revocarlo). Best-effort: si falla, igual desconectamos localmente.
    if tenant.google_refresh_token:
        _revocar_token_google(tenant.google_refresh_token)
    tenant.google_refresh_token        = None
    # Nulificar TODOS los IDs cacheados de Drive: si el usuario reconecta con
    # otra cuenta de Google, un id de la cuenta anterior haría que el próximo
    # backup intente un PATCH sobre un file_id ajeno y devuelva 502 (pasaba con
    # google_drive_images_file_id, que antes no se limpiaba — issue #30). Con
    # todo en NULL, la reconexión resuelve o crea todo por nombre en la cuenta
    # nueva (ver _resolver_carpeta y _resolver_carpeta_imagenes).
    tenant.google_drive_file_id        = None
    tenant.google_drive_folder_id      = None
    tenant.google_drive_root_folder_id = None
    tenant.google_drive_images_file_id = None
    tenant.backup_auto_enabled         = False
    db.commit()

    # Desprogramar los jobs del scheduler: sin esto quedaban registrados en
    # APScheduler tras el disconnect (no-op por la guarda de _run_backup_for_tenant,
    # pero despertándose al pedo cada N horas hasta el próximo reinicio). Con
    # backup_auto_enabled=False, reload_tenant_jobs simplemente los remueve.
    from app.database_manager.scheduler import reload_tenant_jobs
    reload_tenant_jobs(tenant)

    return {"message": "Google Drive desconectado."}