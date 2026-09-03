import api from './client';
import type {
  CitaMedica,
  CitaCreateInput,
  CitaUpdateInput,
  CitaEstado,
  CitaNotificarWhatsAppResponse,
} from '../types';

export const citasApi = {
  list: async (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    medico_id?: number;
    especialidad_id?: number;
    sucursal_id?: number;
    paciente_id?: number;
    estado?: string;
  }): Promise<CitaMedica[]> => {
    const response = await api.get<CitaMedica[]>('/citas', { params });
    return response.data;
  },

  getById: async (id: number): Promise<CitaMedica> => {
    const response = await api.get<CitaMedica>(`/citas/${id}`);
    return response.data;
  },

  create: async (data: CitaCreateInput): Promise<CitaMedica> => {
    const response = await api.post<CitaMedica>('/citas', data);
    return response.data;
  },

  update: async (id: number, data: CitaUpdateInput): Promise<CitaMedica> => {
    const response = await api.put<CitaMedica>(`/citas/${id}`, data);
    return response.data;
  },

  cambiarEstado: async (
    id: number,
    estado: CitaEstado,
    motivo_cancelacion?: string
  ): Promise<CitaMedica> => {
    const response = await api.patch<CitaMedica>(`/citas/${id}/estado`, {
      estado,
      motivo_cancelacion,
    });
    return response.data;
  },

  notificarWhatsApp: async (id: number): Promise<CitaNotificarWhatsAppResponse> => {
    const response = await api.post<CitaNotificarWhatsAppResponse>(
      `/citas/${id}/notificar-whatsapp`,
      {},
      { timeout: 30000 }
    );
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string; id: number }> => {
    const response = await api.delete<{ message: string; id: number }>(`/citas/${id}`);
    return response.data;
  },
};

export default citasApi;
