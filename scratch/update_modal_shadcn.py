with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target_imports = """import { Button } from '../ui/button';
import { Badge } from '../ui/badge';"""

new_imports = """import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';"""

if target_imports in text:
    text = text.replace(target_imports, new_imports)
elif target_imports.replace('\n', '\r\n') in text:
    text = text.replace(target_imports.replace('\n', '\r\n'), new_imports.replace('\n', '\r\n'))

# Replace parentesco select
target_parentesco = """                    <select
                      value={tempDatosAcompanante.parentesco}
                      onChange={(e) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, parentesco: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="Madre">Madre</option>
                      <option value="Padre">Padre</option>
                      <option value="Cónyuge / Esposo(a)">Cónyuge / Esposo(a)</option>
                      <option value="Hijo / Hija">Hijo / Hija</option>
                      <option value="Hermano / Hermana">Hermano / Hermana</option>
                      <option value="Tutor / Representante Legal">Tutor / Representante Legal</option>
                      <option value="Abuelo / Abuela">Abuelo / Abuela</option>
                      <option value="Tío / Tía">Tío / Tía</option>
                      <option value="Familiar">Familiar</option>
                      <option value="Acompañante">Acompañante</option>
                      <option value="Otro">Otro (Especificar)</option>
                    </select>"""

new_parentesco = """                    <Select
                      value={tempDatosAcompanante.parentesco}
                      onValueChange={(val) =>
                        setTempDatosAcompanante({ ...tempDatosAcompanante, parentesco: val })
                      }
                    >
                      <SelectTrigger className="w-full text-xs h-9 rounded-lg">
                        <SelectValue placeholder="Seleccione parentesco..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Madre">Madre</SelectItem>
                        <SelectItem value="Padre">Padre</SelectItem>
                        <SelectItem value="Cónyuge / Esposo(a)">Cónyuge / Esposo(a)</SelectItem>
                        <SelectItem value="Hijo / Hija">Hijo / Hija</SelectItem>
                        <SelectItem value="Hermano / Hermana">Hermano / Hermana</SelectItem>
                        <SelectItem value="Tutor / Representante Legal">Tutor / Representante Legal</SelectItem>
                        <SelectItem value="Abuelo / Abuela">Abuelo / Abuela</SelectItem>
                        <SelectItem value="Tío / Tía">Tío / Tía</SelectItem>
                        <SelectItem value="Familiar">Familiar</SelectItem>
                        <SelectItem value="Acompañante">Acompañante</SelectItem>
                        <SelectItem value="Otro">Otro (Especificar)</SelectItem>
                      </SelectContent>
                    </Select>"""

if target_parentesco in text:
    text = text.replace(target_parentesco, new_parentesco)
elif target_parentesco.replace('\n', '\r\n') in text:
    text = text.replace(target_parentesco.replace('\n', '\r\n'), new_parentesco.replace('\n', '\r\n'))

# Replace textarea in WhatsApp modal
target_ws_textarea = """              <textarea
                rows={2}
                placeholder="Ej. Recuerde tomar abundante agua y guardar reposo estricto..."
                value={textoWhatsAppPersonalizado}
                onChange={(e) => setTextoWhatsAppPersonalizado(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />"""

new_ws_textarea = """              <Textarea
                rows={2}
                placeholder="Ej. Recuerde tomar abundante agua y guardar reposo estricto..."
                value={textoWhatsAppPersonalizado}
                onChange={(e) => setTextoWhatsAppPersonalizado(e.target.value)}
                className="w-full text-xs rounded-lg min-h-[58px]"
              />"""

if target_ws_textarea in text:
    text = text.replace(target_ws_textarea, new_ws_textarea)
elif target_ws_textarea.replace('\n', '\r\n') in text:
    text = text.replace(target_ws_textarea.replace('\n', '\r\n'), new_ws_textarea.replace('\n', '\r\n'))

with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("DocumentosImpresionModal.tsx updated with shadcn components!")

