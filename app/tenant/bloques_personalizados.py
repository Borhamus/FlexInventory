"""
app/tenant/bloques_personalizados.py
──────────────────────────────────────
Bloques de estadística que arma el propio usuario: cada bloque es un texto
editable ("Me faltan {faltantes} cartas...") con una o más métricas
calculadas del lado del servidor y luego interpoladas en el texto.

Cada métrica es una FÓRMULA armada como una cadena de términos unidos por
operadores aritméticos — ej. "Cantidad × Precio_por_kilo" para saber
cuánta plata representa un ítem — más un filtro opcional (solo calcular
sobre los items donde tal atributo cumple tal condición). La operación de
agregado NO la elige el usuario: si la fórmula tiene términos, se suma su
resultado en todos los items que matchean; si la fórmula queda vacía (solo
hay condición, o ni eso), se cuenta cuántos items matchean. Se infiere del
lado del cliente y viaja ya resuelta como "sum"/"count" — ver
ModalBloquePersonalizado.tsx. (Se sacaron promedio/mínimo/máximo: agregaban
opciones que un usuario no técnico no entendía y no eran necesarias para
los casos de uso reales que pidió el usuario.)

Deliberadamente NO es un lenguaje de fórmulas de texto libre: el usuario
arma la cadena eligiendo de listas (término, operador, término...), nunca
escribiendo una expresión a mano. Evaluar una fórmula de texto libre sería
o bien un riesgo de inyección (si se traduce a SQL) o un intérprete de
expresiones para mantener — ninguna de las dos vale la pena acá. Todo
nombre de atributo y todo operador viaja como parámetro enlazado o sale de
una tabla fija (OPERADORES_ARITMETICOS/OPERADORES_SQL), nunca se interpola
el string que mandó el usuario directamente.

La cadena de términos se evalúa de IZQUIERDA A DERECHA, sin precedencia de
operadores (a diferencia del SQL estándar, donde × y ÷ se evalúan antes que
+ y −). Se fuerza con paréntesis explícitos en la query generada. Es la
única forma de que "agarro esto, lo multiplico, después le sumo esto otro"
signifique lo mismo para el usuario que para la base de datos.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.tenant import models
from app.tenant.validators import parse_value_by_type

# ==================== Vocabulario permitido ====================

OPERACIONES = {"count", "sum"}

# Símbolo SQL real detrás de cada operador de filtro — nunca se interpola
# el string que manda el usuario, siempre este de acá.
OPERADORES_SQL = {
    "eq": "=", "neq": "!=",
    "gt": ">", "lt": "<",
    "gte": ">=", "lte": "<=",
}

# Símbolo SQL real detrás de cada operador aritmético de la fórmula. Misma
# idea: el usuario elige "mul"/"div"/"add"/"sub", nunca escribe el símbolo.
OPERADORES_ARITMETICOS = {"mul": "*", "div": "/", "add": "+", "sub": "-"}

TIPOS_TERMINO = {"atributo", "cantidad", "constante"}

# Qué operadores de FILTRO tiene sentido ofrecer según el tipo del atributo.
_OPERADORES_POR_TIPO = {
    "boolean": {"eq", "neq"}, "bool": {"eq", "neq"},
    "string": {"eq", "neq"}, "str": {"eq", "neq"},
    "integer": set(OPERADORES_SQL), "int": set(OPERADORES_SQL),
    "float": set(OPERADORES_SQL), "number": set(OPERADORES_SQL),
    "date": set(OPERADORES_SQL),
}

_CAST_POR_TIPO = {
    "integer": "float8", "int": "float8", "float": "float8", "number": "float8",
    "date": "date",
    "boolean": "boolean", "bool": "boolean",
    # string: sin cast, comparación de texto directa
}

_TIPOS_NUMERICOS = {"integer", "int", "float", "number"}

_REGEX_CLAVE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")
_REGEX_PLACEHOLDER = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


# ==================== Validación ====================

def _validar_termino(t: Dict[str, Any], atributos: Dict[str, str], prefijo: str, idx: int, errors: List[str]) -> Optional[Dict[str, Any]]:
    tipo = (t.get("tipo") or "").strip()
    if tipo not in TIPOS_TERMINO:
        errors.append(f"{prefijo}: el término {idx + 1} de la fórmula no es válido")
        return None

    if tipo == "atributo":
        atributo = (t.get("atributo") or "").strip()
        tipo_attr = atributos.get(atributo)
        if tipo_attr is None:
            errors.append(f"{prefijo}: el atributo '{atributo}' (término {idx + 1}) no existe en este inventario")
            return None
        if tipo_attr.lower().strip() not in _TIPOS_NUMERICOS:
            errors.append(f"{prefijo}: el atributo '{atributo}' (término {idx + 1}) es de tipo '{tipo_attr}', se requiere numérico")
            return None
        return {"tipo": "atributo", "atributo": atributo}

    if tipo == "cantidad":
        return {"tipo": "cantidad"}

    # constante
    try:
        valor = float(t.get("valor"))
    except (TypeError, ValueError):
        errors.append(f"{prefijo}: el término {idx + 1} necesita un número válido")
        return None
    return {"tipo": "constante", "valor": valor}


def _validar_metrica(m: Dict[str, Any], atributos: Dict[str, str], idx_bloque: int, idx_metrica: int, errors: List[str]) -> Optional[Dict[str, Any]]:
    prefijo = f"Bloque {idx_bloque + 1}, métrica {idx_metrica + 1}"

    clave = (m.get("clave") or "").strip()
    if not clave or not _REGEX_CLAVE.match(clave):
        errors.append(f"{prefijo}: la clave '{clave}' debe empezar con letra y usar solo letras, números o '_'")
        return None

    operacion = (m.get("operacion") or "").strip().lower()
    if operacion not in OPERACIONES:
        errors.append(f"{prefijo} ('{clave}'): operación '{operacion}' inválida. Válidas: {', '.join(sorted(OPERACIONES))}")
        return None

    terminos_normalizados: List[Dict[str, Any]] = []
    operadores_normalizados: List[str] = []

    if operacion != "count":
        terminos_raw = m.get("terminos") or []
        operadores_raw = m.get("operadores") or []
        if not terminos_raw:
            errors.append(f"{prefijo} ('{clave}'): armá al menos un término para el cálculo (ej: un atributo)")
            return None
        if len(operadores_raw) != len(terminos_raw) - 1:
            errors.append(f"{prefijo} ('{clave}'): la cantidad de operadores no coincide con la cantidad de términos")
            return None

        for idx_t, t in enumerate(terminos_raw):
            termino = _validar_termino(t, atributos, f"{prefijo} ('{clave}')", idx_t, errors)
            if termino is None:
                return None
            terminos_normalizados.append(termino)

        for op in operadores_raw:
            op = (op or "").strip().lower()
            if op not in OPERADORES_ARITMETICOS:
                errors.append(f"{prefijo} ('{clave}'): operador aritmético '{op}' inválido")
                return None
            operadores_normalizados.append(op)

    filtro_atributo = (m.get("filtro_atributo") or "").strip() or None
    filtro_operador = (m.get("filtro_operador") or "").strip().lower() or None
    filtro_valor = m.get("filtro_valor")
    filtro_normalizado = None

    if filtro_atributo:
        tipo_filtro = atributos.get(filtro_atributo)
        if tipo_filtro is None:
            errors.append(f"{prefijo} ('{clave}'): el atributo de filtro '{filtro_atributo}' no existe en este inventario")
            return None
        tipo_filtro = tipo_filtro.lower().strip()

        if filtro_operador not in OPERADORES_SQL:
            errors.append(f"{prefijo} ('{clave}'): operador de filtro '{filtro_operador}' inválido")
            return None
        if filtro_operador not in _OPERADORES_POR_TIPO.get(tipo_filtro, set()):
            errors.append(
                f"{prefijo} ('{clave}'): el operador '{filtro_operador}' no aplica a un atributo de tipo '{tipo_filtro}'"
            )
            return None

        try:
            valor_convertido = parse_value_by_type(filtro_valor, tipo_filtro)
        except ValueError as e:
            errors.append(f"{prefijo} ('{clave}'): valor de filtro inválido — {e}")
            return None

        filtro_normalizado = {
            "filtro_atributo": filtro_atributo,
            "filtro_operador": filtro_operador,
            "filtro_valor": valor_convertido,
        }
    elif filtro_operador or filtro_valor not in (None, ""):
        errors.append(f"{prefijo} ('{clave}'): hay operador/valor de filtro sin elegir el atributo de filtro")
        return None

    resultado: Dict[str, Any] = {
        "clave": clave,
        "operacion": operacion,
        "terminos": terminos_normalizados,
        "operadores": operadores_normalizados,
    }
    if filtro_normalizado:
        resultado.update(filtro_normalizado)
    return resultado


def validar_bloques_personalizados(bloques: List[Dict[str, Any]], atributos: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Valida y normaliza la lista completa de bloques (reemplazo total, mismo
    criterio que roles_atributos: se manda el estado completo deseado).
    Acumula todos los errores antes de fallar.
    """
    if not isinstance(bloques, list):
        raise HTTPException(400, detail="bloques_personalizados debe ser una lista")

    errors: List[str] = []
    normalizados: List[Dict[str, Any]] = []

    for idx_bloque, bloque in enumerate(bloques):
        nombre = (bloque.get("nombre") or "").strip()
        plantilla = (bloque.get("plantilla") or "").strip()
        metricas_raw = bloque.get("metricas") or []

        if not nombre:
            errors.append(f"Bloque {idx_bloque + 1}: el nombre es obligatorio")
        if not plantilla:
            errors.append(f"Bloque {idx_bloque + 1}: la plantilla de texto es obligatoria")
        if not metricas_raw:
            errors.append(f"Bloque {idx_bloque + 1}: necesita al menos una métrica")

        metricas_normalizadas = []
        claves_vistas = set()
        for idx_metrica, m in enumerate(metricas_raw):
            metrica = _validar_metrica(m, atributos, idx_bloque, idx_metrica, errors)
            if metrica:
                if metrica["clave"] in claves_vistas:
                    errors.append(f"Bloque {idx_bloque + 1}: la clave '{metrica['clave']}' está repetida")
                claves_vistas.add(metrica["clave"])
                metricas_normalizadas.append(metrica)

        if plantilla:
            placeholders = set(_REGEX_PLACEHOLDER.findall(plantilla))
            huerfanos = placeholders - claves_vistas
            if huerfanos:
                errors.append(
                    f"Bloque {idx_bloque + 1}: la plantilla usa {{{'}, {'.join(sorted(huerfanos))}}} "
                    f"pero esa(s) métrica(s) no está(n) definida(s)"
                )

        normalizados.append({"nombre": nombre, "plantilla": plantilla, "metricas": metricas_normalizadas})

    if errors:
        raise HTTPException(status_code=400, detail={"message": "Error en la configuración de bloques personalizados", "errors": errors})

    return normalizados


def _atributo_valido(atributo: Optional[str], nuevos_atributos: Dict[str, str]) -> bool:
    if not atributo:
        return False
    tipo = (nuevos_atributos.get(atributo) or "").lower().strip()
    return tipo in _TIPOS_NUMERICOS


def limpiar_bloques_huerfanos(bloques: List[Dict[str, Any]], nuevos_atributos: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Descarta bloques ENTEROS si algún término de alguna métrica quedó
    apuntando a un atributo que se borró, se renombró o cambió a un tipo
    incompatible (mismo criterio para el atributo de filtro).

    Se descarta el bloque completo, no la métrica suelta: la plantilla de
    texto asume que todas sus métricas están disponibles, y dejar una
    referencia rota a mitad de una fórmula es peor que pedirle al usuario
    que la rearme.
    """
    vigentes = []
    for bloque in bloques or []:
        ok = True
        for metrica in bloque.get("metricas", []):
            for termino in metrica.get("terminos", []):
                if termino.get("tipo") == "atributo" and not _atributo_valido(termino.get("atributo"), nuevos_atributos):
                    ok = False
                    break
            if not ok:
                break
            filtro_atributo = metrica.get("filtro_atributo")
            if filtro_atributo:
                tipo_filtro = nuevos_atributos.get(filtro_atributo)
                if tipo_filtro is None:
                    ok = False
                    break
                if metrica.get("filtro_operador") not in _OPERADORES_POR_TIPO.get(tipo_filtro.lower().strip(), set()):
                    ok = False
                    break
        if ok:
            vigentes.append(bloque)
    return vigentes


# ==================== Cálculo ====================

def _expr_termino(termino: Dict[str, Any], params: Dict[str, Any], prefijo_param: str, idx: int) -> str:
    if termino["tipo"] == "atributo":
        key = f"{prefijo_param}_t{idx}"
        params[key] = termino["atributo"]
        return f"(atributos ->> :{key})::float8"
    if termino["tipo"] == "cantidad":
        # "cantidad" es una columna nativa de la tabla item (integer), no
        # vive en el JSONB de atributos — no necesita cast.
        return "cantidad"
    # constante
    key = f"{prefijo_param}_t{idx}"
    params[key] = termino["valor"]
    return f"CAST(:{key} AS float8)"


def _expr_formula(metrica: Dict[str, Any], params: Dict[str, Any], prefijo_param: str) -> str:
    """
    Arma la expresión de la fórmula evaluando estrictamente de izquierda a
    derecha — se envuelve cada paso en paréntesis explícitos para que el
    resultado no dependa de la precedencia normal de SQL (que evalúa × y ÷
    antes que + y −). "A + B × C" armado paso a paso por el usuario tiene
    que dar (A + B) × C, no A + (B × C).
    """
    terminos = metrica["terminos"]
    operadores = metrica["operadores"]
    expr = _expr_termino(terminos[0], params, prefijo_param, 0)
    for i, op in enumerate(operadores):
        siguiente = _expr_termino(terminos[i + 1], params, prefijo_param, i + 1)
        expr = f"({expr} {OPERADORES_ARITMETICOS[op]} {siguiente})"
    return expr


def _construir_query_metrica(inventario_id: int, metrica: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    params: Dict[str, Any] = {"inv_id": inventario_id}

    if metrica["operacion"] == "count":
        expr_agregada = "COUNT(*)"
    else:
        expr_valor = _expr_formula(metrica, params, "f")
        expr_agregada = f"SUM({expr_valor})"

    condiciones = ["inventario_id = :inv_id"]
    if metrica.get("filtro_atributo"):
        # El tipo del atributo de filtro no viaja en el bloque guardado —
        # se re-resuelve acá contra el schema actual del inventario para
        # el cast. calcular_bloques() se lo pasa a través de metrica["_tipo_filtro"].
        cast_filtro = _CAST_POR_TIPO.get(metrica.get("_tipo_filtro", ""))
        expr_filtro = "(atributos ->> :filtro_key)" + (f"::{cast_filtro}" if cast_filtro else "")
        valor_expr = f"CAST(:filtro_valor AS {cast_filtro})" if cast_filtro else ":filtro_valor"
        op_sql = OPERADORES_SQL[metrica["filtro_operador"]]
        condiciones.append(f"{expr_filtro} {op_sql} {valor_expr}")
        params["filtro_key"] = metrica["filtro_atributo"]
        params["filtro_valor"] = metrica["filtro_valor"]

    sql = f"SELECT {expr_agregada} AS valor FROM item WHERE {' AND '.join(condiciones)}"
    return sql, params


def calcular_bloques(db: Session, inventario: models.Inventario) -> List[Dict[str, Any]]:
    """
    Calcula los valores actuales de cada bloque configurado, listos para
    interpolar en su plantilla ({clave} -> valor). Una query chica por
    métrica — los bloques son unos pocos, no vale la pena la complejidad de
    combinarlos en una sola consulta como en el motor de estadísticas.
    """
    bloques = inventario.bloques_personalizados or []
    atributos = inventario.atributos or {}
    resultado = []

    for bloque in bloques:
        valores: Dict[str, Any] = {}
        for metrica in bloque.get("metricas", []):
            metrica = dict(metrica)
            if metrica.get("filtro_atributo"):
                metrica["_tipo_filtro"] = (atributos.get(metrica["filtro_atributo"]) or "").lower().strip()

            sql, params = _construir_query_metrica(inventario.id, metrica)
            try:
                fila = db.execute(text(sql), params).mappings().first()
            except DBAPIError:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "Dato no convertible (o división por cero) al calcular un bloque personalizado",
                        "bloque": bloque.get("nombre"),
                        "metrica": metrica.get("clave"),
                    },
                )
            valor = fila["valor"] if fila else None
            valores[metrica["clave"]] = round(valor, 2) if isinstance(valor, float) else valor

        resultado.append({"nombre": bloque.get("nombre"), "plantilla": bloque.get("plantilla"), "valores": valores})

    return resultado
