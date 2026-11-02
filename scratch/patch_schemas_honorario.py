from pathlib import Path

path = Path("backend/app/schemas/honorario.py")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Update ResumenCalculoHonorariosResponse
old_resumen = (
    f"    tasa_bcv: float{nl}"
    f"    monto_honorarios_ves: float{nl}"
    f"    cobros_pendientes: List[ItemCalculoCobro]"
)
new_resumen = (
    f"    tasa_bcv: float{nl}"
    f"    monto_honorarios_ves: float{nl}"
    f"    # Estimaciones fiscales (Decreto 1.808 ISLR){nl}"
    f"    porcentaje_islr_sugerido: float = 3.00{nl}"
    f"    monto_retencion_islr_estimado_usd: float = 0.00{nl}"
    f"    monto_retencion_islr_estimado_ves: float = 0.00{nl}"
    f"    monto_neto_estimado_usd: float = 0.00{nl}"
    f"    monto_neto_estimado_ves: float = 0.00{nl}"
    f"    cobros_pendientes: List[ItemCalculoCobro]"
)
if old_resumen in content:
    content = content.replace(old_resumen, new_resumen)
    print("Updated ResumenCalculoHonorariosResponse")
else:
    print("WARNING: old_resumen not found")

# 2. Update LiquidarHonorariosRequest
old_req = (
    f"    cobros_ids: List[int]{nl}"
    f"    monto_deducciones_usd: float = 0.00{nl}"
    f"    motivo_deduccion: Optional[str] = None"
)
new_req = (
    f"    cobros_ids: List[int]{nl}"
    f"    # Retención de ISLR (Decreto 1.808){nl}"
    f"    aplicar_retencion_islr: bool = True{nl}"
    f"    porcentaje_retencion_islr: float = 3.00{nl}"
    f"    monto_deducciones_usd: float = 0.00{nl}"
    f"    motivo_deduccion: Optional[str] = None"
)
if old_req in content:
    content = content.replace(old_req, new_req)
    print("Updated LiquidarHonorariosRequest")
else:
    print("WARNING: old_req not found")

# 3. Update LiquidacionHonorarioResponse
old_resp = (
    f"    motivo_deduccion: Optional[str] = None{nl}"
    f"    monto_neto_pagar_usd: float{nl}"
    f"    monto_neto_pagar_ves: float"
)
new_resp = (
    f"    motivo_deduccion: Optional[str] = None{nl}"
    f"    # Retención de ISLR{nl}"
    f"    porcentaje_retencion_islr: float = 0.00{nl}"
    f"    monto_retencion_islr_usd: float = 0.00{nl}"
    f"    monto_retencion_islr_ves: float = 0.00{nl}"
    f"    numero_comprobante_islr: Optional[str] = None{nl}"
    f"    monto_neto_pagar_usd: float{nl}"
    f"    monto_neto_pagar_ves: float"
)
if old_resp in content:
    content = content.replace(old_resp, new_resp)
    print("Updated LiquidacionHonorarioResponse")
else:
    print("WARNING: old_resp not found")

# 4. Add ComprobanteRetencionISLRResponse
comprobante_schema = (
    f"{nl}{nl}class ComprobanteRetencionISLRResponse(BaseModel):{nl}"
    f"    numero_comprobante: str{nl}"
    f"    codigo_liquidacion: str{nl}"
    f"    fecha_emision: str{nl}"
    f"    periodo_fiscal: str  # Ej. '2026-11'{nl}"
    f"    ejercicio_fiscal_ano: int{nl}"
    f"    ejercicio_fiscal_mes: int{nl}"
    f"    agente_retencion: Dict[str, Any]{nl}"
    f"    sujeto_retenido: Dict[str, Any]{nl}"
    f"    concepto: str{nl}"
    f"    exencion_iva: str = 'Exento según Art. 18 Numeral 3 de la Ley de IVA'{nl}"
    f"    base_imponible_usd: float{nl}"
    f"    tasa_bcv: float{nl}"
    f"    base_imponible_ves: float{nl}"
    f"    porcentaje_retencion: float{nl}"
    f"    monto_retenido_usd: float{nl}"
    f"    monto_retenido_ves: float{nl}"
    f"    monto_neto_usd: float{nl}"
    f"    monto_neto_ves: float{nl}"
    f"    fundamento_legal: str = 'Decreto N° 1.808 en materia de Retenciones de ISLR (Art. 9, Numeral 1)'{nl}"
)

content += comprobante_schema
print("Added ComprobanteRetencionISLRResponse schema")

path.write_text(content, encoding="utf-8")
print("Done patching honorario schemas")

