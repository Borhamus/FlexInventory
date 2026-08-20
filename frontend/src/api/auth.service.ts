import type { LoginCredentials, RegisterTenantData } from '../schemas/auth.schema';
import api from './axios.config';

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/token', credentials);
    return response.data; // Aquí vendría tu token y datos de usuario
  },
  registerTenant: async (data: RegisterTenantData) => {
    const response = await api.post('/tenants/', data);
    return response.data;
  },
};