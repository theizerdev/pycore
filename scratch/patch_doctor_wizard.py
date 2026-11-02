from pathlib import Path

path = Path("frontend/src/pages/clinica/DoctorFormModal.tsx")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Add icons to lucide-react import
old_icons = f"  ChevronRight,{nl}}} from 'lucide-react';"
new_icons = f"  ChevronRight,{nl}  Receipt,{nl}  Percent,{nl}  CircleDollarSign,{nl}  Landmark,{nl}}} from 'lucide-react';"
if old_icons in content:
    content = content.replace(old_icons, new_icons)
    print("Added lucide-react icons")
else:
    print("WARNING: old_icons not found")

# 2. Add BANCOS_VENEZUELA constant
old_const = "const COLORES_PREDEFINIDOS = ["
new_const = (
    "export const BANCOS_VENEZUELA = [\n"
    "  'Banesco Banco Universal',\n"
    "  'Banco de Venezuela (BDV)',\n"
    "  'Banco Mercantil',\n"
    "  'Banco Provincial (BBVA)',\n"
    "  'Bancamiga Banco Universal',\n"
    "  'Banco Nacional de Crédito (BNC)',\n"
    "  'Banplus Banco Universal',\n"
    "  'Banco Exterior',\n"
    "  'Banco Plaza',\n"
    "  '100% Banco',\n"
    "  'Bancaribe',\n"
    "  'Banco Venezolano de Crédito',\n"
    "  'Cuenta en Divisas (Custodia)',\n"
    "  'Zelle / Bank of America / Wells Fargo',\n"
    "  'Otro Banco Internacional',\n"
    "];\n\n"
    "const COLORES_PREDEFINIDOS = ["
)
if crlf:
    new_const = new_const.replace("\n", "\r\n")

if old_const in content:
    content = content.replace(old_const, new_const)
    print("Added BANCOS_VENEZUELA constant")
else:
    print("WARNING: old_const not found")

# 3. Update DoctorTab type
old_tab_type = "type DoctorTab = 'personal' | 'especialidad' | 'subespecialidades' | 'horario' | 'acceso';"
new_tab_type = "type DoctorTab = 'personal' | 'especialidad' | 'subespecialidades' | 'horario' | 'honorarios' | 'acceso';"
if old_tab_type in content:
    content = content.replace(old_tab_type, new_tab_type)
    print("Updated DoctorTab type")
else:
    print("WARNING: old_tab_type not found")

# 4. Add honorarios state variables
old_state = f"  // Carrito de Subespecialidades{nl}  const [subespecialidadesCarrito, setSubespecialidadesCarrito] = useState<SubespecialidadItem[]>([]);"
new_state = (
    f"  // Honorarios y Liquidación{nl}"
    f"  const [tipoComision, setTipoComision] = useState<'porcentaje' | 'fijo'>('porcentaje');{nl}"
    f"  const [porcentajeHonorario, setPorcentajeHonorario] = useState<number>(70);{nl}"
    f"  const [montoFijoHonorario, setMontoFijoHonorario] = useState<number>(0);{nl}"
    f"  const [banco, setBanco] = useState('');{nl}"
    f"  const [numeroCuenta, setNumeroCuenta] = useState('');{nl}"
    f"  const [titular, setTitular] = useState('');{nl}"
    f"  const [pagoMovil, setPagoMovil] = useState('');{nl}"
    f"  const [zelle, setZelle] = useState('');{nl}{nl}"
    f"  // Carrito de Subespecialidades{nl}"
    f"  const [subespecialidadesCarrito, setSubespecialidadesCarrito] = useState<SubespecialidadItem[]>([]);"
)
if old_state in content:
    content = content.replace(old_state, new_state)
    print("Added honorarios state variables")
else:
    print("WARNING: old_state not found")

# 5. Populate on edit / reset on new
old_init_edit = f"      setCrearUsuario(Boolean(medicoToEdit.usuario_id));{nl}      setPassword('');"
new_init_edit = (
    f"      // Honorarios & Pagos{nl}"
    f"      setTipoComision((medicoToEdit.tipo_comision as 'porcentaje' | 'fijo') || 'porcentaje');{nl}"
    f"      setPorcentajeHonorario(medicoToEdit.porcentaje_honorario !== undefined && medicoToEdit.porcentaje_honorario !== null ? Number(medicoToEdit.porcentaje_honorario) : 70);{nl}"
    f"      setMontoFijoHonorario(medicoToEdit.monto_fijo_honorario !== undefined && medicoToEdit.monto_fijo_honorario !== null ? Number(medicoToEdit.monto_fijo_honorario) : 0);{nl}"
    f"      const b = (medicoToEdit.datos_bancarios as Record<string, any>) || {{}};{nl}"
    f"      setBanco(b.banco || '');{nl}"
    f"      setNumeroCuenta(b.numero_cuenta || '');{nl}"
    f"      setTitular(b.titular || '');{nl}"
    f"      setPagoMovil(b.pago_movil || '');{nl}"
    f"      setZelle(b.zelle || '');{nl}"
    f"      setCrearUsuario(Boolean(medicoToEdit.usuario_id));{nl}"
    f"      setPassword('');"
)
if old_init_edit in content:
    content = content.replace(old_init_edit, new_init_edit)
    print("Added init_edit honorarios")
else:
    print("WARNING: old_init_edit not found")

old_init_new = f"      setHorarioAtencion(DIAS_SEMANA_DEFAULT);{nl}      setCrearUsuario(true);"
new_init_new = (
    f"      setHorarioAtencion(DIAS_SEMANA_DEFAULT);{nl}"
    f"      setTipoComision('porcentaje');{nl}"
    f"      setPorcentajeHonorario(70);{nl}"
    f"      setMontoFijoHonorario(0);{nl}"
    f"      setBanco('');{nl}"
    f"      setNumeroCuenta('');{nl}"
    f"      setTitular('');{nl}"
    f"      setPagoMovil('');{nl}"
    f"      setZelle('');{nl}"
    f"      setCrearUsuario(true);"
)
if old_init_new in content:
    content = content.replace(old_init_new, new_init_new)
    print("Added init_new honorarios")
else:
    print("WARNING: old_init_new not found")

# 6. Include in updateData & createData
old_submit_update = f"          biografia: biografia.trim() || null,{nl}          activo,"
new_submit_update = (
    f"          biografia: biografia.trim() || null,{nl}"
    f"          tipo_comision: tipoComision,{nl}"
    f"          porcentaje_honorario: Number(porcentajeHonorario),{nl}"
    f"          monto_fijo_honorario: Number(montoFijoHonorario),{nl}"
    f"          datos_bancarios: {{{nl}"
    f"            banco: banco.trim() || undefined,{nl}"
    f"            numero_cuenta: numeroCuenta.trim() || undefined,{nl}"
    f"            titular: titular.trim() || undefined,{nl}"
    f"            pago_movil: pagoMovil.trim() || undefined,{nl}"
    f"            zelle: zelle.trim() || undefined,{nl}"
    f"          }},{nl}"
    f"          activo,"
)
if old_submit_update in content:
    content = content.replace(old_submit_update, new_submit_update)
    print("Added honorarios to updateData")
else:
    print("WARNING: old_submit_update not found")

old_submit_create = f"          biografia: biografia.trim() || null,{nl}          activo,{nl}          crear_usuario: crearUsuario,"
new_submit_create = (
    f"          biografia: biografia.trim() || null,{nl}"
    f"          tipo_comision: tipoComision,{nl}"
    f"          porcentaje_honorario: Number(porcentajeHonorario),{nl}"
    f"          monto_fijo_honorario: Number(montoFijoHonorario),{nl}"
    f"          datos_bancarios: {{{nl}"
    f"            banco: banco.trim() || undefined,{nl}"
    f"            numero_cuenta: numeroCuenta.trim() || undefined,{nl}"
    f"            titular: titular.trim() || undefined,{nl}"
    f"            pago_movil: pagoMovil.trim() || undefined,{nl}"
    f"            zelle: zelle.trim() || undefined,{nl}"
    f"          }},{nl}"
    f"          activo,{nl}"
    f"          crear_usuario: crearUsuario,"
)
if old_submit_create in content:
    content = content.replace(old_submit_create, new_submit_create)
    print("Added honorarios to createData")
else:
    print("WARNING: old_submit_create not found")

# 7. Update STEPS array
old_steps = (
    f"    {{{nl}"
    f"      id: 'acceso',{nl}"
    f"      label: '5. Acceso al Sistema',{nl}"
    f"      shortTitle: 'Acceso',{nl}"
    f"      subtitle: 'Cuenta de usuario y rol',{nl}"
    f"      titleDetail: 'Acceso al Sistema y Credenciales',{nl}"
    f"      descriptionDetail: 'Configura las credenciales de inicio de sesión para el portal médico.',{nl}"
    f"      icon: Key,{nl}"
    f"      isComplete: !crearUsuario || Boolean(password || isEditing),{nl}"
    f"    }},"
)

new_steps = (
    f"    {{{nl}"
    f"      id: 'honorarios',{nl}"
    f"      label: '5. Honorarios & Pagos',{nl}"
    f"      shortTitle: 'Honorarios',{nl}"
    f"      subtitle: 'Comisión y datos de pago',{nl}"
    f"      titleDetail: 'Honorarios Médicos y Cuentas de Liquidación',{nl}"
    f"      descriptionDetail: 'Configura la modalidad de comisión (% o monto fijo) y las cuentas de desembolso para liquidaciones.',{nl}"
    f"      icon: Receipt,{nl}"
    f"      isComplete: Boolean(tipoComision === 'porcentaje' ? porcentajeHonorario > 0 : montoFijoHonorario > 0),{nl}"
    f"      badge: tipoComision === 'porcentaje' ? `${{porcentajeHonorario}}%` : `$${{montoFijoHonorario}}`,{nl}"
    f"    }},{nl}"
    f"    {{{nl}"
    f"      id: 'acceso',{nl}"
    f"      label: '6. Acceso al Sistema',{nl}"
    f"      shortTitle: 'Acceso',{nl}"
    f"      subtitle: 'Cuenta de usuario y rol',{nl}"
    f"      titleDetail: 'Acceso al Sistema y Credenciales',{nl}"
    f"      descriptionDetail: 'Configura las credenciales de inicio de sesión para el portal médico.',{nl}"
    f"      icon: Key,{nl}"
    f"      isComplete: !crearUsuario || Boolean(password || isEditing),{nl}"
    f"    }},"
)
if old_steps in content:
    content = content.replace(old_steps, new_steps)
    print("Updated STEPS array")
else:
    print("WARNING: old_steps not found")

# 8. Update step count in banner
content = content.replace("Paso {currentStepIndex + 1} de 5", "Paso {currentStepIndex + 1} de {STEPS.length}")
content = content.replace("style={{ width: `${((currentStepIndex + 1) / 5) * 100}%` }}", "style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}")
content = content.replace("{Math.round(((currentStepIndex + 1) / 5) * 100)}%", "{Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%")

# 9. Insert tab 5 (honorarios) UI before tab acceso
with open("scratch/tab_honorarios_snippet.txt", "r", encoding="utf-8") as f:
    tab_honorarios_code = f.read()

if crlf:
    tab_honorarios_code = tab_honorarios_code.replace("\n", "\r\n")

target_acceso = "{/* ── PESTAÑA 5: ACCESO AL SISTEMA / USUARIO ─────────────────────── */}"
target_acceso_new = "{/* ── PESTAÑA 6: ACCESO AL SISTEMA / USUARIO ─────────────────────── */}"

if target_acceso in content:
    content = content.replace(target_acceso, tab_honorarios_code + "\n            " + target_acceso_new)
    print("Inserted tab_honorarios_code")
else:
    print("WARNING: target_acceso not found")

path.write_text(content, encoding="utf-8")
print("Done patching DoctorFormModal.tsx")
