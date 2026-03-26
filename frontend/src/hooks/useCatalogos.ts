import { useQuery } from '@tanstack/react-query';
import { catalogosService } from '../api/catalogos.service';

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