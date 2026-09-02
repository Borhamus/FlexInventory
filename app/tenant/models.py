from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, Table, Numeric, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, column_property
from sqlalchemy.sql import func, select
from app.db_config import TenantBase  # IMPORTANTE: cambiar Base por TenantBase

# Tabla intermedia para la relación many-to-many entre Catalogo e Item
catalogo_item = Table(
    'catalogo_item',
    TenantBase.metadata,
    Column('catalogo_id', Integer, ForeignKey('catalogo.id', ondelete='CASCADE'), primary_key=True),
    Column('item_id', Integer, ForeignKey('item.id', ondelete='CASCADE'), primary_key=True),
    Column('added_at', TIMESTAMP, server_default=func.current_timestamp())
)

class Inventario(TenantBase):
    __tablename__ = "inventario"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, index=True, nullable=False)
    atributos = Column(JSONB, default={})
    # Mapa {rol: nombre_de_atributo}, ej: {"volumen_unitario": "peso_m3"}.
    # Ver app/tenant/roles_atributos.py (Registry Pattern) para los roles válidos.
    roles_atributos = Column(JSONB, default={})
    # Lista de bloques de estadística armados por el usuario (texto editable
    # + métricas calculadas). Ver app/tenant/bloques_personalizados.py.
    bloques_personalizados = Column(JSONB, default=[])
    # Si los items de este inventario piden/muestran foto. Default True acá
    # es solo para inventarios YA EXISTENTES al migrar (no ocultarles de
    # golpe una foto que ya hayan cargado) — los inventarios nuevos siempre
    # arrancan en False salvo que el usuario tilde el checkbox al crear (ver
    # InventarioCreate.fotos_habilitadas).
    fotos_habilitadas = Column(Boolean, default=True, nullable=False)
    creado_en = Column(TIMESTAMP, server_default=func.current_timestamp())
    actualizado_en = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    items = relationship("Item", back_populates="inventario", cascade="all, delete-orphan") #esto indica la relacion uno a muchos de inventario e items

class Item(TenantBase):
    __tablename__ = "item"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    cantidad = Column(Integer, nullable=False, default=0)
    inventario_id = Column(Integer, ForeignKey('inventario.id', ondelete='CASCADE'), nullable=False, index=True)
    atributos = Column(JSONB, default={})
    # URL pública ya armada (ej. "/uploads/tenant_borhamus/items/8f3a1c2e.jpg"),
    # no solo el nombre de archivo — evita reconstruirla en cada respuesta.
    # El archivo en sí vive en disco local, no en la base. Ver app/tenant/imagenes.py.
    imagen = Column(String(500), nullable=True)
    creado_en = Column(TIMESTAMP, server_default=func.current_timestamp())
    actualizado_en = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relación: Un item pertenece a un inventario
    inventario = relationship("Inventario", back_populates="items")
    
    # Relación: Un item puede estar en muchos catálogos
    catalogos = relationship("Catalogo", secondary=catalogo_item, back_populates="items")

class Catalogo(TenantBase):
    __tablename__ = "catalogo"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), unique=True, index=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    creado_en = Column(TIMESTAMP, server_default=func.current_timestamp())
    actualizado_en = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relación: Un catálogo puede tener muchos items (de cualquier inventario)
    items = relationship("Item", secondary=catalogo_item, back_populates="catalogos")

    total_items = column_property(
        select(func.count(catalogo_item.c.item_id))
        .where(catalogo_item.c.catalogo_id == id)
        .correlate_except(catalogo_item)
        .scalar_subquery()
    )
