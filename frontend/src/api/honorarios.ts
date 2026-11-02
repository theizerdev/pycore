import api from './client';

export interface ItemCalculoCobro {
  cobro_id: number;
  numero_recibo: string;
  fecha: string;
  paciente_nombre: string;
  paciente_documento?: string;
  concepto: string;
  monto_total_usd: number;
  tipo_comision: string;
  porcentaje_aplicado: number;
  honorario_medico_usd: number;
  retencion_clinica_usd: number;
}

export interface MedicoMiniHonorario {
  id: number;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  especialidad?: string;
  documento?: string;
  tipo_comision: string;
  porcentaje_honorario: number;
  monto_fijo_honorario: number;
  datos_bancarios?: Record<string, any>;
}

export interface ResumenCalculoHonorariosResponse {
  medico: MedicoMiniHonorario;
  periodo_desde: string;
  periodo_hasta: string;
  total_cobros: number;
  monto_total_recaudado_usd: number;
  monto_honorarios_usd: number;
  monto_retencion_clinica_usd: number;
  tasa_bcv: number;
  monto_honorarios_ves: number;
  cobros_pendientes: ItemCalculoCobro[];
}

export interface LiquidacionHonorarioResponse {
  id: number;
  empresa_id: number;
  sucursal_id?: number;
  medico_id: number;
  codigo_liquidacion: string;
  fecha_emision: string;
  periodo_desde: string;
  periodo_hasta: string;
  total_cobros: number;
  monto_total_recaudado_usd: number;
  tipo_comision_aplicado: string;
  porcentaje_aplicado: number;
  monto_fijo_aplicado: number;
  monto_honorarios_usd: number;
  monto_retencion_clinica_usd: number;
  monto_deducciones_usd: number;
  motivo_deduccion?: string;
  monto_neto_pagar_usd: number;
  monto_neto_pagar_ves: number;
  tasa_bcv_aplicada: number;
  estado: 'pendiente' | 'pagado' | 'anulado';
  fecha_pago?: string;
  metodo_pago?: string;
  referencia_pago?: string;
  banco_origen?: string;
  banco_destino?: string;
  cobros_ids: number[];
  desglose_cobros: Array<{
    cobro_id: number;
    numero_recibo: string;
    fecha: string;
    paciente: string;
    concepto: string;
    monto_cobro_usd: number;
    honorario_usd: number;
    retencion_clinica_usd: number;
    porcentaje_aplicado: number;
  }>;
  datos_bancarios_medico: Record<string, any>;
  notas?: string;
  medico_nombre_completo?: string;
  medico_documento?: string;
  created_at?: string;
}

export interface LiquidacionesListResponse {
  items: LiquidacionHonorarioResponse[];
  total: number;
  page: number;
  page_size: number;
  stats: {
    total_liquidado_usd: number;
    total_pagado_usd: number;
    total_pendiente_usd: number;
    total_liquidaciones: number;
  };
}

export interface LiquidarHonorariosPayload {
  medico_id: number;
  sucursal_id?: number;
  periodo_desde: string;
  periodo_hasta: string;
  cobros_ids: number[];
  monto_deducciones_usd?: number;
  motivo_deduccion?: string;
  metodo_pago?: string;
  referencia_pago?: string;
  banco_origen?: string;
  banco_destino?: string;
  marcar_como_pagado?: boolean;
  notas?: string;
}

export interface PagarLiquidacionPayload {
  metodo_pago: string;
  referencia_pago?: string;
  banco_origen?: string;
  banco_destino?: string;
  notas?: string;
}

export interface ConfiguracionComisionPayload {
  tipo_comision: string;
  porcentaje_honorario: number;
  monto_fijo_honorario: number;
  datos_bancarios?: Record<string, any>;
}

export const honorariosApi = {
  resumenCalculo: async (params: {
    medico_id: number;
    sucursal_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<ResumenCalculoHonorariosResponse> => {
    const res = await api.get('/honorarios/resumen-calculo', { params });
    return res.data;
  },

  liquidar: async (payload: LiquidarHonorariosPayload): Promise<LiquidacionHonorarioResponse> => {
    const res = await api.post('/honorarios/liquidar', payload);
    return res.data;
  },

  listarLiquidaciones: async (params?: {
    medico_id?: number;
    sucursal_id?: number;
    estado?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<LiquidacionesListResponse> => {
    const res = await api.get('/honorarios/liquidaciones', { params });
    return res.data;
  },

  obtenerDetalle: async (id: number): Promise<LiquidacionHonorarioResponse> => {
    const res = await api.get(`/honorarios/liquidaciones/${id}`);
    return res.data;
  },

  pagarLiquidacion: async (id: number, payload: PagarLiquidacionPayload): Promise<LiquidacionHonorarioResponse> => {
    const res = await api.post(`/honorarios/liquidaciones/${id}/pagar`, payload);
    return res.data;
  },

  anularLiquidacion: async (id: number, motivo?: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/honorarios/liquidaciones/${id}/anular`, null, {
      params: { motivo },
    });
    return res.data;
  },

  actualizarConfiguracionMedico: async (
    medicoId: number,
    payload: ConfiguracionComisionPayload
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.put(`/honorarios/medicos/${medicoId}/configuracion`, payload);
    return res.data;
  },
};

export default honorariosApi;

