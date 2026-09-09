// hooks/useItems.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { itemsService } from '../api/item.service';
import type { ItemsOrdenFiltro } from '../api/item.service';
import { message } from 'antd';

// `enabled` default true para no cambiar el comportamiento de los usos
// existentes (ej. AddItemModal, que llama useItems() sin argumentos y
// espera que cargue de una). La vista de inventario la pasa en false hasta
// que el usuario activa un orden/filtro, para no duplicar el fetch de items
// que ya vienen embebidos en GET /inventarios/{id}.
export const useItems = (inventarioId?: number, ordenFiltro: ItemsOrdenFiltro = {}, enabled = true) => {
  return useQuery({
    queryKey: ['items', inventarioId, ordenFiltro],
    queryFn: () => itemsService.getItems(inventarioId, ordenFiltro),
    // placeholderData: mantiene los datos de la query anterior mientras se
    // hace el fetch del nuevo orden/filtro, para que la tabla no se vacíe
    // entre medio (el queryKey cambia con `ordenFiltro`, así que cada orden
    // es una query distinta). Se quitó `initialData: []`: populaba cada key
    // nueva con [] y hacía parpadear la tabla vacía, y además anulaba el
    // keepPreviousData. Los consumidores (AddItemModal, DashboardPage)
    // destructuran `data = []`, así que toleran el undefined inicial.
    placeholderData: keepPreviousData,
    enabled,
  });
};

// MUTACIÓN PARA ACTUALIZAR
export const useUpdateItem = (catalogoId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => itemsService.updateItem(id, data),
    onSuccess: () => {
      message.success('Artículo actualizado correctamente');
      // Invalida la query del catálogo para repintar la vista con los datos nuevos
      queryClient.invalidateQueries({ queryKey: ['catalogo', catalogoId] });
    },
    onError: () => {
      message.error('Error al actualizar el artículo');
    }
  });
};

// MUTACIÓN PARA ELIMINAR / DAR DE BAJA
export const useDeleteItem = (catalogoId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => itemsService.deleteItem(id),
    onSuccess: () => {
      message.success('Artículo eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['catalogo', catalogoId] });
    },
    onError: () => {
      message.error('No se pudo eliminar el artículo');
    }
  });
};

// MUTACIÓN PARA ELIMINACIÓN MASIVA
export const useDeleteItemsBulk = (inventarioId?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemIds: number[]) => itemsService.deleteItemsBulk(itemIds),
    onSuccess: (data) => {
      message.success(`Se eliminaron ${data.eliminados} artículos correctamente`);
      // Refrescamos la tabla de inventario
      queryClient.invalidateQueries({ queryKey: ['inventory', inventarioId] });
      // Por las dudas, también la query general de ítems
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || 'Error al eliminar los artículos';
      message.error(errorMsg);
    }
  });
};