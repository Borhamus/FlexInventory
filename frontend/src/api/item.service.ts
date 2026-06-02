import api from './axios.config';
import type { Item } from '../schemas/items.schema';

export const itemsService = {
    // Obtener todos los ítems (con filtro opcional de inventario)
    getItems: async (inventarioId?: number): Promise<Item[]> => {
        const response = await api.get('/items/', {
            params: inventarioId ? { inventario_id: inventarioId } : {}
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
    }
};