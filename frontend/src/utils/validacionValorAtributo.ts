import type { Rule } from 'antd/es/form';

// Reglas de validación del VALOR que carga el usuario para un atributo, según
// el tipo definido en el inventario. Los atributos son opcionales, así que un
// valor vacío (null/undefined) siempre pasa; solo se valida lo que sí se cargó.
//   - entero:  número entero (permite negativos, no decimales).
//   - natural: número entero de 0 o mayor (no negativos, no decimales).
//   - decimal: cualquier número (permite negativos y decimales) → sin regla.
export function reglasValorAtributo(tipo: string): Rule[] {
  if (tipo === 'integer' || tipo === 'int') {
    return [{
      validator: (_, value) =>
        value === undefined || value === null || Number.isInteger(value)
          ? Promise.resolve()
          : Promise.reject(new Error('Debe ser un número entero')),
    }];
  }
  if (tipo === 'natural') {
    return [{
      validator: (_, value) =>
        value === undefined || value === null || (Number.isInteger(value) && value >= 0)
          ? Promise.resolve()
          : Promise.reject(new Error('Debe ser un número natural (0 o mayor)')),
    }];
  }
  return [];
}
