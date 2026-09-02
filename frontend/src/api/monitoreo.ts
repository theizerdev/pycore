import api from './client';

export interface SesionActiva {
  id: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  usuario_rol: string;
  empresa?: string;
  sucursal?: string;
  ip_address: string;
  navegador: string;
  sistema_operativo: string;
  dispositivo: string;
  ubicacion: string;
  inicio_sesion: string;
  ultima_actividad: string;
  es_actual: boolean;
}

export interface EventoSeguridad {
  id: string;
  tipo: 'login_fallido' | 'bloqueo_ip' | 'cambio_password' | 'token_expirado' | 'acceso_denegado';
  nivel: 'info' | 'warning' | 'danger';
  mensaje: string;
  usuario_email?: string;
  ip_address: string;
  ubicacion?: string;
  navegador?: string;
  timestamp: string;
  bloqueado: boolean;
}

export interface ServicioSalud {
  nombre: string;
  tipo: 'backend' | 'database' | 'whatsapp' | 'smtp' | 'storage';
  estado: 'operativo' | 'degradado' | 'caido';
  latencia_ms: number;
  detalles: string;
  ultimo_chequeo: string;
}

export interface MetricasSistema {
  servicios: ServicioSalud[];
  uso_cpu_porcentaje: number;
  uso_memoria_porcentaje: number;
  memoria_total_gb: number;
  memoria_usada_gb: number;
  uso_disco_porcentaje: number;
  disco_total_gb: number;
  disco_usado_gb: number;
  conexiones_db_activas: number;
  tiempo_activo_horas: number;
}

export const monitoreoApi = {
  getSesiones: async (): Promise<SesionActiva[]> => {
    const res = await api.get('/monitoreo/sesiones');
    return res.data;
  },

  revocarSesion: async (sessionId: string): Promise<{ message: string }> => {
    const res = await api.post(`/monitoreo/sesiones/${sessionId}/revocar`);
    return res.data;
  },

  getEventosSeguridad: async (): Promise<EventoSeguridad[]> => {
    const res = await api.get('/monitoreo/seguridad-accesos');
    return res.data;
  },

  toggleBloqueoIp: async (ip: string, bloquear: boolean): Promise<{ message: string; bloqueado: boolean }> => {
    const res = await api.post('/monitoreo/toggle-bloqueo-ip', null, {
      params: { ip, bloquear },
    });
    return res.data;
  },

  getSaludSistema: async (): Promise<MetricasSistema> => {
    const res = await api.get('/monitoreo/salud-sistema');
    return res.data;
  },

  pingService: async (serviceType: string): Promise<{ status: string; latencia_ms: number; message: string }> => {
    const res = await api.post(`/monitoreo/ping-service/${serviceType}`);
    return res.data;
  },
};
