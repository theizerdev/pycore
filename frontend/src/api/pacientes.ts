import api from './client';
import type {
  Paciente,
  PacienteCreateInput,
  PacienteUpdateInput,
  PacienteHistorialResponse,
} from '../types';

export interface PacienteListParams {
  q?: string;
  grupo_sanguineo?: string;
  genero?: string;
  sucursal_id?: number;
  activo?: boolean;
  con_alergias?: boolean;
  limit?: number;
  offset?: number;
}

export const pacientesApi = {
  list: async (params?: PacienteListParams): Promise<Paciente[]> => {
    const res = await api.get<Paciente[]>('/pacientes', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Paciente> => {
    const res = await api.get<Paciente>(`/pacientes/${id}`);
    return res.data;
  },

  create: async (data: PacienteCreateInput): Promise<Paciente> => {
    const res = await api.post<Paciente>('/pacientes', data);
    return res.data;
  },

  update: async (id: number, data: PacienteUpdateInput): Promise<Paciente> => {
    const res = await api.put<Paciente>(`/pacientes/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/pacientes/${id}`);
    return res.data;
  },

  getHistorial: async (id: number): Promise<PacienteHistorialResponse> => {
    const res = await api.get<PacienteHistorialResponse>(`/pacientes/${id}/historial`);
    return res.data;
  },
};

export default pacientesApi;
