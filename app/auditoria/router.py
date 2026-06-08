# app/auditoria/router.py
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.Core.auth import get_current_user
from app.Core.models import Users, Tenant, UserRole
from app.db_config import get_db, get_tenant_db_context
from app.auditoria.models import AuditLog
from app.auditoria.schemas import AuditLogResponse

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])

# Dependencias base
db_dep = Annotated[Session, Depends(get_db)]
user_dep = Annotated[dict, Depends(get_current_user)]

def _require_tenant_owner(current_user: user_dep, db: db_dep) -> Tenant:
    """Valida que el usuario sea dueño y devuelve su tenant."""
    if current_user["role"] != UserRole.tenant:
        raise HTTPException(status_code=403, detail="No tenés permisos para ver la auditoría.")
    
    tenant = db.query(Tenant).filter(Tenant.id == current_user["tenant_id"]).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    
    return tenant

@router.get("/", response_model=list[AuditLogResponse])
def obtener_auditorias(
    current_user: user_dep, 
    db: db_dep,
    skip: int = Query(0, ge=0, description="Registros a saltar (paginación)"),
    limit: int = Query(50, ge=1, le=100, description="Límite de registros por página")
):
    """Obtiene el historial de acciones de los empleados del tenant."""
    
    # 1. Validamos permisos y sacamos los datos del tenant
    tenant = _require_tenant_owner(current_user, db)
    
    # 2. Nos conectamos al esquema aislado de este comercio
    with get_tenant_db_context(tenant.schema_name) as tdb:
        # Traemos los registros ordenados del más nuevo al más viejo
        logs = (
            tdb.query(AuditLog)
            .order_by(desc(AuditLog.fecha))
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return [AuditLogResponse.model_validate(log) for log in logs]
    
@router.delete("/eliminar", status_code=status.HTTP_200_OK)
def vaciar_historial_auditoria(
    current_user: user_dep,
    db: db_dep
):
    """
    Elimina permanentemente todos los registros de auditoría del tenant actual.
    Solo el dueño del tenant puede ejecutar esta acción.
    """

    tenant = _require_tenant_owner(current_user, db)

    with get_tenant_db_context(tenant.schema_name) as tdb:
        filas_borradas = tdb.query(AuditLog).delete()
        tdb.commit()
        
    return {
        "msg": "Historial de auditoría vaciado con éxito", 
        "registros_eliminados": filas_borradas
    }