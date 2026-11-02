# 1. Update backend/app/api/v1/estudios.py
with open('backend/app/api/v1/estudios.py', 'r', encoding='utf-8') as f:
    text_est = f.read()

text_est = text_est.replace(
    'from sqlalchemy import select, or_, and_, desc, func',
    'from sqlalchemy import select, or_, and_, desc, func, case'
)

text_est = text_est.replace(
    'func.sum(func.case((EstudioAdjunto.categoria == "laboratorio", 1), else_=0))',
    'func.sum(case((EstudioAdjunto.categoria == "laboratorio", 1), else_=0))'
).replace(
    'func.sum(func.case((EstudioAdjunto.categoria == "imagenologia", 1), else_=0))',
    'func.sum(case((EstudioAdjunto.categoria == "imagenologia", 1), else_=0))'
).replace(
    'func.sum(func.case((EstudioAdjunto.estado_analisis == "analizado_alterado", 1), else_=0))',
    'func.sum(case((EstudioAdjunto.estado_analisis == "analizado_alterado", 1), else_=0))'
).replace(
    'func.sum(func.case((EstudioAdjunto.estado_analisis == "pendiente", 1), else_=0))',
    'func.sum(case((EstudioAdjunto.estado_analisis == "pendiente", 1), else_=0))'
).replace(
    'func.sum(func.case((EstudioAdjunto.estado_analisis == "revisado_medico", 1), else_=0))',
    'func.sum(case((EstudioAdjunto.estado_analisis == "revisado_medico", 1), else_=0))'
)

with open('backend/app/api/v1/estudios.py', 'w', encoding='utf-8') as f:
    f.write(text_est)
print("Updated estudios.py with case")

# 2. Update backend/app/api/v1/honorarios.py
with open('backend/app/api/v1/honorarios.py', 'r', encoding='utf-8') as f:
    text_hon = f.read()

text_hon = text_hon.replace(
    'from sqlalchemy import select, func, and_, or_, desc, update',
    'from sqlalchemy import select, func, and_, or_, desc, update, case'
)

text_hon = text_hon.replace('func.case((', 'case((')

with open('backend/app/api/v1/honorarios.py', 'w', encoding='utf-8') as f:
    f.write(text_hon)
print("Updated honorarios.py with case")

