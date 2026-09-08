import api from './client';

export interface PacienteMini {
  id: number;
  nombres: string;
  apellidos: string;
  tipo_documento?: string;
  documento_identidad?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  genero?: string;
  fecha_nacimiento?: string;
  edad?: number;
  edad_texto?: string;
  grupo_sanguineo?: string;
  alergias?: any;
  antecedentes_patologicos?: string;
  medicacion_habitual?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_parentesco?: string;
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
  servicio?: {
    id?: number;
    nombre?: string;
    categoria?: string;
  } | null;
  servicio_nombre?: string | null;
  precio_estimado?: number | null;
  estado_pago?: string | null;
}

export interface EstudioSolicitado {
  id?: string;
  nombre: string;
  categoria?: string; // 'Laboratorio', 'Rayos X', 'Ecografía', 'Tomografía', 'Resonancia', 'Endoscopía', 'Otro'
  justificacion_clinica?: string;
  urgente?: boolean;
  indicaciones_preparacion?: string;
}

export interface MedicamentoPrescrito {
  id?: string;
  medicamento: string;
  presentacion?: string; // Ej: 'Tabletas 500mg', 'Jarabe 250mg/5ml'
  dosis?: string; // Ej: '1 tableta'
  via_administracion?: string; // 'Oral', 'Intravenosa', 'Intramuscular', 'Tópica', 'Oftálmica', 'Inhalatoria'
  frecuencia?: string; // Ej: 'Cada 8 horas'
  duracion?: string; // Ej: '7 días'
  instrucciones?: string; // Ej: 'Tomar después de las comidas'
}

export interface ReposoMedico {
  requiere_reposo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias_reposo?: number;
  motivo_diagnostico?: string;
  observaciones?: string;
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
  observaciones_adicionales?: string;
  referido_para?: string;
  signos_vitales: Record<string, any>;
  datos_plantilla: Record<string, any>;
  estudios_solicitados: EstudioSolicitado[];
  receta_medica: MedicamentoPrescrito[];
  reposo_medico?: ReposoMedico;
  diagnostico_principal?: string;
  diagnosticos_secundarios: any[];
  plan_tratamiento?: string;
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
