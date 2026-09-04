import api from './client';

export interface PacienteMini {
  id: number;
  nombres: string;
  apellidos: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  genero?: string;
  fecha_nacimiento?: string;
  edad?: number;
}

export interface MedicoMini {
  id: number;
  nombres: string;
  apellidos: string;
  especialidad_id?: number;
  numero_colegiado?: string;
  color_calendario?: string;
}

export interface EspecialidadMini {
  id: number;
  nombre: string;
  codigo?: string;
  color?: string;
  icono?: string;
}

export interface PreconsultaMini {
  id: number;
  token: string;
  estado: 'pendiente' | 'completada';
  respuestas: Record<string, any>;
  whatsapp_enviado: boolean;
  whatsapp_enviado_at?: string;
  completada_at?: string;
  created_at?: string;
}

export interface SucursalMini {
  id: number;
  nombre: string;
  codigo?: string;
}

export interface CitaMini {
  id: number;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  estado?: string;
  motivo?: string;
}

export interface ConsultaMedica {
  id: number;
  codigo?: string;
  empresa_id: number;
  sucursal_id?: number;
  cita_id?: number;
  paciente_id: number;
  medico_id: number;
  especialidad_id: number;
  preconsulta_id?: number;
  creado_por?: number;
  fecha_consulta: string;
  motivo_consulta: string;
  enfermedad_actual?: string;
  signos_vitales: Record<string, any>;
  datos_plantilla: Record<string, any>;
  diagnostico_principal?: string;
  diagnosticos_secundarios: any[];
  plan_tratamiento?: string;
  receta_medica: any[];
  indicaciones_generales?: string;
  estado: 'en_espera' | 'en_curso' | 'finalizada' | 'anulada';
  created_at?: string;
  updated_at?: string;

  paciente?: PacienteMini;
  medico?: MedicoMini;
  especialidad?: EspecialidadMini;
  preconsulta?: PreconsultaMini;
  sucursal?: SucursalMini;
  cita?: CitaMini;
}

export interface ConsultaFiltros {
  estado?: string;
  fecha?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  medico_id?: number;
  especialidad_id?: number;
  sucursal_id?: number;
  paciente_id?: number;
  search?: string;
}

export interface ConsultaResumenContadores {
  sala_espera: number;
  en_consulta: number;
  atendidas: number;
  total_hoy: number;
}

export const consultasApi = {
  getConsultas: async (filtros?: ConsultaFiltros): Promise<ConsultaMedica[]> => {
    const params = new URLSearchParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, String(val));
        }
      });
    }
    const response = await api.get<ConsultaMedica[]>(`/consultas?${params.toString()}`);
    return response.data;
  },

  getResumenContadores: async (filtros?: {
    fecha?: string;
    medico_id?: number;
    sucursal_id?: number;
  }): Promise<ConsultaResumenContadores> => {
    const params = new URLSearchParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, String(val));
        }
      });
    }
    const response = await api.get<ConsultaResumenContadores>(
      `/consultas/resumen-contadores?${params.toString()}`
    );
    return response.data;
  },

  getConsultaById: async (id: number): Promise<ConsultaMedica> => {
    const response = await api.get<ConsultaMedica>(`/consultas/${id}`);
    return response.data;
  },

  cambiarEstado: async (
    id: number,
    estado: 'en_espera' | 'en_curso' | 'finalizada' | 'anulada',
    motivo?: string
  ): Promise<ConsultaMedica> => {
    const response = await api.patch<ConsultaMedica>(`/consultas/${id}/estado`, {
      estado,
      motivo,
    });
    return response.data;
  },

  updateConsulta: async (id: number, data: Partial<ConsultaMedica>): Promise<ConsultaMedica> => {
    const response = await api.put<ConsultaMedica>(`/consultas/${id}`, data);
    return response.data;
  },
};
