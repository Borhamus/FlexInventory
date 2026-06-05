from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone
from app.db_config import TenantBase 

class AuditLog(TenantBase):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, index=True, nullable=False)
    usuario = Column(String) 
    endpoint = Column(String, index=True)
    metodo = Column(String)
    accion = Column(String) 
    fecha = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    payload_cambios = Column(JSONB, nullable=True)