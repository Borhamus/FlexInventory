from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import Users
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import JWTError, jwt
import enum


# ==========================================
# Core de autenticación y autorización
# ==========================================
router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

SECRET_KEY = 'fdgth654f0ghj156fdg4h05fgh1510sfd2g1t2j15ñ41fg2h10sd5f4jui4'
ALGORITHM = 'HS256'

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

# ==========================================
# Clases
# ==========================================
class UserRole(str, enum.Enum):
    tenant = "tenant"
    administrator = "administrator"
    employee = "employee"

class RegisterRequest(BaseModel): 
    username: str
    password: str

class CreateEmployeeRequest(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.employee  # Por defecto es empleado

class Token(BaseModel):
    access_token: str
    token_type: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# Funciones
# ==========================================
def authenticate_user(username: str, password: str, db):
    user = db.query(Users).filter(Users.username == username).first()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(user: Users, expires_delta: timedelta):
    encode = {
        "sub": user.username, 
        "id": user.id,
        "role": user.role, 
        "owner_id": user.owner_id
    }
    expires = datetime.utcnow() + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        role: str = payload.get("role")
        owner_id: int = payload.get("owner_id")
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
        return {
            "username": username, 
            "id": user_id, 
            "role": role, 
            "owner_id": owner_id
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
 
# ==========================================
# Dependencias
# ==========================================
db_dependency = Annotated[Session, Depends(get_db)]

user_dependency = Annotated[dict, Depends(get_current_user)]

# ==========================================
# Endpoints
# ==========================================
# 3. ENDPOINT PÚBLICO: "Crear cuenta" (Siempre Tenant)
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_tenant(db: db_dependency, create_user_request: RegisterRequest): 
    # Se crea como Tenant (owner_id = None)
    create_user_model = Users(
        username=create_user_request.username,
        hashed_password=bcrypt_context.hash(create_user_request.password),
        role=UserRole.tenant,
        owner_id=None 
    )
    db.add(create_user_model)
    db.commit()
    return {"message": "Cuenta de Tenant creada exitosamente"}

@router.post("/create-employee", status_code=status.HTTP_201_CREATED)
async def create_employee(
    user: user_dependency, 
    db: db_dependency, 
    create_employee_request: CreateEmployeeRequest
):
    if user['role'] != UserRole.tenant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo Tenant puede crear usuarios.")
    
    create_user_model = Users(
        username=create_employee_request.username,
        hashed_password=bcrypt_context.hash(create_employee_request.password),
        role=create_employee_request.role, # Usamos el rol que enviamos
        owner_id=user['id']
    )
    db.add(create_user_model)
    db.commit()
    
    return {"message": f"Usuario {create_employee_request.role} creado exitosamente"}


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], 
                                 db: db_dependency):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password")
    
    token = create_access_token(user, timedelta(minutes=30))
    
    return {"access_token": token, "token_type": "bearer"}

@router.get("/my-employees", status_code=status.HTTP_200_OK)
async def get_my_employees(user: user_dependency, db: db_dependency):
    
    # 1. Validar que sea Tenant
    if user['role'] != UserRole.tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acceso denegado. Solo los Tenant pueden ver esta lista."
        )

    # 2. Obtener mis datos (El Tenant Dueño)
    current_tenant = db.query(Users).filter(Users.id == user['id']).first()
    tenant_name = current_tenant.username

    # 3. Obtener todo el personal
    staff_list = db.query(Users).filter(Users.owner_id == user['id']).all()

    # 4. Separar en listas distintas
    administrators_list = []
    employees_list = []

    for person in staff_list:
        # Formato string
        person_info = f"{person.username}({person.role})"
        
        if person.role == UserRole.administrator:
            administrators_list.append(person_info)
        elif person.role == UserRole.employee:
            employees_list.append(person_info)

    # 5. Devolver estructura jerárquica
    return {
        "Tenant": tenant_name,
        "Administrators": administrators_list,
        "Employees": employees_list
    }