from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from . import schemas, models
from app.db_config import get_db
from .validators import *


router = APIRouter()


# ==================== ENDPOINTS DE INVENTARIO ====================
@router.post("/inventarios/", response_model=schemas.InventarioResponse, status_code=201)
def create_inventario(inventario: schemas.InventarioCreate, db: Session = Depends(get_db)):
    db_inventario = db.query(models.Inventario).filter(models.Inventario.nombre == inventario.nombre).first()
    if db_inventario:
        raise HTTPException(
            status_code=400, 
            detail=f"Ya existe un inventario con el nombre '{inventario.nombre}'"
        )
    data = inventario.model_dump()
    if "atributos" in data and data["atributos"]:
        data["atributos"] = validate_inventario_atributos(data["atributos"])
    else:
        data["atributos"] = {}
    new_inventario = models.Inventario(**data)
    db.add(new_inventario)
    db.commit()
    db.refresh(new_inventario)
    return new_inventario

@router.get("/inventarios/all", response_model=List[schemas.InventarioResponse])
def get_inventarios(db: Session = Depends(get_db)):
    inventarios = db.query(models.Inventario).all()
    return inventarios


@router.get("/inventarios/{inventario_id}", response_model=schemas.InventarioResponse)
def get_inventario(inventario_id: int, db: Session = Depends(get_db)):
    inventario = db.query(models.Inventario).filter( models.Inventario.id == inventario_id ).first()
    if not inventario:
        raise HTTPException(
            status_code=404, 
            detail=f"Inventario con ID {inventario_id} no encontrado"
        )
    return inventario

@router.put("/inventarios/{inventario_id}", response_model=schemas.InventarioResponse)
def update_inventario( inventario_id: int, inventario: schemas.InventarioUpdate, db: Session = Depends(get_db) ):
    db_inventario = db.query(models.Inventario).filter( models.Inventario.id == inventario_id ).first()
    if not db_inventario:
        raise HTTPException(
            status_code=404, 
            detail=f"Inventario con ID {inventario_id} no encontrado"
        )
    update_data = inventario.model_dump(exclude_unset=True)
    if "atributos" in update_data and update_data["atributos"]:
        update_data["atributos"] = validate_inventario_atributos(update_data["atributos"])
        item_count = db.query(models.Item).filter(
            models.Item.inventario_id == inventario_id
        ).count()
    for field, value in update_data.items():
        setattr(db_inventario, field, value)
    if "atributos" in update_data:
        flag_modified(db_inventario, "atributos")
    db.commit()
    db.refresh(db_inventario)
    return db_inventario


@router.post("/inventarios/{inventario_id}/atributos", response_model=schemas.InventarioResponse)
def add_atributo_inventario( inventario_id: int, atributo: dict, db: Session = Depends(get_db) ):
    inventario = db.query(models.Inventario).filter( models.Inventario.id == inventario_id ).first()
    if not inventario:
        raise HTTPException(
            status_code=404, 
            detail=f"Inventario con ID {inventario_id} no encontrado"
        )
    if not atributo or len(atributo) != 1:  #el endpoint es para agregar un solo atributo, si le pones mas se jode xd
        raise HTTPException(
            status_code=400,
            detail="Debe proporcionar exactamente un atributo con formato {nombre: tipo}"
        )
    nombre_atributo = list(atributo.keys())[0]
    tipo_atributo = list(atributo.values())[0]
    validated_atributo = validate_single_atributo(nombre_atributo, tipo_atributo)
    if inventario.atributos is None:
        inventario.atributos = {}
    validate_atributo_not_exists(inventario.atributos, nombre_atributo)
    inventario.atributos.update(validated_atributo)
    flag_modified(inventario, "atributos")
    db.commit()
    db.refresh(inventario)
    return inventario


@router.delete("/inventarios/{inventario_id}/atributos/{atributo_nombre}", response_model=schemas.InventarioResponse)
def delete_atributo_inventario(inventario_id: int, atributo_nombre: str, db: Session = Depends(get_db) ):
    inventario = db.query(models.Inventario).filter( models.Inventario.id == inventario_id).first()
    if not inventario:
        raise HTTPException(
            status_code=404, 
            detail=f"Inventario con ID {inventario_id} no encontrado"
        )
    validate_atributo_exists(inventario.atributos, atributo_nombre)
    del inventario.atributos[atributo_nombre]
    flag_modified(inventario, "atributos")
    db.commit()
    db.refresh(inventario)
    return inventario


@router.delete("/inventarios/{inventario_id}", status_code=204)
def delete_inventario(inventario_id: int, db: Session = Depends(get_db)):
    db_inventario = db.query(models.Inventario).filter( models.Inventario.id == inventario_id ).first()
    if not db_inventario:
        raise HTTPException(
            status_code=404, 
            detail=f"Inventario con ID {inventario_id} no encontrado"
        )
    db.delete(db_inventario)
    db.commit()
    return None

# ==================== ENDPOINTS DE ITEMS ====================

@router.post("/items/", response_model=schemas.ItemResponse, status_code=201)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    
    # 1. Verificar que el inventario existe
    inventario = db.query(models.Inventario)\
        .filter(models.Inventario.id == item.inventario_id)\
        .first()

    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")

    # 2. Validar atributos del item contra el inventario
    validated_atributos = validate_item_attributes(
        item_atributos=item.atributos,
        inventario_atributos=inventario.atributos,
        inventario_nombre=inventario.nombre
    )

    # 3. Crear item con datos validados
    item_data = item.model_dump()
    item_data["atributos"] = validated_atributos

    new_item = models.Item(**item_data)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item

@router.get("/items/", response_model=List[schemas.ItemResponse])
def get_items(inventario_id: int = None, db: Session = Depends(get_db)):
    """Obtener todos los items, opcionalmente filtrados por inventario"""
    query = db.query(models.Item)
    if inventario_id:
        query = query.filter(models.Item.inventario_id == inventario_id)
    items = query.all()
    return items

@router.get("/items/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return item

@router.put("/items/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, item: schemas.ItemUpdate, db: Session = Depends(get_db)):
    """Actualizar un item"""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    update_data = item.model_dump(exclude_unset=True)
    
    # Si se actualiza el inventario_id, verificar que existe
    if 'inventario_id' in update_data:
        inventario = db.query(models.Inventario).filter(models.Inventario.id == update_data['inventario_id']).first()
        if not inventario:
            raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Eliminar un item"""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    db.delete(db_item)
    db.commit()
    return None

# ==================== ENDPOINTS DE CATÁLOGOS ====================

@router.post("/catalogos/", response_model=schemas.CatalogoResponse, status_code=201)
def create_catalogo(catalogo: schemas.CatalogoCreate, db: Session = Depends(get_db)):
    """Crear un nuevo catálogo"""
    db_catalogo = db.query(models.Catalogo).filter(models.Catalogo.nombre == catalogo.nombre).first()
    if db_catalogo:
        raise HTTPException(status_code=400, detail="El catálogo ya existe")
    
    new_catalogo = models.Catalogo(**catalogo.model_dump())
    db.add(new_catalogo)
    db.commit()
    db.refresh(new_catalogo)
    return new_catalogo

@router.get("/catalogos/", response_model=List[schemas.CatalogoResponse])
def get_catalogos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener todos los catálogos"""
    catalogos = db.query(models.Catalogo).offset(skip).limit(limit).all()
    return catalogos

@router.get("/catalogos/{catalogo_id}", response_model=schemas.CatalogoWithItems)
def get_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    """Obtener un catálogo por ID con sus items"""
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    return catalogo

@router.put("/catalogos/{catalogo_id}", response_model=schemas.CatalogoResponse)
def update_catalogo(catalogo_id: int, catalogo: schemas.CatalogoUpdate, db: Session = Depends(get_db)):
    """Actualizar un catálogo"""
    db_catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not db_catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    
    update_data = catalogo.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_catalogo, field, value)
    
    db.commit()
    db.refresh(db_catalogo)
    return db_catalogo

@router.delete("/catalogos/{catalogo_id}", status_code=204)
def delete_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    """Eliminar un catálogo"""
    db_catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not db_catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    
    db.delete(db_catalogo)
    db.commit()
    return None

@router.post("/catalogos/{catalogo_id}/items", response_model=schemas.CatalogoWithItems)
def add_items_to_catalogo(catalogo_id: int, data: schemas.CatalogoItemAdd, db: Session = Depends(get_db)):
    """Añadir items a un catálogo"""
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    
    for item_id in data.item_ids:
        item = db.query(models.Item).filter(models.Item.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} no encontrado")
        if item not in catalogo.items:
            catalogo.items.append(item)
    
    db.commit()
    db.refresh(catalogo)
    return catalogo

@router.delete("/catalogos/{catalogo_id}/items/{item_id}", status_code=204)
def remove_item_from_catalogo(catalogo_id: int, item_id: int, db: Session = Depends(get_db)):
    """Remover un item de un catálogo"""
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    if item in catalogo.items:
        catalogo.items.remove(item)
        db.commit()
    
    return None