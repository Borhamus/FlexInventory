import api from './axios.config';

export interface AuditLog {
  id: number;
  usuario_id: number;
  usuario: string;
  endpoint: string;
  metodo: string;
  accion: string;
  payload_cambios: any;
  fecha: string;
  entidad_afectada: string; 
  resumen: string;
}

export interface AuditoriaResponse {
  items: AuditLog[];
  total: number;
}

export const auditoriaService = {
  
  getHistorial: async (skip: number = 0, limit: number = 50): Promise<AuditoriaResponse> => {
    const response = await api.get(`/auditoria/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  vaciarHistorial: async (): Promise<any> => {
    const response = await api.delete('/auditoria/eliminar');
    return response.data;
  }

};