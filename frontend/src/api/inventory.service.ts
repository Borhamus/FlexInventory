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
    const response = await api.get(`/inventarios/${id}`);
    return response.data;
  }
  ,
  getInventarios: async (): Promise<Inventario[]> => {
    const response = await api.get('/inventarios/all');
    return response.data;
  }
  ,
};