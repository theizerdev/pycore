import api from './client';
import type { SeccionClinica } from '../types';

export interface PreconsultaPublicData {
  token: string;
  estado: 'pendiente' | 'completada';
  completada_at: string | null;
  paciente: {
    id: number | null;
    nombres: string;
    apellidos: string;
    documento: string;
    telefono: string | null;
  };
  medico: {
    id: number | null;
    nombres: string;
    apellidos: string;
    color: string;
  };
  especialidad: {
    id: number | null;
    nombre: string;
    color: string;
    icono: string;
  };
  empresa: {
    id: number | null;
    nombre: string;
    logo_url: string | null;
    logo_mini_url: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  sucursal: {
    id: number | null;
    nombre: string;
    direccion: string | null;
  };
  cita: {
    id: number | null;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    motivo: string;
  };
  secciones: SeccionClinica[];
  respuestas: Record<string, any>;
}

export const preconsultaApi = {
  getPublic: async (token: string): Promise<PreconsultaPublicData> => {
    const response = await api.get<PreconsultaPublicData>(`/preconsultas/public/${token}`);
    return response.data;
  },

  responder: async (token: string, respuestas: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(`/preconsultas/public/${token}/responder`, {
      respuestas,
    });
    return response.data;
  },
};
