import api from './client';
import type { Pais } from '../types';

export const paisesApi = {
  list: async (params?: { activo?: boolean; search?: string }): Promise<Pais[]> => {
    const res = await api.get<Pais[]>('/paises', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Pais> => {
    const res = await api.get<Pais>(`/paises/${id}`);
    return res.data;
  },
  create: async (data: Partial<Pais>): Promise<Pais> => {
    const res = await api.post<Pais>('/paises', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Pais>): Promise<Pais> => {
    const res = await api.put<Pais>(`/paises/${id}`, data);
    return res.data;
  },
  toggleStatus: async (id: number): Promise<Pais> => {
    const res = await api.patch<Pais>(`/paises/${id}/toggle-status`);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/paises/${id}`);
  }
};
