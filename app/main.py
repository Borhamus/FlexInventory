from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.db_config import engine, Base, TenantBase
from app.tenant.imagenes import UPLOADS_DIR
from app.Core.endpoints import router as tenant_router
from app.Core.auth import router as auth_router
from app.Core.roles import router as roles_router
from app.tenant.inventarios import router as inventarios_router
from app.tenant.estadisticas import router as estadisticas_router
from app.tenant.items import router as items_router
from app.tenant.catalogos import router as catalogos_router
from app.database_manager.router import router as database_router
from app.Core import models as core_models  # registra modelos en Base
from app.auditoria.router import router as auditoria_router
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database_manager.scheduler import init_scheduler, shutdown_scheduler
from app.database_manager.migraciones import run_migrations


# ── Lifespan: migra schemas de tenants, arranca y apaga el scheduler ────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()       # agrega columnas nuevas a tenants ya existentes
    init_scheduler()       # arranca APScheduler y carga los jobs
    yield
    shutdown_scheduler()   # apaga APScheduler limpiamente


app = FastAPI(
    title="Stock Manager API — Multi-tenant",
    description="API para gestión de inventarios con soporte multi-tenant",
    version="3.0.0",
    lifespan=lifespan,  # ← reemplaza los @app.on_event deprecated
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 2. Agrega el middleware a la aplicación
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Permite el acceso desde tu frontend
    allow_credentials=True,           # Permite el envío de cookies/auth headers
    allow_methods=["*"],               # Permite todos los métodos (GET, POST, etc.)
    allow_headers=["*"],               # Permite todos los encabezados
)

app.include_router(auth_router)        # /auth/*
app.include_router(tenant_router)      # /tenants/*       ← requiere X-Developer-Key
app.include_router(roles_router)       # /roles/*, /empleados/*
app.include_router(inventarios_router)  # /inventarios/*
app.include_router(estadisticas_router) # /inventarios/{id}/stats
app.include_router(items_router)       # /items/*
app.include_router(catalogos_router)   # /catalogos/*
app.include_router(database_router)    # /database/*
app.include_router(auditoria_router)   # /auditoria/*

# Fotos de items: servidas directo del disco, sin pasar por un endpoint de
# la API. La URL random (uuid) hace de "difícil de adivinar" ya que este
# proyecto no usa cookies de sesión — un <img src> no puede mandar el
# Authorization Bearer que sí usa el resto de la API. Ver app/tenant/imagenes.py.
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Crea tablas del schema public: tenants, users, custom_roles, role_permissions
Base.metadata.create_all(bind=engine)