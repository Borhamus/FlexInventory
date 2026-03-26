import type { Inventario } from '../schemas/inventarios.schema';
import api from './axios.config';

export const inventoryService = {
  getInventario: async (id: number): Promise<Inventario> => {
    const response = await api.get(`/inventarios/${id}`);
    // Validamos la respuesta individual
    return response.data;
  },

  getInventarios: async (): Promise<Inventario[]> => {
    const response = await api.get('/inventarios/all');
    // Validamos que sea un array de inventarios
    return response.data;
  },
};