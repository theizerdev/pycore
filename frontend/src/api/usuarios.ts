import api from './client';
import type { Usuario } from '../types';

export interface UsuarioFilterParams {
  search?: string;
  rol_id?: number;
  sucursal_id?: number;
  activo?: boolean;
  empresa_id?: number;
}

export const usuariosApi = {
  list: async (params?: UsuarioFilterParams): Promise<Usuario[]> => {
    const res = await api.get<Usuario[]>('/usuarios', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Usuario> => {
    const res = await api.get<Usuario>(`/usuarios/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Usuario> => {
    const res = await api.post<Usuario>('/usuarios', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Usuario> => {
    const res = await api.put<Usuario>(`/usuarios/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ mensaje: string }> => {
    const res = await api.delete<{ mensaje: string }>(`/usuarios/${id}`);
    return res.data;
  }
};
