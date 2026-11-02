import os

path = r'frontend/src/components/clinica/DocumentosImpresionModal.tsx'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# 1. Imports
target_import = "import { cn } from '../../lib/utils';"
new_imports = """import { cn } from '../../lib/utils';
import { consultasApi } from '../../api/consultas';
import { toast } from 'sonner';
import {
  QrCode,
  Send,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';"""

if target_import in content and 'consultasApi' not in content:
    content = content.replace(target_import, new_imports)

# 2. Add WhatsApp states before const [modalAcompananteOpen
idx_acomp = content.find('const [modalAcompananteOpen, setModalAcompananteOpen]')
if idx_acomp != -1 and 'modalWhatsAppOpen' not in content:
    whatsapp_states = """// Estados para Despacho por WhatsApp
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [textoWhatsAppPersonalizado, setTextoWhatsAppPersonalizado] = useState('');
  const [ultimoResultadoWhatsApp, setUltimoResultadoWhatsApp] = useState<{
    success: boolean;
    message: string;
    destinatario?: string;
    preview_mensaje?: string;
  } | null>(null);

  """
    content = content[:idx_acomp] + whatsapp_states + content[idx_acomp:]

# 3. Update useEffect
target_use_effect = """  React.useEffect(() => {
    if (open) {
      setDocumentoActivo(initialDocumento);
      if (initialDocumento === 'constancia') {
        setTempTieneAcompanante(tieneAcompanante);
        setTempDatosAcompanante(datosAcompanante);
        setModalAcompananteOpen(true);
      }
    }
  }, [open, initialDocumento]);"""

new_use_effect = """  React.useEffect(() => {
    if (open) {
      setDocumentoActivo(initialDocumento);
      if (initialDocumento === 'constancia') {
        setTempTieneAcompanante(tieneAcompanante);
        setTempDatosAcompanante(datosAcompanante);
        setModalAcompananteOpen(true);
      }
      if (consulta) {
        const tel = consulta.paciente?.telefono || consulta.paciente?.telefono_movil || '';
        setTelefonoWhatsApp(tel);
        setUltimoResultadoWhatsApp(null);
      }
    }
  }, [open, initialDocumento, consulta]);"""

if target_use_effect in content:
    content = content.replace(target_use_effect, new_use_effect)

# 4. Add WhatsApp action handlers
target_handlers_pos = content.find('const handleGuardarAcompanante = () => {')
if target_handlers_pos != -1 and 'handleEnviarWhatsApp' not in content:
    handlers_code = """const handleEnviarWhatsApp = async () => {
    if (!consulta) return;
    setEnviandoWhatsApp(true);
    try {
      const res = await consultasApi.enviarDocumentoWhatsApp(consulta.id, {
        tipo_documento: documentoActivo,
        telefono_personalizado: telefonoWhatsApp.trim() || undefined,
        texto_personalizado: textoWhatsAppPersonalizado.trim() || undefined,
        incluir_indicaciones: true,
      });
      setUltimoResultadoWhatsApp(res);
      toast.success(res.message || 'Documento despachado vía WhatsApp con éxito');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'No se pudo enviar el documento por WhatsApp';
      toast.error(msg);
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  const handleAbrirWhatsAppWeb = () => {
    const rawTel = (telefonoWhatsApp || consulta?.paciente?.telefono || '').replace(/[^0-9]/g, '');
    const defaultText = `Estimado(a) paciente ${nombrePaciente}, le hacemos entrega de su documento médico emitido en ${empresaNombre}.`;
    const texto = encodeURIComponent(ultimoResultadoWhatsApp?.preview_mensaje || defaultText);
    const url = rawTel ? `https://api.whatsapp.com/send?phone=${rawTel}&text=${texto}` : `https://api.whatsapp.com/send?text=${texto}`;
    window.open(url, '_blank');
  };

  """
    content = content[:target_handlers_pos] + handlers_code + content[target_handlers_pos:]

# 5. Header Action Buttons: add "Enviar por WhatsApp" button next to "Imprimir Documento"
target_btn = """          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Documento</span>
            </Button>
          </div>"""

new_btn = """          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              onClick={() => {
                const tel = consulta?.paciente?.telefono || consulta?.paciente?.telefono_movil || '';
                setTelefonoWhatsApp(tel);
                setModalWhatsAppOpen(true);
              }}
              variant="outline"
              className="gap-2 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold h-10 px-4 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Enviar por WhatsApp</span>
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Documento</span>
            </Button>
          </div>"""

if target_btn in content:
    content = content.replace(target_btn, new_btn)

# 6. Add QR Code & Sello Digital in footer of printable sheet
target_footer = """            {/* PIE DE PÁGINA: FIRMA Y SELLO MÉDICO */}
            <div className="pt-3 border-t border-zinc-200">
              <div className="grid grid-cols-2 gap-6 items-end">
                {/* Leyenda y Sello institucional */}
                <div className="text-[9px] text-zinc-500 space-y-0.5">
                  <p className="font-bold text-zinc-800 uppercase">{empresaNombre}</p>
                  {empresaDocumento && (
                    <p className="font-mono text-[8.5px] text-zinc-600 font-semibold">{empresaDocumento}</p>
                  )}
                  <p className="font-medium text-zinc-600">{sucursalNombre}</p>
                  <p className="font-mono text-[8.5px] text-zinc-400">Verificación: {consulta.codigo || `CON-${consulta.id}`}</p>
                </div>

                {/* Firma y Sello del Médico */}
                <div className="text-center space-y-0.5">
                  <div className="w-48 mx-auto border-b border-zinc-400 pb-7 mb-0.5" />
                  <p className="font-bold text-[11px] text-zinc-900">{nombreMedico}</p>
                  <p className="text-[10px] text-zinc-600">{especialidadNombre}</p>
                  <p className="text-[9px] text-zinc-500 font-mono">C.M. / Lic: {colegiadoMedico}</p>
                </div>
              </div>
            </div>"""

# Note that because of special characters, let's find the footer by its distinctive code
idx_footer = content.find('{/* Firma y Sello del M')
if idx_footer != -1 and 'QR Autenticidad' not in content:
    # Find the start of that footer container
    idx_start_footer = content.rfind('<div className="pt-3 border-t border-zinc-200">', 0, idx_footer)
    idx_end_footer = content.find('</div>\n          </div>\n        </div>\n      </DialogContent>', idx_footer)
    if idx_start_footer != -1 and idx_end_footer != -1:
        replacement_footer = """<div className="pt-3 border-t border-zinc-200">
              <div className="grid grid-cols-3 gap-3 items-end">
                {/* 1. Leyenda y Sello institucional */}
                <div className="text-[9px] text-zinc-500 space-y-0.5">
                  <p className="font-bold text-zinc-800 uppercase">{empresaNombre}</p>
                  {empresaDocumento && (
                    <p className="font-mono text-[8.5px] text-zinc-600 font-semibold">{empresaDocumento}</p>
                  )}
                  <p className="font-medium text-zinc-600">{sucursalNombre}</p>
                  <p className="font-mono text-[8.5px] text-zinc-400">Verificación: {consulta.codigo || `CON-${consulta.id}`}</p>
                </div>

                {/* 2. Sello Digital y Código QR de Autenticidad */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50/80">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        `DOC:${documentoActivo.toUpperCase()}|ID:${consulta.codigo || consulta.id}|MED:${colegiadoMedico}|PAC:${documentoPaciente}`
                      )}`}
                      alt="QR Autenticidad"
                      className="w-11 h-11 rounded border border-zinc-200 bg-white p-0.5 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="text-[7.5px] leading-tight text-zinc-600 text-left">
                      <span className="font-bold text-emerald-700 flex items-center gap-0.5 uppercase tracking-wider">
                        <ShieldCheck className="h-2.5 w-2.5 inline" /> Certificado
                      </span>
                      <p className="font-mono text-zinc-800 font-semibold mt-0.5">
                        {consulta.codigo || `CON-${consulta.id}`}
                      </p>
                      <p className="text-[7px] text-zinc-400">Firma electrónica y QR facultativo</p>
                    </div>
                  </div>
                </div>

                {/* 3. Firma y Sello del Médico */}
                <div className="text-center space-y-0.5">
                  <div className="w-40 mx-auto border-b border-zinc-400 pb-6 mb-0.5" />
                  <p className="font-bold text-[10.5px] text-zinc-900">{nombreMedico}</p>
                  <p className="text-[9.5px] text-zinc-600">{especialidadNombre}</p>
                  <p className="text-[8.5px] text-zinc-500 font-mono">C.M. / Lic: {colegiadoMedico}</p>
                </div>
              </div>
            </div>"""
        content = content[:idx_start_footer] + replacement_footer + content[idx_end_footer:]

# 7. Add WhatsApp Dialog at the bottom (before the last </Dialog>)
whatsapp_modal_code = """

      {/* MODAL DE DESPACHO DIRECTO DE WHATSAPP */}
      <Dialog open={modalWhatsAppOpen} onOpenChange={setModalWhatsAppOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-emerald-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Despachar Documento por WhatsApp
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Envío formal al paciente con formato institucional y validación facultativa
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Documento a enviar: <span className="font-bold">{documentosList.find(d => d.id === documentoActivo)?.label}</span>
              </p>
              <p>
                Paciente: <strong className="text-foreground">{nombrePaciente}</strong> | Cédula: {tipoDoc} {documentoPaciente}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Número de WhatsApp de Destino (con código de país)
              </label>
              <input
                type="text"
                placeholder="Ej. +58 412 1234567 o 0414..."
                value={telefonoWhatsApp}
                onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-muted-foreground">
                Si el número es nacional (ej. 0412...), el sistema aplicará automáticamente el código país por defecto (+58).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nota o Mensaje Adicional (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Recuerde tomar abundante agua y guardar reposo estricto..."
                value={textoWhatsAppPersonalizado}
                onChange={(e) => setTextoWhatsAppPersonalizado(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {ultimoResultadoWhatsApp && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-2 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{ultimoResultadoWhatsApp.message}</span>
                </div>
                {ultimoResultadoWhatsApp.destinatario && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Enviado a: +{ultimoResultadoWhatsApp.destinatario}
                  </p>
                )}
                {ultimoResultadoWhatsApp.preview_mensaje && (
                  <div className="p-2 rounded bg-background/80 border text-[10.5px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {ultimoResultadoWhatsApp.preview_mensaje}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAbrirWhatsAppWeb}
              className="gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer w-full sm:w-auto"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir WhatsApp Web</span>
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalWhatsAppOpen(false)}
                className="cursor-pointer"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleEnviarWhatsApp}
                disabled={enviandoWhatsApp || !telefonoWhatsApp.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {enviandoWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Despachando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Enviar Directo</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""

if 'modalWhatsAppOpen' in content and 'Despachar Documento por WhatsApp' not in content:
    # insert before the very last `</Dialog>`
    last_dialog_idx = content.rfind('</Dialog>')
    if last_dialog_idx != -1:
        content = content[:last_dialog_idx] + whatsapp_modal_code + '\n    ' + content[last_dialog_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('DocumentosImpresionModal.tsx updated completely!')

