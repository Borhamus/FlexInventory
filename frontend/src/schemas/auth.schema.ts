import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .nonempty('El nombre de usuario es obligatorio'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .nonempty('La contraseña es obligatoria'),
});

// Esto extrae el "Tipo" de TypeScript automáticamente del esquema
export type LoginCredentials = z.infer<typeof loginSchema>;