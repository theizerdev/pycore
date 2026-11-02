from pathlib import Path

path = Path("frontend/src/pages/clinica/DoctorFormModal.tsx")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

target_stepper = f"{nl}                            {{step.id === 'horario' && ("
replace_stepper = (
    f"{nl}                            {{step.id === 'horario' && ("
)
target_block = """                            {step.id === 'horario' && (
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                {horarioAtencion.filter((h) => h.activo).length}d
                              </span>
                            )}"""

replacement_block = """                            {step.id === 'horario' && (
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                {horarioAtencion.filter((h) => h.activo).length}d
                              </span>
                            )}
                            {step.id === 'honorarios' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold shrink-0 font-mono">
                                {tipoComision === 'porcentaje' ? `${porcentajeHonorario}%` : `$${montoFijoHonorario}`}
                              </span>
                            )}"""

if crlf:
    target_block = target_block.replace("\n", "\r\n")
    replacement_block = replacement_block.replace("\n", "\r\n")

if target_block in content:
    content = content.replace(target_block, replacement_block)
    print("Added honorarios badge in stepper")
else:
    print("WARNING: target_block not found")

# Summary card honorarios
target_card = """                    <span className="text-muted-foreground">Estado agenda:</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded-full ${
                        activo
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>"""

replacement_card = """                    <span className="text-muted-foreground">Estado agenda:</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded-full ${
                        activo
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Honorarios:</span>
                    <span className="font-bold font-mono text-teal-600 dark:text-teal-400">
                      {tipoComision === 'porcentaje' ? `${porcentajeHonorario}%` : `$${montoFijoHonorario.toFixed(2)}`}
                    </span>
                  </div>"""

if crlf:
    target_card = target_card.replace("\n", "\r\n")
    replacement_card = replacement_card.replace("\n", "\r\n")

if target_card in content:
    content = content.replace(target_card, replacement_card)
    print("Added honorarios in summary card")
else:
    print("WARNING: target_card not found")

path.write_text(content, encoding="utf-8")
print("Done refining DoctorFormModal.tsx")
