import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Video,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { integracionesApi } from '../../api/integraciones';
import type { JitsiSessionConfig } from '../../types';
import { JitsiMeetingEmbed } from './JitsiMeetingEmbed';
import { toast } from 'sonner';

interface JitsiTestRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JitsiTestRoomModal: React.FC<JitsiTestRoomModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<JitsiSessionConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTestSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await integracionesApi.createJitsiSession({
        context_type: 'test',
        subject: 'Cabina de Diagnóstico — MediSoft WorkSpace',
        as_moderator: true,
      });
      setSession(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'No se pudo generar la sesión de prueba de Jitsi WorkSpace.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTestSession();
    } else {
      setSession(null);
      setError(null);
    }
  }, [open]);

  const handleCopyInviteLink = async () => {
    if (!session) return;
    // Enlace limpio sin el JWT de moderador para probar ingreso como invitado/paciente desde móvil
    const guestUrl = `https://${session.domain}/${session.room_name}`;
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      toast.success('Enlace de invitado copiado para probar desde otro dispositivo');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('No se pudo copiar el enlace al portapapeles');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[86vh] max-h-[860px] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <Video className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Cabina en Vivo — MediSoft WorkSpace (Jitsi)</span>
                  {session?.is_moderator && (
                    <Badge className="bg-teal-600 text-white text-[10px] font-bold gap-1">
                      <ShieldCheck className="size-3" />
                      Moderador Médico
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Verifica cámara, micrófono, latencia WebRTC y permisos de sala con tu configuración actual.
                </DialogDescription>
              </div>
            </div>

            {session && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInviteLink}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>{copied ? 'Enlace Copiado' : 'Copiar Link Paciente (Móvil)'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadTestSession}
                  disabled={loading}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Nueva Sala</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Avisos contextuales si aplica (ej. modo público meet.jit.si) */}
        {session && session.warnings.length > 0 && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2 shrink-0">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5">
              {session.warnings.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 p-3 bg-slate-950/40 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <p className="text-xs font-medium">Generando sala cifrada y token de sesión...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={loadTestSession}>
                Reintentar
              </Button>
            </div>
          ) : session ? (
            <JitsiMeetingEmbed session={session} className="flex-1 min-h-0" />
          ) : null}
        </div>

        <DialogFooter className="px-5 py-2.5 border-t border-border bg-card flex items-center justify-between sm:justify-between shrink-0">
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            {session ? `Sala: ${session.room_slug}` : 'Preparando cabina...'}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Cerrar Cabina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JitsiTestRoomModal;

