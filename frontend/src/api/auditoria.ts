import api from './client';
import type { AuditoriaLog } from '../types';

export const auditoriaApi = {
  list: async (params?: { modulo?: string; accion?: string; usuario_id?: number; limit?: number; offset?: number }): Promise<AuditoriaLog[]> => {
    const res = await api.get<AuditoriaLog[]>('/auditoria', { params });
    return res.data;
  }
};
