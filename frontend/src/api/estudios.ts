import api, { API_BASE_URL } from './client';

export interface Biomarcador {
  key?: string;
  parametro: string;
  panel?: string;
  valor: number;
  unidad: string;
  ref_min: number;
  ref_max: number;
  rango_origen?: 'laboratorio' | 'paciente_edad_sexo' | 'estandar' | string;
  estado?: 'normal' | 'alto' | 'bajo';
  alerta?: boolean;
  critico?: boolean;
  interpretacion?: string;
}

export interface CalculoDerivado {
  key: string;
  nombre: string;
  valor: number;
  unidad: string;
  estado: 'normal' | 'informativo' | 'alerta' | 'critico' | string;
  interpretacion: string;
  formula?: string;
}

export interface SindromeDetectado {
  codigo_cie10: string;
  nombre: string;
  severidad: 'critico' | 'alto' | 'moderado' | 'leve' | 'informativo' | string;
  evidencia: string[];
  conducta_sugerida: string;
  confianza?: number;
}

export interface Cie10Sugerido {
  codigo: string;
  descripcion: string;
  severidad: string;
  fuente?: string;
}

export interface HallazgoCualitativo {
  key: string;
  parametro: string;
  resultado: string;
  alerta: boolean;
}

export interface AnalisisAgenteClinico {
  agent_name?: string;
  agent_version?: string;
  engine_used?: string;
  extraction_method?: string;
  ocr_confidence?: number | null;
  pages_processed?: number;
  image_quality?: {
    width?: number;
    height?: number;
    megapixels?: number;
    brightness?: number;
    contrast?: number;
    sharpness?: number;
    calidad_label?: string;
    issues?: string[];
  } | null;
  extracted_text_preview?: string;
  patient_context_applied?: {
    edad?: number | null;
    genero?: string | null;
    rangos_personalizados?: boolean;
  };
  critical_alerts?: string[];
  calculos_derivados?: CalculoDerivado[];
  sindromes_detectados?: SindromeDetectado[];
  cie10_sugeridos?: Cie10Sugerido[];
  hallazgos_cualitativos?: HallazgoCualitativo[];
  hallazgos_clave?: string[];
  medidas_detectadas?: string[];
  escalas_detectadas?: string[];
  vision_radiologica?: {
    modalidad_detectada?: string;
    region_anatomica_detectada?: string;
    region_confianza?: number;
    modelo_usado?: string;
    patologias_evaluadas?: Array<{
      key: string;
      nombre: string;
      codigo_cie10: string;
      probabilidad: number;
      umbral: number;
      sospechoso: boolean;
      severidad: string;
    }>;
    metricas_radiometricas?: Array<{
      nombre: string;
      valor: string;
      interpretacion: string;
    }>;
    nota_seguridad?: string;
  } | null;
  resumen_medico?: string;
  guia_paciente?: string;
  requiere_revision_visual?: boolean;
  processing_ms?: number;
}

export interface AgentCapabilities {
  agent_name: string;
  version: string;
  zero_external_api_cost: boolean;
  ocr_local_ready: boolean;
  pdf_tables_ready: boolean;
  local_ollama_configured: boolean;
  biomarkers_catalog_size: number;
  derived_calculators: string[];
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
  analisis_agente?: AnalisisAgenteClinico | null;
  origen?: 'manual' | 'whatsapp';
  whatsapp_remitente?: string | null;
  created_at?: string;
}

export interface WhatsAppEstudioPendienteItem {
  id: number;
  remitente_telefono: string;
  remitente_nombre?: string | null;
  caption?: string | null;
  archivo_nombre: string;
  archivo_tipo: string;
  archivo_tamano: number;
  archivo_url?: string | null;
  categoria_sugerida: 'laboratorio' | 'imagenologia' | 'informe' | 'otro' | string;
  created_at?: string | null;
}

export interface WhatsAppPendientesResponse {
  whatsapp_connected: boolean;
  whatsapp_state: string;
  whatsapp_phone?: string | null;
  sucursal_nombre?: string | null;
  listening_active: boolean;
  agent_info?: AgentCapabilities;
  pendientes: WhatsAppEstudioPendienteItem[];
}

export interface SolicitarWhatsAppResponse {
  success: boolean;
  listening_active: boolean;
  mensaje_enviado: boolean;
  error_envio?: string | null;
  whatsapp_connected: boolean;
  whatsapp_phone?: string | null;
  paciente_phone?: string;
  message: string;
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

export function buildEstudiosWsUrl(consultaId: number, sucursalId?: number | null): string | null {
  const token = localStorage.getItem('pycore_token');
  if (!token) return null;
  let base = API_BASE_URL;
  if (base.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    base = `${proto}//${window.location.host}${base}`;
  } else {
    base = base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  }
  const params = new URLSearchParams({ token, consulta_id: String(consultaId) });
  if (sucursalId) params.set('sucursal_id', String(sucursalId));
  return `${base.replace(/\/$/, '')}/estudios/ws?${params.toString()}`;
}

export const estudiosApi = {
  obtenerCapacidadesAgente: async () => {
    const { data } = await api.get<AgentCapabilities>('/estudios/agente/capacidades');
    return data;
  },

  analizarTextoClinico: async (texto: string, paciente_id?: number) => {
    const { data } = await api.post('/estudios/agente/analizar-texto', { texto, paciente_id });
    return data;
  },

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

  // Recepción en tiempo real vía WhatsApp (Paso 4)
  solicitarPorWhatsApp: async (
    consultaId: number,
    payload: { enviar_mensaje?: boolean; mensaje_personalizado?: string; telefono_destino?: string }
  ) => {
    const { data } = await api.post<SolicitarWhatsAppResponse>(
      `/estudios/consulta/${consultaId}/solicitar-whatsapp`,
      payload
    );
    return data;
  },

  listarPendientesWhatsApp: async (consultaId?: number, sucursalId?: number | null) => {
    const params: Record<string, any> = {};
    if (consultaId) params.consulta_id = consultaId;
    if (sucursalId) params.sucursal_id = sucursalId;
    const { data } = await api.get<WhatsAppPendientesResponse>('/estudios/whatsapp/pendientes', { params });
    return data;
  },

  asignarPendienteWhatsApp: async (
    pendienteId: number,
    payload: {
      consulta_id: number;
      paciente_id: number;
      medico_id?: number;
      titulo?: string;
      categoria?: string;
      notas?: string;
    }
  ) => {
    const { data } = await api.post<{
      success: boolean;
      estudio_id: number;
      titulo: string;
      categoria: string;
      estado_analisis: string;
      alertas_detectadas: string[];
      engine_used: string;
      message: string;
    }>(`/estudios/whatsapp/pendientes/${pendienteId}/asignar`, payload);
    return data;
  },

  descartarPendienteWhatsApp: async (pendienteId: number) => {
    const { data } = await api.delete(`/estudios/whatsapp/pendientes/${pendienteId}`);
    return data;
  },
};
