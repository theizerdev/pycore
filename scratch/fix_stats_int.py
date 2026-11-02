with open('backend/app/api/v1/estudios.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    stats = {
        "total": getattr(stats_row, "total", 0) or 0,
        "laboratorio": getattr(stats_row, "laboratorio", 0) or 0,
        "imagenologia": getattr(stats_row, "imagenologia", 0) or 0,
        "con_alertas": getattr(stats_row, "con_alertas", 0) or 0,
        "pendientes": getattr(stats_row, "pendientes", 0) or 0,
        "revisados": getattr(stats_row, "revisados", 0) or 0,
    }'''

replacement = '''    stats = {
        "total": int(getattr(stats_row, "total", 0) or 0),
        "laboratorio": int(getattr(stats_row, "laboratorio", 0) or 0),
        "imagenologia": int(getattr(stats_row, "imagenologia", 0) or 0),
        "con_alertas": int(getattr(stats_row, "con_alertas", 0) or 0),
        "pendientes": int(getattr(stats_row, "pendientes", 0) or 0),
        "revisados": int(getattr(stats_row, "revisados", 0) or 0),
    }'''

if target in text:
    text = text.replace(target, replacement)
elif target.replace('\n', '\r\n') in text:
    text = text.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))

with open('backend/app/api/v1/estudios.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("stats cast to int in estudios.py")

