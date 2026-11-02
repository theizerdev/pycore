with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

lines = text.splitlines()
for idx, l in enumerate(lines):
    if '</div></div>' in l:
        print(f'Line {idx+1}: {l}')

