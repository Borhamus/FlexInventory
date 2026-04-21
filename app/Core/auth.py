from datetime import datetime, timedelta, timezone
from typing import Annotated
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from app.Core.models import Users, UserRole, RolePermission
from app.db_config import get_db


# ==========================================
# Configuración JWT
# ==========================================
router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl apunta al endpoint form para que el botón "Authorize" de Swagger funcione
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="/auth/token-form")


# ==========================================
# Schemas
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str

class UpdateProfileRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class ChangeOwnPasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ==========================================
# Helpers JWT
# ==========================================
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(Users).filter(Users.username == username).first()
    if not user or not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user


def create_access_token(user: Users, expires_delta: timedelta) -> str:
    payload = {
        "sub":       user.username,
        "id":        user.id,
        "role":      user.role,
        "tenant_id": user.tenant_id,
    }
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]) -> dict:
    try:
        payload   = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username  = payload.get("sub")
        user_id   = payload.get("id")
        role      = payload.get("role")
        tenant_id = payload.get("tenant_id")

        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: faltan campos obligatorios.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"username": username, "id": user_id, "role": role, "tenant_id": tenant_id}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar el token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==========================================
# Dependencias tipadas
# ==========================================
db_dependency   = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,    Depends(get_current_user)]


# ==========================================
# Endpoints
# ==========================================
@router.post("/token", response_model=Token)
async def login(login_data: LoginRequest, db: db_dependency):
    """
    Autentica un usuario y devuelve un JWT válido por 30 minutos.

    El token debe enviarse en el header `Authorization: Bearer <token>` en todos
    los endpoints protegidos.

    **Ejemplo de request:**
    ```json
    { "username": "juan", "password": "miPassword123" }
    ```

    **Ejemplo de response:**
    ```json
    { "access_token": "eyJhbGci...", "token_type": "bearer" }
    ```
    """
    user = authenticate_user(login_data.username, login_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos.",
        )
    return {"access_token": create_access_token(user, timedelta(minutes=30)),
            "token_type": "bearer"}


@router.post("/token-form", response_model=Token, include_in_schema=False)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency,
):
    """Endpoint oculto — mantiene el botón Authorize de Swagger funcional."""
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario o contraseña incorrectos.")
    return {"access_token": create_access_token(user, timedelta(minutes=30)),
            "token_type": "bearer"}


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_me(user: user_dependency):
    """
    Devuelve la información del usuario autenticado según su token JWT.

    Útil para verificar qué usuario está activo en la sesión actual y conocer
    su `tenant_id` y `role`.

    **Ejemplo de response:**
    ```json
    {
      "username": "juan",
      "id": 4,
      "role": "employee",
      "tenant_id": 2
    }
    ```
    """
    return user

@router.get("/me/profile", status_code=200)
async def get_my_profile(user: user_dependency, db: db_dependency):
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return {
        "id":             db_user.id,
        "username":       db_user.username,
        "email":          db_user.email,
        "role":           db_user.role,
        "custom_role_id": db_user.custom_role_id,  # ← esta línea
    }

@router.patch("/me/username", status_code=200)
async def update_my_username(
    body: UpdateProfileRequest,
    user: user_dependency,
    db: db_dependency,
):
    """Cambia el username del usuario autenticado."""
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(404, detail="Usuario no encontrado.")
    if db.query(Users).filter(Users.username == body.username, Users.id != user["id"]).first():
        raise HTTPException(400, detail="Ese nombre de usuario ya está en uso.")
    db_user.username = body.username
    db.commit()
    db.refresh(db_user)
    return {"username": db_user.username}

@router.patch("/me/password", status_code=204)
async def change_my_password(
    body: ChangeOwnPasswordRequest,
    user: user_dependency,
    db: db_dependency,
):
    """Cambia la contraseña del usuario autenticado verificando la contraseña actual."""
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(404, detail="Usuario no encontrado.")
    if not bcrypt_context.verify(body.current_password, db_user.hashed_password):
        raise HTTPException(400, detail="La contraseña actual es incorrecta.")
    db_user.hashed_password = bcrypt_context.hash(body.new_password)
    db.commit()

@router.get("/me/permissions", status_code=200)
async def get_my_permissions(user: user_dependency, db: db_dependency):
    """Devuelve los permisos del usuario autenticado según su rol asignado."""
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user or not db_user.custom_role_id:
        return {"permissions": []}
    
    perms = db.query(RolePermission).filter(
        RolePermission.role_id == db_user.custom_role_id
    ).all()
    
    return {
        "permissions": [
            {"resource": p.resource, "action": p.action}
            for p in perms
        ]
    }