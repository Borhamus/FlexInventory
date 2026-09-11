# app/notificaciones/router.py
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.tenant.dependencies import get_tenant_db, require_permission
from app.tenant.models import Inventario, Item
from app.notificaciones.models import Notificacion
from app.notificaciones.schemas import (
    MarcarLeidaRequest,
    MarcarTodasLeidasResponse,
    NoLeidasCountResponse,
    NotificacionResponse,
    PaginatedNotificacionesResponse,
)

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))


def _to_response(n: Notificacion, item_nombre: Optional[str], inventario_id: Optional[int], inventario_nombre: Optional[str]) -> NotificacionResponse:
    return NotificacionResponse(
        id=n.id,
        item_id=n.item_id,
        item_nombre=item_nombre,
        inventario_id=inventario_id,
        inventario_nombre=inventario_nombre,
        origen=n.origen,
        atributo=n.atributo,
        tipo=n.tipo,
        evento=n.evento,
        mensaje=n.mensaje,
        valor_detectado=n.valor_detectado,
        creada_en=n.creada_en,
        resuelta_en=n.resuelta_en,
        leida=n.leida,
        leida_en=n.leida_en,
    )


@router.get("/", response_model=PaginatedNotificacionesResponse)
def listar_notificaciones(
    leida: Optional[bool] = Query(None, description="Filtrar por leída/no leída"),
    inventario_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _: dict = _perm("notificaciones", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista las notificaciones del tenant (activas y resueltas, más nuevas
    primero), con el nombre del ítem/inventario ya resuelto para no obligar
    al frontend a pedirlos aparte.

    Requiere permiso `notificaciones:read` (o ser tenant owner).
    """
    query = (
        db.query(Notificacion, Item.nombre, Item.inventario_id, Inventario.nombre)
        .join(Item, Item.id == Notificacion.item_id)
        .join(Inventario, Inventario.id == Item.inventario_id)
    )
    if leida is not None:
        query = query.filter(Notificacion.leida == leida)
    if inventario_id is not None:
        query = query.filter(Item.inventario_id == inventario_id)

    total = query.count()
    rows = query.order_by(desc(Notificacion.creada_en)).offset(skip).limit(limit).all()

    return {
        "items": [_to_response(n, item_nombre, inv_id, inv_nombre) for n, item_nombre, inv_id, inv_nombre in rows],
        "total": total,
    }


@router.get("/no-leidas/count", response_model=NoLeidasCountResponse)
def contar_no_leidas(
    _: dict = _perm("notificaciones", "read"),
    db: Session = Depends(get_tenant_db),
):
    """Conteo liviano para el badge del Dashboard/navegación."""
    return {"count": db.query(Notificacion).filter(Notificacion.leida == False).count()}


@router.patch("/{notificacion_id}/leida", response_model=NotificacionResponse)
def marcar_leida(
    notificacion_id: int,
    payload: MarcarLeidaRequest,
    _: dict = _perm("notificaciones", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Marca una notificación como leída o no leída (leído/no-leído compartido
    por tenant: quien lo marque, lo marca para todos).

    Requiere permiso `notificaciones:update` (o ser tenant owner).
    """
    n = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not n:
        raise HTTPException(404, detail="Notificación no encontrada")

    n.leida = payload.leida
    n.leida_en = datetime.now(timezone.utc) if payload.leida else None
    db.commit()
    db.refresh(n)

    item = db.query(Item).filter(Item.id == n.item_id).first()
    inventario = db.query(Inventario).filter(Inventario.id == item.inventario_id).first() if item else None
    return _to_response(n, item.nombre if item else None, item.inventario_id if item else None, inventario.nombre if inventario else None)


@router.patch("/marcar-todas-leidas", response_model=MarcarTodasLeidasResponse)
def marcar_todas_leidas(
    _: dict = _perm("notificaciones", "update"),
    db: Session = Depends(get_tenant_db),
):
    """Requiere permiso `notificaciones:update` (o ser tenant owner)."""
    ahora = datetime.now(timezone.utc)
    actualizadas = (
        db.query(Notificacion)
        .filter(Notificacion.leida == False)
        .update({"leida": True, "leida_en": ahora}, synchronize_session=False)
    )
    db.commit()
    return {"actualizadas": actualizadas}
