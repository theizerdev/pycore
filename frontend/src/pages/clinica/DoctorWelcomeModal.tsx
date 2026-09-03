import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { medicosApi } from '../../api/medicos';
import type { Medico, EnviarBienvenidaResponse } from '../../types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { getCountryFlagEmoji } from '../../context/RegionalContext';
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Key,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface DoctorWelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medico: Medico | null;
  onSent?: () => void;
}

export const formatCleanWhatsAppNumber = (phone: string, countryCode: string = '58'): string => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '').trim();
  if (!clean) return '';
  const cleanCc = countryCode.replace(/[^0-9]/g, '') || '58';

  // Si empieza con 0 (ej: 0424...), quitarlo
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }

  // Si viene con el prefijo país seguido de un 0 (ej: 580424...)
  if (cleanCc && clean.startsWith(`${cleanCc}0`)) {
    clean = cleanCc + clean.substring(cleanCc.length + 1);
  }

  // Si es Venezuela (58)
  if (cleanCc === '58' || clean.startsWith('58')) {
    if (!clean.startsWith('58')) {
      clean = '58' + clean;
    }
    if (clean.startsWith('580')) {
      clean = '58' + clean.substring(3);
    }
    return clean;
  }

  // Si es México (52)
  if (cleanCc === '52' || clean.startsWith('52')) {
    if (clean.startsWith('520')) {
      clean = '52' + clean.substring(3);
    }
    if (clean.startsWith('521') && clean.length === 13) {
      return clean;
    }
    if (clean.startsWith('52') && clean.length === 12) {
      return '521' + clean.substring(2);
    }
    if (clean.length === 10) {
      return '521' + clean;
    }
    return clean;
  }

  // Otros países
  if (cleanCc && !clean.startsWith(cleanCc)) {
    clean = cleanCc + clean;
  }

  return clean;
};

export const DoctorWelcomeModal: React.FC<DoctorWelcomeModalProps> = ({
  open,
  onOpenChange,
  medico,
  onSent,
}) => {
  const { user } = useAuth();
  const [telefonoDestino, setTelefonoDestino] = useState('');
  const [passwordTemporal, setPasswordTemporal] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [lastResponse, setLastResponse] = useState<EnviarBienvenidaResponse | null>(null);

  // Generador de contraseña aleatoria segura
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Dr*';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordTemporal(pass);
  };

  // Sincronizar teléfono y contraseña cuando abre o cambia médico
  useEffect(() => {
    if (!medico) return;

    const initialCleanPhone = formatCleanWhatsAppNumber(
      medico.telefono || '',
      medico.pais_codigo_telefonico || '58'
    );
    setTelefonoDestino(initialCleanPhone);
  }, [medico, open]);

  // Construir mensaje inicial cuando cambia el médico o la contraseña
  useEffect(() => {
    if (!medico) return;

    const clinicaNombre = user?.empresa?.nombre || 'Centro Médico MedFlow';
    const especialidadNom = medico.especialidad_nombre || 'Especialista';
    const loginUrl = `${window.location.origin}/login`;
    const passDisplay = passwordTemporal.trim() || 'Dr*MedFlow2026';

    const textoGenerado = 
`👋 ¡Hola Dr(a). ${medico.nombres} ${medico.apellidos}!

Le damos una cordial bienvenida al equipo médico de *${clinicaNombre}* (${especialidadNom}).

Compartimos sus credenciales de acceso a la plataforma clínica:
🌐 *Portal:* ${loginUrl}
👤 *Usuario:* ${medico.email}
🔑 *Contraseña:* ${passDisplay}

Desde su cuenta podrá gestionar su agenda médica, atender consultas, emitir recetas y revisar historias clínicas.

¡Mucho éxito en su jornada asistencial! 🩺✨`;

    setMensaje(textoGenerado);
  }, [medico, passwordTemporal, user?.empresa?.nombre]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      generatePassword();
      setLastResponse(null);
      setCopiedMsg(false);
    }
  }, [open]);

  if (!medico) return null;

  const cleanFormattedTarget = formatCleanWhatsAppNumber(
    telefonoDestino,
    medico.pais_codigo_telefonico || '58'
  );

  const copyMessageToClipboard = () => {
    navigator.clipboard.writeText(mensaje);
    setCopiedMsg(true);
    toast.success('Mensaje copiado al portapapeles');
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  // Envío automático usando la integración backend de WhatsApp
  const handleSend = async (canal: 'whatsapp' | 'email' | 'ambos' = 'whatsapp') => {
    if (!cleanFormattedTarget) {
      toast.error('Por favor ingresa un número telefónico válido para WhatsApp');
      return;
    }

    setSending(true);
    try {
      const res = await medicosApi.enviarBienvenida(medico.id, {
        telefono: cleanFormattedTarget,
        password_temporal: passwordTemporal.trim() || undefined,
        mensaje_personalizado: mensaje,
        canal,
      });

      setLastResponse(res);

      if (res.success) {
        toast.success(`¡Mensaje enviado automáticamente!`, {
          description: `Despachado vía WhatsApp al Dr(a). ${medico.nombres} (${res.destinatario})`,
        });
      } else {
        toast.warning('Aviso del envío', {
          description: res.detalle || 'La instancia de WhatsApp no pudo procesar el mensaje automáticamente.',
        });
      }

      if (onSent) onSent();
    } catch (err: any) {
      console.error('Error enviando bienvenida:', err);
      toast.error('Error al procesar el mensaje', {
        description: err.response?.data?.detail || 'No se pudo enviar el mensaje',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabecera */}
        <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-xl text-white font-bold text-sm shadow-xs border-2 border-white/20 shrink-0"
              style={{ backgroundColor: medico.color || '#0d9488' }}
            >
              {medico.nombres.charAt(0)}{medico.apellidos.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Enviar Credenciales de Acceso por WhatsApp</span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                  Automático
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Dr(a). {medico.nombres} {medico.apellidos} • {medico.especialidad_nombre}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Canales y Número Formateado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Correo */}
            <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs flex items-center gap-2.5">
              <Mail className="size-4 text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Usuario de Acceso</span>
                <span className="text-xs font-semibold text-foreground truncate block">{medico.email}</span>
              </div>
            </div>

            {/* Número Telefónico Destino (Formateado y Editable) */}
            <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{getCountryFlagEmoji(medico.pais_codigo_iso2)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Destino WhatsApp</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                  {cleanFormattedTarget || 'Sin número'}
                </Badge>
              </div>
              <Input
                value={telefonoDestino}
                onChange={(e) => setTelefonoDestino(e.target.value)}
                placeholder="Ej: 584241703465"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Generador de Contraseña */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Key className="size-3.5 text-primary" />
                <span>Contraseña Temporal de Acceso</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generatePassword}
                className="h-6 text-[11px] text-teal-600 hover:text-teal-700 cursor-pointer p-1"
              >
                <Sparkles className="size-3 mr-1" />
                <span>Generar Otra</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={passwordTemporal}
                onChange={(e) => setPasswordTemporal(e.target.value)}
                placeholder="Ej. Dr*Mendoza82"
                className="h-8.5 text-xs font-mono bg-background"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Al enviar el mensaje por WhatsApp, esta contraseña se actualiza de inmediato en la cuenta del médico.
            </p>
          </div>

          {/* Vista Previa y Edición del Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-teal-600" />
                <span>Mensaje que se enviará automáticamente</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyMessageToClipboard}
                className="h-6 text-[11px] cursor-pointer px-2 gap-1"
              >
                {copiedMsg ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                <span>{copiedMsg ? 'Copiado' : 'Copiar'}</span>
              </Button>
            </div>

            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={7}
              className="text-xs font-mono resize-none leading-relaxed p-3 bg-muted/10 border-border/80"
              placeholder="Escribe el mensaje de bienvenida..."
            />
          </div>

          {/* Resultado de Envío Automático */}
          {lastResponse && (
            <div
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                lastResponse.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {lastResponse.success ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">
                    {lastResponse.success ? '¡Despachado Automáticamente!' : 'Resultado del Envío'}
                  </span>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                    {lastResponse.detalle}
                  </p>
                </div>
              </div>

              {lastResponse.whatsapp_direct_url && (
                <a
                  href={lastResponse.whatsapp_direct_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 text-[11px] self-center"
                >
                  <span>Abrir WhatsApp Web</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <DialogFooter className="p-3.5 border-t border-border/80 bg-muted/10 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Cerrar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyMessageToClipboard}
              className="h-8 text-xs cursor-pointer gap-1.5"
            >
              {copiedMsg ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>Copiar Texto</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={sending || !cleanFormattedTarget}
              onClick={() => handleSend('whatsapp')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 text-xs cursor-pointer shadow-xs gap-1.5"
            >
              {sending ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span>{sending ? 'Enviando vía WhatsApp...' : 'Enviar por WhatsApp'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorWelcomeModal;
