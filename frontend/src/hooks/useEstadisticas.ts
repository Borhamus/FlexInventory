import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../api/inventory.service';
import type { BloquePersonalizado } from '../api/inventory.service';

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
// Alertas de vencimiento de todo el tenant (dashboard). `dias=7` por defecto,
// mismo default que el backend.
export const useAlertasVencimiento = (dias: number = 7) => {
  return useQuery({
    queryKey: ['alertas-vencimiento', dias],
    queryFn: () => inventoryService.getAlertas(dias),
  });
};

export const usePromedioRango = (id: number) => {
  return useMutation({
    mutationFn: ({ atributo, desde, hasta }: { atributo: string; desde: number; hasta: number }) =>
      inventoryService.getPromedioRango(id, atributo, desde, hasta),
  });
};

// Bloques personalizados: el usuario arma sus propios cálculos (Fase de
// "estadísticas armadas por el usuario").
export const useBloquesPersonalizados = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['bloques-personalizados', id],
    queryFn: () => inventoryService.getBloques(id),
    enabled,
  });
};

export const useConfigurarBloques = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bloques }: { id: number; bloques: BloquePersonalizado[] }) =>
      inventoryService.configurarBloques(id, bloques),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bloques-personalizados', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.id] });
    },
  });
};
