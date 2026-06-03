import type { LoginCredentials } from '../schemas/auth.schema';
import api from './axios.config';

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/token', credentials);
    return response.data; // Aquí vendría tu token y datos de usuario
  },
};