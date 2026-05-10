// hooks/useItems.ts
import { useQuery } from '@tanstack/react-query';
import { itemsService } from '../api/item.service';

export const useItems = (inventarioId?: number) => {
  return useQuery({
    queryKey: ['items', inventarioId],
    queryFn: () => itemsService.getItems(inventarioId),
    initialData: [],
  });
};