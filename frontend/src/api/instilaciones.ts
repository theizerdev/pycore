import client from './client';

export interface GotaItem {
  numero: number;
  tipo_gota: string;
  hora: string;
  timestamp: number;
  quien_instilo: string;
  observaciones?: string;
}

export interface InstilacionOftalmica {
  id: number;
  empresa_id: number;
  sucursal_id: number;
  paciente_id?: number | null;
  paciente_nombre: string;
  paciente_documento?: string | null;
  paciente_edad?: number | null;
  alergias?: string | null;
  medico_id?: number | null;
  medico_nombre?: string | null;
  cita_id?: number | null;
  consulta_id?: number | null;
  tipo: string;
  farmaco: string;
  ojo: string;
  es_pediatrico: boolean;
  quien_instilo: string;
  usuario_id_instilo?: number | null;
  estado: 'en_espera' | 'dilatado_listo' | 'en_consulta' | 'finalizado' | 'cancelado';
  total_gotas: number;
  hora_primera_gota?: string | null;
  hora_ultima_gota?: string | null;
  gotas: GotaItem[];
  observaciones?: string | null;
  tiempo_recomendado_min: number;
  notificado_chat: boolean;
  notificado_whatsapp: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateInstilacionPayload {
  sucursal_id: number;
  paciente_id?: number;
  paciente_nombre: string;
  paciente_documento?: string;
  paciente_edad?: number;
  alergias?: string;
  medico_id?: number;
  medico_nombre?: string;
  cita_id?: number;
  consulta_id?: number;
  tipo?: string;
  farmaco?: string;
  ojo?: string;
  es_pediatrico?: boolean;
  quien_instilo?: string;
  observaciones?: string;
  tiempo_recomendado_min?: number;
}

export const instilacionesApi = {
  list: async (sucursalId: number, soloActivas: boolean = true): Promise<InstilacionOftalmica[]> => {
    const res = await client.get<InstilacionOftalmica[]>('/instilaciones-oftalmicas', {
      params: { sucursal_id: sucursalId, solo_activas: soloActivas },
    });
    return res.data;
  },

  create: async (payload: CreateInstilacionPayload): Promise<InstilacionOftalmica> => {
    const res = await client.post<InstilacionOftalmica>('/instilaciones-oftalmicas', payload);
    return res.data;
  },

  addGota: async (
    id: number,
    data: { tipo_gota: string; quien_instilo?: string; observaciones?: string }
  ): Promise<InstilacionOftalmica> => {
    const res = await client.post<InstilacionOftalmica>(`/instilaciones-oftalmicas/${id}/gota`, data);
    return res.data;
  },

  updateEstado: async (
    id: number,
    estado: 'en_espera' | 'dilatado_listo' | 'en_consulta' | 'finalizado' | 'cancelado'
  ): Promise<InstilacionOftalmica> => {
    const res = await client.patch<InstilacionOftalmica>(`/instilaciones-oftalmicas/${id}/estado`, { estado });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/instilaciones-oftalmicas/${id}`);
  },
};

export default instilacionesApi;
