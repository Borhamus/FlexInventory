from app.models import models
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db_config import get_db, engine, Base
from app.schemas import schemas
from app.validators import validate_item_attributes

# Crear las tablas (si usas Alembic para migraciones, comenta esta línea)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Stock Manager API",
    description="API para gestión de inventarios, items y catálogos"
)


@app.get("/")
def read_root():
    """Endpoint de bienvenida"""
    return {
        "message": "Bienvenido a Stock Manager API",
        "docs": "/docs",
        "version": "1.0.0"
    }