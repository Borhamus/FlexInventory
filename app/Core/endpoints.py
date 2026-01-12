

# ==================== ENDPOINTS DE INVENTARIO ====================

@app.post("/inventarios/", response_model=schemas.InventarioResponse, status_code=201)
def create_inventario(inventario: schemas.InventarioCreate, db: Session = Depends(get_db)):
    db_inventario = db.query(models.Inventario).filter(models.Inventario.nombre == inventario.nombre).first()
    if db_inventario:
        raise HTTPException(status_code=400, detail="El inventario ya existe")
    
    new_inventario = models.Inventario(**inventario.model_dump())
    db.add(new_inventario)
    db.commit()
    db.refresh(new_inventario)
    return new_inventario

@app.get("/inventarios/all", response_model=List[schemas.InventarioResponse])
def get_inventarios(db: Session = Depends(get_db)):
    inventarios = db.query(models.Inventario).all()
    return inventarios

@app.get("/inventarios/{inventario_id}", response_model=schemas.InventarioResponse)
def get_inventario(inventario_id: int, db: Session = Depends(get_db)):                
    inventario = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    return inventario

@app.put("/inventarios/{inventario_id}", response_model=schemas.InventarioResponse)
def update_inventario(inventario_id: int, inventario: schemas.InventarioUpdate, db: Session = Depends(get_db)):
    db_inventario = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not db_inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    update_data = inventario.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_inventario, field, value)
    
    db.commit()
    db.refresh(db_inventario)
    return db_inventario

@app.delete("/inventarios/{inventario_id}", status_code=204)
def delete_inventario(inventario_id: int, db: Session = Depends(get_db)):
    db_inventario = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not db_inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    db.delete(db_inventario)
    db.commit()
    return None

# ==================== ENDPOINTS DE ITEMS ====================

@app.post("/items/", response_model=schemas.ItemResponse, status_code=201)
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

@app.get("/items/", response_model=List[schemas.ItemResponse])
def get_items(inventario_id: int = None, db: Session = Depends(get_db)):
    """Obtener todos los items, opcionalmente filtrados por inventario"""
    query = db.query(models.Item)
    if inventario_id:
        query = query.filter(models.Item.inventario_id == inventario_id)
    items = query.all()
    return items

@app.get("/items/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return item

@app.put("/items/{item_id}", response_model=schemas.ItemResponse)
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

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Eliminar un item"""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    db.delete(db_item)
    db.commit()
    return None

# ==================== ENDPOINTS DE CATÁLOGOS ====================

@app.post("/catalogos/", response_model=schemas.CatalogoResponse, status_code=201)
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

@app.get("/catalogos/", response_model=List[schemas.CatalogoResponse])
def get_catalogos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener todos los catálogos"""
    catalogos = db.query(models.Catalogo).offset(skip).limit(limit).all()
    return catalogos

@app.get("/catalogos/{catalogo_id}", response_model=schemas.CatalogoWithItems)
def get_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    """Obtener un catálogo por ID con sus items"""
    catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    return catalogo

@app.put("/catalogos/{catalogo_id}", response_model=schemas.CatalogoResponse)
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

@app.delete("/catalogos/{catalogo_id}", status_code=204)
def delete_catalogo(catalogo_id: int, db: Session = Depends(get_db)):
    """Eliminar un catálogo"""
    db_catalogo = db.query(models.Catalogo).filter(models.Catalogo.id == catalogo_id).first()
    if not db_catalogo:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    
    db.delete(db_catalogo)
    db.commit()
    return None

@app.post("/catalogos/{catalogo_id}/items", response_model=schemas.CatalogoWithItems)
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

@app.delete("/catalogos/{catalogo_id}/items/{item_id}", status_code=204)
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