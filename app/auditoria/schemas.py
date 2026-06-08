# app/auditoria/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any

class AuditLogResponse(BaseModel):
    id: int
    usuario_id: int
    usuario: str
    endpoint: str
    metodo: str
    accion: str
    payload_cambios: Optional[Any] = None
    fecha: datetime
    entidad_afectada: Optional[str] = None
    resumen: Optional[str] = None

    class Config:
        from_attributes = True