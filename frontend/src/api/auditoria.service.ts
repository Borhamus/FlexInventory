// src/services/auditoria.service.ts (ajustá la ruta según tu proyecto)
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
}

export const auditoriaService = {
  
  getHistorial: async (skip: number = 0, limit: number = 50): Promise<AuditLog[]> => {
    const response = await api.get(`/auditoria/?skip=${skip}&limit=${limit}`);
    return response.data;
  }

};