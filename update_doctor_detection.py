files_to_update = [
    'frontend/src/pages/clinica/AgendaCalendarioPage.tsx',
    'frontend/src/pages/clinica/CitaFormModal.tsx',
    'frontend/src/pages/clinica/ConsultasPage.tsx',
    'frontend/src/pages/administracion/ServiciosPage.tsx',
]

target = "const isDoctorUser = Boolean(user?.rol?.slug === 'medico');"
replacement = "const isDoctorUser = Boolean(user?.rol?.slug === 'medico' || user?.empresa?.tipo_entidad === 'medico_independiente');"

for file_path in files_to_update:
    with open(file_path, 'r', encoding='utf-8') as f:
        c = f.read().replace('\r\n', '\n')
    if target in c:
        c = c.replace(target, replacement, 1)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"SUCCESS: {file_path}")
    else:
        print(f"NOT FOUND: {file_path}")

# Update role label in AdminHeader.tsx
with open('frontend/src/components/layout/AdminHeader.tsx', 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

h_target = "{user?.es_superadmin ? 'Superadmin' : user?.rol?.nombre || 'Personal'}"
h_replacement = "{user?.es_superadmin ? 'Superadmin' : user?.empresa?.tipo_entidad === 'medico_independiente' ? 'Médico Especialista' : user?.rol?.nombre || 'Personal'}"
if h_target in c:
    c = c.replace(h_target, h_replacement, 1)
    with open('frontend/src/components/layout/AdminHeader.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("SUCCESS: AdminHeader.tsx")
else:
    print("NOT FOUND: AdminHeader.tsx")

# Update role label in AdminSidebar.tsx
with open('frontend/src/components/layout/AdminSidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

s_target = "{user?.es_superadmin ? 'Superadmin' : user?.rol?.nombre || user?.email}"
s_replacement = "{user?.es_superadmin ? 'Superadmin' : user?.empresa?.tipo_entidad === 'medico_independiente' ? 'Médico Especialista' : user?.rol?.nombre || user?.email}"
if s_target in c:
    c = c.replace(s_target, s_replacement, 1)
    with open('frontend/src/components/layout/AdminSidebar.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("SUCCESS: AdminSidebar.tsx")
else:
    print("NOT FOUND: AdminSidebar.tsx")

