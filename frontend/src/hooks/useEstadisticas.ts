import { useQuery, useMutation } from '@tanstack/react-query';
import { inventoryService } from '../api/inventory.service';

export const useInventoryStats = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['inventory-stats', id],
    queryFn: () => inventoryService.getStats(id),
    enabled,
  });
};

export const useMediana = (id: number, atributo: string | null, intervalos?: number) => {
  return useQuery({
    queryKey: ['mediana', id, atributo, intervalos],
    queryFn: () => inventoryService.getMediana(id, atributo as string, intervalos),
    enabled: Boolean(atributo),
  });
};

// El promedio de un rango de intervalos es a pedido del usuario (elige un
// rango de buckets del histograma y lo consulta), no algo que se calcule
// solo — por eso es una mutation (se dispara con .mutate()) y no una query
// automática.
export const usePromedioRango = (id: number) => {
  return useMutation({
    mutationFn: ({ atributo, desde, hasta }: { atributo: string; desde: number; hasta: number }) =>
      inventoryService.getPromedioRango(id, atributo, desde, hasta),
  });
};
