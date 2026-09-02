import api from './client';
import type { Plan, SuscripcionEmpresa } from '../types';

export const planesApi = {
  list: async (): Promise<Plan[]> => {
    const response = await api.get<Plan[]>('/planes');
    return response.data;
  },

  getMiSuscripcion: async (): Promise<SuscripcionEmpresa> => {
    const response = await api.get<SuscripcionEmpresa>('/planes/mi-suscripcion');
    return response.data;
  },

  cambiarPlan: async (plan_id: number, ciclo: 'mensual' | 'anual' = 'mensual'): Promise<SuscripcionEmpresa> => {
    const response = await api.post<SuscripcionEmpresa>('/planes/cambiar-plan', { plan_id, ciclo });
    return response.data;
  },

  create: async (data: Partial<Plan>): Promise<Plan> => {
    const response = await api.post<Plan>('/planes', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Plan>): Promise<Plan> => {
    const response = await api.put<Plan>(`/planes/${id}`, data);
    return response.data;
  },

  getTodasSuscripciones: async (): Promise<SuscripcionEmpresa[]> => {
    const response = await api.get<SuscripcionEmpresa[]>('/planes/todas-suscripciones');
    return response.data;
  },

  adminUpdateSuscripcion: async (
    empresa_id: number,
    data: { plan_id?: number; plan_estado?: string; plan_vencimiento?: string | null }
  ): Promise<SuscripcionEmpresa> => {
    const response = await api.put<SuscripcionEmpresa>(`/planes/empresas/${empresa_id}/suscripcion`, data);
    return response.data;
  },

  toggleStatus: async (id: number): Promise<Plan> => {
    const response = await api.patch<Plan>(`/planes/${id}/toggle-status`);
    return response.data;
  },

  togglePromo: async (id: number): Promise<Plan> => {
    const response = await api.patch<Plan>(`/planes/${id}/toggle-promo`);
    return response.data;
  },

  toggleDestacado: async (id: number): Promise<Plan> => {
    const response = await api.patch<Plan>(`/planes/${id}/toggle-destacado`);
    return response.data;
  },

  delete: async (id: number): Promise<{ detail: string }> => {
    const response = await api.delete<{ detail: string }>(`/planes/${id}`);
    return response.data;
  }
};
