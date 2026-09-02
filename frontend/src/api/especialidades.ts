import api from './client';
import type { Especialidad, EspecialidadCreateInput, EspecialidadUpdateInput } from '../types';

export interface EspecialidadesFilterParams {
  sucursal_id?: number | null;
  include_global?: boolean;
  activo?: boolean;
  search?: string;
  empresa_id?: number;
}

export const especialidadesApi = {
  list: async (params?: EspecialidadesFilterParams): Promise<Especialidad[]> => {
    const res = await api.get<Especialidad[]>('/especialidades', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Especialidad> => {
    const res = await api.get<Especialidad>(`/especialidades/${id}`);
    return res.data;
  },

  create: async (data: EspecialidadCreateInput): Promise<Especialidad> => {
    const res = await api.post<Especialidad>('/especialidades', data);
    return res.data;
  },

  update: async (id: number, data: EspecialidadUpdateInput): Promise<Especialidad> => {
    const res = await api.put<Especialidad>(`/especialidades/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/especialidades/${id}`);
    return res.data;
  },

  seedDefaults: async (sucursal_id?: number | null): Promise<Especialidad[]> => {
    const params = sucursal_id ? { sucursal_id } : {};
    const res = await api.post<Especialidad[]>('/especialidades/seed-defaults', null, { params });
    return res.data;
  },
};
