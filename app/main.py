
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db_config import get_db, engine, Base
from app.Core.endpoints import router as inventory_router
from app.Core.auth import router as auth_router




app = FastAPI(
    title="Stock Manager API",
    description="API para gestión de inventarios, items y catálogos"
)

app.include_router(inventory_router)
app.include_router(auth_router)

Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    """Endpoint de bienvenida"""
    return {
        "message": "Bienvenido a Stock Manager API",
        "docs": "/docs",
        "version": "1.0.0"
    }