from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, Table, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
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
