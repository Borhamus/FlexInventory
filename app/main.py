from fastapi import FastAPI
from app.db_config import engine, Base, TenantBase
from app.tenant.endpoints import router as inventory_router
from app.Core.endpoints import router as tenant_router
from app.Core.auth import router as auth_router
from app.Core import models as core_models  # Importar para que se registren

app = FastAPI(
    title="Stock Manager API - Multi-tenant",
    description="API para gestión de inventarios con soporte multi-tenant",
    version="2.0.0"
)

app.include_router(tenant_router)
app.include_router(inventory_router)
app.include_router(auth_router)

# SOLO crear tablas del schema public (tenants y users)
Base.metadata.create_all(bind=engine)

# NO crear las tablas de TenantBase aquí
# Esas se crean cuando se crea cada tenant

@app.get("/")
def read_root():
    """Endpoint de bienvenida"""
    return {
        "message": "Bienvenido a Stock Manager API Multi-tenant",
        "docs": "/docs",
        "version": "2.0.0",
        "endpoints": {
            "tenants": "/tenants - Gestión de tenants",
            "auth": "/auth - Autenticación",
            "inventory": "/inventarios, /items, /catalogos - Gestión de inventario"
        }
    }