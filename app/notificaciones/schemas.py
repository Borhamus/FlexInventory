# app/notificaciones/schemas.py
from pydantic import BaseModel, ConfigDict, field_serializer
from datetime import datetime, timezone
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

    # Las columnas de fecha son DateTime SIN zona: se guarda
    # datetime.now(timezone.utc) y la base lo deja como timestamp naive en
    # UTC. Serializado así ("2026-09-15T14:03:54", sin offset) el navegador
    # lo tomaba como hora LOCAL y la columna "Cuándo" mostraba "en 3 horas"
    # en Argentina. Se marca explícitamente como UTC ("...+00:00") para que
    # dayjs lo convierta a la zona del usuario.
    @field_serializer("creada_en", "resuelta_en", "leida_en")
    def _fecha_utc(self, fecha: Optional[datetime]) -> Optional[str]:
        if fecha is None:
            return None
        if fecha.tzinfo is None:
            fecha = fecha.replace(tzinfo=timezone.utc)
        return fecha.isoformat()


class PaginatedNotificacionesResponse(BaseModel):
    items: List[NotificacionResponse]
    total: int


class MarcarLeidaRequest(BaseModel):
    leida: bool = True


class NoLeidasCountResponse(BaseModel):
    count: int


class MarcarTodasLeidasResponse(BaseModel):
    actualizadas: int
