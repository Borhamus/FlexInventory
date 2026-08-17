import api from './axios.config';
import type { Item } from '../schemas/items.schema';

export interface ItemsOrdenFiltro {
    sortBy?: string;
    order?: 'asc' | 'desc';
    filtroAtributo?: string;
    filtroDesde?: string;
    filtroHasta?: string;
}

export const itemsService = {
    // Obtener todos los ítems (con filtro opcional de inventario, y orden/filtro
    // por atributo — ver GET /items/ en el backend, Fase 5)
    getItems: async (inventarioId?: number, ordenFiltro: ItemsOrdenFiltro = {}): Promise<Item[]> => {
        const { sortBy, order, filtroAtributo, filtroDesde, filtroHasta } = ordenFiltro;
        const response = await api.get('/items/', {
            params: {
                ...(inventarioId ? { inventario_id: inventarioId } : {}),
                ...(sortBy ? { sort_by: sortBy, order: order || 'asc' } : {}),
                ...(filtroAtributo ? { filtro_atributo: filtroAtributo } : {}),
                ...(filtroDesde ? { filtro_desde: filtroDesde } : {}),
                ...(filtroHasta ? { filtro_hasta: filtroHasta } : {}),
            },
        });
        // Blindaje por si el backend devuelve un objeto en lugar del array directo
        return Array.isArray(response.data) ? response.data : (response.data.items || []);
    },

    getItem: async (id: number): Promise<Item> => {
        const response = await api.get(`/items/${id}`);
        return response.data;
    },

    // Vinculación con catálogos (Esta acción pertenece lógicamente a la relación)
    addItemsToCatalogo: async (catalogoId: number, itemIds: number[]) => {
        const response = await api.post(`/catalogos/${catalogoId}/items`, {
            item_ids: itemIds
        });
        return response.data;
    },
    // api/items.service.ts (Añadir este método)
    removeItemFromCatalogo: async (catalogoId: number, itemId: number) => {
        await api.delete(`/catalogos/${catalogoId}/items/${itemId}`);
        return itemId;
    },
    // Actualizar un ítem específico
    updateItem: async (id: number, itemData: Partial<Item>): Promise<Item> => {
        const response = await api.put(`/items/${id}`, itemData);
        return response.data;
    },

    // Eliminar permanentemente un ítem
    deleteItem: async (id: number): Promise<void> => {
        await api.delete(`/items/${id}`);
    },

    // Eliminar masivamente varios ítems
    deleteItemsBulk: async (itemIds: number[]): Promise<any> => {
        const response = await api.delete('/items/bulk-delete', {
            data: { item_ids: itemIds } 
        });
        return response.data;
    }
};