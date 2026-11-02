from pathlib import Path

path = Path("backend/app/api/v1/honorarios.py")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Update schema imports
old_imp = "from app.schemas.honorario import ("
new_imp = (
    "from app.schemas.honorario import (\n"
    "    ComprobanteRetencionISLRResponse,"
)
if crlf:
    new_imp = new_imp.replace("\n", "\r\n")

if old_imp in content:
    content = content.replace(old_imp, new_imp)
    print("Updated schemas import in honorarios.py")
else:
    print("WARNING: old_imp not found")

# 2. Update resumen_calculo_honorarios to compute ISLR
old_resumen_calc = (
    f"    tasa_bcv = await _get_tasa_bcv(db, current_user.empresa_id){nl}"
    f"    honorarios_ves = round(total_honorarios * tasa_bcv, 2){nl}{nl}"
    f"    esp_nom = medico.especialidad.nombre if medico.especialidad else \"Medicina General\"{nl}"
    f"    med_doc = f\"{{medico.tipo_documento}}-{{medico.documento_identidad}}\" if medico.documento_identidad else None{nl}{nl}"
    f"    return ResumenCalculoHonorariosResponse({nl}"
    f"        medico=MedicoMiniHonorario({nl}"
    f"            id=medico.id,{nl}"
    f"            nombres=medico.nombres,{nl}"
    f"            apellidos=medico.apellidos,{nl}"
    f"            nombre_completo=f\"Dr(a). {{medico.nombres}} {{medico.apellidos}}\",{nl}"
    f"            especialidad=esp_nom,{nl}"
    f"            documento=med_doc,{nl}"
    f"            tipo_comision=tipo_comision,{nl}"
    f"            porcentaje_honorario=porcentaje,{nl}"
    f"            monto_fijo_honorario=monto_fijo,{nl}"
    f"            datos_bancarios=medico.datos_bancarios or {{}},{nl}"
    f"        ),{nl}"
    f"        periodo_desde=dt_desde.strftime(\"%Y-%m-%d\"),{nl}"
    f"        periodo_hasta=dt_hasta.strftime(\"%Y-%m-%d\"),{nl}"
    f"        total_cobros=len(cobros),{nl}"
    f"        monto_total_recaudado_usd=round(total_recaudado, 2),{nl}"
    f"        monto_honorarios_usd=round(total_honorarios, 2),{nl}"
    f"        monto_retencion_clinica_usd=round(total_retencion, 2),{nl}"
    f"        tasa_bcv=tasa_bcv,{nl}"
    f"        monto_honorarios_ves=honorarios_ves,{nl}"
    f"        cobros_pendientes=items_calculados,{nl}"
    f"    )"
)

new_resumen_calc = (
    f"    tasa_bcv = await _get_tasa_bcv(db, current_user.empresa_id){nl}"
    f"    honorarios_ves = round(total_honorarios * tasa_bcv, 2){nl}{nl}"
    f"    # Estimación de Retención de ISLR según Ley Venezolana (Decreto N° 1.808){nl}"
    f"    # 3.00% para Personas Naturales (V, E) y 5.00% para Personas Jurídicas (J, G){nl}"
    f"    doc_tipo = (medico.tipo_documento or 'V').upper().strip(){nl}"
    f"    pct_islr_sugerido = 5.00 if doc_tipo in ['J', 'G'] else 3.00{nl}"
    f"    ret_islr_usd = round(total_honorarios * (pct_islr_sugerido / 100.0), 2){nl}"
    f"    ret_islr_ves = round(ret_islr_usd * tasa_bcv, 2){nl}"
    f"    neto_est_usd = max(0.0, round(total_honorarios - ret_islr_usd, 2)){nl}"
    f"    neto_est_ves = round(neto_est_usd * tasa_bcv, 2){nl}{nl}"
    f"    esp_nom = medico.especialidad.nombre if medico.especialidad else \"Medicina General\"{nl}"
    f"    med_doc = f\"{{medico.tipo_documento}}-{{medico.documento_identidad}}\" if medico.documento_identidad else None{nl}{nl}"
    f"    return ResumenCalculoHonorariosResponse({nl}"
    f"        medico=MedicoMiniHonorario({nl}"
    f"            id=medico.id,{nl}"
    f"            nombres=medico.nombres,{nl}"
    f"            apellidos=medico.apellidos,{nl}"
    f"            nombre_completo=f\"Dr(a). {{medico.nombres}} {{medico.apellidos}}\",{nl}"
    f"            especialidad=esp_nom,{nl}"
    f"            documento=med_doc,{nl}"
    f"            tipo_comision=tipo_comision,{nl}"
    f"            porcentaje_honorario=porcentaje,{nl}"
    f"            monto_fijo_honorario=monto_fijo,{nl}"
    f"            datos_bancarios=medico.datos_bancarios or {{}},{nl}"
    f"        ),{nl}"
    f"        periodo_desde=dt_desde.strftime(\"%Y-%m-%d\"),{nl}"
    f"        periodo_hasta=dt_hasta.strftime(\"%Y-%m-%d\"),{nl}"
    f"        total_cobros=len(cobros),{nl}"
    f"        monto_total_recaudado_usd=round(total_recaudado, 2),{nl}"
    f"        monto_honorarios_usd=round(total_honorarios, 2),{nl}"
    f"        monto_retencion_clinica_usd=round(total_retencion, 2),{nl}"
    f"        tasa_bcv=tasa_bcv,{nl}"
    f"        monto_honorarios_ves=honorarios_ves,{nl}"
    f"        porcentaje_islr_sugerido=pct_islr_sugerido,{nl}"
    f"        monto_retencion_islr_estimado_usd=ret_islr_usd,{nl}"
    f"        monto_retencion_islr_estimado_ves=ret_islr_ves,{nl}"
    f"        monto_neto_estimado_usd=neto_est_usd,{nl}"
    f"        monto_neto_estimado_ves=neto_est_ves,{nl}"
    f"        cobros_pendientes=items_calculados,{nl}"
    f"    )"
)

if old_resumen_calc in content:
    content = content.replace(old_resumen_calc, new_resumen_calc)
    print("Updated resumen_calculo_honorarios calculation")
else:
    print("WARNING: old_resumen_calc not found")

# 3. Update liquidar_honorarios calculation & persistence
old_liquidar_ded = (
    f"    # Aplicar deducciones{nl}"
    f"    deducciones = max(0.0, float(payload.monto_deducciones_usd or 0.0)){nl}"
    f"    neto_usd = max(0.0, total_honorarios - deducciones){nl}{nl}"
    f"    tasa_bcv = await _get_tasa_bcv(db, current_user.empresa_id){nl}"
    f"    neto_ves = round(neto_usd * tasa_bcv, 2){nl}{nl}"
    f"    # 4. Generar correlativo de liquidación (Ej. LIQ-2026-00001){nl}"
    f"    year = datetime.utcnow().year{nl}"
    f"    count_res = await db.execute({nl}"
    f"        select(func.count(LiquidacionHonorario.id)).where({nl}"
    f"            LiquidacionHonorario.empresa_id == current_user.empresa_id{nl}"
    f"        ){nl}"
    f"    ){nl}"
    f"    total_liq_empresa = count_res.scalar() or 0{nl}"
    f"    codigo = f\"LIQ-{{year}}-{{(total_liq_empresa + 1):05d}}\""
)

new_liquidar_ded = (
    f"    # Determinar porcentaje de retención ISLR (Decreto N° 1.808 Ley Venezolana){nl}"
    f"    doc_tipo = (medico.tipo_documento or 'V').upper().strip(){nl}"
    f"    pct_islr_defecto = 5.00 if doc_tipo in ['J', 'G'] else 3.00{nl}"
    f"    if payload.aplicar_retencion_islr:{nl}"
    f"        pct_islr = float(payload.porcentaje_retencion_islr if payload.porcentaje_retencion_islr is not None else pct_islr_defecto){nl}"
    f"    else:{nl}"
    f"        pct_islr = 0.00{nl}{nl}"
    f"    tasa_bcv = await _get_tasa_bcv(db, current_user.empresa_id){nl}"
    f"    retencion_islr_usd = round(total_honorarios * (pct_islr / 100.0), 2){nl}"
    f"    retencion_islr_ves = round(retencion_islr_usd * tasa_bcv, 2){nl}{nl}"
    f"    # Aplicar deducciones e ISLR{nl}"
    f"    deducciones = max(0.0, float(payload.monto_deducciones_usd or 0.0)){nl}"
    f"    neto_usd = max(0.0, round(total_honorarios - retencion_islr_usd - deducciones, 2)){nl}"
    f"    neto_ves = round(neto_usd * tasa_bcv, 2){nl}{nl}"
    f"    # 4. Generar correlativo de liquidación (Ej. LIQ-2026-00001) y comprobante ISLR{nl}"
    f"    year = datetime.utcnow().year{nl}"
    f"    count_res = await db.execute({nl}"
    f"        select(func.count(LiquidacionHonorario.id)).where({nl}"
    f"            LiquidacionHonorario.empresa_id == current_user.empresa_id{nl}"
    f"        ){nl}"
    f"    ){nl}"
    f"    total_liq_empresa = count_res.scalar() or 0{nl}"
    f"    codigo = f\"LIQ-{{year}}-{{(total_liq_empresa + 1):05d}}\"{nl}"
    f"    mes_str = datetime.utcnow().strftime('%Y%m'){nl}"
    f"    numero_comprobante_islr = f\"{{mes_str}}{{(total_liq_empresa + 1):08d}}\" if pct_islr > 0 else None"
)

if old_liquidar_ded in content:
    content = content.replace(old_liquidar_ded, new_liquidar_ded)
    print("Updated liquidar_honorarios calculation")
else:
    print("WARNING: old_liquidar_ded not found")

# 4. Update LiquidacionHonorario constructor call
old_liq_inst = (
    f"        motivo_deduccion=payload.motivo_deduccion,{nl}"
    f"        monto_neto_pagar_usd=Decimal(str(round(neto_usd, 2))),"
)
new_liq_inst = (
    f"        motivo_deduccion=payload.motivo_deduccion,{nl}"
    f"        porcentaje_retencion_islr=Decimal(str(round(pct_islr, 2))),{nl}"
    f"        monto_retencion_islr_usd=Decimal(str(round(retencion_islr_usd, 2))),{nl}"
    f"        monto_retencion_islr_ves=Decimal(str(round(retencion_islr_ves, 2))),{nl}"
    f"        numero_comprobante_islr=numero_comprobante_islr,{nl}"
    f"        monto_neto_pagar_usd=Decimal(str(round(neto_usd, 2))),"
)
if old_liq_inst in content:
    content = content.replace(old_liq_inst, new_liq_inst)
    print("Updated LiquidacionHonorario constructor instantiation")
else:
    print("WARNING: old_liq_inst not found")

# 5. Read endpoint string from separate file to avoid f-string escaping
endpoint_islr = Path("scratch/endpoint_comprobante_islr.txt").read_text(encoding="utf-8")
if crlf:
    endpoint_islr = endpoint_islr.replace("\n", "\r\n")

content += endpoint_islr
print("Added obtener_comprobante_retencion_islr endpoint")

path.write_text(content, encoding="utf-8")
print("Done patching honorarios.py")
