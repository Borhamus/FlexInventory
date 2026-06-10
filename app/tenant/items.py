import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auditoria.auditor import Auditor
from app.tenant import schemas, models
from app.tenant.dependencies import get_tenant_db, require_permission
from app.tenant.validators import validate_item_attributes, parse_value_by_type

router = APIRouter(prefix="/items", tags=["Items"])

def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))

# ─── DEPENDENCIAS DE AUDITORÍA ──────────────────────────────────────────
POST   = [Depends(Auditor(accion="Crear Nuevo Artículo", auditar_payload=True))]
PUT    = [Depends(Auditor(accion="Editar Artículo", auditar_payload=True))]
PATCH  = [Depends(Auditor(accion="Editar Artículo", auditar_payload=True))]
DELETE = [Depends(Auditor(accion="Eliminar Artículo", auditar_payload=True))]
DELETE_BULK = [Depends(Auditor(accion="Eliminar Artículos (Masivo)", auditar_payload=True))]
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


@router.patch("/bulk-update", response_model=schemas.BulkUpdateResponse, dependencies=PATCH)
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


@router.get("/", response_model=List[schemas.ItemResponse])
def get_items(
    inventario_id: Optional[int] = None,
    skip: int = Query(0, ge=0, description="Registros a saltar (paginación)"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Máximo de registros (sin límite si se omite)"),
    _: dict = _perm("items", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista todos los items del tenant. Se puede filtrar por inventario usando el
    query param `inventario_id` y paginar con `skip`/`limit`.

    Requiere permiso `items:read` (o ser tenant owner).

    **Ejemplos:**
    - `GET /items/` → todos los items
    - `GET /items/?inventario_id=1` → solo los items del inventario 1
    - `GET /items/?skip=0&limit=100` → primera página de 100
    """
    query = db.query(models.Item)
    if inventario_id is not None:
        query = query.filter(models.Item.inventario_id == inventario_id)
    query = query.order_by(models.Item.id).offset(skip)
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
