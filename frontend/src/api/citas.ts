import api from './client';
import type {
  CitaMedica,
  CitaCreateInput,
  CitaUpdateInput,
  CitaEstado,
  CitaEstadoPago,
  CitaNotificarWhatsAppResponse,
  BloqueoAgenda,
  BloqueoAgendaCreateInput,
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

  cambiarPago: async (
    id: number,
    data: { estado_pago: CitaEstadoPago; metodo_pago?: string | null } | CitaEstadoPago,
    metodo_pago?: string | null
  ): Promise<CitaMedica> => {
    const payload =
      typeof data === 'object' && data !== null
        ? data
        : { estado_pago: data, metodo_pago };
    const response = await api.patch<CitaMedica>(`/citas/${id}/pago`, payload);
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

  // ── Bloqueos de Agenda ──
  listarBloqueos: async (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    medico_id?: number;
    sucursal_id?: number;
  }): Promise<BloqueoAgenda[]> => {
    const response = await api.get<BloqueoAgenda[]>('/citas/bloqueos', { params });
    return response.data;
  },

  crearBloqueo: async (data: BloqueoAgendaCreateInput): Promise<BloqueoAgenda> => {
    const response = await api.post<BloqueoAgenda>('/citas/bloqueos', data);
    return response.data;
  },

  eliminarBloqueo: async (id: number): Promise<{ message: string; id: number }> => {
    const response = await api.delete<{ message: string; id: number }>(`/citas/bloqueos/${id}`);
    return response.data;
  },

  // ── Recordatorios WhatsApp ──
  enviarRecordatoriosProximas: async (fecha?: string): Promise<{
    success: boolean;
    fecha: string;
    total_citas: number;
    enviados: number;
    message: string;
  }> => {
    const response = await api.post('/citas/recordatorios/enviar-proximas', {}, {
      params: fecha ? { fecha } : {},
      timeout: 60000,
    });
    return response.data;
  },
};

export default citasApi;
