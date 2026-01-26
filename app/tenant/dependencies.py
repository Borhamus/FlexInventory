from typing import Annotated
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant, Users
from app.Core.auth import get_current_user

async def get_tenant_from_header(
    x_tenant_id: Annotated[str, Header()],
    db: Session = Depends(get_db)
) -> Tenant:
    """
    Obtener tenant desde el header X-Tenant-ID
    
    Raises:
        HTTPException 400 si no se proporciona el header
        HTTPException 404 si el tenant no existe
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header X-Tenant-ID es requerido"
        )
    
    tenant = db.query(Tenant).filter(
        Tenant.tenant_id == x_tenant_id,
        Tenant.is_active == True
    ).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant no encontrado o inactivo"
        )
    
    return tenant

def get_tenant_db(tenant: Annotated[Tenant, Depends(get_tenant_from_header)]):
    """
    Generator para obtener sesión de BD configurada con el schema del tenant
    
    Usage:
        @router.get("/items")
        def get_items(db: Session = Depends(get_tenant_db)):
            items = db.query(Item).all()
    """
    with get_tenant_db_context(tenant.schema_name) as db:
        yield db

async def verify_user_belongs_to_tenant(
    current_user: Annotated[dict, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_tenant_from_header)],
    db: Session = Depends(get_db)
):
    """
    Verificar que el usuario pertenezca al tenant solicitado
    
    Raises:
        HTTPException 403 si el usuario no pertenece al tenant
    """
    # Obtener el usuario completo
    user = db.query(Users).filter(Users.id == current_user['id']).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )
    
    if user.tenant_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este tenant"
        )
    
    return {"user": user, "tenant": tenant} 