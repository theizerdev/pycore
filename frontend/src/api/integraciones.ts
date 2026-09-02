import client from './client';
import type {
  IntegracionesConfig,
  BcvRateData,
  WhatsAppStatus,
  WhatsAppTemplate,
  WhatsAppMessage
} from '../types';

export interface QueueStats {
  sentToday: number;
  dailyLimit: number;
  queued: number;
  totalQueued: number;
  warmupMode: boolean;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  proxyUrl?: string | null;
}

export interface WhatsAppDiagnostic {
  service_online: boolean;
  latency_ms: number;
  memory_usage: string;
  api_url: string;
  instance: string;
  socket_state: string;
  timestamp: string;
}

export interface BroadcastRecipient {
  id: number;
  name: string;
  phone: string;
  formatted_phone: string;
  is_valid_phone: boolean;
  role: string;
  type: string;
}

export interface MessagesResponse {
  success: boolean;
  messages: {
    data: WhatsAppMessage[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
  stats: {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
  };
}

export const integracionesApi = {
  // Configuración General
  getConfig: async (): Promise<IntegracionesConfig> => {
    const res = await client.get<IntegracionesConfig>('/integraciones');
    return res.data;
  },

  updateMaps: async (data: {
    maptiler_api_key?: string | null;
    maptiler_active?: boolean;
    mapbox_api_key?: string | null;
    mapbox_active: boolean;
    google_maps_api_key?: string | null;
    google_maps_active: boolean;
  }): Promise<IntegracionesConfig> => {
    const res = await client.put<IntegracionesConfig>('/integraciones/maps', data);
    return res.data;
  },

  updatePagos: async (data: {
    paypal_active: boolean;
    paypal_mode: string;
    paypal_client_id?: string | null;
    paypal_client_secret?: string | null;
    stripe_active: boolean;
    stripe_mode: string;
    stripe_publishable_key?: string | null;
    stripe_secret_key?: string | null;
    stripe_webhook_secret?: string | null;
    mercadopago_active: boolean;
    mercadopago_mode: string;
    mercadopago_public_key?: string | null;
    mercadopago_access_token?: string | null;
  }): Promise<IntegracionesConfig> => {
    const res = await client.put<IntegracionesConfig>('/integraciones/pagos', data);
    return res.data;
  },

  // Monitor Tasa BCV
  getBcvRate: async (): Promise<BcvRateData> => {
    const res = await client.get<BcvRateData>('/integraciones/bcv');
    return res.data;
  },

  // WhatsApp Conexión & Ciclo de Vida
  getWhatsAppStatus: async (): Promise<WhatsAppStatus> => {
    const res = await client.get<WhatsAppStatus>('/integraciones/whatsapp/status');
    return res.data;
  },

  connectWhatsApp: async (): Promise<WhatsAppStatus> => {
    const res = await client.post<WhatsAppStatus>('/integraciones/whatsapp/connect');
    return res.data;
  },

  reconnectWhatsApp: async (): Promise<WhatsAppStatus> => {
    const res = await client.post<WhatsAppStatus>('/integraciones/whatsapp/reconnect');
    return res.data;
  },

  disconnectWhatsApp: async (): Promise<WhatsAppStatus> => {
    const res = await client.post<WhatsAppStatus>('/integraciones/whatsapp/disconnect');
    return res.data;
  },

  runDiagnostic: async (): Promise<WhatsAppDiagnostic> => {
    const res = await client.get<WhatsAppDiagnostic>('/integraciones/whatsapp/diagnostic');
    return res.data;
  },

  // Anti-Baneo & Estadísticas de Cola
  getQueueStats: async (): Promise<QueueStats> => {
    const res = await client.get<QueueStats>('/integraciones/whatsapp/queue-stats');
    return res.data;
  },

  simulateScan: async (): Promise<WhatsAppStatus> => {
    const res = await client.post<WhatsAppStatus>('/integraciones/whatsapp/simulate-scan');
    return res.data;
  },

  updateAntiBan: async (data: {
    dailyLimit: number;
    warmupMode: boolean;
    workingHoursEnabled: boolean;
    workingHoursStart: string;
    workingHoursEnd: string;
    proxyUrl?: string | null;
  }): Promise<{ success: boolean; mensaje: string }> => {
    const res = await client.post('/integraciones/whatsapp/antiban', data);
    return res.data;
  },

  // Servidor & Tokens
  generateToken: async (): Promise<{ success: boolean; token: string; whatsapp_api_key: string }> => {
    const res = await client.post('/integraciones/whatsapp/generate-token');
    return res.data;
  },

  updateWhatsAppServer: async (data: {
    whatsapp_api_url: string;
    whatsapp_instance: string;
    whatsapp_api_key?: string;
    whatsapp_active: boolean;
  }): Promise<{ success: boolean; mensaje: string }> => {
    const res = await client.put('/integraciones/whatsapp/update', data);
    return res.data;
  },

  // Verificador de Números & Spintax
  checkNumber: async (phone: string): Promise<{ success: boolean; result?: { exists: boolean; jid: string; phone: string }; error?: string }> => {
    const res = await client.post('/integraciones/whatsapp/check-number', { phone });
    return res.data;
  },

  previewSpintax: async (text: string, count: number = 4, variables?: Record<string, any>): Promise<{ success: boolean; variations: string[] }> => {
    const res = await client.post('/integraciones/whatsapp/preview-spintax', { text, count, variables });
    return res.data;
  },

  sendWhatsAppTest: async (data: { phone: string; message: string; sync?: boolean; variables?: Record<string, any> }): Promise<{ success: boolean; mensaje: string; resultado: any }> => {
    const res = await client.post('/integraciones/whatsapp/send-test', data);
    return res.data;
  },

  // Plantillas de WhatsApp
  getTemplates: async (): Promise<WhatsAppTemplate[]> => {
    const res = await client.get<WhatsAppTemplate[]>('/integraciones/whatsapp/templates');
    return res.data;
  },

  createTemplate: async (data: {
    nombre: string;
    categoria: string;
    contenido: string;
    variables?: string[];
    activo: boolean;
  }): Promise<WhatsAppTemplate> => {
    const res = await client.post<WhatsAppTemplate>('/integraciones/whatsapp/templates', data);
    return res.data;
  },

  updateTemplate: async (id: number, data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> => {
    const res = await client.put<WhatsAppTemplate>(`/integraciones/whatsapp/templates/${id}`, data);
    return res.data;
  },

  deleteTemplate: async (id: number): Promise<{ mensaje: string }> => {
    const res = await client.delete(`/integraciones/whatsapp/templates/${id}`);
    return res.data;
  },

  // Bitácora & Historial
  getMessages: async (page: number = 1, search: string = '', status: string = 'all', limit: number = 15): Promise<MessagesResponse> => {
    const res = await client.get<MessagesResponse>(`/integraciones/whatsapp/mensajes?page=${page}&search=${encodeURIComponent(search)}&status=${status}&limit=${limit}`);
    return res.data;
  },

  retryMessage: async (id: number): Promise<{ success: boolean; mensaje?: string; error?: string }> => {
    const res = await client.post(`/integraciones/whatsapp/messages/${id}/retry`);
    return res.data;
  },

  // Difusión Masiva (Broadcast)
  getBroadcastRecipients: async (target: string = 'usuarios'): Promise<BroadcastRecipient[]> => {
    const res = await client.get<BroadcastRecipient[]>(`/integraciones/whatsapp/broadcast/recipients?target=${target}`);
    return res.data;
  },

  dispatchBroadcast: async (data: {
    recipient_ids: number[];
    target_type: string;
    message: string;
    delay_seconds: number;
    variables?: Record<string, any>;
  }): Promise<{ success: boolean; dispatched_count: number; message: string }> => {
    const res = await client.post('/integraciones/whatsapp/broadcast/dispatch', data);
    return res.data;
  },
};
