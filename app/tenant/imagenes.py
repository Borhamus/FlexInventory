"""
app/tenant/imagenes.py
────────────────────────
Fotos de items: se guardan en disco local, NO en la base — Item.imagen solo
guarda la URL pública ya armada (ej. "/uploads/tenant_borhamus/items/
8f3a1c2e.jpg"). Servidas después vía StaticFiles (ver app/main.py).

Decisiones de diseño (charladas con el usuario antes de tocar código):
- Disco local, no bytea en Postgres ni base64 en el JSONB de `atributos`.
  Cero infraestructura nueva, mismo criterio de simplicidad que el resto
  del proyecto — se puede migrar a un object storage el día que haga
  falta escalar a más de un servidor.
- Nombre de archivo random (uuid4), nunca el nombre original del upload.
  El login de este proyecto usa un token en memoria (no cookies), así que
  un <img src="..."> no puede mandar el header de auth — la URL "difícil
  de adivinar" hace ese trabajo en su lugar, en vez de exigirle al
  frontend armar la imagen a mano con fetch + blob URL.
- Una carpeta POR TENANT (uploads/{schema}/items/) — no todo junto ni
  organizado por item — para que el día que se implemente el backup a
  Drive (ver DOC), comprimir "todas las fotos de este tenant" sea
  trivial: un solo directorio, no hay que consultar la base para saber
  qué archivo es de quién.
"""
import io
import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

# Ancla a la raíz del proyecto (no al cwd del proceso, que cambia según
# desde dónde se arranque uvicorn) — 3 parents: imagenes.py -> tenant -> app -> raíz.
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

# Content-Type declarado por el navegador -> extensión de archivo. Lista
# blanca chica a propósito: son los formatos que tienen sentido para fotos
# de producto, no un conversor de imágenes genérico.
_TIPOS_PERMITIDOS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_TAMANO_MAXIMO = 5 * 1024 * 1024  # 5 MB


def _carpeta_tenant(tenant_schema: str) -> Path:
    carpeta = UPLOADS_DIR / tenant_schema / "items"
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


async def guardar_imagen(tenant_schema: str, archivo: UploadFile, imagen_anterior: Optional[str]) -> str:
    """
    Valida el archivo subido, lo guarda en disco y devuelve la URL pública
    nueva. Si el item ya tenía una foto, borra el archivo viejo del disco
    (no dejar huérfanos acumulándose).
    """
    if archivo.content_type not in _TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de imagen no soportado ('{archivo.content_type}'). Usá JPG, PNG o WEBP.",
        )

    contenido = await archivo.read()
    if len(contenido) > _TAMANO_MAXIMO:
        raise HTTPException(status_code=400, detail="La imagen no puede pesar más de 5 MB.")
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo llegó vacío.")

    # No confiar solo en el Content-Type que manda el navegador (se puede
    # falsear fácil) — intentar abrir el archivo de verdad con Pillow.
    try:
        with Image.open(io.BytesIO(contenido)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida.")

    extension = _TIPOS_PERMITIDOS[archivo.content_type]
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    carpeta = _carpeta_tenant(tenant_schema)
    (carpeta / nombre_archivo).write_bytes(contenido)

    if imagen_anterior:
        eliminar_imagen(imagen_anterior)

    return f"/uploads/{tenant_schema}/items/{nombre_archivo}"


def eliminar_imagen(url_imagen: str) -> None:
    """
    Borra el archivo físico correspondiente a una URL guardada en
    Item.imagen. No lanza error si el archivo ya no está — borrar algo que
    ya no existe no debería tumbar la request.
    """
    ruta_relativa = url_imagen.removeprefix("/uploads/")
    ruta = (UPLOADS_DIR / ruta_relativa).resolve()
    # Defensa en profundidad: que el resultado siga adentro de UPLOADS_DIR,
    # por si algún día una URL guardada viene rara.
    if UPLOADS_DIR.resolve() not in ruta.parents:
        logger.warning(f"Ruta de imagen fuera de UPLOADS_DIR, no se borra: {ruta}")
        return
    try:
        ruta.unlink(missing_ok=True)
    except OSError as e:
        logger.warning(f"No se pudo borrar la imagen {ruta}: {e}")
