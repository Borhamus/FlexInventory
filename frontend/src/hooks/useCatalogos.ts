import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogosService } from '../api/catalogos.service';
import { notification } from 'antd';

export const useCatalogo = (id: number) => {
  return useQuery({
    queryKey: ['catalogos', id],
    queryFn: () => catalogosService.getCatalogo(id),
  });
};

export const useCatalogos = () => {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: () => catalogosService.getCatalogos(),
  });
};

export const useCreateCatalogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: catalogosService.createCatalogo,
    onSuccess: () => {
      // Esto hace que la lista lateral se refresque automáticamente
      queryClient.invalidateQueries({ queryKey: ['catalogos'] });
      notification.success({ message: 'Catálogo creado con éxito' });
    },
    onError: (error: any) => {
      notification.error({
        message: 'Error al crear catálogo',
        description: error.response?.data?.detail || 'El servidor no responde. Intenta más tarde.',
        placement: 'topRight',
        duration: 4, // Segundos antes de desaparecer
      });
    },
  });
};

export const useUpdateCatalogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogosService.updateCatalogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogos'] });
      notification.success({ message: 'Catálogo actualizado' });
    },
    onError: (error: any) => {
      notification.error({ message: 'Error al actualizar', description: error.response?.data?.detail });
    }
  });
};

export const useDeleteCatalogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogosService.deleteCatalogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogos'] });
      notification.success({ message: 'Catálogo eliminado correctamente' });
    },
    onError: (error: any) => {
      notification.error({ message: 'No se pudo eliminar el catálogo' });
    }
  });
};