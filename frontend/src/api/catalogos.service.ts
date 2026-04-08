import type { Catalogo } from '../schemas/catalogos.schema';
import api from './axios.config';

export const catalogosService = {
  getCatalogo: async (id: number): Promise<Catalogo> => {
    const response = await api.get(`/catalogos/${id}`);
    return response.data;
  },
  getCatalogos: async (): Promise<Catalogo[]> => {
    const response = await api.get('/catalogos');
    return response.data;
  },
  createCatalogo: async (data: any) => {
    const response = await api.post('/catalogos/', data);
    return response.data;
  },
};