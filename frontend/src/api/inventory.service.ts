import api from './axios.config';

export interface Inventario {
  id: number;
  nombre: string;
  atributos: Record<string, any>;
  creado_en: string;
  actualizado_en: string;
}

export const inventoryService = {
  getInventario: async (id: number): Promise<Inventario> => {
    // El interceptor de axios debería manejar el token, 
    // pero para este prototipo lo pasamos manualmente si prefieres
    const token = localStorage.getItem('token');
    const response = await api.get(`/inventarios/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};