import api from './client';

export interface Caja {
  id: number;
  empresa_id: number;
  sucursal_id: number;
  nombre: string;
  descripcion?: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface TurnoCaja {
  id: number;
  empresa_id: number;
  sucursal_id: number;
  caja_id: number;
  caja_nombre?: string;
  usuario_id: number;
  cajero_nombre?: string;
  apertura_at: string;
  cierre_at?: string | null;
  estado: 'abierta' | 'cerrada';
  fondo_inicial_usd: number;
  fondo_inicial_ves: number;
  total_ingresos_usd: number;
  total_ingresos_ves: number;
  total_ingresos_eur: number;
  total_egresos_usd: number;
  total_egresos_ves: number;
  arqueo_declarado_usd?: number | null;
  arqueo_declarado_ves?: number | null;
  diferencia_usd?: number | null;
  diferencia_ves?: number | null;
  notas_apertura?: string | null;
  notas_cierre?: string | null;
  created_at: string;
}

export interface TurnoAperturaInput {
  caja_id: number;
  sucursal_id: number;
  fondo_inicial_usd: number;
  fondo_inicial_ves: number;
  notas_apertura?: string;
}

export interface TurnoCierreInput {
  arqueo_declarado_usd: number;
  arqueo_declarado_ves: number;
  notas_cierre?: string;
}

export interface CobroDetalleItem {
  id?: number;
  servicio_id?: number | null;
  tipo_concepto: string; // 'consulta' | 'servicio' | 'odontologia' | 'estudio' | 'insumo' | 'otro'
  descripcion: string;
  cantidad: number;
  precio_unitario_divisa: number;
  subtotal_divisa?: number;
  subtotal_ves?: number;
  diente_fdi?: number | null;
}

export interface CobroPagoItem {
  id?: number;
  metodo: string; // 'efectivo_usd' | 'efectivo_ves' | 'efectivo_eur' | 'pago_movil' | 'punto_venta' | 'transferencia' | 'zelle' | 'pasarela'
  moneda: 'USD' | 'VES' | 'EUR';
  monto_moneda_origen: number;
  tasa_cambio?: number;
  monto_equivalente_divisa?: number;
  banco_origen?: string | null;
  banco_destino?: string | null;
  referencia?: string | null;
  lote_punto?: string | null;
  ultimos_digitos_tarjeta?: string | null;
  notas?: string | null;
}

export interface CobroCreateInput {
  turno_caja_id: number;
  sucursal_id: number;
  paciente_id: number;
  medico_id?: number | null;
  cita_id?: number | null;
  descuento_divisa?: number;
  detalles: CobroDetalleItem[];
  pagos: CobroPagoItem[];
  notas?: string;
}

export interface Cobro {
  id: number;
  empresa_id: number;
  sucursal_id: number;
  turno_caja_id: number;
  cajero_id: number;
  cajero_nombre?: string;
  paciente_id: number;
  paciente_nombre?: string;
  paciente_documento?: string;
  paciente_telefono?: string;
  medico_id?: number | null;
  medico_nombre?: string | null;
  cita_id?: number | null;
  numero_recibo: string;
  fecha_emision: string;
  moneda_referencia: 'USD' | 'EUR';
  tasa_bcv_aplicada: number;
  fuente_tasa?: string;
  subtotal_divisa: number;
  descuento_divisa: number;
  total_divisa: number;
  total_ves: number;
  monto_pagado_divisa: number;
  monto_vuelto_divisa: number;
  monto_vuelto_ves: number;
  estado: 'completado' | 'anulado';
  motivo_anulacion?: string | null;
  anulado_at?: string | null;
  notas?: string | null;
  detalles: CobroDetalleItem[];
  pagos: CobroPagoItem[];
}

export const cajasApi = {
  // Cajas
  listCajas: async (sucursal_id?: number): Promise<Caja[]> => {
    const res = await api.get<Caja[]>('/cajas', { params: sucursal_id ? { sucursal_id } : {} });
    return res.data;
  },

  createCaja: async (data: { nombre: string; descripcion?: string; sucursal_id: number; activa?: boolean }): Promise<Caja> => {
    const res = await api.post<Caja>('/cajas', data);
    return res.data;
  },

  // Turnos
  getActiveTurno: async (): Promise<TurnoCaja | null> => {
    const res = await api.get<TurnoCaja | null>('/cajas/turno-activo');
    return res.data;
  },

  openTurno: async (data: TurnoAperturaInput): Promise<TurnoCaja> => {
    const res = await api.post<TurnoCaja>('/cajas/turnos/apertura', data);
    return res.data;
  },

  closeTurno: async (turnoId: number, data: TurnoCierreInput): Promise<TurnoCaja> => {
    const res = await api.post<TurnoCaja>(`/cajas/turnos/${turnoId}/cierre`, data);
    return res.data;
  },

  // Cobros
  createCobro: async (data: CobroCreateInput): Promise<Cobro> => {
    const res = await api.post<Cobro>('/cajas/cobros', data);
    return res.data;
  },

  listCobros: async (params?: { sucursal_id?: number; paciente_id?: number; fecha_desde?: string; fecha_hasta?: string; limit?: number }): Promise<Cobro[]> => {
    const res = await api.get<Cobro[]>('/cajas/cobros', { params });
    return res.data;
  },

  getCobroById: async (id: number): Promise<Cobro> => {
    const res = await api.get<Cobro>(`/cajas/cobros/${id}`);
    return res.data;
  },

  anularCobro: async (id: number, motivo: string): Promise<Cobro> => {
    const res = await api.post<Cobro>(`/cajas/cobros/${id}/anular`, null, { params: { motivo } });
    return res.data;
  },
};

export default cajasApi;
