import api from './client';

export interface Biomarcador {
  parametro: string;
  valor: number;
  unidad: string;
  ref_min: number;
  ref_max: number;
  estado?: 'normal' | 'alto' | 'bajo';
  alerta?: boolean;
  interpretacion?: string;
}

export interface DatosImagenologia {
  region_anatomica?: string;
  tecnica?: string;
  calidad_estudio?: string;
  hallazgos?: string;
  conclusion?: string;
  recomendaciones?: string;
  guia_paciente?: string;
}

export interface EstudioAdjunto {
  id: number;
  empresa_id?: number;
  paciente_id: number;
  consulta_id?: number;
  medico_id?: number;
  sucursal_id?: number;
  titulo: string;
  categoria: 'laboratorio' | 'imagenologia' | 'informe' | 'otro';
  subtipo?: string;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo: string;
  archivo_tamano?: number;
  fecha_estudio: string;
  notas?: string;
  estado_analisis: 'pendiente' | 'analizado_normal' | 'analizado_alterado' | 'revisado_medico';
  valores_laboratorio?: Biomarcador[];
  datos_imagenologia?: DatosImagenologia;
  interpretacion_clinica?: string;
  alertas_detectadas?: string[];
  created_at?: string;
}

export interface EstudioItemResponse extends EstudioAdjunto {
  paciente_nombre?: string;
  paciente_documento?: string;
  paciente_telefono?: string;
  paciente_email?: string;
  paciente_foto_url?: string;
  consulta_codigo?: string;
  medico_nombre?: string;
  sucursal_nombre?: string;
}

export interface EstudioStats {
  total: number;
  laboratorio: number;
  imagenologia: number;
  con_alertas: number;
  pendientes: number;
  revisados: number;
}

export interface ListarEstudiosResponse {
  items: EstudioItemResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  stats: EstudioStats;
}

export interface ListarEstudiosParams {
  page?: number;
  page_size?: number;
  categoria?: string;
  estado_analisis?: string;
  search?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  paciente_id?: number;
  medico_id?: number;
  sucursal_id?: number;
}

export const estudiosApi = {
  listarGlobal: async (params?: ListarEstudiosParams) => {
    const { data } = await api.get<ListarEstudiosResponse>('/estudios', { params });
    return data;
  },

  listarPorPaciente: async (
    pacienteId: number,
    categoria?: string,
    consultaId?: number,
    alcance?: 'esta_consulta' | 'historial_previo' | 'todos'
  ) => {
    const params: Record<string, any> = {};
    if (categoria && categoria !== 'todos') params.categoria = categoria;
    if (consultaId) params.consulta_id = consultaId;
    if (alcance) params.alcance = alcance;
    const { data } = await api.get<EstudioAdjunto[]>(`/estudios/paciente/${pacienteId}`, { params });
    return data;
  },

  listarPorConsulta: async (consultaId: number, categoria?: string) => {
    const params = categoria && categoria !== 'todos' ? { categoria } : {};
    const { data } = await api.get<EstudioAdjunto[]>(`/estudios/consulta/${consultaId}`, { params });
    return data;
  },

  obtenerDetalle: async (estudioId: number) => {
    const { data } = await api.get<EstudioAdjunto>(`/estudios/${estudioId}`);
    return data;
  },

  crear: async (payload: Partial<EstudioAdjunto>) => {
    const { data } = await api.post('/estudios/crear', payload);
    return data;
  },

  reanalizarConBot: async (estudioId: number) => {
    const { data } = await api.post(`/estudios/${estudioId}/analizar-bot`);
    return data;
  },

  actualizar: async (estudioId: number, payload: Partial<EstudioAdjunto>) => {
    const { data } = await api.put(`/estudios/${estudioId}`, payload);
    return data;
  },

  eliminar: async (estudioId: number) => {
    const { data } = await api.delete(`/estudios/${estudioId}`);
    return data;
  },
};
