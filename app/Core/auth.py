from datetime import datetime, timedelta, timezone
from typing import Annotated
from collections import defaultdict, deque
import os
import time
import threading
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from app.Core.models import Users, UserRole, RolePermission, Tenant
from app.db_config import get_db


# ==========================================
# Configuración JWT
# ==========================================
router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Fallar al arranque en vez de firmar tokens con clave None
    raise RuntimeError("La variable de entorno SECRET_KEY es obligatoria.")
ALGORITHM  = "HS256"

ACCESS_TOKEN_MINUTES = 30
REFRESH_TOKEN_DAYS   = 7
# En producción (HTTPS) setear COOKIE_SECURE=true para que la cookie
# del refresh token solo viaje por conexiones seguras.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

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
# Rate limiting simple (in-memory) para login
# ==========================================
_LOGIN_MAX_ATTEMPTS   = 5      # intentos fallidos permitidos
_LOGIN_WINDOW_SECONDS = 60     # dentro de esta ventana
_login_attempts: dict[str, deque] = defaultdict(deque)
_login_lock = threading.Lock()


def _rate_limit_key(request: Request, username: str) -> str:
    client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}:{username}"


def check_login_rate_limit(request: Request, username: str) -> None:
    """Lanza 429 si hubo demasiados intentos fallidos recientes para esta IP+usuario."""
    key = _rate_limit_key(request, username)
    now = time.monotonic()
    with _login_lock:
        attempts = _login_attempts[key]
        while attempts and now - attempts[0] > _LOGIN_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Esperá un minuto e intentá de nuevo.",
            )


def register_failed_login(request: Request, username: str) -> None:
    key = _rate_limit_key(request, username)
    with _login_lock:
        _login_attempts[key].append(time.monotonic())


def clear_login_attempts(request: Request, username: str) -> None:
    key = _rate_limit_key(request, username)
    with _login_lock:
        _login_attempts.pop(key, None)


# ==========================================
# Helpers JWT
# ==========================================
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(Users).filter(Users.username == username).first()
    if not user or not bcrypt_context.verify(password, user.hashed_password):
        return False
    # Un usuario desactivado no puede iniciar sesión
    if not user.is_active:
        return False
    return user


def create_access_token(user: Users, expires_delta: timedelta) -> str:
    payload = {
        "sub":       user.username,
        "id":        user.id,
        "role":      user.role,
        "tenant_id": user.tenant_id,
        "type":      "access",
    }
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user: Users) -> str:
    """Token de larga duración, solo válido para renovar el access token.

    Viaja exclusivamente en una cookie httpOnly (inaccesible para JS → XSS no
    puede robarlo) con path=/auth, así que el navegador solo la envía a los
    endpoints de auth.
    """
    payload = {
        "sub":  user.username,
        "id":   user.id,
        "type": "refresh",
        "exp":  datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,            # inaccesible desde JavaScript
        samesite="lax",           # mitiga CSRF: no viaja en POSTs cross-site
        secure=COOKIE_SECURE,
        max_age=REFRESH_TOKEN_DAYS * 24 * 3600,
        path="/auth",             # solo se envía a los endpoints /auth/*
    )


async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]) -> dict:
    try:
        payload   = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username  = payload.get("sub")
        user_id   = payload.get("id")
        role      = payload.get("role")
        tenant_id = payload.get("tenant_id")

        # Un refresh token NO sirve como access token
        if payload.get("type") == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tipo de token inválido.",
                headers={"WWW-Authenticate": "Bearer"},
            )

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


def _get_active_user_or_401(user_id: int, db: Session) -> Users:
    """Resuelve el usuario del token y verifica que siga activo.

    Un token sigue siendo válido hasta 30 min después de emitido; sin este
    chequeo, un usuario desactivado podría seguir operando sobre su perfil.
    """
    db_user = db.query(Users).filter(Users.id == user_id).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo.",
        )
    return db_user


# ==========================================
# Endpoints
# ==========================================
@router.post("/token", response_model=Token)
async def login(login_data: LoginRequest, db: db_dependency, request: Request, response: Response):
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
    check_login_rate_limit(request, login_data.username)
    user = authenticate_user(login_data.username, login_data.password, db)
    if not user:
        register_failed_login(request, login_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos.",
        )
    clear_login_attempts(request, login_data.username)
    set_refresh_cookie(response, create_refresh_token(user))
    return {"access_token": create_access_token(user, timedelta(minutes=ACCESS_TOKEN_MINUTES)),
            "token_type": "bearer"}


@router.post("/token-form", response_model=Token, include_in_schema=False)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency,
    request: Request,
    response: Response,
):
    """Endpoint oculto — mantiene el botón Authorize de Swagger funcional."""
    check_login_rate_limit(request, form_data.username)
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        register_failed_login(request, form_data.username)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario o contraseña incorrectos.")
    clear_login_attempts(request, form_data.username)
    set_refresh_cookie(response, create_refresh_token(user))
    return {"access_token": create_access_token(user, timedelta(minutes=ACCESS_TOKEN_MINUTES)),
            "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
async def refresh_access_token(request: Request, response: Response, db: db_dependency):
    """
    Renueva el access token usando el refresh token de la cookie httpOnly.

    El frontend lo llama automáticamente cuando un request devuelve 401 (o al
    recargar la página) para mantener la sesión activa sin re-login. La cookie
    se rota en cada renovación (ventana deslizante de 7 días).
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="No hay sesión activa.")
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Sesión inválida o expirada.")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Tipo de token inválido.")

    # Verificar contra la BD que el usuario siga existiendo y activo
    user = db.query(Users).filter(Users.id == payload.get("id")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario no encontrado o inactivo.")

    set_refresh_cookie(response, create_refresh_token(user))  # rotación
    return {"access_token": create_access_token(user, timedelta(minutes=ACCESS_TOKEN_MINUTES)),
            "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Cierra la sesión eliminando la cookie del refresh token."""
    response.delete_cookie("refresh_token", path="/auth")


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
    db_user = _get_active_user_or_401(user["id"], db)
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
    db_user = _get_active_user_or_401(user["id"], db)
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
    db_user = _get_active_user_or_401(user["id"], db)
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

@router.get("/me/stats", status_code=200)
async def get_dashboard_stats(
    user: user_dependency,
    db: db_dependency,
):
    """
    Devuelve estadísticas generales del tenant para el dashboard de inicio.
    Accesible por cualquier usuario autenticado.
    """
    from app.tenant.models import Inventario, Item, Catalogo
    from app.db_config import get_tenant_db_context

    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(404, detail="Usuario no encontrado.")

    tenant = db.query(Tenant).filter(Tenant.id == db_user.tenant_id).first()

    # Contar empleados en schema public
    total_empleados = db.query(Users).filter(
        Users.tenant_id == db_user.tenant_id,
        Users.role      != "tenant",
    ).count()

    # Contar inventarios, items y catálogos en el schema del tenant
    with get_tenant_db_context(tenant.schema_name) as tenant_db:
        total_inventarios = tenant_db.query(Inventario).count()
        total_items       = tenant_db.query(Item).count()
        total_catalogos   = tenant_db.query(Catalogo).count()

    return {
        "username":          db_user.username,
        "total_inventarios": total_inventarios,
        "total_items":       total_items,
        "total_catalogos":   total_catalogos,
        "total_empleados":   total_empleados,
    }