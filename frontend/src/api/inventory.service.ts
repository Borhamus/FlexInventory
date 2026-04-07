import api from './axios.config';

export interface Item {
  id: number;
  nombre: string;
  cantidad: number;
  inventario_id: number;
  atributos: Record<string, any>;
  creado_en: string;
  actualizado_en: string;
}

export interface Inventario {
  id: number;
  nombre: string;
  atributos: Record<string, string>; // schema: {"color": "string", "talle": "string"}
  items: Item[];
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
  
  createInventory: async (data: any) => {
    const response = await api.post('/inventarios/', data);
    return response.data;
  },
  
  deleteInventory: async (id: number) => {
    const response = await api.delete(`/inventarios/${id}`);
    return response.data;
  },

  updateInventory: async (id: number, payload: { nombre: string }) => {
    const response = await api.put(`/inventarios/${id}`, payload);
    return response.data;
  },

};