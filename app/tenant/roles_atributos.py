"""
Roles de atributo: metadata que indica qué atributo de un inventario cumple
un rol especial (ej: cuál es el atributo de volumen unitario, cuál es la
fecha de reposición).

Implementado como Registry Pattern: cada rol se declara una única vez en
ROLES_REGISTRY. El resto del código (validación, y más adelante el cálculo
de volumen/alertas) nunca pregunta "¿qué rol es este?" con un if/elif —
solo itera el registro. Agregar un rol nuevo (por ejemplo, el atributo de
umbral para las alertas que quedaron pendientes) es una entrada más acá,
sin tocar la lógica de validación existente (principio Abierto/Cerrado).
"""

from dataclasses import dataclass
from typing import Callable, Dict, FrozenSet, List, Optional
from fastapi import HTTPException


@dataclass(frozen=True)
class RolAtributo:
    nombre: str
    tipos_permitidos: FrozenSet[str]
    # Hook opcional para reglas de negocio más allá del chequeo de tipo
    # (ej: "el atributo de proveedor no puede estar vacío en ningún item").
    # Ningún rol lo usa todavía; existe para que agregar esa regla el día
    # de mañana no requiera tocar validate_roles_atributos.
    validar_extra: Optional[Callable[[str, Dict[str, str]], List[str]]] = None


ROLES_REGISTRY: Dict[str, RolAtributo] = {
    "volumen_unitario": RolAtributo(
        nombre="volumen_unitario",
        tipos_permitidos=frozenset({"integer", "int", "float", "number"}),
    ),
    "fecha_reposicion": RolAtributo(
        nombre="fecha_reposicion",
        tipos_permitidos=frozenset({"date"}),
    ),
    "proveedor": RolAtributo(
        nombre="proveedor",
        tipos_permitidos=frozenset({"string", "str"}),
    ),
}


def validate_roles_atributos(
    roles: Dict[str, str],
    inventario_atributos: Dict[str, str],
) -> Dict[str, str]:
    """
    Valida un mapa {rol: nombre_de_atributo} contra el schema del inventario.

    Se acumulan todos los errores antes de fallar (mismo criterio que
    validate_inventario_atributos en validators.py), para que el usuario
    vea de una todo lo que está mal en vez de corregir de a uno.

    Reglas:
    - El rol debe existir en ROLES_REGISTRY.
    - El atributo referenciado debe existir en inventario_atributos.
    - El tipo de ese atributo debe estar entre los tipos_permitidos del rol.
    - Si el rol define validar_extra, sus errores también se acumulan.

    Devuelve el mapa normalizado (nombres sin espacios sobrantes).
    """
    if not isinstance(roles, dict):
        raise HTTPException(
            status_code=400,
            detail="roles_atributos debe ser un objeto JSON con formato {rol: nombre_de_atributo}",
        )

    errors: List[str] = []
    normalizado: Dict[str, str] = {}

    for rol_nombre, attr_nombre in roles.items():
        rol_nombre = (rol_nombre or "").strip()
        attr_nombre = (attr_nombre or "").strip()

        rol = ROLES_REGISTRY.get(rol_nombre)
        if rol is None:
            errors.append(
                f"Rol desconocido: '{rol_nombre}'. Roles válidos: {', '.join(sorted(ROLES_REGISTRY))}"
            )
            continue

        attr_tipo = (inventario_atributos or {}).get(attr_nombre)
        if attr_tipo is None:
            errors.append(
                f"El atributo '{attr_nombre}' (rol '{rol_nombre}') no existe en este inventario"
            )
            continue

        if attr_tipo.lower().strip() not in rol.tipos_permitidos:
            errors.append(
                f"El atributo '{attr_nombre}' (rol '{rol_nombre}') es de tipo '{attr_tipo}', "
                f"se requiere uno de: {', '.join(sorted(rol.tipos_permitidos))}"
            )
            continue

        if rol.validar_extra:
            errors.extend(rol.validar_extra(attr_nombre, inventario_atributos))

        normalizado[rol_nombre] = attr_nombre

    if errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "Error en configuración de roles de atributo", "errors": errors},
        )

    return normalizado


def clean_orphan_roles(
    roles: Dict[str, str],
    nuevos_atributos: Dict[str, str],
) -> Dict[str, str]:
    """
    Descarta los roles cuyo atributo referenciado ya no existe (se borró o
    renombró) o cambió a un tipo que el rol ya no acepta.

    Se llama desde update_inventario cada vez que cambia el schema de
    atributos, para que roles_atributos nunca quede apuntando a algo que no
    existe: Postgres no puede garantizar esa integridad con una FK porque el
    atributo es una clave dentro de un JSONB, no una fila de otra tabla — esa
    consistencia la tiene que mantener el código de la aplicación.
    """
    if not roles:
        return {}

    vigentes: Dict[str, str] = {}
    for rol_nombre, attr_nombre in roles.items():
        rol = ROLES_REGISTRY.get(rol_nombre)
        attr_tipo = (nuevos_atributos or {}).get(attr_nombre)
        if rol and attr_tipo and attr_tipo.lower().strip() in rol.tipos_permitidos:
            vigentes[rol_nombre] = attr_nombre

    return vigentes
