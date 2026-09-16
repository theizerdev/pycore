import api from './client';

export interface TurnoLlamarPayload {
  paciente_nombre: string;
  medico_nombre: string;
  consultorio: string;
  especialidad?: string;
  numero_turno?: string;
  cita_id?: number;
  paciente_id?: number;
  sucursal_id?: number;
}

export const turneroApi = {
  llamar: async (payload: TurnoLlamarPayload) => {
    const { data } = await api.post('/turnero/llamar', payload);
    return data;
  },

  getPublic: async (codigoSucursal: string) => {
    const { data } = await api.get(`/turnero/public/${codigoSucursal}`);
    return data;
  },

  marcarAtendido: async (turnoId: number) => {
    const { data } = await api.post(`/turnero/completar/${turnoId}`);
    return data;
  },
};
