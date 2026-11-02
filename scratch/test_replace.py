with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('Total lines:', len(lines))
# Replace line 1277 (index 1276)
print('Line 1276:', repr(lines[1276]))
lines[1276] = '            </div>\n'

with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Line 1277 replaced. Now testing build...')

