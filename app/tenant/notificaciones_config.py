"""
Configuración de notificaciones por atributo (y por la cantidad nativa de
cada ítem): qué atributo de fecha dispara un recordatorio/vencimiento, y qué
atributos numéricos (o la Cantidad del ítem) tienen un mínimo/máximo que, al
cruzarse, dispara una alerta.

Mismo criterio de diseño que app/tenant/roles_atributos.py: se declara y se
valida acá, el cálculo real (Fase 3, motor de evaluación) lee esta
configuración más adelante.

Forma del JSONB (Inventario.notificaciones_config):
{
  "atributos": {
    "Vencimiento": {"tipo": "fecha",  "recordatorio_dias": 7},
    "Peso":        {"tipo": "numero", "minimo": 1, "maximo": 10}
  },
  "cantidad": {"minimo": 10, "maximo": 500}
}

"cantidad" vive aparte de "atributos" (no adentro) a propósito: evita
cualquier colisión si el usuario llama a un atributo propio "Cantidad", y
aplica directamente sobre el campo nativo Item.cantidad, que no es parte del
esquema dinámico de atributos del inventario.
"""

from typing import Any, Dict, List
from fastapi import HTTPException

TIPOS_FECHA   = frozenset({"date"})
TIPOS_NUMERO  = frozenset({"integer", "int", "float", "number"})


def _validar_bloque_numero(nombre: str, bloque: Dict[str, Any], errors: List[str]) -> Dict[str, Any]:
    """Valida y normaliza un bloque {minimo, maximo} — usado por atributos numéricos y por cantidad."""
    minimo = bloque.get("minimo")
    maximo = bloque.get("maximo")

    if minimo is None and maximo is None:
        errors.append(f"'{nombre}': hay que indicar al menos un mínimo o un máximo")
        return {}

    normalizado: Dict[str, Any] = {}
    for clave, valor in (("minimo", minimo), ("maximo", maximo)):
        if valor is None:
            continue
        if not isinstance(valor, (int, float)) or isinstance(valor, bool):
            errors.append(f"'{nombre}': '{clave}' tiene que ser un número")
            continue
        normalizado[clave] = valor

    if "minimo" in normalizado and "maximo" in normalizado and normalizado["minimo"] > normalizado["maximo"]:
        errors.append(f"'{nombre}': el mínimo no puede ser mayor que el máximo")

    return normalizado


def validar_notificaciones_config(
    config: Dict[str, Any],
    inventario_atributos: Dict[str, str],
) -> Dict[str, Any]:
    """
    Valida el payload completo de notificaciones_config contra el esquema de
    atributos del inventario. Acumula todos los errores antes de fallar
    (mismo criterio que validate_roles_atributos y validate_inventario_atributos).
    """
    if not isinstance(config, dict):
        raise HTTPException(
            status_code=400,
            detail="notificaciones_config debe ser un objeto JSON con las claves 'atributos'/'cantidad'",
        )

    claves_desconocidas = set(config.keys()) - {"atributos", "cantidad"}
    errors: List[str] = [
        f"Clave desconocida: '{c}'. Solo se acepta 'atributos' y 'cantidad'" for c in sorted(claves_desconocidas)
    ]

    normalizado: Dict[str, Any] = {}

    atributos_config = config.get("atributos") or {}
    if not isinstance(atributos_config, dict):
        errors.append("'atributos' debe ser un objeto {nombre_de_atributo: configuración}")
        atributos_config = {}

    atributos_normalizados: Dict[str, Any] = {}
    for attr_nombre, bloque in atributos_config.items():
        attr_nombre = (attr_nombre or "").strip()

        attr_tipo = (inventario_atributos or {}).get(attr_nombre)
        if attr_tipo is None:
            errors.append(f"El atributo '{attr_nombre}' no existe en este inventario")
            continue
        attr_tipo = attr_tipo.lower().strip()

        if not isinstance(bloque, dict) or "tipo" not in bloque:
            errors.append(f"'{attr_nombre}': falta indicar 'tipo' ('fecha' o 'numero')")
            continue

        tipo_notif = bloque.get("tipo")
        if tipo_notif == "fecha":
            if attr_tipo not in TIPOS_FECHA:
                errors.append(f"'{attr_nombre}' es de tipo '{attr_tipo}', 'fecha' solo aplica a atributos de tipo date")
                continue
            dias = bloque.get("recordatorio_dias")
            if not isinstance(dias, int) or isinstance(dias, bool) or dias < 0:
                errors.append(f"'{attr_nombre}': 'recordatorio_dias' tiene que ser un entero mayor o igual a 0")
                continue
            atributos_normalizados[attr_nombre] = {"tipo": "fecha", "recordatorio_dias": dias}

        elif tipo_notif == "numero":
            if attr_tipo not in TIPOS_NUMERO:
                errors.append(f"'{attr_nombre}' es de tipo '{attr_tipo}', 'numero' solo aplica a atributos numéricos")
                continue
            sub_errors: List[str] = []
            bloque_normalizado = _validar_bloque_numero(attr_nombre, bloque, sub_errors)
            errors.extend(sub_errors)
            if not sub_errors:
                atributos_normalizados[attr_nombre] = {"tipo": "numero", **bloque_normalizado}

        else:
            errors.append(f"'{attr_nombre}': 'tipo' tiene que ser 'fecha' o 'numero', no '{tipo_notif}'")

    if atributos_normalizados:
        normalizado["atributos"] = atributos_normalizados

    cantidad_config = config.get("cantidad")
    if cantidad_config is not None:
        if not isinstance(cantidad_config, dict):
            errors.append("'cantidad' debe ser un objeto {minimo, maximo}")
        else:
            sub_errors = []
            bloque_normalizado = _validar_bloque_numero("Cantidad", cantidad_config, sub_errors)
            errors.extend(sub_errors)
            if not sub_errors:
                normalizado["cantidad"] = bloque_normalizado

    if errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "Error en configuración de notificaciones", "errors": errors},
        )

    return normalizado


def validar_notificaciones_item(
    override: Dict[str, Any],
    inventario_atributos: Dict[str, str],
) -> Dict[str, Any]:
    """
    Valida el override de notificaciones de UN ítem puntual. A diferencia de
    validar_notificaciones_config (que declara qué atributos monitorea el
    inventario por default), el override de un ítem es independiente de eso:
    cualquier atributo de fecha o numérico del ESQUEMA del inventario admite
    un override puntual, tenga o no el inventario un default para esa señal
    (y la Cantidad siempre, es un campo nativo de todo ítem). Solo se valida
    contra el tipo real del atributo (no puede inventar uno nuevo ni pisar
    uno de texto/booleano). Cualquier campo que el ítem no fije queda sin
    entrada acá, y resolver_recordatorio_dias()/resolver_minimo_maximo() (más
    abajo) caen al default del inventario si existe, o a "sin umbral" si no.
    """
    if not isinstance(override, dict):
        raise HTTPException(
            status_code=400,
            detail="notificaciones_config debe ser un objeto JSON con las claves 'atributos'/'cantidad'",
        )

    claves_desconocidas = set(override.keys()) - {"atributos", "cantidad"}
    errors: List[str] = [
        f"Clave desconocida: '{c}'. Solo se acepta 'atributos' y 'cantidad'" for c in sorted(claves_desconocidas)
    ]

    normalizado: Dict[str, Any] = {}

    atributos_override = override.get("atributos") or {}
    if not isinstance(atributos_override, dict):
        errors.append("'atributos' debe ser un objeto {nombre_de_atributo: configuración}")
        atributos_override = {}

    atributos_normalizados: Dict[str, Any] = {}
    for attr_nombre, bloque in atributos_override.items():
        attr_nombre = (attr_nombre or "").strip()
        attr_tipo = (inventario_atributos or {}).get(attr_nombre)
        if attr_tipo is None:
            errors.append(f"El atributo '{attr_nombre}' no existe en este inventario")
            continue
        attr_tipo = attr_tipo.lower().strip()
        if not isinstance(bloque, dict):
            errors.append(f"'{attr_nombre}': la configuración debe ser un objeto")
            continue

        if attr_tipo in TIPOS_FECHA:
            if "recordatorio_dias" not in bloque:
                errors.append(f"'{attr_nombre}': solo se puede fijar 'recordatorio_dias' (es un atributo de fecha)")
                continue
            dias = bloque.get("recordatorio_dias")
            if not isinstance(dias, int) or isinstance(dias, bool) or dias < 0:
                errors.append(f"'{attr_nombre}': 'recordatorio_dias' tiene que ser un entero mayor o igual a 0")
                continue
            atributos_normalizados[attr_nombre] = {"recordatorio_dias": dias}
        elif attr_tipo in TIPOS_NUMERO:
            sub_errors: List[str] = []
            bloque_normalizado = _validar_bloque_numero(attr_nombre, bloque, sub_errors)
            errors.extend(sub_errors)
            if not sub_errors:
                atributos_normalizados[attr_nombre] = bloque_normalizado
        else:
            errors.append(f"'{attr_nombre}' es de tipo '{attr_tipo}' — solo los atributos de fecha o numéricos admiten notificaciones")

    if atributos_normalizados:
        normalizado["atributos"] = atributos_normalizados

    cantidad_override = override.get("cantidad")
    if cantidad_override is not None:
        if not isinstance(cantidad_override, dict):
            errors.append("'cantidad' debe ser un objeto {minimo, maximo}")
        else:
            sub_errors = []
            bloque_normalizado = _validar_bloque_numero("Cantidad", cantidad_override, sub_errors)
            errors.extend(sub_errors)
            if not sub_errors:
                normalizado["cantidad"] = bloque_normalizado

    if errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "Error en configuración de notificaciones del ítem", "errors": errors},
        )

    return normalizado


def resolver_recordatorio_dias(override: Dict[str, Any], default_inventario: Dict[str, Any]) -> int:
    """El ítem gana si fijó su propio valor; si no, se usa el del inventario."""
    if "recordatorio_dias" in (override or {}):
        return override["recordatorio_dias"]
    return default_inventario.get("recordatorio_dias")


def resolver_minimo_maximo(override: Dict[str, Any], default_inventario: Dict[str, Any]):
    """
    Mezcla campo por campo (no todo-o-nada): si el ítem fijó 'minimo' pero no
    'maximo', el 'maximo' sigue siendo el del inventario, y viceversa —
    "si no se fija uno se elige por default el del inventario".
    """
    override = override or {}
    default_inventario = default_inventario or {}
    minimo = override["minimo"] if "minimo" in override else default_inventario.get("minimo")
    maximo = override["maximo"] if "maximo" in override else default_inventario.get("maximo")
    return minimo, maximo


def limpiar_notificaciones_item_huerfanas(
    override: Dict[str, Any],
    inventario_atributos: Dict[str, str],
) -> Dict[str, Any]:
    """
    Descarta las entradas del override de un ítem si el atributo que
    referencian fue borrado, renombrado, o cambió a un tipo que ya no admite
    notificar (ej. integer -> string) — el override es independiente de si el
    inventario tiene o no un default para esa señal, así que se limpia contra
    el ESQUEMA de atributos, no contra notificaciones_config. Se llama cuando
    cambian los atributos del inventario (PUT /inventarios/{id}), mismo
    criterio que clean_orphan_roles/limpiar_bloques_huerfanos.

    'cantidad' nunca queda huérfana: es un campo nativo de todo ítem, no
    depende del esquema de atributos.
    """
    if not override:
        return {}

    inventario_atributos = inventario_atributos or {}
    vigentes: Dict[str, Any] = {}
    for attr_nombre, bloque in (override.get("atributos") or {}).items():
        attr_tipo = (inventario_atributos.get(attr_nombre) or "").lower().strip()
        if attr_tipo in TIPOS_FECHA or attr_tipo in TIPOS_NUMERO:
            vigentes[attr_nombre] = bloque

    resultado: Dict[str, Any] = {}
    if vigentes:
        resultado["atributos"] = vigentes
    if override.get("cantidad"):
        resultado["cantidad"] = override["cantidad"]
    return resultado


def limpiar_notificaciones_huerfanas(
    config: Dict[str, Any],
    nuevos_atributos: Dict[str, str],
) -> Dict[str, Any]:
    """
    Descarta las entradas de notificaciones_config['atributos'] cuyo atributo
    fue borrado, renombrado, o cambió a un tipo que ya no admite esa
    configuración (ej. un atributo de fecha pasó a string). Se llama desde
    update_inventario cada vez que cambia el esquema de atributos — mismo
    criterio que clean_orphan_roles.

    'cantidad' nunca queda huérfana: no referencia ningún atributo, aplica
    siempre sobre el campo nativo del ítem.
    """
    if not config:
        return {}

    atributos_config = config.get("atributos") or {}
    vigentes: Dict[str, Any] = {}
    for attr_nombre, bloque in atributos_config.items():
        attr_tipo = (nuevos_atributos or {}).get(attr_nombre)
        if not attr_tipo:
            continue
        attr_tipo = attr_tipo.lower().strip()
        tipo_notif = bloque.get("tipo")
        if tipo_notif == "fecha" and attr_tipo in TIPOS_FECHA:
            vigentes[attr_nombre] = bloque
        elif tipo_notif == "numero" and attr_tipo in TIPOS_NUMERO:
            vigentes[attr_nombre] = bloque

    resultado: Dict[str, Any] = {}
    if vigentes:
        resultado["atributos"] = vigentes
    if config.get("cantidad"):
        resultado["cantidad"] = config["cantidad"]
    return resultado
