from pathlib import Path

path = Path("frontend/src/api/honorarios.ts")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Update ResumenCalculoHonorariosResponse
old_resumen = f"  tasa_bcv: number;{nl}  monto_honorarios_ves: number;{nl}  cobros_pendientes: ItemCalculoCobro[];"
new_resumen = (
    f"  tasa_bcv: number;{nl}"
    f"  monto_honorarios_ves: number;{nl}"
    f"  porcentaje_islr_sugerido?: number;{nl}"
    f"  monto_retencion_islr_estimado_usd?: number;{nl}"
    f"  monto_retencion_islr_estimado_ves?: number;{nl}"
    f"  monto_neto_estimado_usd?: number;{nl}"
    f"  monto_neto_estimado_ves?: number;{nl}"
    f"  cobros_pendientes: ItemCalculoCobro[];"
)
if old_resumen in content:
    content = content.replace(old_resumen, new_resumen)
    print("Updated ResumenCalculoHonorariosResponse in honorarios.ts")
else:
    print("WARNING: old_resumen not found")

# 2. Update LiquidacionHonorarioResponse
old_liq_resp = (
    f"  motivo_deduccion?: string;{nl}"
    f"  monto_neto_pagar_usd: number;{nl}"
    f"  monto_neto_pagar_ves: number;"
)
new_liq_resp = (
    f"  motivo_deduccion?: string;{nl}"
    f"  porcentaje_retencion_islr?: number;{nl}"
    f"  monto_retencion_islr_usd?: number;{nl}"
    f"  monto_retencion_islr_ves?: number;{nl}"
    f"  numero_comprobante_islr?: string;{nl}"
    f"  monto_neto_pagar_usd: number;{nl}"
    f"  monto_neto_pagar_ves: number;"
)
if old_liq_resp in content:
    content = content.replace(old_liq_resp, new_liq_resp)
    print("Updated LiquidacionHonorarioResponse in honorarios.ts")
else:
    print("WARNING: old_liq_resp not found")

# 3. Update LiquidarHonorariosPayload
old_liq_pay = (
    f"  cobros_ids: number[];{nl}"
    f"  monto_deducciones_usd?: number;{nl}"
    f"  motivo_deduccion?: string;"
)
new_liq_pay = (
    f"  cobros_ids: number[];{nl}"
    f"  aplicar_retencion_islr?: boolean;{nl}"
    f"  porcentaje_retencion_islr?: number;{nl}"
    f"  monto_deducciones_usd?: number;{nl}"
    f"  motivo_deduccion?: string;"
)
if old_liq_pay in content:
    content = content.replace(old_liq_pay, new_liq_pay)
    print("Updated LiquidarHonorariosPayload in honorarios.ts")
else:
    print("WARNING: old_liq_pay not found")

# 4. Add ComprobanteRetencionISLR interface and api method
comprobante_code = (
    f"{nl}export interface ComprobanteRetencionISLR {{{nl}"
    f"  numero_comprobante: string;{nl}"
    f"  codigo_liquidacion: string;{nl}"
    f"  fecha_emision: string;{nl}"
    f"  periodo_fiscal: string;{nl}"
    f"  ejercicio_fiscal_ano: number;{nl}"
    f"  ejercicio_fiscal_mes: number;{nl}"
    f"  agente_retencion: {{{nl}"
    f"    nombre: string;{nl}"
    f"    rif: string;{nl}"
    f"    direccion?: string;{nl}"
    f"    telefono?: string;{nl}"
    f"    email?: string;{nl}"
    f"  }};{nl}"
    f"  sujeto_retenido: {{{nl}"
    f"    nombre: string;{nl}"
    f"    documento_tipo: string;{nl}"
    f"    documento_numero: string;{nl}"
    f"    rif: string;{nl}"
    f"    especialidad?: string;{nl}"
    f"    licencia_medica?: string;{nl}"
    f"    email?: string;{nl}"
    f"    telefono?: string;{nl}"
    f"  }};{nl}"
    f"  concepto: string;{nl}"
    f"  exencion_iva: string;{nl}"
    f"  base_imponible_usd: number;{nl}"
    f"  tasa_bcv: number;{nl}"
    f"  base_imponible_ves: number;{nl}"
    f"  porcentaje_retencion: number;{nl}"
    f"  monto_retenido_usd: number;{nl}"
    f"  monto_retenido_ves: number;{nl}"
    f"  monto_neto_usd: number;{nl}"
    f"  monto_neto_ves: number;{nl}"
    f"  fundamento_legal: string;{nl}"
    f"}}{nl}"
)

old_api_end = f"  actualizarConfiguracionMedico:"
new_api_end = (
    f"  obtenerComprobanteISLR: async (id: number): Promise<ComprobanteRetencionISLR> => {{{nl}"
    f"    const res = await api.get(`/honorarios/liquidaciones/${{id}}/comprobante-islr`);{nl}"
    f"    return res.data;{nl}"
    f"  }},{nl}{nl}"
    f"  actualizarConfiguracionMedico:"
)

if old_api_end in content:
    content = content.replace(old_api_end, new_api_end)
    print("Added obtenerComprobanteISLR in honorariosApi")
else:
    print("WARNING: old_api_end not found")

content = comprobante_code + content

path.write_text(content, encoding="utf-8")
print("Done updating frontend/src/api/honorarios.ts")

