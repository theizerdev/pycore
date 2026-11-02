with open('frontend/src/pages/clinica/EstudiosPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
target_imports = """import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';"""

new_imports = """import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';"""

if target_imports in text:
    text = text.replace(target_imports, new_imports)
elif target_imports.replace('\n', '\r\n') in text:
    text = text.replace(target_imports.replace('\n', '\r\n'), new_imports.replace('\n', '\r\n'))

# 2. Update filter select
target_filter = """          {/* Selector Estado Análisis */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Filter className="size-3.5" />
              <span>Estado:</span>
            </span>
            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="todos">Todos los Estados</option>
              <option value="analizado_alterado">⚠️ Con Valores Alterados</option>
              <option value="analizado_normal">✅ Analizado Normal</option>
              <option value="pendiente">⏳ Pendiente de Análisis</option>
              <option value="revisado_medico">👨‍⚕️ Revisado por Médico</option>
            </select>
          </div>"""

new_filter = """          {/* Selector Estado Análisis */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Filter className="size-3.5" />
              <span>Estado:</span>
            </Label>
            <Select
              value={estadoFiltro}
              onValueChange={(val) => {
                setEstadoFiltro(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[195px] h-9 text-xs rounded-xl font-medium">
                <SelectValue placeholder="Todos los Estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Estados</SelectItem>
                <SelectItem value="analizado_alterado">⚠️ Con Valores Alterados</SelectItem>
                <SelectItem value="analizado_normal">✅ Analizado Normal</SelectItem>
                <SelectItem value="pendiente">⏳ Pendiente de Análisis</SelectItem>
                <SelectItem value="revisado_medico">👨‍⚕️ Revisado por Médico</SelectItem>
              </SelectContent>
            </Select>
          </div>"""

if target_filter in text:
    text = text.replace(target_filter, new_filter)
elif target_filter.replace('\n', '\r\n') in text:
    text = text.replace(target_filter.replace('\n', '\r\n'), new_filter.replace('\n', '\r\n'))

# 3. Update category select and labels in upload modal
target_modal = """            {/* Categoría y Subtipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Categoría *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium"
                >
                  <option value="laboratorio">🔬 Laboratorio Clínico</option>
                  <option value="imagenologia">🩻 Imagenología / Ecografía</option>
                  <option value="informe">📄 Informe Médico / Biopsia</option>
                  <option value="otro">📎 Otro Estudio</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subtipo / Especialidad</label>
                <Input
                  type="text"
                  placeholder="Ej. Hematología, Perfil Lipídico, Rx Tórax..."
                  value={subtipo}
                  onChange={(e) => setSubtipo(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>"""

new_modal = """            {/* Categoría y Subtipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Categoría *</Label>
                <Select
                  value={categoria}
                  onValueChange={(val: any) => setCategoria(val)}
                >
                  <SelectTrigger className="w-full text-xs h-9 rounded-xl font-medium">
                    <SelectValue placeholder="Seleccione categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratorio">🔬 Laboratorio Clínico</SelectItem>
                    <SelectItem value="imagenologia">🩻 Imagenología / Ecografía</SelectItem>
                    <SelectItem value="informe">📄 Informe Médico / Biopsia</SelectItem>
                    <SelectItem value="otro">📎 Otro Estudio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Subtipo / Especialidad</Label>
                <Input
                  type="text"
                  placeholder="Ej. Hematología, Perfil Lipídico, Rx Tórax..."
                  value={subtipo}
                  onChange={(e) => setSubtipo(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>"""

if target_modal in text:
    text = text.replace(target_modal, new_modal)
elif target_modal.replace('\n', '\r\n') in text:
    text = text.replace(target_modal.replace('\n', '\r\n'), new_modal.replace('\n', '\r\n'))

# 4. Update other labels and textarea in upload modal
target_labels = """            {/* Título y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Título del Estudio *</label>
                <Input
                  type="text"
                  placeholder="Ej. Perfil 20 y Química Sanguínea"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-xs h-9 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Fecha Realización *</label>
                <Input
                  type="date"
                  value={fechaEstudio}
                  onChange={(e) => setFechaEstudio(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Subida de Archivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Archivo Adjunto (PDF o Imagen) *</label>"""

new_labels = """            {/* Título y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Título del Estudio *</Label>
                <Input
                  type="text"
                  placeholder="Ej. Perfil 20 y Química Sanguínea"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-xs h-9 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Fecha Realización *</Label>
                <Input
                  type="date"
                  value={fechaEstudio}
                  onChange={(e) => setFechaEstudio(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Subida de Archivo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Archivo Adjunto (PDF o Imagen) *</Label>"""

if target_labels in text:
    text = text.replace(target_labels, new_labels)
elif target_labels.replace('\n', '\r\n') in text:
    text = text.replace(target_labels.replace('\n', '\r\n'), new_labels.replace('\n', '\r\n'))

target_textarea = """            {/* Notas Médicas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Notas / Observaciones Clínicas</label>
              <textarea
                rows={2}
                placeholder="Observaciones de la muestra, laboratorio externo emisor, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>"""

new_textarea = """            {/* Notas Médicas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Notas / Observaciones Clínicas</Label>
              <Textarea
                rows={2}
                placeholder="Observaciones de la muestra, laboratorio externo emisor, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="text-xs rounded-xl min-h-[64px]"
              />
            </div>"""

if target_textarea in text:
    text = text.replace(target_textarea, new_textarea)
elif target_textarea.replace('\n', '\r\n') in text:
    text = text.replace(target_textarea.replace('\n', '\r\n'), new_textarea.replace('\n', '\r\n'))

# Also patient label
target_pac_label = '<label className="text-xs font-semibold text-foreground">Paciente *</label>'
new_pac_label = '<Label className="text-xs font-semibold text-foreground">Paciente *</Label>'
if target_pac_label in text:
    text = text.replace(target_pac_label, new_pac_label)

with open('frontend/src/pages/clinica/EstudiosPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("EstudiosPage.tsx updated with shadcn/ui components!")

