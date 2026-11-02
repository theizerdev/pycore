from pathlib import Path

path = Path("frontend/src/pages/clinica/DoctorFormModal.tsx")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

target = f"export {nl}export const DoctorFormModal"
replacement = f"export type DoctorTab = 'personal' | 'especialidad' | 'subespecialidades' | 'horario' | 'honorarios' | 'acceso';{nl}{nl}export const DoctorFormModal"

if target in content:
    content = content.replace(target, replacement)
    print("Replaced successfully")
else:
    # Try without crlf
    target_simple = "export \nexport const DoctorFormModal"
    if target_simple in content:
        content = content.replace(target_simple, replacement)
        print("Replaced simple successfully")
    else:
        print("WARNING: target not found")

path.write_text(content, encoding="utf-8")
print("Done")

