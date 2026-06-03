import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../api/inventory.service';
import { message } from 'antd';

export const useInventory = (id: number) => {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryService.getInventario(id),
  });
};

export const useInventories = () => {
  return useQuery({
    queryKey: ['inventories'],
    queryFn: () => inventoryService.getInventarios(),
  });
};

export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nuevoInventario: any) => inventoryService.createInventory(nuevoInventario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
    },
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { nombre?: string; atributos?: Record<string, string>; defaults?: Record<string, unknown> } }) =>
      inventoryService.updateInventory(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.id] });
    },
  });
};

export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventoryService.deleteInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
    },
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => inventoryService.createItem(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.inventario_id] });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => inventoryService.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); 
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // La función recibe un objeto con el ID y el cuerpo (payload)
    mutationFn: ({ id, payload }: { id: number; payload: any }) => 
      inventoryService.updateItem(id, payload),
    
    onSuccess: () => {
      // IMPORTANTE: 'inventory' debe ser la misma key que usás en useQuery
      // Esto hace que la tabla se actualice "mágicamente"
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      message.success('Artículo actualizado con éxito');
    },
    
    onError: (error: any) => {
      console.error("Error al actualizar:", error);
      message.error('No se pudo actualizar el artículo');
    }
  });
};
