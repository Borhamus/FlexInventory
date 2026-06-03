import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogosService } from '../api/catalogos.service';
import { notification } from 'antd';
import axios from 'axios';
import { itemsService } from '../api/item.service';

export const useCatalogo = (id: number) => {
  return useQuery({
    queryKey: ['catalogo', id],
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


export const useAddItemsToCatalogo = (catalogoId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemIds: number[]) => itemsService.addItemsToCatalogo(catalogoId, itemIds),
    onSuccess: () => {
      // Importante: invalidamos la query del catálogo específico para ver los cambios
      queryClient.invalidateQueries({ queryKey: ['catalogos', catalogoId] });
      notification.success({ message: 'Ítems vinculados al catálogo' });
    },
    onError: (error: any) => {
      notification.error({
        message: 'Error al vincular ítems',
        description: error.response?.data?.detail || 'Error de conexión'
      });
    }
  });
};

export const useRemoveItemFromCatalogo = (catalogoId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => itemsService.removeItemFromCatalogo(catalogoId, itemId),
    onSuccess: () => {
      // Refrescamos el catálogo para que el ítem desaparezca de la lista
      queryClient.invalidateQueries({ queryKey: ['catalogos', catalogoId] });
      notification.success({
        message: 'Ítem quitado',
        description: 'El artículo se desvinculó del catálogo correctamente.'
      });
    },
    onError: (error: any) => {
      notification.error({
        message: 'Error al quitar ítem',
        description: error.response?.data?.detail || 'No se pudo completar la acción'
      });
    }
  });
};