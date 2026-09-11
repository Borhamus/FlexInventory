"""
app/notificaciones/motor.py
─────────────────────────────
Evalúa Inventario.notificaciones_config contra los ítems reales y sincroniza
la tabla Notificacion. No manda emails ni corre solo — eso lo hace el
scheduler (Fase 4) llamando a evaluar_notificaciones_tenant().

Máquina de estados por señal (atributo de fecha, atributo numérico, o la
Cantidad nativa del ítem):
  1. Se calcula el estado actual ("ok" | "recordatorio" | "vencido" | "minimo" | "maximo").
  2. Se busca la notificación ACTIVA (no resuelta) para ese item+origen+atributo
     (a lo sumo una, por el índice único parcial de Notificacion).
  3. estado == "ok"  + activa existe   → se resuelve (resuelta_en = ahora).
  4. estado != "ok"  + no hay activa   → se inserta una nueva.
  5. estado != "ok"  + activa mismo evento → no se hace nada (evita el spam:
     ya se avisó de esto, no se repite hasta que se resuelva).
  6. estado != "ok"  + activa con OTRO evento (ej. recordatorio → vencido)
     → se resuelve la vieja y se inserta una nueva en la misma pasada (la
     transición de estado cuenta como una notificación nueva).

Mismo "Camino B" que estadisticas.py/alertas.py para los atributos vía JSONB:
la query optimista corre primero (rápida, sin regex); si un valor no castea,
se hace rollback y se loguea el detalle en vez de romper toda la corrida —
acá no hay HTTP request esperando una respuesta, así que en vez de un 400 se
loguea y se sigue con el resto de los inventarios/atributos.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from app.notificaciones.models import Notificacion
from app.tenant import models
from app.tenant.notificaciones_config import (
    resolver_recordatorio_dias,
    resolver_minimo_maximo,
    TIPOS_FECHA,
    TIPOS_NUMERO,
)

logger = logging.getLogger(__name__)

_REGEX_FECHA  = r"^\d{4}-\d{2}-\d{2}$"
_REGEX_NUMERO = r"^-?\d+(\.\d+)?$"


def _clasificar_numero(nombre_item: str, inventario_nombre: str, etiqueta: str, valor: float, minimo, maximo):
    if minimo is not None and valor < minimo:
        return "minimo", (
            f"El ítem '{nombre_item}' del inventario '{inventario_nombre}' tiene "
            f"{etiqueta} por debajo del mínimo ({valor} < {minimo})"
        )
    if maximo is not None and valor > maximo:
        return "maximo", (
            f"El ítem '{nombre_item}' del inventario '{inventario_nombre}' tiene "
            f"{etiqueta} por encima del máximo ({valor} > {maximo})"
        )
    return "ok", None


def _sincronizar_estado(
    db: Session,
    item_id: int,
    origen: str,
    atributo: str,
    tipo: str,
    estado: str,
    mensaje: Optional[str],
    valor_detectado: Any,
    nuevas: List[Notificacion],
) -> None:
    """
    Aplica la máquina de estados descripta arriba para una señal puntual.
    Corre en su propio SAVEPOINT (begin_nested) para que un choque contra el
    índice único (carrera entre dos corridas del motor) no aborte el resto
    de la evaluación del tenant — defensa en profundidad además del chequeo
    explícito de "¿ya hay una activa?" de acá abajo.
    """
    try:
        with db.begin_nested():
            activa = (
                db.query(Notificacion)
                .filter(
                    Notificacion.item_id == item_id,
                    Notificacion.origen == origen,
                    Notificacion.atributo == atributo,
                    Notificacion.resuelta_en.is_(None),
                )
                .with_for_update()
                .first()
            )

            if estado == "ok":
                if activa:
                    activa.resuelta_en = datetime.now(timezone.utc)
                return

            if activa:
                if activa.evento == estado:
                    return  # mismo incumplimiento ya notificado — no repetir
                # Escalada (ej. recordatorio -> vencido): se resuelve la
                # vieja y se hace flush ANTES de insertar la nueva, para que
                # el índice único parcial no vea dos filas activas a la vez.
                activa.resuelta_en = datetime.now(timezone.utc)
                db.flush()

            nueva = Notificacion(
                item_id=item_id,
                origen=origen,
                atributo=atributo,
                tipo=tipo,
                evento=estado,
                mensaje=mensaje,
                valor_detectado=str(valor_detectado) if valor_detectado is not None else None,
            )
            db.add(nueva)
            db.flush()
            nuevas.append(nueva)
    except IntegrityError as e:
        logger.warning("[Notificaciones] Conflicto sincronizando item=%s %s/%s: %s", item_id, origen, atributo, e)


def _log_diagnostico(db: Session, inventario_id: int, atributo: str, regex: str) -> None:
    """
    Corre solo cuando la query grande ya falló — busca el valor exacto que no
    castea, para el log. Corre en su propio SAVEPOINT: un rollback de
    transacción completa acá revertiría también el SET search_path que
    get_tenant_db_context() dejó al principio de la sesión, rompiendo todas
    las queries siguientes del resto de esta corrida (otros atributos, otros
    inventarios) con "relation ... does not exist" — un rollback a SAVEPOINT
    no toca eso.
    """
    try:
        with db.begin_nested():
            fila = db.execute(
                text(
                    "SELECT id, (atributos ->> :key) AS valor FROM item "
                    "WHERE inventario_id = :inv_id AND (atributos ->> :key) IS NOT NULL "
                    "AND (atributos ->> :key) !~ :regex LIMIT 1"
                ),
                {"key": atributo, "inv_id": inventario_id, "regex": regex},
            ).mappings().first()
    except DBAPIError:
        fila = None
    if fila:
        logger.warning(
            "[Notificaciones] Inventario %s, atributo '%s': item %s tiene un valor no convertible (%r) — se omite este atributo en esta corrida.",
            inventario_id, atributo, fila["id"], fila["valor"],
        )
    else:
        logger.warning(
            "[Notificaciones] Inventario %s, atributo '%s': error de cast sin diagnóstico puntual — se omite este atributo en esta corrida.",
            inventario_id, atributo,
        )


def evaluar_atributo_fecha(db: Session, inventario, atributo: str, config: Dict[str, Any], nuevas: List[Notificacion]) -> None:
    try:
        # SAVEPOINT (no rollback de toda la transacción): ver el comentario
        # de _log_diagnostico — esta sesión sigue viva para evaluar más
        # atributos/inventarios después de este, y necesita conservar el
        # SET search_path del tenant.
        with db.begin_nested():
            rows = db.execute(
                text(
                    "SELECT id, nombre, notificaciones_config, (atributos ->> :key)::date - CURRENT_DATE AS dias_restantes "
                    "FROM item WHERE inventario_id = :inv_id AND (atributos ->> :key) IS NOT NULL"
                ),
                {"key": atributo, "inv_id": inventario.id},
            ).mappings().all()
    except DBAPIError:
        _log_diagnostico(db, inventario.id, atributo, _REGEX_FECHA)
        return

    for row in rows:
        override = ((row["notificaciones_config"] or {}).get("atributos") or {}).get(atributo) or {}
        recordatorio_dias = resolver_recordatorio_dias(override, config)
        dias = row["dias_restantes"]
        if dias < 0:
            estado, mensaje = "vencido", (
                f"El ítem '{row['nombre']}' del inventario '{inventario.nombre}' tiene "
                f"'{atributo}' vencido hace {abs(dias)} día(s)"
            )
        elif recordatorio_dias is not None and dias <= recordatorio_dias:
            # recordatorio_dias puede no estar fijado ni en el inventario ni
            # en el ítem (ej. un ítem overrideó un atributo que el inventario
            # nunca configuró) — sin umbral no hay ventana de recordatorio,
            # pero "vencido" sigue evaluándose igual (no depende de este valor).
            estado, mensaje = "recordatorio", (
                f"El ítem '{row['nombre']}' del inventario '{inventario.nombre}' tiene "
                f"'{atributo}' por vencer en {dias} día(s)"
            )
        else:
            estado, mensaje = "ok", None
        _sincronizar_estado(db, row["id"], "atributo", atributo, "fecha", estado, mensaje, dias, nuevas)


def evaluar_atributo_numero(db: Session, inventario, atributo: str, config: Dict[str, Any], nuevas: List[Notificacion]) -> None:
    try:
        with db.begin_nested():
            rows = db.execute(
                text(
                    "SELECT id, nombre, notificaciones_config, (atributos ->> :key)::float8 AS valor "
                    "FROM item WHERE inventario_id = :inv_id AND (atributos ->> :key) IS NOT NULL"
                ),
                {"key": atributo, "inv_id": inventario.id},
            ).mappings().all()
    except DBAPIError:
        _log_diagnostico(db, inventario.id, atributo, _REGEX_NUMERO)
        return

    for row in rows:
        override = ((row["notificaciones_config"] or {}).get("atributos") or {}).get(atributo) or {}
        minimo, maximo = resolver_minimo_maximo(override, config)
        estado, mensaje = _clasificar_numero(row["nombre"], inventario.nombre, f"'{atributo}'", row["valor"], minimo, maximo)
        _sincronizar_estado(db, row["id"], "atributo", atributo, "numero", estado, mensaje, row["valor"], nuevas)


def evaluar_cantidad(db: Session, inventario, config: Dict[str, Any], nuevas: List[Notificacion]) -> None:
    """Sin Camino B: Item.cantidad es una columna Integer nativa, no hay cast de JSONB que pueda fallar."""
    items = (
        db.query(models.Item.id, models.Item.nombre, models.Item.cantidad, models.Item.notificaciones_config)
        .filter(models.Item.inventario_id == inventario.id)
        .all()
    )
    for item_id, nombre, cantidad, notif_item in items:
        override = (notif_item or {}).get("cantidad") or {}
        minimo, maximo = resolver_minimo_maximo(override, config)
        estado, mensaje = _clasificar_numero(nombre, inventario.nombre, "la Cantidad", cantidad, minimo, maximo)
        _sincronizar_estado(db, item_id, "cantidad", "cantidad", "numero", estado, mensaje, cantidad, nuevas)


def evaluar_notificaciones_tenant(db: Session) -> List[Notificacion]:
    """
    Evalúa TODOS los inventarios del tenant. Una señal (atributo o cantidad)
    se evalúa si el inventario le puso un default O si algún ítem le puso un
    override propio — el override de un ítem es independiente de que el
    inventario haya configurado algo para esa señal (ver
    validar_notificaciones_item), así que no alcanza con mirar
    Inventario.notificaciones_config solo. Devuelve las notificaciones nuevas
    creadas en esta corrida (las usa la Fase 5 para armar el digest de
    email). Commitea al final.
    """
    nuevas: List[Notificacion] = []

    for inventario in db.query(models.Inventario).all():
        config = inventario.notificaciones_config or {}
        atributos_inventario = inventario.atributos or {}
        atributos_config = dict(config.get("atributos") or {})

        # Atributos que algún ítem monitorea por su cuenta, sin que el
        # inventario tenga un default para esa señal.
        claves_override = db.execute(
            text(
                "SELECT DISTINCT jsonb_object_keys(notificaciones_config -> 'atributos') AS clave "
                "FROM item WHERE inventario_id = :inv_id AND notificaciones_config -> 'atributos' IS NOT NULL"
            ),
            {"inv_id": inventario.id},
        ).scalars().all()
        for clave in claves_override:
            if clave in atributos_config:
                continue
            tipo_attr = (atributos_inventario.get(clave) or "").lower().strip()
            if tipo_attr in TIPOS_FECHA:
                atributos_config[clave] = {"tipo": "fecha"}
            elif tipo_attr in TIPOS_NUMERO:
                atributos_config[clave] = {"tipo": "numero"}
            # si no matchea ninguno, el atributo se borró/cambió de tipo y el
            # override quedó huérfano — limpiar_notificaciones_item_huerfanas
            # lo descarta la próxima vez que se edite el inventario; acá se
            # ignora sin romper la corrida.

        for atributo, sub_config in atributos_config.items():
            if sub_config.get("tipo") == "fecha":
                evaluar_atributo_fecha(db, inventario, atributo, sub_config, nuevas)
            elif sub_config.get("tipo") == "numero":
                evaluar_atributo_numero(db, inventario, atributo, sub_config, nuevas)

        cantidad_config = config.get("cantidad") or {}
        hay_override_cantidad = db.execute(
            text(
                "SELECT EXISTS (SELECT 1 FROM item WHERE inventario_id = :inv_id "
                "AND notificaciones_config -> 'cantidad' IS NOT NULL)"
            ),
            {"inv_id": inventario.id},
        ).scalar()
        if cantidad_config or hay_override_cantidad:
            evaluar_cantidad(db, inventario, cantidad_config, nuevas)

    db.commit()
    return nuevas
