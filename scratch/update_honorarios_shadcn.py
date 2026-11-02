with open('frontend/src/pages/facturacion/HonorariosMedicosPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
target_imports = """import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';"""

new_imports = """import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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

# 2. Doctor selector
target_med_select = """                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4 text-teal-600" />
                  Especialista Médico a Liquidar <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMedicoId || ''}
                  onChange={(e) => setSelectedMedicoId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500"
                >
                  <option value="" disabled>
                    Seleccione un especialista...
                  </option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      Dr(a). {m.nombres} {m.apellidos} - {m.especialidad_nombre || 'Especialista'}
                    </option>
                  ))}
                </select>"""

new_med_select = """                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4 text-teal-600" />
                  Especialista Médico a Liquidar <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedMedicoId ? String(selectedMedicoId) : ''}
                  onValueChange={(val) => setSelectedMedicoId(Number(val) || null)}
                >
                  <SelectTrigger className="w-full text-xs font-semibold h-9 rounded-xl">
                    <SelectValue placeholder="Seleccione un especialista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        Dr(a). {m.nombres} {m.apellidos} - {m.especialidad_nombre || 'Especialista'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>"""

if target_med_select in text:
    text = text.replace(target_med_select, new_med_select)
elif target_med_select.replace('\n', '\r\n') in text:
    text = text.replace(target_med_select.replace('\n', '\r\n'), new_med_select.replace('\n', '\r\n'))

# 3. Date inputs
target_dates = """              {/* Rango de Fechas */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-teal-500"
                />
              </div>"""

new_dates = """              {/* Rango de Fechas */}
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Desde
                </Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full text-xs h-9 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Hasta
                </Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full text-xs h-9 rounded-xl"
                />
              </div>"""

if target_dates in text:
    text = text.replace(target_dates, new_dates)
elif target_dates.replace('\n', '\r\n') in text:
    text = text.replace(target_dates.replace('\n', '\r\n'), new_dates.replace('\n', '\r\n'))

# 4. Filter state in Historial
target_hist_filter = """              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  fetchHistorial();
                }}
                className="px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground"
              >
                <option value="">Todos los Estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="anulado">Anulado</option>
              </select>"""

new_hist_filter = """              <Select
                value={filtroEstado || 'todos'}
                onValueChange={(val) => {
                  setFiltroEstado(val === 'todos' ? '' : val);
                  fetchHistorial();
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Todos los Estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>"""

if target_hist_filter in text:
    text = text.replace(target_hist_filter, new_hist_filter)
elif target_hist_filter.replace('\n', '\r\n') in text:
    text = text.replace(target_hist_filter.replace('\n', '\r\n'), new_hist_filter.replace('\n', '\r\n'))

# 5. Method in modalLiquidarOpen
target_liq_metodo = """                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Método de Pago</label>
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
                      >
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="pago_movil">Pago Móvil</option>
                        <option value="zelle">Zelle</option>
                        <option value="efectivo_usd">Efectivo USD</option>
                        <option value="efectivo_ves">Efectivo VES</option>
                      </select>
                    </div>"""

new_liq_metodo = """                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Método de Pago</Label>
                      <Select
                        value={metodoPago}
                        onValueChange={(val) => setMetodoPago(val)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs rounded-lg">
                          <SelectValue placeholder="Método de Pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                          <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                          <SelectItem value="efectivo_ves">Efectivo VES</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>"""

if target_liq_metodo in text:
    text = text.replace(target_liq_metodo, new_liq_metodo)
elif target_liq_metodo.replace('\n', '\r\n') in text:
    text = text.replace(target_liq_metodo.replace('\n', '\r\n'), new_liq_metodo.replace('\n', '\r\n'))

# 6. Textarea in modalLiquidarOpen
target_liq_notes = """            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Notas u Observaciones</label>
              <textarea
                rows={2}
                placeholder="Observaciones de la liquidación..."
                value={notasLiquidacion}
                onChange={(e) => setNotasLiquidacion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>"""

new_liq_notes = """            <div className="space-y-1">
              <Label className="font-semibold text-muted-foreground">Notas u Observaciones</Label>
              <Textarea
                rows={2}
                placeholder="Observaciones de la liquidación..."
                value={notasLiquidacion}
                onChange={(e) => setNotasLiquidacion(e.target.value)}
                className="w-full text-xs rounded-lg min-h-[60px]"
              />
            </div>"""

if target_liq_notes in text:
    text = text.replace(target_liq_notes, new_liq_notes)
elif target_liq_notes.replace('\n', '\r\n') in text:
    text = text.replace(target_liq_notes.replace('\n', '\r\n'), new_liq_notes.replace('\n', '\r\n'))

# 7. Modal pagar from historial
target_pagar_modal = """            <div className="space-y-1">
              <label className="font-bold text-foreground">Forma de Pago Empleada</label>
              <select
                value={pagoMetodo}
                onChange={(e) => setPagoMetodo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="pago_movil">Pago Móvil</option>
                <option value="zelle">Zelle</option>
                <option value="efectivo_usd">Efectivo USD</option>
                <option value="efectivo_ves">Efectivo VES</option>
              </select>
            </div>"""

new_pagar_modal = """            <div className="space-y-1">
              <Label className="font-bold text-foreground">Forma de Pago Empleada</Label>
              <Select
                value={pagoMetodo}
                onValueChange={(val) => setPagoMetodo(val)}
              >
                <SelectTrigger className="w-full h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Forma de Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                  <SelectItem value="efectivo_ves">Efectivo VES</SelectItem>
                </SelectContent>
              </Select>
            </div>"""

if target_pagar_modal in text:
    text = text.replace(target_pagar_modal, new_pagar_modal)
elif target_pagar_modal.replace('\n', '\r\n') in text:
    text = text.replace(target_pagar_modal.replace('\n', '\r\n'), new_pagar_modal.replace('\n', '\r\n'))

# 8. Textarea in modalPagarOpen
target_pagar_notes = """            <div className="space-y-1">
              <label className="font-bold text-foreground">Notas Contables</label>
              <textarea
                rows={2}
                placeholder="Detalle o notas adicionales del pago..."
                value={pagoNotas}
                onChange={(e) => setPagoNotas(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>"""

new_pagar_notes = """            <div className="space-y-1">
              <Label className="font-bold text-foreground">Notas Contables</Label>
              <Textarea
                rows={2}
                placeholder="Detalle o notas adicionales del pago..."
                value={pagoNotas}
                onChange={(e) => setPagoNotas(e.target.value)}
                className="w-full text-xs rounded-lg min-h-[60px]"
              />
            </div>"""

if target_pagar_notes in text:
    text = text.replace(target_pagar_notes, new_pagar_notes)
elif target_pagar_notes.replace('\n', '\r\n') in text:
    text = text.replace(target_pagar_notes.replace('\n', '\r\n'), new_pagar_notes.replace('\n', '\r\n'))

with open('frontend/src/pages/facturacion/HonorariosMedicosPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("HonorariosMedicosPage.tsx updated with shadcn/ui components!")

