from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.tenant import schemas, models
from app.tenant.dependencies import get_tenant_db, require_permission
from app.tenant.validators import validate_item_attributes

router = APIRouter(prefix="/items", tags=["Items"])


def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))


@router.post("/", response_model=schemas.ItemResponse, status_code=201)
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
    validated = validate_item_attributes(item.atributos, inventario.atributos, inventario.nombre)
    item_data = item.model_dump()
    item_data["atributos"] = validated
    new_item = models.Item(**item_data)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.get("/", response_model=List[schemas.ItemResponse])
def get_items(
    inventario_id: int = None,
    _: dict = _perm("items", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista todos los items del tenant. Se puede filtrar por inventario usando el
    query param `inventario_id`.

    Requiere permiso `items:read` (o ser tenant owner).

    **Ejemplos:**
    - `GET /items/` → todos los items
    - `GET /items/?inventario_id=1` → solo los items del inventario 1
    """
    query = db.query(models.Item)
    if inventario_id:
        query = query.filter(models.Item.inventario_id == inventario_id)
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


@router.put("/{item_id}", response_model=schemas.ItemResponse)
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
    if 'inventario_id' in update_data:
        if not db.query(models.Inventario).filter(models.Inventario.id == update_data['inventario_id']).first():
            raise HTTPException(404, detail="Inventario no encontrado")
    for field, value in update_data.items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}", status_code=204)
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
