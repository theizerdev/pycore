import api from './client';
import type { Rol, Permiso, SectorPermisos } from '../types';

export const rolesApi = {
  list: async (): Promise<Rol[]> => {
    const res = await api.get<Rol[]>('/roles');
    return res.data;
  },
  getById: async (id: number): Promise<Rol> => {
    const res = await api.get<Rol>(`/roles/${id}`);
    return res.data;
  },
  create: async (data: { nombre: string; slug: string; descripcion?: string; activo?: boolean; permisos_ids: number[] }): Promise<Rol> => {
    const res = await api.post<Rol>('/roles', data);
    return res.data;
  },
  update: async (id: number, data: { nombre?: string; descripcion?: string; activo?: boolean; permisos_ids?: number[] }): Promise<Rol> => {
    const res = await api.put<Rol>(`/roles/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ mensaje: string }> => {
    const res = await api.delete<{ mensaje: string }>(`/roles/${id}`);
    return res.data;
  }
};

export const permisosApi = {
  listSectores: async (): Promise<SectorPermisos[]> => {
    const res = await api.get<SectorPermisos[]>('/permisos/sectores');
    return res.data;
  },
  listTodos: async (): Promise<Permiso[]> => {
    const res = await api.get<Permiso[]>('/permisos');
    return res.data;
  }
};
