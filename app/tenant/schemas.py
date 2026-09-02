from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, Optional, List
from datetime import datetime

# ==================== Schemas para Inventario ====================

class InventarioBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    atributos: Dict[str, Any] = Field(default_factory=dict)

class InventarioCreate(InventarioBase):
    # Si el usuario no tilda el checkbox al crear, arranca en False — no
    # tiene sentido mostrarle un campo de foto en cada item si nunca lo va
    # a usar. Se puede prender/apagar después desde Editar Inventario.
    fotos_habilitadas: bool = False

class InventarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    atributos: Optional[Dict[str, Any]] = None
    defaults: Optional[Dict[str, Any]] = None
    fotos_habilitadas: Optional[bool] = None

class InventarioResponse(InventarioBase):
    id: int
    fotos_habilitadas: bool = False
    roles_atributos: Dict[str, str] = Field(default_factory=dict)
    bloques_personalizados: List[Dict[str, Any]] = Field(default_factory=list)
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)

class InventarioWithItems(InventarioResponse):
    items: List["ItemResponse"] = []

# ==================== Schema para roles de atributo ====================
# Configura qué atributo del inventario cumple un rol especial (ej: volumen
# unitario, fecha de reposición). Es un reemplazo completo del mapa vigente,
# no un merge parcial — mismo criterio que ya usa "atributos" en
# InventarioUpdate: se manda el estado completo que se quiere dejar.

class RolesAtributosUpdate(BaseModel):
    roles_atributos: Dict[str, str] = Field(default_factory=dict)

# ==================== Schemas para bloques personalizados ====================
# Un bloque = una plantilla de texto editable + una o más métricas
# calculadas (contar/sumar/promediar un atributo, con filtro opcional).
# Se valida en app/tenant/bloques_personalizados.py; acá solo se define la
# forma laxa del payload (Dict[str, Any] por métrica) porque el shape real
# depende de la operación (count no lleva "atributo", por ejemplo).

class BloquePersonalizado(BaseModel):
    nombre: str = Field(..., min_length=1)
    plantilla: str = Field(..., min_length=1)
    metricas: List[Dict[str, Any]] = Field(default_factory=list)

class BloquesPersonalizadosUpdate(BaseModel):
    bloques_personalizados: List[BloquePersonalizado] = Field(default_factory=list)

class BloqueCalculado(BaseModel):
    nombre: str
    plantilla: str
    valores: Dict[str, Any]

# ==================== Schemas para estadísticas de inventario ====================
# Todos los campos numéricos/fecha son opcionales porque cada tipo de atributo
# solo llena el subconjunto que le corresponde (un string no tiene "promedio",
# un boolean no tiene "proxima_fecha").

class AtributoStats(BaseModel):
    tipo: str
    con_valor: int
    # numérico (integer/float)
    promedio: Optional[float] = None
    suma: Optional[float] = None
    minimo: Optional[float] = None
    maximo: Optional[float] = None
    # boolean
    verdaderos: Optional[int] = None
    falsos: Optional[int] = None
    # date
    proxima_fecha: Optional[str] = None
    ultima_fecha: Optional[str] = None
    dias_restantes: Optional[int] = None

class VolumenTotalStats(BaseModel):
    atributo: str
    volumen_total: Optional[float] = None
    items_con_valor: int

class InventarioStatsResponse(BaseModel):
    total_items: int
    atributos: Dict[str, AtributoStats]
    # Solo presente si el inventario tiene configurado el rol volumen_unitario (Fase 1).
    # Sin unidad hardcodeada: el sistema es genérico, la unidad (m³ u otra) la
    # define el usuario al elegir qué atributo cumple ese rol.
    volumen_total: Optional[VolumenTotalStats] = None

# ==================== Schema para alertas de vencimiento ====================
# Reutiliza el rol fecha_reposicion (Fase 1) — no es un concepto nuevo,
# es la misma configuración leída para armar una vista de "qué está por vencer".

class AlertaVencimiento(BaseModel):
    item_id: int
    item_nombre: str
    inventario_id: int
    inventario_nombre: str
    fecha_vencimiento: str
    dias_restantes: int
    proveedor: Optional[str] = None

# ==================== Schemas para mediana/histograma (Fase 3) ====================

class HistogramaBucket(BaseModel):
    desde: float
    hasta: float
    frecuencia: int

class HistogramaMedianaResponse(BaseModel):
    atributo: str
    con_valor: int
    minimo: Optional[float] = None
    maximo: Optional[float] = None
    mediana: Optional[float] = None
    n_intervalos: int
    ancho_intervalo: Optional[float] = None
    histograma: List[HistogramaBucket]

class PromedioRangoResponse(BaseModel):
    atributo: str
    desde: float
    hasta: float
    promedio: Optional[float] = None
    cantidad: int

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
    # URL pública ya armada (o None si no tiene foto). Se gestiona aparte
    # con POST/DELETE /items/{id}/imagen — nunca se manda por ItemCreate
    # ni ItemUpdate (subir un archivo no encaja en un body JSON).
    imagen: Optional[str] = None
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
    total_items: int

    model_config = ConfigDict(from_attributes=True)

class CatalogoWithItems(CatalogoResponse):
    items: List[ItemResponse] = []

# ==================== Schema para añadir items a catálogos ====================

class CatalogoItemAdd(BaseModel):
    item_ids: List[int] = Field(..., min_length=1)

# ==================== Schemas para operaciones masivas de Items ====================

class ItemBulkUpdate(BaseModel):
    item_ids: List[int] = Field(..., min_length=1)
    atributos: Dict[str, Any] = Field(..., min_length=1)

class BulkUpdateResponse(BaseModel):
    actualizados: int

class ItemBulkDelete(BaseModel):
    item_ids: List[int] = Field(..., min_length=1)

class BulkDeleteResponse(BaseModel):
    eliminados: int
    ids: List[int]