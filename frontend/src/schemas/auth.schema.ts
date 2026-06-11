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

export const registerTenantSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre del comercio debe tener al menos 3 caracteres')
    .nonempty('El nombre del comercio es obligatorio'),
  owner_username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .nonempty('El nombre de usuario es obligatorio'),
  owner_email: z
    .string()
    .email('Ingresá un email válido')
    .nonempty('El email es obligatorio'),
  owner_password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .nonempty('La contraseña es obligatoria'),
});

export type RegisterTenantData = z.infer<typeof registerTenantSchema>;