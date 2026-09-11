"""
app/notificaciones/models.py
─────────────────────────────
Notificacion: una fila por cada vez que un ítem cruza (o deja de cruzar) una
regla configurada en Inventario.notificaciones_config. Estilo plano, mismo
criterio que AuditLog — sin relaciones declaradas, texto ya prerenderizado.

Índice único parcial: a lo sumo una notificación ACTIVA (resuelta_en IS NULL)
por combinación item+origen+atributo. Es lo que hace cumplible a nivel de
base el "una sola vez hasta resolverse" (no solo por convención de la app) —
ver _sincronizar_estado en motor.py.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, text
from datetime import datetime, timezone
from app.db_config import TenantBase


class Notificacion(TenantBase):
    __tablename__ = "notificacion"
    __table_args__ = (
        Index(
            "uq_notificacion_activa_item_atributo",
            "item_id", "origen", "atributo",
            unique=True,
            postgresql_where=text("resuelta_en IS NULL"),
        ),
    )

    id      = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("item.id", ondelete="CASCADE"), nullable=False, index=True)

    # "atributo" | "cantidad" — de dónde salió la señal.
    origen = Column(String(20), nullable=False)
    # Nombre del atributo, o el literal "cantidad" cuando origen="cantidad".
    # Nunca NULL a propósito: un NULL en la columna del índice único no se
    # considera igual a otro NULL en Postgres, así que dos notificaciones de
    # "cantidad" activas para el mismo ítem no chocarían entre sí si esta
    # columna fuera nullable — se pierde la garantía del índice.
    atributo = Column(String(255), nullable=False)

    tipo   = Column(String(20), nullable=False)  # "fecha" | "numero"
    evento = Column(String(20), nullable=False)  # "recordatorio" | "vencido" | "minimo" | "maximo"

    mensaje          = Column(String, nullable=False)
    valor_detectado  = Column(String, nullable=True)

    creada_en   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resuelta_en = Column(DateTime, nullable=True)  # NULL = activa

    leida    = Column(Boolean, default=False, nullable=False)
    leida_en = Column(DateTime, nullable=True)
