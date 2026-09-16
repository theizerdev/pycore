import client, { API_BASE_URL } from './client';
import type {
  ChatCanal,
  ChatMensaje,
  ChatPersonalItem,
  ChatUnreadSummary,
  ChatUploadResponse,
} from '../types/chat';

export const MAX_CHAT_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB exactos

/**
 * Resuelve una ruta relativa (ej: /uploads/chat/...) a una URL absoluta que apunta
 * directamente al servidor backend (evitando 404 o caídas en el servidor frontend).
 */
export const getFullMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const apiBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${apiBase}${cleanPath}`;
};

export const chatApi = {
  // Obtener canales de la sucursal del usuario
  getCanales: async (sucursal_id: number): Promise<ChatCanal[]> => {
    const res = await client.get<ChatCanal[]>(`/chat/canales?sucursal_id=${sucursal_id}`);
    return res.data;
  },

  // Iniciar o recuperar chat directo 1-a-1
  openDirectChannel: async (otro_usuario_id: number, sucursal_id: number): Promise<ChatCanal> => {
    const res = await client.post<ChatCanal>(
      `/chat/canales/directo?otro_usuario_id=${otro_usuario_id}&sucursal_id=${sucursal_id}`
    );
    return res.data;
  },

  // Obtener historial de mensajes de un canal
  getMensajes: async (
    canal_id: number,
    limit: number = 50,
    before_id?: number
  ): Promise<ChatMensaje[]> => {
    const beforeParam = before_id ? `&before_id=${before_id}` : '';
    const res = await client.get<ChatMensaje[]>(
      `/chat/canales/${canal_id}/mensajes?limit=${limit}${beforeParam}`
    );
    return res.data;
  },

  // Enviar mensaje por REST
  sendMensaje: async (
    canal_id: number,
    payload: {
      contenido?: string | null;
      tipo?: 'texto' | 'audio' | 'imagen' | 'documento';
      archivo_url?: string | null;
      archivo_nombre?: string | null;
      archivo_tamano?: number | null;
      archivo_tipo?: string | null;
      duracion_audio?: number | null;
    }
  ): Promise<ChatMensaje> => {
    const res = await client.post<ChatMensaje>(`/chat/canales/${canal_id}/mensajes`, payload);
    return res.data;
  },

  // Marcar canal como leído
  markAsRead: async (canal_id: number): Promise<{ success: boolean }> => {
    const res = await client.post<{ success: boolean }>(`/chat/canales/${canal_id}/leer`);
    return res.data;
  },

  // Directorio de personal médico en la sucursal
  getPersonal: async (sucursal_id: number): Promise<ChatPersonalItem[]> => {
    const res = await client.get<ChatPersonalItem[]>(`/chat/personal?sucursal_id=${sucursal_id}`);
    return res.data;
  },

  // Contador de mensajes sin leer (para badge flotante)
  getNoLeidos: async (sucursal_id: number): Promise<ChatUnreadSummary> => {
    const res = await client.get<ChatUnreadSummary>(`/chat/no-leidos?sucursal_id=${sucursal_id}`);
    return res.data;
  },

  // Subida de archivos multimedia con control estricto de 4 MB
  uploadFile: async (file: File): Promise<ChatUploadResponse> => {
    if (file.size > MAX_CHAT_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(
        `El archivo pesa ${sizeMb} MB. El límite máximo permitido es de 4 MB.`
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await client.post<ChatUploadResponse>('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
