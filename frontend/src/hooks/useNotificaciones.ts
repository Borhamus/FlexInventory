import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacionesService } from '../api/notificaciones.service';

// 60s: suficientemente seguido para que el badge se sienta "vivo" sin
// generar tráfico real — primer uso de polling en este proyecto (antes todo
// se refrescaba por invalidateQueries tras una mutación).
const INTERVALO_POLLING_MS = 60_000;

export const useNotificaciones = (
  params: { leida?: boolean; inventario_id?: number; skip?: number; limit?: number } = {},
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['notificaciones', params],
    queryFn: () => notificacionesService.listar(params),
    enabled,
  });
};

export const useNotificacionesNoLeidasCount = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['notificaciones-no-leidas-count'],
    queryFn: () => notificacionesService.contarNoLeidas(),
    enabled,
    refetchInterval: INTERVALO_POLLING_MS,
  });
};

export const useMarcarNotificacionLeida = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, leida }: { id: number; leida?: boolean }) => notificacionesService.marcarLeida(id, leida),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-no-leidas-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
};

export const useMarcarTodasNotificacionesLeidas = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificacionesService.marcarTodasLeidas(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-no-leidas-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
};
