import api from './client';
import type { Plan, SuscripcionEmpresa } from '../types';

export interface PagoSuscripcion {
  id: number;
  empresa_id: number;
  suscripcion_id?: number | null;
  plan_id?: number | null;
  usuario_id?: number | null;
  monto: number;
  ciclo_meses: number;
  sucursales_contratadas: number;
  metodo_pago: string;
  referencia_pago?: string | null;
  comprobante_path?: string | null;
  notas?: string | null;
  estado: 'pending' | 'approved' | 'rejected';
  aprobado_por_id?: number | null;
  aprobado_at?: string | null;
  created_at: string;
  updated_at: string;
  plan?: Plan | null;
}

export interface ReportarPagoData {
  plan_id?: number;
  ciclo_meses: number;
  sucursales_contratadas: number;
  metodo_pago: string;
  referencia_pago?: string;
  comprobante_base64?: string;
  notas?: string;
}

export const suscripcionesApi = {
  reportarPago: async (data: ReportarPagoData): Promise<PagoSuscripcion> => {
    const response = await api.post<PagoSuscripcion>('/suscripciones/reportar-pago', data);
    return response.data;
  },

  getMisPagos: async (): Promise<PagoSuscripcion[]> => {
    const response = await api.get<PagoSuscripcion[]>('/suscripciones/mis-pagos');
    return response.data;
  },

  getPagosPendientes: async (): Promise<PagoSuscripcion[]> => {
    const response = await api.get<PagoSuscripcion[]>('/suscripciones/pagos-pendientes');
    return response.data;
  },

  aprobarPago: async (pago_id: number, notas?: string): Promise<PagoSuscripcion> => {
    const response = await api.post<PagoSuscripcion>(`/suscripciones/pagos/${pago_id}/aprobar`, { notas });
    return response.data;
  },

  rechazarPago: async (pago_id: number, notas: string): Promise<PagoSuscripcion> => {
    const response = await api.post<PagoSuscripcion>(`/suscripciones/pagos/${pago_id}/rechazar`, { notas });
    return response.data;
  },

  getPendientesCount: async (): Promise<{ pendientes_count: number; hay_pendientes: boolean }> => {
    const response = await api.get<{ pendientes_count: number; hay_pendientes: boolean }>('/suscripciones/pendientes-count');
    return response.data;
  },

  notificarVencimientosProximos: async (): Promise<{ mensaje: string; notificados: any[] }> => {
    const response = await api.post<{ mensaje: string; notificados: any[] }>('/suscripciones/notificar-vencimientos-proximos');
    return response.data;
  }
};

