from pathlib import Path

path = Path("frontend/src/pages/clinica/DoctorFormModal.tsx")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

# 1. Add DoctorTab type before DoctorFormModal
old_comp = "export const DoctorFormModal: React.FC<DoctorFormModalProps> = ({"
new_comp = (
    "export type DoctorTab = 'personal' | 'especialidad' | 'subespecialidades' | 'horario' | 'honorarios' | 'acceso';\n\n"
    "export const DoctorFormModal: React.FC<DoctorFormModalProps> = ({"
)
if crlf:
    new_comp = new_comp.replace("\n", "\r\n")

if old_comp in content:
    content = content.replace(old_comp, new_comp)
    print("Added DoctorTab before DoctorFormModal")

# 2. Update useState type
old_state = "const [activeTab, setActiveTab] = useState<'personal' | 'especialidad' | 'subespecialidades' | 'horario' | 'acceso'>('personal');"
new_state = "const [activeTab, setActiveTab] = useState<DoctorTab>('personal');"

if old_state in content:
    content = content.replace(old_state, new_state)
    print("Updated activeTab useState to use DoctorTab")
else:
    print("WARNING: old_state not found")

# 3. Remove duplicate type DoctorTab down below
dup_type = f"type DoctorTab = 'personal' | 'especialidad' | 'subespecialidades' | 'horario' | 'honorarios' | 'acceso';{nl}"
if dup_type in content:
    content = content.replace(dup_type, "")
    print("Removed duplicate DoctorTab declaration")

path.write_text(content, encoding="utf-8")
print("Done fixing activeTab type")

