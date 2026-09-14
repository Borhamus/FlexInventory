# app/auditoria/schemas.py
from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone
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

    # La columna `fecha` es DateTime SIN zona: el auditor guarda
    # datetime.now(timezone.utc) y Postgres lo deja como timestamp naive en
    # UTC. Serializado así ("2026-09-14T20:12:00", sin offset) el navegador
    # lo tomaba como hora LOCAL y mostraba los cambios 3 h adelantados en
    # Argentina. Se marca explícitamente como UTC ("...+00:00") para que
    # dayjs lo convierta a la zona del usuario.
    @field_serializer("fecha")
    def _fecha_utc(self, fecha: datetime) -> str:
        if fecha.tzinfo is None:
            fecha = fecha.replace(tzinfo=timezone.utc)
        return fecha.isoformat()
