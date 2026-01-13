from fastapi import FastAPI, status, Depends, HTTPException
import models
from database import engine, SessionLocal
from typing import Annotated
from sqlalchemy.orm import Session
import auth
from auth import get_current_user, user_dependency
from pydantic import BaseModel

app = FastAPI()
app.include_router(auth.router)

models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

@app.get("/", status_code=status.HTTP_200_OK)
async def user (user: user_dependency, db:db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail="No autorizado")
    return {"User": user}

# 1. Un modelo simple para recibir datos en el endpoint
class SimpleRequest(BaseModel):
    descripcion: str

def obtener_tenant_id(user: dict) -> int:
    return user['id'] if user['role'] == 'tenant' else user['owner_id']

@app.post("/probar/")
async def probar_logica(datos: SimpleRequest, user: user_dependency):
    tenant_id = obtener_tenant_id(user)
    return {"tenant_dueno": tenant_id}