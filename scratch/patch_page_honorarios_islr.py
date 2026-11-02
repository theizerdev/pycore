from pathlib import Path

path = Path("frontend/src/pages/facturacion/HonorariosMedicosPage.tsx")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Add states for ISLR
old_state = f"  const [montoDeduccion, setMontoDeduccion] = useState<number>(0);"
new_state = (
    f"  const [aplicarISLR, setAplicarISLR] = useState(true);{nl}"
    f"  const [porcentajeISLR, setPorcentajeISLR] = useState<number>(3);{nl}"
    f"  const [montoDeduccion, setMontoDeduccion] = useState<number>(0);"
)
if old_state in content:
    content = content.replace(old_state, new_state)
    print("Added ISLR states in HonorariosMedicosPage.tsx")
else:
    print("WARNING: old_state not found")

# 2. Update dynamic calculations
old_calc = (
    f"  const subtotalRecaudadoSelected = selectedItems.reduce((acc, c) => acc + c.monto_total_usd, 0);{nl}"
    f"  const subtotalHonorariosSelected = selectedItems.reduce((acc, c) => acc + c.honorario_medico_usd, 0);{nl}"
    f"  const subtotalRetencionSelected = selectedItems.reduce((acc, c) => acc + c.retencion_clinica_usd, 0);{nl}"
    f"  const netoPagarFinalUSD = Math.max(0, subtotalHonorariosSelected - (montoDeduccion || 0));{nl}"
    f"  const netoPagarFinalVES = resumenCalculo{nl}"
    f"    ? Math.round(netoPagarFinalUSD * resumenCalculo.tasa_bcv * 100) / 100{nl}"
    f"    : 0;"
)

new_calc = (
    f"  const subtotalRecaudadoSelected = selectedItems.reduce((acc, c) => acc + c.monto_total_usd, 0);{nl}"
    f"  const subtotalHonorariosSelected = selectedItems.reduce((acc, c) => acc + c.honorario_medico_usd, 0);{nl}"
    f"  const subtotalRetencionSelected = selectedItems.reduce((acc, c) => acc + c.retencion_clinica_usd, 0);{nl}"
    f"  const tasaBCV = resumenCalculo?.tasa_bcv || 1;{nl}"
    f"  const retencionISLRUSD = aplicarISLR ? Math.round(subtotalHonorariosSelected * (porcentajeISLR / 100) * 100) / 100 : 0;{nl}"
    f"  const retencionISLRVES = Math.round(retencionISLRUSD * tasaBCV * 100) / 100;{nl}"
    f"  const netoPagarFinalUSD = Math.max(0, subtotalHonorariosSelected - retencionISLRUSD - (montoDeduccion || 0));{nl}"
    f"  const netoPagarFinalVES = Math.round(netoPagarFinalUSD * tasaBCV * 100) / 100;"
)

if old_calc in content:
    content = content.replace(old_calc, new_calc)
    print("Updated dynamic calculations in HonorariosMedicosPage.tsx")
else:
    print("WARNING: old_calc not found")

# 3. Update handleCalcularHonorarios to autodetect 3% vs 5%
old_cal_hook = "      setSelectedCobrosIds(data.cobros_pendientes.map((c) => c.cobro_id));"
new_cal_hook = (
    "      setSelectedCobrosIds(data.cobros_pendientes.map((c) => c.cobro_id));\n"
    "      const docTipo = (data.medico?.documento || '').charAt(0).toUpperCase();\n"
    "      setPorcentajeISLR(docTipo === 'J' || docTipo === 'G' ? 5.0 : 3.0);\n"
    "      setAplicarISLR(true);"
)
if crlf:
    new_cal_hook = new_cal_hook.replace("\n", "\r\n")

if old_cal_hook in content:
    content = content.replace(old_cal_hook, new_cal_hook)
    print("Updated autodetect ISLR in handleCalcularHonorarios")
else:
    print("WARNING: old_cal_hook not found")

# 4. Update handleGenerarLiquidacion call
old_liq_call = (
    f"        cobros_ids: selectedCobrosIds,{nl}"
    f"        monto_deducciones_usd: montoDeduccion,"
)
new_liq_call = (
    f"        cobros_ids: selectedCobrosIds,{nl}"
    f"        aplicar_retencion_islr: aplicarISLR,{nl}"
    f"        porcentaje_retencion_islr: aplicarISLR ? porcentajeISLR : 0,{nl}"
    f"        monto_deducciones_usd: montoDeduccion,"
)
if old_liq_call in content:
    content = content.replace(old_liq_call, new_liq_call)
    print("Updated handleGenerarLiquidacion call")
else:
    print("WARNING: old_liq_call not found")

# 5. Insert ISLR block into modalLiquidarOpen
old_modal_ded = (
    f"            {{/* Deducciones */}}{nl}"
    f"            <div className=\"grid grid-cols-2 gap-3\">"
)

new_modal_islr = """            {/* Retención Legal de ISLR (Decreto 1.808 Ley Venezolana) */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarISLR}
                    onChange={(e) => setAplicarISLR(e.target.checked)}
                    className="rounded border-border text-teal-600 focus:ring-teal-500"
                  />
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="size-4 text-teal-600" />
                    Retención de ISLR (Decreto N° 1.808)
                  </span>
                </label>
                <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 bg-teal-500/5">
                  Agente de Retención SENIAT
                </Badge>
              </div>

              {aplicarISLR && (
                <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-semibold">
                      Tasa de Retención ISLR
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={porcentajeISLR}
                        onChange={(e) => setPorcentajeISLR(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="h-8 text-xs font-mono w-20"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                      <div className="flex gap-1 ml-1">
                        <button
                          type="button"
                          onClick={() => setPorcentajeISLR(3.0)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                            porcentajeISLR === 3
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-background border-border text-muted-foreground'
                          }`}
                        >
                          3% PN
                        </button>
                        <button
                          type="button"
                          onClick={() => setPorcentajeISLR(5.0)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                            porcentajeISLR === 5
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-background border-border text-muted-foreground'
                          }`}
                        >
                          5% PJ
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:text-right font-mono">
                    <span className="text-[11px] text-muted-foreground block">Impuesto Retenido:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 block text-xs">
                      - {formatUSD(retencionISLRUSD)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      - {formatVES(retencionISLRVES)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Deducciones */}
            <div className="grid grid-cols-2 gap-3">"""

if crlf:
    new_modal_islr = new_modal_islr.replace("\n", "\r\n")

if old_modal_ded in content:
    content = content.replace(old_modal_ded, new_modal_islr)
    print("Inserted ISLR block into modalLiquidarOpen")
else:
    print("WARNING: old_modal_ded not found")

path.write_text(content, encoding="utf-8")
print("Done patching HonorariosMedicosPage.tsx")

