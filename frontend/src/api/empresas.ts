import api from './client';
import type { Empresa } from '../types';

export const empresasApi = {
  list: async (): Promise<Empresa[]> => {
    const res = await api.get<Empresa[]>('/empresas');
    return res.data;
  },
  getById: async (id: number): Promise<Empresa> => {
    const res = await api.get<Empresa>(`/empresas/${id}`);
    return res.data;
  },
  create: async (data: Partial<Empresa>): Promise<Empresa> => {
    const res = await api.post<Empresa>('/empresas', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Empresa>): Promise<Empresa> => {
    const res = await api.put<Empresa>(`/empresas/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/empresas/${id}`);
  }
};
