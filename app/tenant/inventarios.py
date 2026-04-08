from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.tenant import schemas, models
from app.tenant.dependencies import get_tenant_db, require_permission

router = APIRouter(prefix="/inventarios", tags=["Inventarios"])


def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))


@router.post("/", response_model=schemas.InventarioResponse, status_code=201)
def create_inventario(
    inventario: schemas.InventarioCreate,
    _: dict = _perm("inventarios", "create"),
    db: Session = Depends(get_tenant_db),
):
    """
    Crea un nuevo inventario para el tenant. Un inventario agrupa items del mismo tipo
    y define los atributos que esos items deben tener (ej: color, talle, peso).

    Requiere permiso `inventarios:create` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    {
      "nombre": "Ropa deportiva",
      "descripcion": "Indumentaria para deporte",
      "atributos": ["color", "talle"]
    }
    ```
    """
    if db.query(models.Inventario).filter(models.Inventario.nombre == inventario.nombre).first():
        raise HTTPException(400, detail="El inventario ya existe")
    new_inv = models.Inventario(**inventario.model_dump())
    db.add(new_inv)
    db.flush()
    return new_inv


@router.get("/all", response_model=List[schemas.InventarioResponse])
def get_inventarios(
    _: dict = _perm("inventarios", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista todos los inventarios del tenant.

    Requiere permiso `inventarios:read` (o ser tenant owner).
    """
    return db.query(models.Inventario).all()


@router.get("/{inventario_id}", response_model=schemas.InventarioWithItems)
def get_inventario(
    inventario_id: int,
    _: dict = _perm("inventarios", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Devuelve el detalle de un inventario específico.

    Requiere permiso `inventarios:read` (o ser tenant owner).

    **Ejemplo:** `GET /inventarios/1`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    return inv


@router.put("/{inventario_id}", response_model=schemas.InventarioResponse)
def update_inventario(
    inventario_id: int,
    inventario: schemas.InventarioUpdate,
    _: dict = _perm("inventarios", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Actualiza el nombre, descripción o atributos de un inventario. Solo se modifican
    los campos que se envíen.

    Requiere permiso `inventarios:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "descripcion": "Nueva descripción" }
    ```
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    for field, value in inventario.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/{inventario_id}", status_code=204)
def delete_inventario(
    inventario_id: int,
    _: dict = _perm("inventarios", "delete"),
    db: Session = Depends(get_tenant_db),
):
    """
    Elimina un inventario permanentemente. También elimina todos los items asociados.

    Requiere permiso `inventarios:delete` (o ser tenant owner).

    **Ejemplo:** `DELETE /inventarios/1`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    db.delete(inv)
    db.commit()
