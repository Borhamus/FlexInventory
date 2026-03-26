import { z } from 'zod';
import { itemSchema } from './items.schema';

// Esquema para el Inventario (Cabecera + Items)
export const inventarioSchema = z.object({
  id: z.number(),
  nombre: z.string().min(3, 'Nombre demasiado corto'),
  descripcion: z.string().nullable(),
  // Aquí definimos que las claves son strings y los valores tipos (ej: "string", "number")
  items: z.array(itemSchema).default([]),
  creado_en: z.string(),
  actualizado_en: z.string(),
});

export type Catalogo = z.infer<typeof inventarioSchema>;
