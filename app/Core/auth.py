from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from app.Core.models import Users, UserRole
from app.db_config import get_db


# ==========================================
# Configuración JWT
# ==========================================
router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = "fdgth654f0ghj156fdg4h05fgh1510sfd2g1t2j15ñ41fg2h10sd5f4jui4"
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


class CreateEmployeeRequest(BaseModel):
    username: str
    password: str
    email: str | None = None
    role: UserRole = UserRole.viewer


# ==========================================
# Helpers JWT
# ==========================================
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(Users).filter(Users.username == username).first()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user


def create_access_token(user: Users, expires_delta: timedelta) -> str:
    payload = {
        "sub":       user.username,
        "id":        user.id,
        "role":      user.role,
        "tenant_id": user.tenant_id,
    }
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# UNICA definicion — sin duplicados
async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]) -> dict:
    try:
        payload    = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username   = payload.get("sub")
        user_id    = payload.get("id")
        role       = payload.get("role")
        tenant_id  = payload.get("tenant_id")

        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido: faltan campos obligatorios.",
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
# Helpers de permisos
# ==========================================
def require_tenant_owner(user: dict):
    if user["role"] != UserRole.tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el dueno del tenant puede realizar esta accion.",
        )


def require_admin_or_owner(user: dict):
    if user["role"] not in (UserRole.tenant, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol admin o tenant para esta accion.",
        )


# ==========================================
# Endpoints
# ==========================================
@router.post("/token", response_model=Token)
async def login_for_access_token(
    login_data: LoginRequest,
    db: db_dependency,
):
    """
    Login con JSON. Devuelve JWT.

    ```json
    { "username": "mi_usuario", "password": "mi_contrasena" }
    ```
    """
    user = authenticate_user(login_data.username, login_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos.",
        )
    token = create_access_token(user, timedelta(minutes=30))
    return {"access_token": token, "token_type": "bearer"}


@router.post("/token-form", response_model=Token, include_in_schema=False)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency,
):
    """
    Endpoint oculto que mantiene el botón 'Authorize' de Swagger funcional.
    Usa el mismo form data que espera OAuth2PasswordRequestForm (solo username y password).
    """
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos.",
        )
    token = create_access_token(user, timedelta(minutes=30))
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_me(user: user_dependency):
    """Diagnostico: muestra los datos del token actual"""
    return user


@router.post("/create-employee", status_code=status.HTTP_201_CREATED)
async def create_employee(
    user: user_dependency,
    db: db_dependency,
    req: CreateEmployeeRequest,
):
    require_tenant_owner(user)

    if db.query(Users).filter(Users.username == req.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya esta en uso.")

    if req.email and db.query(Users).filter(Users.email == req.email).first():
        raise HTTPException(status_code=400, detail="El email ya esta registrado.")

    new_user = Users(
        username        = req.username,
        hashed_password = bcrypt_context.hash(req.password),
        email           = req.email,
        role            = req.role,
        tenant_id       = user["tenant_id"],
        is_active       = True,
    )
    db.add(new_user)
    db.commit()
    return {
        "message":   f"Empleado '{req.username}' creado con rol '{req.role}'.",
        "tenant_id": user["tenant_id"],
    }


@router.get("/my-employees", status_code=status.HTTP_200_OK)
async def get_my_employees(user: user_dependency, db: db_dependency):
    require_tenant_owner(user)

    employees = (
        db.query(Users)
        .filter(Users.tenant_id == user["tenant_id"], Users.role != UserRole.tenant)
        .all()
    )

    return {
        "tenant_id": user["tenant_id"],
        "owner":     user["username"],
        "employees": [
            {"username": e.username, "role": e.role, "is_active": e.is_active}
            for e in employees
        ],
    }