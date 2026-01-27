"""
Validadores para la gestión de inventarios y items.

Este módulo contiene la lógica de validación para:
- Atributos de inventarios (tipos permitidos, formato)
- Atributos de items (concordancia con inventario, conversión de tipos)
"""

from typing import Dict, Any
from fastapi import HTTPException
from datetime import datetime


# ==================== CONSTANTES ====================

ALLOWED_TYPES = {"string", "str", "integer", "int", "float", "number", "boolean", "bool", "date"}

TYPE_EXAMPLES = {
    "string": "ejemplo_texto",
    "str": "ejemplo_texto",
    "integer": 0,
    "int": 0,
    "float": 0.0,
    "number": 0.0,
    "boolean": True,
    "bool": True,
    "date": "2025-01-19"
}


# ==================== VALIDACIÓN DE TIPOS ====================

def parse_value_by_type(value: Any, expected_type: str) -> Any:
    """
    Convierte un valor al tipo esperado según la definición del inventario.
    
    Args:
        value: Valor a convertir
        expected_type: Tipo esperado (string, int, float, boolean, date)
    
    Returns:
        Valor convertido al tipo correcto
    
    Raises:
        ValueError: Si no se puede convertir el valor al tipo esperado
    """
    try:
        if expected_type in ("string", "str"):
            return str(value)
        
        elif expected_type in ("integer", "int"):
            return int(value)
        
        elif expected_type in ("float", "number"):
            return float(value)
        
        elif expected_type in ("boolean", "bool"):
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ('true', '1', 'yes', 'si', 'sí')
            return bool(value)
        
        elif expected_type == "date":
            if isinstance(value, str):
                # Intenta parsear diferentes formatos de fecha
                for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d'):
                    try:
                        datetime.strptime(value, fmt)
                        return value
                    except ValueError:
                        continue
                raise ValueError(f"Formato de fecha inválido: {value}. Use YYYY-MM-DD")
            return str(value)
        
        else:
            # Tipo no reconocido, retorna el valor sin modificar
            return value
            
    except (ValueError, TypeError) as e:
        raise ValueError(f"No se puede convertir '{value}' a tipo '{expected_type}': {str(e)}")


# ==================== VALIDACIÓN DE ATRIBUTOS DE INVENTARIO ====================

def validate_inventario_atributos(atributos: Dict[str, str]) -> Dict[str, str]:
    """
    Valida que los atributos de un inventario tengan el formato correcto.
    
    Args:
        atributos: Diccionario con formato {"nombre_atributo": "tipo"}
    
    Returns:
        Diccionario normalizado con tipos en minúsculas
    
    Raises:
        HTTPException: Si el formato o los tipos son inválidos
    """
    if not isinstance(atributos, dict):
        raise HTTPException(
            status_code=400,
            detail="Los atributos deben ser un objeto JSON con formato {nombre: tipo}"
        )
    
    if not atributos:
        raise HTTPException(
            status_code=400,
            detail="Debe proporcionar al menos un atributo"
        )
    
    errors = []

    for attr_name, attr_type in atributos.items():
        # Validar que el nombre sea string
        if not isinstance(attr_name, str) or not attr_name.strip():
            errors.append(f"El nombre del atributo '{attr_name}' debe ser un string no vacío")
        
        # Validar que el tipo sea string
        if not isinstance(attr_type, str):
            errors.append(f"El tipo de '{attr_name}' debe ser string")
        # Validar que el tipo esté en los permitidos
        elif attr_type.lower() not in ALLOWED_TYPES:
            errors.append(
                f"Tipo inválido para '{attr_name}': '{attr_type}'. "
                f"Tipos permitidos: {', '.join(sorted(ALLOWED_TYPES))}"
            )

    if errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Error en definición de atributos del inventario",
                "errors": errors,
                "tipos_permitidos": list(sorted(ALLOWED_TYPES))
            }
        )

    # Normalizar tipos a minúsculas
    return {k.strip(): v.lower().strip() for k, v in atributos.items()}


def validate_single_atributo(nombre: str, tipo: str) -> Dict[str, str]:
    """
    Valida un único atributo para agregar a un inventario.
    
    Args:
        nombre: Nombre del atributo
        tipo: Tipo del atributo
    
    Returns:
        Diccionario con el atributo validado y normalizado
    
    Raises:
        HTTPException: Si el nombre o tipo son inválidos
    """
    if not nombre or not isinstance(nombre, str) or not nombre.strip():
        raise HTTPException(
            status_code=400,
            detail="El nombre del atributo debe ser un string no vacío"
        )
    
    if not tipo or not isinstance(tipo, str):
        raise HTTPException(
            status_code=400,
            detail="El tipo del atributo debe ser un string"
        )
    
    tipo_lower = tipo.lower().strip()
    
    if tipo_lower not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Tipo inválido: '{tipo}'",
                "tipos_permitidos": list(sorted(ALLOWED_TYPES))
            }
        )
    
    return {nombre.strip(): tipo_lower}


def validate_atributo_exists(atributos: Dict[str, str], atributo_nombre: str) -> None:
    """
    Valida que un atributo exista en el inventario.
    
    Args:
        atributos: Atributos actuales del inventario
        atributo_nombre: Nombre del atributo a verificar
    
    Raises:
        HTTPException: Si el atributo no existe
    """
    if not atributos or atributo_nombre not in atributos:
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"El atributo '{atributo_nombre}' no existe en este inventario",
                "atributos_disponibles": list(atributos.keys()) if atributos else []
            }
        )


def validate_atributo_not_exists(atributos: Dict[str, str], atributo_nombre: str) -> None:
    """
    Valida que un atributo NO exista en el inventario (para agregar nuevos).
    
    Args:
        atributos: Atributos actuales del inventario
        atributo_nombre: Nombre del atributo a verificar
    
    Raises:
        HTTPException: Si el atributo ya existe
    """
    if atributos and atributo_nombre in atributos:
        raise HTTPException(
            status_code=400,
            detail=f"El atributo '{atributo_nombre}' ya existe en este inventario"
        )


# ==================== VALIDACIÓN DE ATRIBUTOS DE ITEMS ====================

def validate_item_attributes(
    item_atributos: Dict[str, Any], 
    inventario_atributos: Dict[str, str],
    inventario_nombre: str = None
) -> Dict[str, Any]:
    """
    Valida que los atributos del item cumplan con los requisitos del inventario.
    
    Args:
        item_atributos: Atributos proporcionados para el item
        inventario_atributos: Definición de atributos del inventario {"color": "string", "precio": "float"}
        inventario_nombre: Nombre del inventario (opcional, para mensajes más claros)
    
    Returns:
        Diccionario con los atributos validados y convertidos al tipo correcto
    
    Raises:
        HTTPException: Si faltan atributos requeridos o hay errores de tipo
    """
    # Si el inventario no tiene atributos definidos, permitir cualquier atributo
    if not inventario_atributos:
        return item_atributos or {}
    
    if not item_atributos:
        item_atributos = {}
    
    validated_atributos = {}
    missing_attributes = []
    type_errors = []
    
    # Verificar que todos los atributos requeridos estén presentes y con el tipo correcto
    for attr_name, attr_type in inventario_atributos.items():
        if attr_name not in item_atributos:
            missing_attributes.append(f"{attr_name} ({attr_type})")
        else:
            try:
                validated_value = parse_value_by_type(item_atributos[attr_name], attr_type)
                validated_atributos[attr_name] = validated_value
            except ValueError as e:
                type_errors.append(f"{attr_name}: {str(e)}")
    
    # Agregar atributos adicionales que no están en la definición del inventario
    # (permitimos atributos extra para flexibilidad)
    for attr_name, attr_value in item_atributos.items():
        if attr_name not in inventario_atributos:
            validated_atributos[attr_name] = attr_value
    
    # Si hay errores, lanzar excepción con información detallada
    if missing_attributes or type_errors:
        errors = []
        if missing_attributes:
            errors.append(f"Atributos faltantes: {', '.join(missing_attributes)}")
        if type_errors:
            errors.append(f"Errores de tipo: {'; '.join(type_errors)}")
        
        detail = {
            "message": "Los atributos del item no cumplen con los requisitos del inventario",
            "errors": errors,
            "inventario_requiere": inventario_atributos,
            "item_proporciona": item_atributos
        }
        
        if inventario_nombre:
            detail["inventario_nombre"] = inventario_nombre
        
        raise HTTPException(status_code=400, detail=detail)
    
    return validated_atributos


# ==================== UTILIDADES ====================

def get_attribute_schema(inventario_atributos: Dict[str, str]) -> Dict[str, Any]:
    """
    Genera un schema de ejemplo basado en los atributos del inventario.
    Útil para mostrar al usuario qué atributos necesita proporcionar.
    
    Args:
        inventario_atributos: Definición de atributos del inventario
    
    Returns:
        Diccionario con valores de ejemplo para cada atributo
    """
    if not inventario_atributos:
        return {}
    
    schema = {}
    for attr_name, attr_type in inventario_atributos.items():
        schema[attr_name] = TYPE_EXAMPLES.get(attr_type, "valor")
    
    return schema