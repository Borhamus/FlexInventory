import { z } from 'zod';
import { itemSchema } from './items.schema';

// Esquema para el Inventario (Cabecera + Items)
export const catalogoSchema = z.object({
  id: z.number(),
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre es muy largo'),
  descripcion: z
    .string()
    .max(200, 'La descripción no puede exceder los 200 caracteres')
    .optional()
    .nullable(),
  // Aquí definimos que las claves son strings y los valores tipos (ej: "string", "number")
  items: z.array(itemSchema).default([]),
  creado_en: z.string(),
  actualizado_en: z.string(),
});

export type Catalogo = z.infer<typeof catalogoSchema>;
