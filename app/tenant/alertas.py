"""
app/tenant/alertas.py
────────────────────────
Detecta items próximos a vencer o ya vencidos, reutilizando el rol
`fecha_reposicion` de `roles_atributos` (Fase 1 de la Tarea 3) — el mismo
mecanismo que ya usa el resto del sistema para saber "qué atributo de este
inventario es una fecha importante", sin inventar un concepto nuevo.

Mismo criterio "optimista con diagnóstico" (Camino B) que el motor de
estadísticas: la query normal no tiene protección contra datos rotos: si
falla, se corre una sola consulta de diagnóstico para decir exactamente
qué valor no convierte, en vez de un 500 genérico.
"""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.tenant import models

_REGEX_DATE = r"^\d{4}-\d{2}-\d{2}$"


def _alertas_de_inventario(db: Session, inventario: models.Inventario, dias: int) -> List[Dict[str, Any]]:
    """Alertas de un único inventario. Lista vacía si no tiene configurado el rol."""
    roles = inventario.roles_atributos or {}
    atributo = roles.get("fecha_reposicion")
    if not atributo:
        return []

    proveedor_attr = roles.get("proveedor")
    proveedor_select = "(atributos ->> :prov_key)" if proveedor_attr else "NULL"

    params: Dict[str, Any] = {"key": atributo, "inv_id": inventario.id, "dias": dias}
    if proveedor_attr:
        params["prov_key"] = proveedor_attr

    sql = (
        "SELECT id, nombre, (atributos ->> :key)::date AS fecha, "
        "(atributos ->> :key)::date - CURRENT_DATE AS dias_restantes, "
        f"{proveedor_select} AS proveedor "
        "FROM item WHERE inventario_id = :inv_id "
        "AND (atributos ->> :key) IS NOT NULL "
        "AND (atributos ->> :key)::date <= CURRENT_DATE + make_interval(days => :dias) "
        "ORDER BY fecha ASC"
    )

    try:
        rows = db.execute(text(sql), params).mappings().all()
    except DBAPIError:
        # La transacción queda abortada tras el error — hay que limpiarla
        # antes de poder correr la query de diagnóstico.
        db.rollback()
        fila = db.execute(
            text(
                "SELECT (atributos ->> :key) AS valor FROM item "
                "WHERE inventario_id = :inv_id AND (atributos ->> :key) IS NOT NULL "
                "AND (atributos ->> :key) !~ :regex LIMIT 1"
            ),
            {"key": atributo, "inv_id": inventario.id, "regex": _REGEX_DATE},
        ).mappings().first()
        detalle: Dict[str, Any] = {
            "message": "Dato almacenado no convertible al tipo declarado",
            "inventario_id": inventario.id,
            "atributo": atributo,
        }
        if fila:
            detalle["valor"] = fila["valor"]
        raise HTTPException(status_code=400, detail=detalle)

    return [
        {
            "item_id": row["id"],
            "item_nombre": row["nombre"],
            "inventario_id": inventario.id,
            "inventario_nombre": inventario.nombre,
            "fecha_vencimiento": row["fecha"].isoformat() if row["fecha"] else None,
            "dias_restantes": row["dias_restantes"],
            "proveedor": row["proveedor"],
        }
        for row in rows
    ]


def calcular_alertas(db: Session, dias: int, inventario_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Alertas de todos los inventarios del tenant que tengan configurado el rol
    `fecha_reposicion` (o de uno solo, si se pasa `inventario_id`). Se
    itera por inventario en vez de una query única porque cada inventario
    puede tener un nombre de atributo distinto para su fecha — no hay forma
    de escribir una sola consulta genérica para todos a la vez. El costo es
    acotado: como mucho, una query por inventario configurado, no por item.
    """
    query = db.query(models.Inventario)
    if inventario_id is not None:
        query = query.filter(models.Inventario.id == inventario_id)

    alertas: List[Dict[str, Any]] = []
    for inventario in query.all():
        alertas.extend(_alertas_de_inventario(db, inventario, dias))

    alertas.sort(key=lambda a: a["dias_restantes"])
    return alertas
