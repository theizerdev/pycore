from pathlib import Path

path = Path("backend/app/api/v1/medicos.py")
content = path.read_text(encoding="utf-8")

# 1. Add Decimal import
if "from decimal import Decimal" not in content:
    content = content.replace("from datetime import datetime\n", "from datetime import datetime\nfrom decimal import Decimal\n")

# 2. Update _format_medico_response
old_format = """        sucursal_nombre=m.sucursal_defecto.nombre if m.sucursal_defecto else None,
        usuario_activo=m.usuario.activo if m.usuario else None
    )"""

new_format = """        sucursal_nombre=m.sucursal_defecto.nombre if m.sucursal_defecto else None,
        usuario_activo=m.usuario.activo if m.usuario else None,
        tipo_comision=m.tipo_comision or "porcentaje",
        porcentaje_honorario=float(m.porcentaje_honorario if m.porcentaje_honorario is not None else 70.00),
        monto_fijo_honorario=float(m.monto_fijo_honorario if m.monto_fijo_honorario is not None else 0.00),
        datos_bancarios=m.datos_bancarios or {},
    )"""

if old_format in content:
    content = content.replace(old_format, new_format)
    print("Replaced _format_medico_response successfully")
else:
    # Try with CRLF
    old_format_crlf = old_format.replace("\n", "\r\n")
    new_format_crlf = new_format.replace("\n", "\r\n")
    if old_format_crlf in content:
        content = content.replace(old_format_crlf, new_format_crlf)
        print("Replaced _format_medico_response (CRLF) successfully")
    else:
        print("WARNING: old_format not found")

# 3. Update create_medico
old_create = """        subespecialidades=subesp_dicts,
        sucursales_ids=req.sucursales_ids,
        horario_atencion=req.horario_atencion if req.horario_atencion is not None else {},
        activo=req.activo
    )"""

new_create = """        subespecialidades=subesp_dicts,
        sucursales_ids=req.sucursales_ids,
        horario_atencion=req.horario_atencion if req.horario_atencion is not None else {},
        tipo_comision=req.tipo_comision or "porcentaje",
        porcentaje_honorario=Decimal(str(req.porcentaje_honorario if req.porcentaje_honorario is not None else 70.00)),
        monto_fijo_honorario=Decimal(str(req.monto_fijo_honorario if req.monto_fijo_honorario is not None else 0.00)),
        datos_bancarios=req.datos_bancarios or {},
        activo=req.activo
    )"""

if old_create in content:
    content = content.replace(old_create, new_create)
    print("Replaced create_medico successfully")
else:
    old_create_crlf = old_create.replace("\n", "\r\n")
    new_create_crlf = new_create.replace("\n", "\r\n")
    if old_create_crlf in content:
        content = content.replace(old_create_crlf, new_create_crlf)
        print("Replaced create_medico (CRLF) successfully")
    else:
        print("WARNING: old_create not found")

# 4. Update update_medico
old_update = """    if req.horario_atencion is not None:
        medico.horario_atencion = req.horario_atencion"""

new_update = """    if req.horario_atencion is not None:
        medico.horario_atencion = req.horario_atencion
    if req.tipo_comision is not None:
        medico.tipo_comision = req.tipo_comision
    if req.porcentaje_honorario is not None:
        medico.porcentaje_honorario = Decimal(str(req.porcentaje_honorario))
    if req.monto_fijo_honorario is not None:
        medico.monto_fijo_honorario = Decimal(str(req.monto_fijo_honorario))
    if req.datos_bancarios is not None:
        medico.datos_bancarios = req.datos_bancarios"""

if old_update in content:
    content = content.replace(old_update, new_update)
    print("Replaced update_medico successfully")
else:
    old_update_crlf = old_update.replace("\n", "\r\n")
    new_update_crlf = new_update.replace("\n", "\r\n")
    if old_update_crlf in content:
        content = content.replace(old_update_crlf, new_update_crlf)
        print("Replaced update_medico (CRLF) successfully")
    else:
        print("WARNING: old_update not found")

path.write_text(content, encoding="utf-8")
print("Done patching medicos.py")

