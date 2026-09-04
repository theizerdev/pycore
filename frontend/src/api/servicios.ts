import api from './client';
import type {
  Servicio,
  ServicioCreateInput,
  ServicioUpdateInput,
  ServicioFilterParams,
} from '../types';

export const serviciosApi = {
  list: async (params?: ServicioFilterParams): Promise<Servicio[]> => {
    const res = await api.get<Servicio[]>('/servicios', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Servicio> => {
    const res = await api.get<Servicio>(`/servicios/${id}`);
    return res.data;
  },

  create: async (data: ServicioCreateInput): Promise<Servicio> => {
    const res = await api.post<Servicio>('/servicios', data);
    return res.data;
  },

  update: async (id: number, data: ServicioUpdateInput): Promise<Servicio> => {
    const res = await api.put<Servicio>(`/servicios/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string; id: number }> => {
    const res = await api.delete<{ message: string; id: number }>(`/servicios/${id}`);
    return res.data;
  },

  seedDefaults: async (sucursal_id?: number | null): Promise<Servicio[]> => {
    const params = sucursal_id ? { sucursal_id } : {};
    const res = await api.post<Servicio[]>('/servicios/seed-defaults', null, { params });
    return res.data;
  },
};

export default serviciosApi;
