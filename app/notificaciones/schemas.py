# app/notificaciones/schemas.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional


class NotificacionResponse(BaseModel):
    id: int
    item_id: int
    item_nombre: Optional[str] = None
    inventario_id: Optional[int] = None
    inventario_nombre: Optional[str] = None
    origen: str
    atributo: str
    tipo: str
    evento: str
    mensaje: str
    valor_detectado: Optional[str] = None
    creada_en: datetime
    resuelta_en: Optional[datetime] = None
    leida: bool
    leida_en: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedNotificacionesResponse(BaseModel):
    items: List[NotificacionResponse]
    total: int


class MarcarLeidaRequest(BaseModel):
    leida: bool = True


class NoLeidasCountResponse(BaseModel):
    count: int


class MarcarTodasLeidasResponse(BaseModel):
    actualizadas: int
