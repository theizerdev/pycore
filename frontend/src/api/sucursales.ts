import api from './client';
import type { Sucursal } from '../types';

export const sucursalesApi = {
  list: async (empresa_id?: number): Promise<Sucursal[]> => {
    const params = empresa_id ? { empresa_id } : {};
    const res = await api.get<Sucursal[]>('/sucursales', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Sucursal> => {
    const res = await api.get<Sucursal>(`/sucursales/${id}`);
    return res.data;
  },
  create: async (data: Partial<Sucursal>): Promise<Sucursal> => {
    const res = await api.post<Sucursal>('/sucursales', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Sucursal>): Promise<Sucursal> => {
    const res = await api.put<Sucursal>(`/sucursales/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/sucursales/${id}`);
  }
};
