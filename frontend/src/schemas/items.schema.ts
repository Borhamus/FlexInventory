import { z } from 'zod';

// Esquema para un Item individual
export const itemSchema = z.object({
  id: z.number(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  cantidad: z.number().min(0, 'La cantidad no puede ser negativa'),
  inventario_id: z.number(),
  // Record<string, any> para los atributos dinámicos
  atributos: z.record(z.any()).default({}),
  // URL pública lista para usar en un <img src>, o null si no tiene foto.
  imagen: z.string().nullable().optional(),
  creado_en: z.string(),
  actualizado_en: z.string(),
});

// Esquema para CREAR (Omite IDs y fechas que pone el servidor)
export const createItemSchema = itemSchema.omit({ 
  id: true, 
  creado_en: true, 
  actualizado_en: true 
});

export type Item = z.infer<typeof itemSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;