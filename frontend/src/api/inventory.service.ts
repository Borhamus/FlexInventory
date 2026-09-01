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
  roles_atributos: Record<string, string>; // {"volumen_unitario": "peso_m3", ...}
  items: Item[];
  creado_en: string;
  actualizado_en: string;
}

export interface AtributoStats {
  tipo: string;
  con_valor: number;
  promedio?: number | null;
  suma?: number | null;
  minimo?: number | null;
  maximo?: number | null;
  verdaderos?: number | null;
  falsos?: number | null;
  proxima_fecha?: string | null;
  ultima_fecha?: string | null;
  dias_restantes?: number | null;
}

export interface InventarioStats {
  total_items: number;
  atributos: Record<string, AtributoStats>;
  volumen_total?: {
    atributo: string;
    volumen_total: number | null;
    items_con_valor: number;
  } | null;
}

export interface HistogramaBucket {
  desde: number;
  hasta: number;
  frecuencia: number;
}

export interface HistogramaMediana {
  atributo: string;
  con_valor: number;
  minimo: number | null;
  maximo: number | null;
  mediana: number | null;
  n_intervalos: number;
  ancho_intervalo: number | null;
  histograma: HistogramaBucket[];
}

export interface PromedioRango {
  atributo: string;
  desde: number;
  hasta: number;
  promedio: number | null;
  cantidad: number;
}

export interface AlertaVencimiento {
  item_id: number;
  item_nombre: string;
  inventario_id: number;
  inventario_nombre: string;
  fecha_vencimiento: string;
  dias_restantes: number;
  proveedor: string | null;
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

  updateInventory: async (id: number, payload: { nombre?: string; atributos?: Record<string, string>; defaults?: Record<string, unknown> }) => {
    const response = await api.put(`/inventarios/${id}`, payload);
    return response.data;
  },

  configurarRoles: async (id: number, roles_atributos: Record<string, string>) => {
    const response = await api.patch(`/inventarios/${id}/roles`, { roles_atributos });
    return response.data;
  },

  getStats: async (id: number): Promise<InventarioStats> => {
    const response = await api.get(`/inventarios/${id}/stats`);
    return response.data;
  },

  getMediana: async (id: number, atributo: string, intervalos?: number): Promise<HistogramaMediana> => {
    const response = await api.get(`/inventarios/${id}/atributos/${encodeURIComponent(atributo)}/mediana`, {
      params: intervalos ? { intervalos } : {},
    });
    return response.data;
  },

  getPromedioRango: async (id: number, atributo: string, desde: number, hasta: number): Promise<PromedioRango> => {
    const response = await api.get(`/inventarios/${id}/atributos/${encodeURIComponent(atributo)}/promedio-rango`, {
      params: { desde, hasta },
    });
    return response.data;
  },

  getAlertas: async (dias: number = 7): Promise<AlertaVencimiento[]> => {
    const response = await api.get('/inventarios/alertas', { params: { dias } });
    return response.data;
  },

  createItem: async (payload: any) => {
    const response = await api.post(`/items/`, payload);
    return response.data;
  },

  deleteItem: async (itemId: number) => {
    const response = await api.delete(`/items/${itemId}`);
    return response.data;
  },

  updateItem: async (id: number, payload: any) => {
    const { data } = await api.put(`/items/${id}`, payload);
    return data;
  },

};