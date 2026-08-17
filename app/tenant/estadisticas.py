"""
app/tenant/estadisticas.py
────────────────────────────
Motor de estadísticas por inventario: calcula, en una sola consulta SQL,
las métricas que corresponden a cada atributo según su tipo declarado en
`inventario.atributos`.

Strategy Pattern (mismo criterio que roles_atributos.py): cada tipo se
declara una vez en ESTRATEGIAS con tres responsabilidades — qué fragmento
de SQL aporta a la consulta grande, qué expresión "tolerante" usar si hay
que diagnosticar un dato roto, y cómo leer su parte del resultado. El
motor nunca pregunta "¿qué tipo es este?" con un if/elif.

Camino "optimista con diagnóstico": la query grande (todos los atributos
del inventario juntos) es el camino feliz — una sola ida a la base, sin
importar cuántos atributos tenga el inventario. Si algún valor no casea al
tipo declarado (datos heredados, atributos que cambiaron de tipo), esa
query entera falla. Recién ahí se corre una segunda pasada, atributo por
atributo, para encontrar exactamente cuál y qué valor rompió el cálculo, y
se responde 400 con ese detalle en vez de un 500 genérico o estadísticas
parciales. El costo extra de la segunda pasada solo se paga en el caso
raro (dato roto), no en el camino normal.
"""

import math
from dataclasses import dataclass
from datetime import date
from typing import Any, Callable, Dict, List, NamedTuple, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.tenant import models, schemas
from app.tenant.dependencies import get_tenant_db, require_permission

router = APIRouter(prefix="/inventarios", tags=["Estadísticas"])


# ==================== Estrategia por tipo ====================

@dataclass(frozen=True)
class EstrategiaAtributo:
    nombre: str
    # Dado el índice posicional del atributo, devuelve {alias_sintetico: expresión_sql}
    # que se agregan al SELECT de la consulta grande.
    construir_sql: Callable[[int], Dict[str, str]]
    # Expresión regex "tolerante" (nunca explota) usada solo en la pasada de
    # diagnóstico para encontrar el primer valor que no matchea el tipo.
    # None para los tipos que nunca pueden fallar un cast (string).
    regex_diagnostico: Optional[str]
    # Lee la fila de resultado y arma el bloque de respuesta de este atributo.
    parsear: Callable[[Any, int], Dict[str, Any]]


def _key_param(i: int) -> str:
    return f"key_{i}"


def _alias(i: int, sufijo: str) -> str:
    return f"attr_{i}_{sufijo}"


# ---- numérico (integer/int/float/number) ----

def _sql_numerico(i: int) -> Dict[str, str]:
    key = f":{_key_param(i)}"
    expr = f"(atributos ->> {key})::float8"
    return {
        _alias(i, "avg"): f"AVG({expr})",
        _alias(i, "sum"): f"SUM({expr})",
        _alias(i, "min"): f"MIN({expr})",
        _alias(i, "max"): f"MAX({expr})",
        _alias(i, "count"): f"COUNT(atributos ->> {key})",
    }


def _parse_numerico(row: Any, i: int) -> Dict[str, Any]:
    return {
        "promedio": row[_alias(i, "avg")],
        "suma": row[_alias(i, "sum")],
        "minimo": row[_alias(i, "min")],
        "maximo": row[_alias(i, "max")],
        "con_valor": row[_alias(i, "count")],
    }


# ---- boolean ----

def _sql_boolean(i: int) -> Dict[str, str]:
    key = f":{_key_param(i)}"
    expr = f"(atributos ->> {key})::boolean"
    return {
        _alias(i, "true"): f"COUNT(*) FILTER (WHERE {expr} = true)",
        _alias(i, "false"): f"COUNT(*) FILTER (WHERE {expr} = false)",
        _alias(i, "count"): f"COUNT(atributos ->> {key})",
    }


def _parse_boolean(row: Any, i: int) -> Dict[str, Any]:
    return {
        "verdaderos": row[_alias(i, "true")] or 0,
        "falsos": row[_alias(i, "false")] or 0,
        "con_valor": row[_alias(i, "count")],
    }


# ---- date ----

def _sql_date(i: int) -> Dict[str, str]:
    key = f":{_key_param(i)}"
    expr = f"(atributos ->> {key})::date"
    return {
        _alias(i, "min"): f"MIN({expr})",
        _alias(i, "max"): f"MAX({expr})",
        _alias(i, "count"): f"COUNT(atributos ->> {key})",
    }


def _parse_date(row: Any, i: int) -> Dict[str, Any]:
    proxima = row[_alias(i, "min")]
    ultima = row[_alias(i, "max")]
    return {
        "proxima_fecha": proxima.isoformat() if proxima else None,
        "ultima_fecha": ultima.isoformat() if ultima else None,
        "dias_restantes": (proxima - date.today()).days if proxima else None,
        "con_valor": row[_alias(i, "count")],
    }


# ---- string ----
# Nunca puede fallar un cast (todo castea a texto), por eso no tiene
# regex_diagnostico: no participa de la pasada de diagnóstico.

def _sql_string(i: int) -> Dict[str, str]:
    key = f":{_key_param(i)}"
    return {_alias(i, "count"): f"COUNT(atributos ->> {key})"}


def _parse_string(row: Any, i: int) -> Dict[str, Any]:
    return {"con_valor": row[_alias(i, "count")]}


# Regex deliberadamente simples: cubren los formatos que la propia app
# produce al guardar (parse_value_by_type en validators.py normaliza
# fechas a ISO, números a notación decimal estándar). No pretenden
# replicar toda la gramática de cast de Postgres — su trabajo es detectar
# el caso común de datos rotos/heredados, no validar exhaustivamente.
_REGEX_NUMERICO = r"^-?\d+(\.\d+)?([eE][+-]?\d+)?$"
_REGEX_BOOLEAN = r"^(true|false|t|f|yes|no|y|n|1|0)$"
_REGEX_DATE = r"^\d{4}-\d{2}-\d{2}$"

ESTRATEGIAS: Dict[str, EstrategiaAtributo] = {
    "numerico": EstrategiaAtributo("numerico", _sql_numerico, _REGEX_NUMERICO, _parse_numerico),
    "boolean": EstrategiaAtributo("boolean", _sql_boolean, _REGEX_BOOLEAN, _parse_boolean),
    "date": EstrategiaAtributo("date", _sql_date, _REGEX_DATE, _parse_date),
    "string": EstrategiaAtributo("string", _sql_string, None, _parse_string),
}

# Sinónimos de tipo → estrategia (mismo vocabulario que ALLOWED_TYPES en validators.py)
_TIPO_A_ESTRATEGIA = {
    "integer": "numerico", "int": "numerico", "float": "numerico", "number": "numerico",
    "boolean": "boolean", "bool": "boolean",
    "date": "date",
    "string": "string", "str": "string",
}


class AtributoIndexado(NamedTuple):
    indice: int
    nombre: str
    tipo_declarado: str
    estrategia: EstrategiaAtributo


# ==================== Motor ====================

def _indexar_atributos(atributos: Dict[str, str]) -> List[AtributoIndexado]:
    indexados = []
    for i, (nombre, tipo) in enumerate((atributos or {}).items()):
        tipo_norm = (tipo or "").lower().strip()
        clave = _TIPO_A_ESTRATEGIA.get(tipo_norm)
        if clave is None:
            continue  # tipo desconocido; no debería pasar si el inventario se validó al guardarse
        indexados.append(AtributoIndexado(i, nombre, tipo, ESTRATEGIAS[clave]))
    return indexados


def _construir_query(indexados: List[AtributoIndexado], volumen_atributo: Optional[str] = None) -> Any:
    selects = ["COUNT(*) AS total_items"]
    params: Dict[str, Any] = {}
    for item in indexados:
        for alias, expr in item.estrategia.construir_sql(item.indice).items():
            selects.append(f"{expr} AS {alias}")
        params[_key_param(item.indice)] = item.nombre

    # Volumen total (Fase 4): SUM(cantidad * valor_unitario), solo si el
    # inventario tiene configurado el rol volumen_unitario (Fase 1). Se suma
    # a la MISMA query grande en vez de hacer una consulta aparte — no hay
    # motivo para gastar una segunda ida a la base por un solo número más.
    if volumen_atributo:
        selects.append("SUM(cantidad * (atributos ->> :key_volumen)::float8) AS volumen_total")
        selects.append("COUNT(atributos ->> :key_volumen) AS volumen_con_valor")
        params["key_volumen"] = volumen_atributo

    sql = f"SELECT {', '.join(selects)} FROM item WHERE inventario_id = :inventario_id"
    return sql, params


def _diagnosticar_y_lanzar(
    db: Session,
    indexados: List[AtributoIndexado],
    inventario_id: int,
    volumen_atributo: Optional[str] = None,
) -> None:
    """
    Se llama solo cuando la query grande ya falló. Prueba cada atributo
    castable de a uno (incluyendo el de volumen, si está configurado), con
    una expresión que nunca explota, para encontrar el primer valor que no
    matchea el tipo declarado. Siempre termina levantando un HTTPException
    400 (nunca vuelve normalmente).
    """
    candidatos = [(item.nombre, item.tipo_declarado, item.estrategia.regex_diagnostico) for item in indexados]
    if volumen_atributo:
        candidatos.append((volumen_atributo, "volumen_unitario (numérico)", _REGEX_NUMERICO))

    for nombre, tipo_declarado, regex in candidatos:
        if regex is None:
            continue
        fila = db.execute(
            text(
                "SELECT (atributos ->> :key) AS valor FROM item "
                "WHERE inventario_id = :inv_id "
                "AND (atributos ->> :key) IS NOT NULL "
                "AND (atributos ->> :key) !~* :regex "
                "LIMIT 1"
            ),
            {"key": nombre, "inv_id": inventario_id, "regex": regex},
        ).mappings().first()
        if fila:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Dato almacenado no convertible al tipo declarado",
                    "atributo": nombre,
                    "tipo_declarado": tipo_declarado,
                    "valor": fila["valor"],
                },
            )
    # Ningún atributo individual reprodujo el error (caso raro: el dato roto
    # no matchea ninguna de las regex de diagnóstico). 400 igual, nunca 500.
    raise HTTPException(
        status_code=400,
        detail="No se pudieron calcular las estadísticas: hay datos que no convierten al tipo declarado.",
    )


def calcular_estadisticas(db: Session, inventario: models.Inventario) -> Dict[str, Any]:
    indexados = _indexar_atributos(inventario.atributos or {})
    volumen_atributo = (inventario.roles_atributos or {}).get("volumen_unitario")
    sql, params = _construir_query(indexados, volumen_atributo)
    params["inventario_id"] = inventario.id

    try:
        row = db.execute(text(sql), params).mappings().first()
    except DBAPIError:
        # La transacción queda abortada tras el error — hay que hacer
        # rollback antes de poder correr las queries de diagnóstico.
        db.rollback()
        _diagnosticar_y_lanzar(db, indexados, inventario.id, volumen_atributo)
        raise  # _diagnosticar_y_lanzar siempre levanta; esto es solo defensivo

    atributos_resultado = {}
    for item in indexados:
        datos = item.estrategia.parsear(row, item.indice)
        datos["tipo"] = item.tipo_declarado
        atributos_resultado[item.nombre] = datos

    resultado = {"total_items": row["total_items"], "atributos": atributos_resultado}

    if volumen_atributo:
        resultado["volumen_total"] = {
            "atributo": volumen_atributo,
            "volumen_total": row["volumen_total"],
            "items_con_valor": row["volumen_con_valor"],
        }

    return resultado


# ==================== Mediana agrupada e histograma (Fase 3) ====================
#
# La mediana "de verdad" (percentil 50 exacto) no es lo que pide la consigna:
# pide la fórmula clásica de estadística descriptiva para datos agrupados en
# intervalos, más la posibilidad de pedir el promedio de un rango de esos
# intervalos. Eso solo tiene sentido para atributos numéricos.
#
# width_bucket(valor, low, high, n) de Postgres arma el histograma en una
# sola query agregada (mismo principio que el resto del motor: nada de traer
# valores a Python para clasificarlos a mano). Gotcha importante: width_bucket
# tiene el límite superior EXCLUSIVO — el valor que sea exactamente el máximo
# cae en el bucket n+1 (fuera de rango), no en el bucket n. Por eso se envuelve
# en LEAST(..., n): así el máximo queda clasificado en el último intervalo en
# vez de perderse.

def _num_intervalos_sturges(n: int) -> int:
    """Regla de Sturges: k = ceil(log2(n) + 1). Da un número de intervalos
    razonable según la cantidad de datos, en vez de un valor fijo arbitrario."""
    if n <= 1:
        return 1
    return max(1, math.ceil(math.log2(n) + 1))


def _resolver_atributo_numerico(inventario: models.Inventario, atributo: str) -> str:
    """Valida que `atributo` exista en el inventario y sea integer/float. Devuelve el tipo declarado."""
    tipo = (inventario.atributos or {}).get(atributo)
    if tipo is None:
        raise HTTPException(404, detail=f"El atributo '{atributo}' no existe en este inventario")
    if _TIPO_A_ESTRATEGIA.get(tipo.lower().strip()) != "numerico":
        raise HTTPException(
            400, detail=f"El atributo '{atributo}' es de tipo '{tipo}', se requiere integer o float"
        )
    return tipo


def _ejecutar_numerico_con_diagnostico(
    db: Session, sql: str, params: Dict[str, Any], atributo: str, tipo: str, inventario_id: int
):
    """
    Igual que el camino optimista de calcular_estadisticas, pero simplificado:
    acá ya sabemos de antemano cuál es el único atributo en juego (no hay que
    iterar buscando cuál falló), así que si el cast explota alcanza con una
    sola query de diagnóstico.
    """
    try:
        return db.execute(text(sql), params)
    except DBAPIError:
        db.rollback()
        fila = db.execute(
            text(
                "SELECT (atributos ->> :key) AS valor FROM item "
                "WHERE inventario_id = :inv_id AND (atributos ->> :key) IS NOT NULL "
                "AND (atributos ->> :key) !~* :regex LIMIT 1"
            ),
            {"key": atributo, "inv_id": inventario_id, "regex": _REGEX_NUMERICO},
        ).mappings().first()
        detalle = {"message": "Dato almacenado no convertible al tipo declarado", "atributo": atributo, "tipo_declarado": tipo}
        if fila:
            detalle["valor"] = fila["valor"]
        raise HTTPException(status_code=400, detail=detalle)


def calcular_histograma_mediana(
    db: Session,
    inventario: models.Inventario,
    atributo: str,
    n_intervalos: Optional[int] = None,
) -> Dict[str, Any]:
    tipo = _resolver_atributo_numerico(inventario, atributo)

    fila = _ejecutar_numerico_con_diagnostico(
        db,
        "SELECT MIN((atributos->>:key)::float8) AS minimo, MAX((atributos->>:key)::float8) AS maximo, "
        "COUNT(atributos->>:key) AS con_valor FROM item WHERE inventario_id = :inv_id",
        {"key": atributo, "inv_id": inventario.id},
        atributo, tipo, inventario.id,
    ).mappings().first()
    minimo, maximo, con_valor = fila["minimo"], fila["maximo"], fila["con_valor"]

    if con_valor == 0:
        return {
            "atributo": atributo, "con_valor": 0, "minimo": None, "maximo": None,
            "mediana": None, "n_intervalos": 0, "ancho_intervalo": None, "histograma": [],
        }

    if minimo == maximo:
        # Todos los valores son iguales: width_bucket dividiría por (max-min)=0.
        # La mediana es trivialmente ese valor, un único intervalo de ancho 0.
        return {
            "atributo": atributo, "con_valor": con_valor, "minimo": minimo, "maximo": maximo,
            "mediana": minimo, "n_intervalos": 1, "ancho_intervalo": 0.0,
            "histograma": [{"desde": minimo, "hasta": maximo, "frecuencia": con_valor}],
        }

    n = n_intervalos or _num_intervalos_sturges(con_valor)
    ancho = (maximo - minimo) / n

    filas = _ejecutar_numerico_con_diagnostico(
        db,
        "SELECT LEAST(width_bucket((atributos->>:key)::float8, :minimo, :maximo, :n), :n) AS bucket, "
        "COUNT(*) AS frecuencia FROM item "
        "WHERE inventario_id = :inv_id AND (atributos->>:key) IS NOT NULL "
        "GROUP BY bucket ORDER BY bucket",
        {"key": atributo, "minimo": minimo, "maximo": maximo, "n": n, "inv_id": inventario.id},
        atributo, tipo, inventario.id,
    ).mappings().all()
    frecuencia_por_bucket = {f["bucket"]: f["frecuencia"] for f in filas}

    # Fórmula de mediana para datos agrupados: Me = Li + ((n/2 - Fa) / fi) * ancho
    # Li = límite inferior del intervalo mediano, Fa = frecuencia acumulada ANTES
    # de ese intervalo, fi = frecuencia del intervalo mediano.
    histograma = []
    acumulada = 0
    mitad = con_valor / 2
    li, fa, fi = minimo, 0, 0
    bucket_mediano_encontrado = False

    for b in range(1, n + 1):
        frecuencia = frecuencia_por_bucket.get(b, 0)
        desde = minimo + (b - 1) * ancho
        hasta = minimo + b * ancho
        histograma.append({"desde": desde, "hasta": hasta, "frecuencia": frecuencia})

        if not bucket_mediano_encontrado and acumulada + frecuencia >= mitad:
            li, fa, fi = desde, acumulada, frecuencia
            bucket_mediano_encontrado = True

        acumulada += frecuencia

    mediana = li + ((mitad - fa) / fi) * ancho if fi else None

    return {
        "atributo": atributo, "con_valor": con_valor, "minimo": minimo, "maximo": maximo,
        "mediana": mediana, "n_intervalos": n, "ancho_intervalo": ancho, "histograma": histograma,
    }


def calcular_promedio_rango(
    db: Session, inventario: models.Inventario, atributo: str, desde: float, hasta: float
) -> Dict[str, Any]:
    tipo = _resolver_atributo_numerico(inventario, atributo)
    if desde > hasta:
        raise HTTPException(400, detail="'desde' no puede ser mayor que 'hasta'")

    fila = _ejecutar_numerico_con_diagnostico(
        db,
        "SELECT AVG((atributos->>:key)::float8) AS promedio, COUNT(atributos->>:key) AS cantidad "
        "FROM item WHERE inventario_id = :inv_id "
        "AND (atributos->>:key)::float8 BETWEEN :desde AND :hasta",
        {"key": atributo, "inv_id": inventario.id, "desde": desde, "hasta": hasta},
        atributo, tipo, inventario.id,
    ).mappings().first()

    return {
        "atributo": atributo, "desde": desde, "hasta": hasta,
        "promedio": fila["promedio"], "cantidad": fila["cantidad"],
    }


# ==================== Endpoint ====================

@router.get("/{inventario_id}/stats", response_model=schemas.InventarioStatsResponse)
def get_estadisticas_inventario(
    inventario_id: int,
    _: dict = Depends(require_permission("inventarios", "read")),
    db: Session = Depends(get_tenant_db),
):
    """
    Estadísticas agregadas del inventario, calculadas según el tipo de cada
    atributo: promedio/suma/min/max para numéricos, conteo de
    verdaderos/falsos para booleanos, próxima/última fecha y días restantes
    para fechas, y cantidad con valor para strings.

    Requiere permiso `inventarios:read` (o ser tenant owner).

    **Ejemplo:** `GET /inventarios/1/stats`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    return calcular_estadisticas(db, inv)


@router.get(
    "/{inventario_id}/atributos/{atributo}/mediana",
    response_model=schemas.HistogramaMedianaResponse,
)
def get_mediana_atributo(
    inventario_id: int,
    atributo: str,
    intervalos: Optional[int] = Query(None, ge=1, le=100, description="Cantidad de intervalos del histograma. Por defecto, regla de Sturges."),
    _: dict = Depends(require_permission("inventarios", "read")),
    db: Session = Depends(get_tenant_db),
):
    """
    Mediana agrupada e histograma de un atributo numérico (integer/float).
    La mediana se calcula con la fórmula de datos agrupados en intervalos
    (no el percentil 50 exacto), a partir de un histograma armado con
    `width_bucket` de Postgres.

    Requiere permiso `inventarios:read` (o ser tenant owner).

    **Ejemplo:** `GET /inventarios/1/atributos/precio/mediana?intervalos=8`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    return calcular_histograma_mediana(db, inv, atributo, intervalos)


@router.get(
    "/{inventario_id}/atributos/{atributo}/promedio-rango",
    response_model=schemas.PromedioRangoResponse,
)
def get_promedio_rango_atributo(
    inventario_id: int,
    atributo: str,
    desde: float = Query(..., description="Límite inferior del rango (inclusive)"),
    hasta: float = Query(..., description="Límite superior del rango (inclusive)"),
    _: dict = Depends(require_permission("inventarios", "read")),
    db: Session = Depends(get_tenant_db),
):
    """
    Promedio de los items cuyo valor cae en un rango de valores dado — pensado
    para pedir el promedio de un rango de intervalos del histograma: el
    frontend arma `desde`/`hasta` a partir de los límites de los buckets que
    el usuario seleccionó en `/mediana`, no hace falta que el cliente vuelva
    a mandar el número de intervalos.

    Requiere permiso `inventarios:read` (o ser tenant owner).

    **Ejemplo:** `GET /inventarios/1/atributos/precio/promedio-rango?desde=10&hasta=25`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    return calcular_promedio_rango(db, inv, atributo, desde, hasta)
