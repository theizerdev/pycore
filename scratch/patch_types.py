from pathlib import Path

path = Path("frontend/src/types/index.ts")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Medico interface
old_medico = f"  biografia?: string | null;{nl}  activo: boolean;"
new_medico = (
    f"  biografia?: string | null;{nl}"
    f"  tipo_comision?: 'porcentaje' | 'fijo';{nl}"
    f"  porcentaje_honorario?: number;{nl}"
    f"  monto_fijo_honorario?: number;{nl}"
    f"  datos_bancarios?: Record<string, any>;{nl}"
    f"  activo: boolean;"
)
if old_medico in content:
    content = content.replace(old_medico, new_medico)
    print("Updated Medico interface")
else:
    print("WARNING: old_medico not found")

# 2. MedicoCreateInput
old_create = f"  biografia?: string | null;{nl}  activo?: boolean;{nl}  crear_usuario?: boolean;"
new_create = (
    f"  biografia?: string | null;{nl}"
    f"  tipo_comision?: 'porcentaje' | 'fijo';{nl}"
    f"  porcentaje_honorario?: number;{nl}"
    f"  monto_fijo_honorario?: number;{nl}"
    f"  datos_bancarios?: Record<string, any>;{nl}"
    f"  activo?: boolean;{nl}"
    f"  crear_usuario?: boolean;"
)
if old_create in content:
    content = content.replace(old_create, new_create)
    print("Updated MedicoCreateInput interface")
else:
    print("WARNING: old_create not found")

# 3. MedicoUpdateInput
old_update = f"  biografia?: string | null;{nl}  activo?: boolean;{nl}  password?: string | null;"
new_update = (
    f"  biografia?: string | null;{nl}"
    f"  tipo_comision?: 'porcentaje' | 'fijo';{nl}"
    f"  porcentaje_honorario?: number;{nl}"
    f"  monto_fijo_honorario?: number;{nl}"
    f"  datos_bancarios?: Record<string, any>;{nl}"
    f"  activo?: boolean;{nl}"
    f"  password?: string | null;"
)
if old_update in content:
    content = content.replace(old_update, new_update)
    print("Updated MedicoUpdateInput interface")
else:
    print("WARNING: old_update not found")

path.write_text(content, encoding="utf-8")
print("Done patching frontend/src/types/index.ts")

