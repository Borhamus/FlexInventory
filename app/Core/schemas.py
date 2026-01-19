from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, Optional, List
from datetime import datetime

# ==================== Schemas para Inventario ====================

class InventarioBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=50)
    atributos: Dict[str, str] = Field(default_factory=dict)

class InventarioCreate(InventarioBase):
    pass

class InventarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=50)
    atributos: Optional[Dict[str, str]] = None

class InventarioResponse(InventarioBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)

class InventarioAtributoAdd(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    tipo: str
# ==================== Schemas para Item ====================

class ItemBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    cantidad: int = Field(..., ge=0)
    atributos: Dict[str, Any] = Field(default_factory=dict)

class ItemCreate(ItemBase):
    inventario_id: int

class ItemUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    cantidad: Optional[int] = Field(None, ge=0)
    atributos: Optional[Dict[str, Any]] = None
    inventario_id: Optional[int] = None

class ItemResponse(ItemBase):
    id: int
    inventario_id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== Schemas para Catálogo ====================

class CatalogoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    descripcion: Optional[str] = None

class CatalogoCreate(CatalogoBase):
    pass

class CatalogoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    descripcion: Optional[str] = None

class CatalogoResponse(CatalogoBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)

class CatalogoWithItems(CatalogoResponse):
    items: List[ItemResponse] = []

# ==================== Schema para añadir items a catálogos ====================

class CatalogoItemAdd(BaseModel):
    item_ids: List[int] = Field(..., min_length=1)