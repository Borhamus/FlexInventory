// hooks/useItems.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsService } from '../api/item.service';
import { message } from 'antd';

export const useItems = (inventarioId?: number) => {
  return useQuery({
    queryKey: ['items', inventarioId],
    queryFn: () => itemsService.getItems(inventarioId),
    initialData: [],
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