import api from './axios.config';

export interface Notificacion {
  id: number;
  item_id: number;
  item_nombre?: string | null;
  inventario_id?: number | null;
  inventario_nombre?: string | null;
  origen: 'atributo' | 'cantidad';
  atributo: string;
  tipo: 'fecha' | 'numero';
  evento: 'recordatorio' | 'vencido' | 'minimo' | 'maximo';
  mensaje: string;
  valor_detectado?: string | null;
  creada_en: string;
  resuelta_en?: string | null;
  leida: boolean;
  leida_en?: string | null;
}

export interface PaginatedNotificaciones {
  items: Notificacion[];
  total: number;
}

export const notificacionesService = {
  listar: async (params: { leida?: boolean; inventario_id?: number; skip?: number; limit?: number } = {}): Promise<PaginatedNotificaciones> => {
    const response = await api.get('/notificaciones/', { params });
    return response.data;
  },

  contarNoLeidas: async (): Promise<number> => {
    const response = await api.get('/notificaciones/no-leidas/count');
    return response.data.count;
  },

  marcarLeida: async (id: number, leida: boolean = true): Promise<Notificacion> => {
    const response = await api.patch(`/notificaciones/${id}/leida`, { leida });
    return response.data;
  },

  marcarTodasLeidas: async (): Promise<{ actualizadas: number }> => {
    const response = await api.patch('/notificaciones/marcar-todas-leidas');
    return response.data;
  },
};
