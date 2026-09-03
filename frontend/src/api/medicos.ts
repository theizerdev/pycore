import api from './client';
import type {
  Medico,
  MedicoCreateInput,
  MedicoUpdateInput,
} from '../types';

export interface MedicosFilterParams {
  search?: string;
  especialidad_id?: number;
  sucursal_id?: number;
  activo?: boolean;
  empresa_id?: number;
}

export const medicosApi = {
  list: async (params?: MedicosFilterParams): Promise<Medico[]> => {
    const res = await api.get<Medico[]>('/medicos', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Medico> => {
    const res = await api.get<Medico>(`/medicos/${id}`);
    return res.data;
  },

  create: async (data: MedicoCreateInput): Promise<Medico> => {
    const res = await api.post<Medico>('/medicos', data);
    return res.data;
  },

  update: async (id: number, data: MedicoUpdateInput): Promise<Medico> => {
    const res = await api.put<Medico>(`/medicos/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/medicos/${id}`);
    return res.data;
  },
};

export default medicosApi;
