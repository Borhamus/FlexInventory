#En este archivo se pueden definir validadores personalizados para los datos de entrada en las rutas de la API

from typing import Dict, Any
from fastapi import HTTPException
from datetime import datetime

def parse_value_by_type(value: Any, expected_type: str) -> Any:
    """
    Convierte un valor al tipo esperado.
    
    Args:
        value: Valor a convertir
        expected_type: Tipo esperado (string, int, float, boolean, date)
    
    Returns:
        Valor convertido al tipo correcto
    
    Raises:
        ValueError: Si no se puede convertir el valor
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
        inventario_nombre: Nombre del inventario (para mensajes de error más claros)
    
    Returns:
        Dict con los atributos validados y parseados al tipo correcto
    
    Raises:
        HTTPException: Si falta algún atributo o el tipo es incorrecto
    """
    # Si el inventario no tiene atributos definidos, permitir cualquier atributo
    if not inventario_atributos:
        return item_atributos
    
    validated_atributos = {}
    missing_attributes = []
    type_errors = []
    
    # Verificar que todos los atributos requeridos estén presentes y sean del tipo correcto
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
    for attr_name, attr_value in item_atributos.items():
        if attr_name not in inventario_atributos:
            validated_atributos[attr_name] = attr_value
    
    # Si hay errores, lanzar excepción con información detallada
    errors = []
    if missing_attributes:
        errors.append(f"Atributos faltantes: {', '.join(missing_attributes)}")
    if type_errors:
        errors.append(f"Errores de tipo: {'; '.join(type_errors)}")
    
    if errors:
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

def get_attribute_schema(inventario_atributos: Dict[str, str]) -> Dict[str, Any]:
    """
    Genera un schema de ejemplo basado en los atributos del inventario.
    Útil para mostrar al usuario qué atributos necesita proporcionar.
    
    Args:
        inventario_atributos: Definición de atributos del inventario
    
    Returns:
        Dict con valores de ejemplo para cada atributo
    """
    type_examples = {
        "string": "ejemplo_texto",
        "str": "ejemplo_texto",
        "integer": 0,
        "int": 0,
        "float": 0.0,
        "number": 0.0,
        "boolean": True,
        "bool": True,
        "date": "2025-01-09"
    }
    
    schema = {}
    for attr_name, attr_type in inventario_atributos.items():
        schema[attr_name] = type_examples.get(attr_type, "valor")
    
    return schema