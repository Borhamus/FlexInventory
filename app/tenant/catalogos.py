from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.tenant import schemas, models
from app.tenant.dependencies import get_tenant_db, require_permission

router = APIRouter(prefix="/catalogos", tags=["Catálogos"])


def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))


@router.post("/", response_model=schemas.CatalogoResponse, status_code=201)
def create_catalogo(
    catalogo: schemas.CatalogoCreate,
    _: dict = _perm("catalogos", "create"),
    db: Session = Depends(get_tenant_db),
):
    """
    Crea un nuevo catálogo. Un catálogo es una colección de items seleccionados
    de distintos inventarios, útil para armar listas de productos, ofertas, etc.

    Requiere permiso `catalogos:create` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "nombre": "Colección verano 2026", "descripcion": "Productos de temporada" }
    ```
    """
    if db.query(models.Catalogo).filter(models.Catalogo.nombre == catalogo.nombre).first():
        raise HTTPException(400, detail="El catálogo ya existe")
    new_cat = models.Catalogo(**catalogo.model_dump())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


@router.get("/", response_model=List[schemas.CatalogoResponse])
def get_catalogos(
    skip: int = 0,
    limit: int = 100,
    _: dict = _perm("catalogos", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista todos los catálogos del tenant. Soporta paginación con `skip` y `limit`.

    Requiere permiso `catalogos:read` (o ser tenant owner).
    """
    return db.query(models.Catalogo).offset(skip).limit(limit).all()


@router.get("/{catalogo_id}", response_model=schemas.CatalogoWithItems)
def get_catalogo(
    catalogo_id: int,
    _: dict = _perm("catalogos", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Devuelve el detalle de un catálogo incluyendo la lista completa de items que contiene.

    Requiere permiso `catalogos:read` (o ser tenant owner).

    **Ejemplo:** `GET /catalogos/2`
    """
    cat = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not cat:
        raise HTTPException(404, detail="Catálogo no encontrado")
    return cat


@router.put("/{catalogo_id}", response_model=schemas.CatalogoResponse)
def update_catalogo(
    catalogo_id: int,
    catalogo: schemas.CatalogoUpdate,
    _: dict = _perm("catalogos", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Actualiza el nombre o descripción de un catálogo. Solo se modifican los campos enviados.

    Requiere permiso `catalogos:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "nombre": "Colección invierno 2026" }
    ```
    """
    cat = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not cat:
        raise HTTPException(404, detail="Catálogo no encontrado")
    for field, value in catalogo.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{catalogo_id}", status_code=204)
def delete_catalogo(
    catalogo_id: int,
    _: dict = _perm("catalogos", "delete"),
    db: Session = Depends(get_tenant_db),
):
    """
    Elimina un catálogo permanentemente. Los items que contenía no se eliminan,
    solo se desvinculan del catálogo.

    Requiere permiso `catalogos:delete` (o ser tenant owner).

    **Ejemplo:** `DELETE /catalogos/2`
    """
    cat = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not cat:
        raise HTTPException(404, detail="Catálogo no encontrado")
    db.delete(cat)
    db.commit()


@router.post("/{catalogo_id}/items", response_model=schemas.CatalogoWithItems)
def add_items_to_catalogo(
    catalogo_id: int,
    data: schemas.CatalogoItemAdd,
    _: dict = _perm("catalogos", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Agrega uno o más items a un catálogo. Si un item ya estaba en el catálogo, se ignora.
    Los items deben existir en el tenant.

    Requiere permiso `catalogos:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "item_ids": [1, 3, 7] }
    ```

    **Ejemplo de response:** el catálogo completo con todos sus items actualizados.
    """
    cat = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not cat:
        raise HTTPException(404, detail="Catálogo no encontrado")
    for item_id in data.item_ids:
        item = db.query(models.Item).filter(models.Item.id == item_id).first()
        if not item:
            raise HTTPException(404, detail=f"Item {item_id} no encontrado")
        if item not in cat.items:
            cat.items.append(item)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{catalogo_id}/items/{item_id}", status_code=204)
def remove_item_from_catalogo(
    catalogo_id: int,
    item_id: int,
    _: dict = _perm("catalogos", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Quita un item de un catálogo. El item no se elimina del sistema, solo se desvincula
    de este catálogo.

    Requiere permiso `catalogos:update` (o ser tenant owner).

    **Ejemplo:** `DELETE /catalogos/2/items/7`
    """
    cat = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not cat:
        raise HTTPException(404, detail="Catálogo no encontrado")
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(404, detail="Item no encontrado")
    if item in cat.items:
        cat.items.remove(item)
        db.commit()
