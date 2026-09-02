import api from './axios.config';

export interface Item {
  id: number;
  nombre: string;
  cantidad: number;
  inventario_id: number;
  atributos: Record<string, any>;
  // URL pública lista para usar en un <img src>, o null si no tiene foto.
  imagen?: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Inventario {
  id: number;
  nombre: string;
  atributos: Record<string, string>; // schema: {"color": "string", "talle": "string"}
  roles_atributos: Record<string, string>; // {"volumen_unitario": "peso_m3", ...}
  // Si los items de este inventario piden/muestran foto — se elige al
  // crear el inventario (checkbox) y se puede cambiar después editándolo.
  fotos_habilitadas: boolean;
  // Bloques de estadística a medida configurados en el inventario (ver
  // ModalStatsInventory / PATCH /inventarios/{id}/bloques). Opcional: un
  // inventario recién creado no tiene ninguno.
  bloques_personalizados?: BloquePersonalizado[];
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

export interface TerminoFormula {
  tipo: 'atributo' | 'cantidad' | 'constante';
  atributo?: string | null;
  valor?: number | null;
}

export type OperadorAritmetico = 'mul' | 'div' | 'add' | 'sub';

export interface MetricaPersonalizada {
  clave: string;
  // No lo elige el usuario: si terminos tiene algo, es "sum" (se suma la
  // fórmula en todos los items que matchean el filtro); si terminos está
  // vacío, es "count" (se cuentan los items que matchean). Se infiere en
  // ModalBloquePersonalizado antes de guardar.
  operacion: 'count' | 'sum';
  // Vacíos = "contar". Se evalúan estrictamente de izquierda a derecha (sin
  // precedencia matemática): operadores[i] combina terminos[i] con
  // terminos[i+1], en orden — ver ModalBloquePersonalizado.
  terminos: TerminoFormula[];
  operadores: OperadorAritmetico[];
  filtro_atributo?: string | null;
  filtro_operador?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | null;
  filtro_valor?: unknown;
}

export interface BloquePersonalizado {
  nombre: string;
  plantilla: string;
  metricas: MetricaPersonalizada[];
}

export interface BloqueCalculado {
  nombre: string;
  plantilla: string;
  valores: Record<string, number | null>;
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

  getBloques: async (id: number): Promise<BloqueCalculado[]> => {
    const response = await api.get(`/inventarios/${id}/bloques`);
    return response.data;
  },

  configurarBloques: async (id: number, bloques_personalizados: BloquePersonalizado[]) => {
    const response = await api.patch(`/inventarios/${id}/bloques`, { bloques_personalizados });
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

  subirImagenItem: async (id: number, archivo: File): Promise<Item> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const { data } = await api.post(`/items/${id}/imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  eliminarImagenItem: async (id: number): Promise<Item> => {
    const { data } = await api.delete(`/items/${id}/imagen`);
    return data;
  },

};