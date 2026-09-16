export type TipoMensaje = 'texto' | 'audio' | 'imagen' | 'documento';
export type TipoCanal = 'canal_sucursal' | 'directo';

export interface ChatMensaje {
  id: number;
  canal_id: number;
  empresa_id: number;
  sucursal_id: number;
  remitente_id: number;
  remitente_nombre: string;
  remitente_rol: string;
  remitente_rol_slug: string;
  remitente_avatar?: string | null;
  tipo: TipoMensaje;
  contenido?: string | null;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
  archivo_tamano?: number | null;
  archivo_tipo?: string | null;
  duracion_audio?: number | null;
  created_at: string;
}

export interface ChatParticipante {
  usuario_id: number;
  nombre: string;
  apellido: string;
  rol: string;
  rol_slug: string;
  avatar_url?: string | null;
  ultimo_leido_at?: string | null;
}

export interface ChatCanal {
  id: number;
  empresa_id: number;
  sucursal_id: number;
  sucursal_nombre: string;
  tipo: TipoCanal;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  ultimo_mensaje?: ChatMensaje | null;
  no_leidos: number;
  participantes: ChatParticipante[];
  created_at: string;
  updated_at?: string | null;
}

export interface ChatPersonalItem {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  rol_slug: 'medico' | 'enfermeria' | 'recepcion' | 'admin-clinica' | string;
  avatar_url?: string | null;
  sucursal_id: number;
  sucursal_nombre: string;
  activo: boolean;
  canal_directo_id?: number | null;
}

export interface ChatUnreadSummary {
  total_no_leidos: number;
  canales: Record<number, number>;
}

export interface ChatUploadResponse {
  success: boolean;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tamano: number;
  archivo_tipo: string;
}

export interface ChatWSEvent {
  event: 'nuevo_mensaje' | 'mensajes_leidos' | 'user_typing' | 'pong';
  canal_id?: number;
  sucursal_id?: number;
  mensaje?: ChatMensaje;
  usuario_id?: number;
  is_typing?: boolean;
}
