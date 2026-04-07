import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../api/inventory.service';

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
    mutationFn: ({ id, payload }: { id: number; payload: { nombre: string } }) => 
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