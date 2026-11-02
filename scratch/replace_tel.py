with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('consulta.paciente?.telefono_movil', 'consulta.paciente?.telefono')
text = text.replace('consulta?.paciente?.telefono_movil', 'consulta?.paciente?.telefono')

with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Replaced successfully')

