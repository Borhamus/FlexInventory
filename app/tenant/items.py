import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import nulls_last, text
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auditoria.auditor import Auditor
from app.Core.models import Tenant
from app.tenant import schemas, models, imagenes
from app.tenant.dependencies import get_tenant_db, get_tenant_from_token, require_permission
from app.tenant.validators import validate_item_attributes, parse_value_by_type

router = APIRouter(prefix="/items", tags=["Items"])

def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))

# ─── DEPENDENCIAS DE AUDITORÍA ──────────────────────────────────────────
POST   = [Depends(Auditor(accion="Crear Nuevo Artículo", auditar_payload=True))]
PUT    = [Depends(Auditor(accion="Editar Artículo", auditar_payload=True))]
PATCH_BULK = [Depends(Auditor(accion="Editar Artículos (Masivo)", auditar_payload=True))]
DELETE = [Depends(Auditor(accion="Eliminar Artículo", auditar_payload=True))]
DELETE_BULK = [Depends(Auditor(accion="Eliminar Artículos (Masivo)", auditar_payload=True))]
IMAGEN = [Depends(Auditor(accion="Cambiar Foto de Artículo", auditar_payload=False))]
# ─────────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.ItemResponse, status_code=201, dependencies=POST)
def create_item(
    item: schemas.ItemCreate,
    _: dict = _perm("items", "create"),
    db: Session = Depends(get_tenant_db),
):
    """
    Crea un nuevo item dentro de un inventario. Los atributos del item deben coincidir
    con los atributos definidos en el inventario al que pertenece.

    Requiere permiso `items:create` (o ser tenant owner).

    **Ejemplo de request** (inventario con atributos `["color", "talle"]`):
    ```json
    {
      "nombre": "Remera azul M",
      "inventario_id": 1,
      "atributos": { "color": "azul", "talle": "M" }
    }
    ```
    """
    inventario = db.query(models.Inventario).filter(models.Inventario.id == item.inventario_id).first()
    if not inventario:
        raise HTTPException(404, detail="Inventario no encontrado")
    # Pre-chequeo de nombre duplicado (la columna es UNIQUE; sin esto el
    # IntegrityError se traduce en un 500 en vez de un 400 claro)
    if db.query(models.Item).filter(models.Item.nombre == item.nombre).first():
        raise HTTPException(400, detail=f"Ya existe un item llamado '{item.nombre}'")
    validated = validate_item_attributes(item.atributos, inventario.atributos, inventario.nombre)
    item_data = item.model_dump()
    item_data["atributos"] = validated
    new_item = models.Item(**item_data)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.patch("/bulk-update", response_model=schemas.BulkUpdateResponse, dependencies=PATCH_BULK)
def bulk_update_items(
    payload: schemas.ItemBulkUpdate,
    _: dict = _perm("items", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Actualiza masivamente atributos de una lista de items del mismo inventario.

    Requiere permiso `items:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    {
      "item_ids": [1, 2, 3],
      "atributos": { "Marca": "Samsung" }
    }
    ```
    """
    found = db.query(models.Item.id, models.Item.inventario_id).filter(
        models.Item.id.in_(payload.item_ids)
    ).all()
    found_ids = {row.id for row in found}
    missing = set(payload.item_ids) - found_ids
    if missing:
        raise HTTPException(404, detail={"message": "Items no encontrados", "ids": sorted(missing)})

    inventory_ids = {row.inventario_id for row in found}
    if len(inventory_ids) > 1:
        raise HTTPException(400, detail="Todos los items deben pertenecer al mismo inventario")

    inventario_id = inventory_ids.pop()
    atributos_inv = db.query(models.Inventario.atributos).filter(
        models.Inventario.id == inventario_id
    ).scalar()
    inv_keys = set(atributos_inv.keys()) if atributos_inv else set()
    unknown_keys = set(payload.atributos.keys()) - inv_keys
    if unknown_keys:
        raise HTTPException(400, detail={
            "message": "Atributos no definidos en el inventario",
            "atributos_invalidos": sorted(unknown_keys),
            "atributos_disponibles": sorted(inv_keys),
        })

    # Convertir/validar los valores según el tipo definido en el inventario
    # (igual que en la creación de items)
    validated_attrs = {}
    type_errors = []
    for key, value in payload.atributos.items():
        try:
            validated_attrs[key] = parse_value_by_type(value, atributos_inv[key])
        except ValueError as e:
            type_errors.append(str(e))
    if type_errors:
        raise HTTPException(400, detail={"message": "Errores de tipo en atributos", "errors": type_errors})

    db.execute(
        text("UPDATE item SET atributos = atributos || CAST(:new_attrs AS jsonb) WHERE id = ANY(:ids)"),
        {"new_attrs": json.dumps(validated_attrs), "ids": list(found_ids)},
    )
    db.commit()
    return {"actualizados": len(found_ids)}


@router.delete("/bulk-delete", response_model=schemas.BulkDeleteResponse, dependencies=DELETE_BULK)
def bulk_delete_items(
    payload: schemas.ItemBulkDelete,
    _: dict = _perm("items", "delete"),
    db: Session = Depends(get_tenant_db),
):
    """
    Elimina masivamente una lista de items por sus IDs.

    Requiere permiso `items:delete` (o ser tenant owner).

    Si alguno de los IDs no existe, no se elimina nada y se devuelve 404
    indicando cuáles faltan (operación todo-o-nada).

    **Ejemplo de request:**
    ```json
    { "item_ids": [1, 2, 3] }
    ```

    **Ejemplo de response:**
    ```json
    { "eliminados": 3, "ids": [1, 2, 3] }
    ```
    """
    ids = set(payload.item_ids)
    found = db.query(models.Item.id).filter(models.Item.id.in_(ids)).all()
    found_ids = {row.id for row in found}
    missing = ids - found_ids
    if missing:
        raise HTTPException(404, detail={"message": "Items no encontrados", "ids": sorted(missing)})

    # Las filas de catalogo_item se eliminan por ON DELETE CASCADE en la BD.
    db.query(models.Item).filter(models.Item.id.in_(found_ids)).delete(synchronize_session=False)
    db.commit()
    return {"eliminados": len(found_ids), "ids": sorted(found_ids)}


# ─── ORDEN Y FILTRO (Fase 5) ────────────────────────────────────────────
# No comparte el registro ESTRATEGIAS de estadisticas.py a propósito: ese
# motor ya está probado end-to-end y esto es una necesidad más chica (un
# nombre de cast por tipo). Duplicar 2 diccionarios chicos es más barato y
# más seguro que acoplar este endpoint a los internos de otro módulo.
#
# Se ordena y filtra sobre dos familias de campos:
#   1. Columnas nativas de `item` (id, nombre, cantidad, creado_en...): no
#      dependen del inventario, así que NO exigen `inventario_id`.
#   2. Atributos del JSONB `atributos`: el tipo se resuelve contra el schema
#      del inventario, así que ahí sí hace falta `inventario_id`.
# Si un inventario define un atributo con el mismo nombre que una columna
# nativa (un atributo llamado "cantidad", por ejemplo), gana la columna
# nativa: es la que el usuario ve en la tabla bajo ese título.

# Tipo declarado en el inventario → tipo SQL para castear. None = sin cast
# (comparación de texto directa), válido para ordenar pero no para filtrar
# por rango ("desde-hasta" no tiene sentido pedido para string/boolean).
_TIPO_SQL_ORDEN = {
    "integer": "float8", "int": "float8", "float": "float8", "number": "float8",
    "date": "date",
    "boolean": "boolean", "bool": "boolean",
    "string": None, "str": None,
}
_TIPOS_FILTRABLES = {"integer", "int", "float", "number", "date"}

# Columnas reales de la tabla `item` habilitadas para ordenar, y con qué
# tipo se interpretan los límites si además se filtra por rango sobre ellas.
# None = ordenable pero no filtrable por rango (mismo criterio que un
# atributo string: "desde-hasta" sobre un nombre no tiene semántica pedida).
_COLUMNAS_ORDENABLES = {
    "id": "integer",
    "nombre": None,
    "cantidad": "integer",
    "creado_en": "timestamp",
    "actualizado_en": "timestamp",
}

# Formatos aceptados para un límite de tipo timestamp. El último (solo
# fecha) es el que manda el frontend desde el DatePicker.
_FORMATOS_TIMESTAMP = ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d")


def _parse_limite(valor: str, tipo_sql: str, param: str, fin_de_dia: bool = False):
    """
    Convierte un límite del rango (siempre llega como string en la query) al
    tipo que corresponde. Sin este chequeo el valor viaja crudo al CAST de
    Postgres y un `filtro_desde=abc` revienta como 500 en vez de 400.
    """
    try:
        if tipo_sql == "float8":
            return float(valor)
        if tipo_sql == "integer":
            return int(valor)
        if tipo_sql == "date":
            return datetime.strptime(valor, "%Y-%m-%d").date()
        if tipo_sql == "timestamp":
            for fmt in _FORMATOS_TIMESTAMP:
                try:
                    parsed = datetime.strptime(valor, fmt)
                except ValueError:
                    continue
                # "hasta el 02/09" tiene que incluir ese día entero, no
                # cortar a las 00:00 y dejar afuera todo lo cargado durante
                # la jornada. Solo aplica si el usuario no indicó hora.
                if fin_de_dia and fmt == "%Y-%m-%d":
                    parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
                return parsed
            raise ValueError(valor)
    except (ValueError, TypeError):
        raise HTTPException(
            400,
            detail=f"'{param}' no es un valor válido para este campo: '{valor}'",
        )
    return valor


def _resolver_atributo_orden(inventario_atributos: dict, atributo: str) -> Optional[str]:
    tipo = (inventario_atributos or {}).get(atributo)
    if tipo is None:
        raise HTTPException(404, detail=f"El atributo '{atributo}' no existe en este inventario")
    tipo_norm = tipo.lower().strip()
    if tipo_norm not in _TIPO_SQL_ORDEN:
        raise HTTPException(400, detail=f"Tipo de atributo no soportado para ordenar: '{tipo}'")
    return _TIPO_SQL_ORDEN[tipo_norm]


def _resolver_atributo_filtro(inventario_atributos: dict, atributo: str) -> str:
    tipo = (inventario_atributos or {}).get(atributo)
    if tipo is None:
        raise HTTPException(404, detail=f"El atributo '{atributo}' no existe en este inventario")
    tipo_norm = tipo.lower().strip()
    if tipo_norm not in _TIPOS_FILTRABLES:
        raise HTTPException(
            400,
            detail=f"El atributo '{atributo}' es de tipo '{tipo}'; filtro_desde/filtro_hasta solo aplica a numérico o date",
        )
    return _TIPO_SQL_ORDEN[tipo_norm]


@router.get("/", response_model=List[schemas.ItemResponse])
def get_items(
    inventario_id: Optional[int] = None,
    skip: int = Query(0, ge=0, description="Registros a saltar (paginación)"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Máximo de registros (sin límite si se omite)"),
    sort_by: Optional[str] = Query(None, description="Columna nativa (id, nombre, cantidad, creado_en, actualizado_en) o atributo del inventario por el que ordenar"),
    order: str = Query("asc", pattern="^(asc|desc)$", description="Dirección del orden: asc o desc"),
    filtro_atributo: Optional[str] = Query(None, description="Columna nativa numérica/fecha, o atributo numérico o date, sobre el que aplicar filtro_desde/filtro_hasta"),
    filtro_desde: Optional[str] = Query(None, description="Límite inferior (inclusive) del filtro por rango"),
    filtro_hasta: Optional[str] = Query(None, description="Límite superior (inclusive) del filtro por rango"),
    _: dict = _perm("items", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista los items del tenant. Se puede filtrar por inventario (`inventario_id`),
    paginar (`skip`/`limit`), ordenar (`sort_by` + `order`) y filtrar por rango
    (`filtro_atributo` + `filtro_desde`/`filtro_hasta`).

    Tanto `sort_by` como `filtro_atributo` aceptan dos cosas:

    - **Columnas nativas del item**: `id`, `nombre`, `cantidad`, `creado_en`,
      `actualizado_en`. No requieren `inventario_id`. Para filtrar por rango
      valen todas menos `nombre` (es texto, no tiene semántica de rango).
    - **Atributos del inventario**: requieren `inventario_id` para resolver el
      tipo contra el schema de ESE inventario. `filtro_atributo` solo acepta
      atributos `integer`/`float`/`date` — para `string`/`boolean` no hay
      semántica de "rango" pedida por la consigna.

    Los items sin valor en el atributo por el que se ordena van siempre al
    final (`NULLS LAST`), tanto en asc como en desc. El desempate es siempre
    por `id`, para que el paginado sea estable cuando el campo ordenado se
    repite entre varios items.

    Requiere permiso `items:read` (o ser tenant owner).

    **Ejemplos:**
    - `GET /items/?inventario_id=1&sort_by=cantidad&order=desc`
    - `GET /items/?sort_by=id&order=desc`
    - `GET /items/?inventario_id=1&filtro_atributo=cantidad&filtro_desde=0&filtro_hasta=5`
    - `GET /items/?inventario_id=1&sort_by=vence&order=desc`
    - `GET /items/?inventario_id=1&filtro_atributo=precio&filtro_desde=10&filtro_hasta=50`
    """
    # Un `?sort_by=` vacío en la URL llega como "" y no como None: se
    # normaliza a None para que valga lo mismo que no mandarlo (era el
    # comportamiento previo, cuando el chequeo era por truthiness).
    sort_by = sort_by or None
    filtro_atributo = filtro_atributo or None

    sort_by_nativo = sort_by is not None and sort_by in _COLUMNAS_ORDENABLES
    filtro_nativo = filtro_atributo is not None and filtro_atributo in _COLUMNAS_ORDENABLES

    # Solo los atributos del JSONB necesitan el inventario para resolver su
    # tipo; las columnas nativas se ordenan y filtran sin él.
    necesita_inventario = (
        (sort_by is not None and not sort_by_nativo)
        or (filtro_atributo is not None and not filtro_nativo)
    )
    if necesita_inventario and inventario_id is None:
        raise HTTPException(400, detail="inventario_id es requerido para ordenar o filtrar por un atributo del inventario")
    if (filtro_desde is not None or filtro_hasta is not None) and filtro_atributo is None:
        raise HTTPException(400, detail="filtro_atributo es requerido para usar filtro_desde/filtro_hasta")
    if filtro_atributo is not None and filtro_desde is None and filtro_hasta is None:
        raise HTTPException(400, detail="Debe indicar filtro_desde y/o filtro_hasta junto con filtro_atributo")

    inventario_atributos = {}
    if necesita_inventario:
        inventario = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
        if not inventario:
            raise HTTPException(404, detail="Inventario no encontrado")
        inventario_atributos = inventario.atributos or {}

    query = db.query(models.Item)
    if inventario_id is not None:
        query = query.filter(models.Item.inventario_id == inventario_id)

    if filtro_nativo:
        tipo_sql = _COLUMNAS_ORDENABLES[filtro_atributo]
        if tipo_sql is None:
            raise HTTPException(
                400,
                detail=f"'{filtro_atributo}' es un campo de texto; filtro_desde/filtro_hasta solo aplica a numérico o fecha",
            )
        columna = getattr(models.Item, filtro_atributo)
        if filtro_desde is not None:
            query = query.filter(columna >= _parse_limite(filtro_desde, tipo_sql, "filtro_desde"))
        if filtro_hasta is not None:
            query = query.filter(columna <= _parse_limite(filtro_hasta, tipo_sql, "filtro_hasta", fin_de_dia=True))
    elif filtro_atributo is not None:
        tipo_sql = _resolver_atributo_filtro(inventario_atributos, filtro_atributo)
        expr = f"(atributos ->> :filtro_key)::{tipo_sql}"
        condiciones = []
        params = {"filtro_key": filtro_atributo}
        if filtro_desde is not None:
            # Se valida acá y se manda el string original al CAST: así un
            # valor inválido corta con un 400 claro y la consulta que ya
            # venía andando no cambia.
            _parse_limite(filtro_desde, tipo_sql, "filtro_desde")
            condiciones.append(f"{expr} >= CAST(:filtro_desde AS {tipo_sql})")
            params["filtro_desde"] = filtro_desde
        if filtro_hasta is not None:
            _parse_limite(filtro_hasta, tipo_sql, "filtro_hasta")
            condiciones.append(f"{expr} <= CAST(:filtro_hasta AS {tipo_sql})")
            params["filtro_hasta"] = filtro_hasta
        query = query.filter(text(" AND ".join(condiciones))).params(**params)

    if sort_by_nativo:
        columna = getattr(models.Item, sort_by)
        direccion = columna.desc() if order == "desc" else columna.asc()
        query = query.order_by(nulls_last(direccion), models.Item.id)
    elif sort_by is not None:
        tipo_sql = _resolver_atributo_orden(inventario_atributos, sort_by)
        expr = f"(atributos ->> :sort_key)" + (f"::{tipo_sql}" if tipo_sql else "")
        direccion = "DESC" if order == "desc" else "ASC"
        # NULLS LAST: los items sin valor en ese atributo (típicamente los que
        # ya existían cuando se agregó el atributo al inventario) van siempre
        # al final. Sin esto, en DESC Postgres los pone PRIMERO y pedir "los
        # más nuevos" muestra arriba un bloque de vacíos.
        query = query.order_by(text(f"{expr} {direccion} NULLS LAST"), models.Item.id).params(sort_key=sort_by)
    else:
        query = query.order_by(models.Item.id)

    query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


@router.get("/{item_id}", response_model=schemas.ItemResponse)
def get_item(
    item_id: int,
    _: dict = _perm("items", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Devuelve el detalle de un item específico, incluyendo sus atributos.

    Requiere permiso `items:read` (o ser tenant owner).

    **Ejemplo:** `GET /items/5`
    """
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(404, detail="Item no encontrado")
    return item


@router.put("/{item_id}", response_model=schemas.ItemResponse, dependencies=PUT)
def update_item(
    item_id: int,
    item: schemas.ItemUpdate,
    _: dict = _perm("items", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Actualiza los datos de un item. Solo se modifican los campos enviados.
    Si se cambia el `inventario_id`, el inventario destino debe existir.

    Requiere permiso `items:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "atributos": { "color": "rojo", "talle": "L" } }
    ```
    """
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(404, detail="Item no encontrado")
    update_data = item.model_dump(exclude_unset=True)

    # Pre-chequeo de nombre duplicado (columna UNIQUE → evita 500 por IntegrityError)
    if 'nombre' in update_data and db.query(models.Item).filter(
        models.Item.nombre == update_data['nombre'],
        models.Item.id != item_id,
    ).first():
        raise HTTPException(400, detail=f"Ya existe un item llamado '{update_data['nombre']}'")

    # Resolver el inventario destino (el nuevo si se cambia, o el actual)
    target_inv_id = update_data.get('inventario_id', db_item.inventario_id)
    target_inv = db.query(models.Inventario).filter(models.Inventario.id == target_inv_id).first()
    if not target_inv:
        raise HTTPException(404, detail="Inventario no encontrado")

    # Validar atributos contra la definición del inventario destino,
    # igual que en la creación (antes la edición guardaba el JSONB sin validar)
    if 'atributos' in update_data or 'inventario_id' in update_data:
        atributos_final = update_data.get('atributos', db_item.atributos)
        update_data['atributos'] = validate_item_attributes(
            atributos_final, target_inv.atributos, target_inv.nombre
        )

    for field, value in update_data.items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}", status_code=204, dependencies=DELETE)
def delete_item(
    item_id: int,
    _: dict = _perm("items", "delete"),
    db: Session = Depends(get_tenant_db),
):
    """
    Elimina un item permanentemente.

    Requiere permiso `items:delete` (o ser tenant owner).

    **Ejemplo:** `DELETE /items/5`
    """
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(404, detail="Item no encontrado")
    db.delete(item)
    db.commit()


# ─── FOTO DEL ITEM ──────────────────────────────────────────────────────
# El archivo va a disco local (app/tenant/imagenes.py), no a la base — acá
# solo se guarda la URL pública resultante en Item.imagen. Ver ese módulo
# para las decisiones de diseño (por qué disco y no bytea/base64, por qué
# nombre de archivo random).

@router.post("/{item_id}/imagen", response_model=schemas.ItemResponse, dependencies=IMAGEN)
async def subir_imagen_item(
    item_id: int,
    archivo: UploadFile = File(...),
    _: dict = _perm("items", "update"),
    tenant: Tenant = Depends(get_tenant_from_token),
    db: Session = Depends(get_tenant_db),
):
    """
    Sube (o reemplaza) la foto de un item. Acepta JPG, PNG o WEBP, hasta 5 MB.

    Si el item ya tenía una foto, la anterior se borra del disco — nunca
    quedan archivos huérfanos acumulándose.

    Requiere permiso `items:update` (o ser tenant owner).
    """
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(404, detail="Item no encontrado")

    inventario = db.query(models.Inventario).filter(models.Inventario.id == item.inventario_id).first()
    if not inventario or not inventario.fotos_habilitadas:
        # No basta con ocultar el botón en el frontend — si alguien pega
        # directo a la API, este inventario sigue sin querer fotos.
        raise HTTPException(400, detail="Este inventario no tiene las fotos habilitadas")

    item.imagen = await imagenes.guardar_imagen(tenant.schema_name, archivo, item.imagen)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}/imagen", response_model=schemas.ItemResponse, dependencies=IMAGEN)
def borrar_imagen_item(
    item_id: int,
    _: dict = _perm("items", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Quita la foto de un item (borra el archivo del disco y limpia la
    referencia). No falla si el item no tenía foto.

    Requiere permiso `items:update` (o ser tenant owner).
    """
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(404, detail="Item no encontrado")

    if item.imagen:
        imagenes.eliminar_imagen(item.imagen)
        item.imagen = None
        db.commit()
        db.refresh(item)
    return item
