import client from './client';

export interface TasaItemDetail {
  id?: number;
  moneda: string;
  destino: string;
  tasa: number;
  fuente: string;
  variacion_24h?: number;
  fecha_tasa?: string;
  created_at?: string;
  es_oficial: boolean;
}

export interface TasasActualesResponse {
  tasas: {
    USD?: TasaItemDetail | null;
    EUR?: TasaItemDetail | null;
    USDT?: TasaItemDetail | null;
  };
  sincronizado_at: string;
}

export interface TasaHistoricoItem {
  id: number;
  moneda: string;
  destino: string;
  tasa: number;
  fuente: string;
  variacion_24h?: number;
  es_oficial: boolean;
  fecha_tasa?: string;
  created_at?: string;
  usuario?: string;
}

export const tasasApi = {
  // Obtener tasas actuales activas
  getCurrentRates: async (): Promise<TasasActualesResponse> => {
    const res = await client.get<TasasActualesResponse>('/integraciones/tasas/actuales');
    return res.data;
  },

  // Sincronizar en tiempo real contra BCV y Binance
  syncRates: async (): Promise<{ status: string; message: string; tasas: Record<string, TasaItemDetail>; sincronizado_at: string }> => {
    const res = await client.post('/integraciones/tasas/sincronizar');
    return res.data;
  },

  // Registrar ajuste manual
  setManualRate: async (data: { moneda: string; tasa: number }): Promise<{ success: boolean; message: string; data: TasaItemDetail }> => {
    const res = await client.post('/integraciones/tasas/manual', data);
    return res.data;
  },

  // Obtener histórico de tasas
  getHistory: async (moneda?: string, limit: number = 100): Promise<TasaHistoricoItem[]> => {
    const url = `/integraciones/tasas/historico?limit=${limit}${moneda && moneda !== 'TODOS' ? `&moneda=${moneda}` : ''}`;
    const res = await client.get<TasaHistoricoItem[]>(url);
    return res.data;
  },
};
