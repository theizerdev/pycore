with open('backend/app/api/v1/estudios.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    stats_query = select(
        func.count(EstudioAdjunto.id).label("total"),
        func.count().filter(EstudioAdjunto.categoria == "laboratorio").label("laboratorio"),
        func.count().filter(EstudioAdjunto.categoria == "imagenologia").label("imagenologia"),
        func.count().filter(EstudioAdjunto.estado_analisis == "analizado_alterado").label("con_alertas"),
        func.count().filter(EstudioAdjunto.estado_analisis == "pendiente").label("pendientes"),
        func.count().filter(EstudioAdjunto.estado_analisis == "revisado_medico").label("revisados"),
    ).where(EstudioAdjunto.empresa_id == current_user.empresa_id)'''

replacement = '''    stats_query = select(
        func.count(EstudioAdjunto.id).label("total"),
        func.sum(func.case((EstudioAdjunto.categoria == "laboratorio", 1), else_=0)).label("laboratorio"),
        func.sum(func.case((EstudioAdjunto.categoria == "imagenologia", 1), else_=0)).label("imagenologia"),
        func.sum(func.case((EstudioAdjunto.estado_analisis == "analizado_alterado", 1), else_=0)).label("con_alertas"),
        func.sum(func.case((EstudioAdjunto.estado_analisis == "pendiente", 1), else_=0)).label("pendientes"),
        func.sum(func.case((EstudioAdjunto.estado_analisis == "revisado_medico", 1), else_=0)).label("revisados"),
    ).where(EstudioAdjunto.empresa_id == current_user.empresa_id)'''

if target in text:
    text = text.replace(target, replacement)
elif target.replace('\n', '\r\n') in text:
    text = text.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))

with open('backend/app/api/v1/estudios.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated stats_query in estudios.py")

