import React, { useState } from 'react';
import { citasApi } from '../../api/citas';
import type { CitaMedica, CitaEstado, Paciente } from '../../types';
import { formatCleanWhatsAppNumber } from './DoctorWelcomeModal';
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
import { Badge } from '../../components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  MessageCircle,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Sparkles,
} from 'lucide-react';

interface CitaQuickActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cita: CitaMedica | null;
  onUpdated: () => void;
  onEdit: (cita: CitaMedica) => void;
  onOpenPatientRecord?: (pacienteId: number) => void;
}

const ESTADOS_CONFIG: Record<
  CitaEstado,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  programada: {
    label: 'Programada',
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/30',
    icon: '📅',
  },
  confirmada: {
    label: 'Confirmada',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/30',
    icon: '✅',
  },
  sala_espera: {
    label: 'En Sala de Espera',
    bg: 'bg-amber-500/15',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-500/40',
    icon: '⏳',
  },
  en_consulta: {
    label: 'En Consulta',
    bg: 'bg-teal-500/15',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-500/40',
    icon: '🩺',
  },
  atendida: {
    label: 'Atendida',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-500/40',
    icon: '🎉',
  },
  cancelada: {
    label: 'Cancelada',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/30',
    icon: '❌',
  },
  no_asistio: {
    label: 'No Asistió',
    bg: 'bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-500/30',
    icon: '⚠️',
  },
};

export const CitaQuickActionDialog: React.FC<CitaQuickActionDialogProps> = ({
  open,
  onOpenChange,
  cita,
  onUpdated,
  onEdit,
  onOpenPatientRecord,
}) => {
  const [loadingAction, setLoadingAction] = useState(false);

  if (!cita) return null;

  const currentCfg = ESTADOS_CONFIG[cita.estado] || ESTADOS_CONFIG.programada;

  const handleCambiarEstado = async (nuevoEstado: CitaEstado) => {
    setLoadingAction(true);
    try {
      await citasApi.cambiarEstado(cita.id, nuevoEstado);
      toast.success(`Estado actualizado a: ${ESTADOS_CONFIG[nuevoEstado].label}`);
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error cambiando estado:', err);
      toast.error('No se pudo actualizar el estado de la cita');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleNotificarWhatsApp = async () => {
    setLoadingAction(true);
    try {
      const res = await citasApi.notificarWhatsApp(cita.id);
      if (res.success) {
        toast.success('Recordatorio enviado por WhatsApp', {
          description: `Destinatario: ${res.destinatario}`,
        });
      } else {
        toast.warning(res.detalle);
      }
      onUpdated();
    } catch (err: any) {
      console.error('Error enviando notificación WhatsApp:', err);
      toast.error('Error al enviar recordatorio por WhatsApp');
    } finally {
      setLoadingAction(false);
    }
  };

  const cleanPhone = formatCleanWhatsAppNumber(cita.paciente_telefono || '', '58');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Cabecera con franja de color del médico */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: cita.medico_color || '#0d9488' }}
        />

        <DialogHeader className="p-5 pb-3 border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  Detalles de Cita Médica #{cita.id}
                </DialogTitle>
                <Badge
                  className={`${currentCfg.bg} ${currentCfg.text} ${currentCfg.border} text-xs font-semibold py-0.5 px-2`}
                >
                  {currentCfg.icon} {currentCfg.label}
                </Badge>
              </div>

              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="size-3" />
                <span className="font-semibold text-foreground">
                  {new Date(`${cita.fecha}T12:00:00`).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span>•</span>
                <Clock className="size-3" />
                <span className="font-bold text-foreground">
                  {cita.hora_inicio} - {cita.hora_fin} ({cita.duracion_minutos} min)
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido principal */}
        <div className="p-5 space-y-4 text-xs">
          {/* Card del Paciente */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Paciente
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {cita.paciente_nombre.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm block">
                    {cita.paciente_nombre}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Doc: {cita.paciente_documento}
                  </span>
                </div>
              </div>

              {cita.paciente_telefono && (
                <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {cita.paciente_telefono}
                </span>
              )}
            </div>
          </div>

          {/* Médico y Especialidad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Médico Especialista
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cita.medico_color || '#0d9488' }}
                />
                <span className="font-bold text-foreground truncate">
                  {cita.medico_nombre}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] py-0 font-medium mt-1">
                {cita.especialidad_nombre}
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Sede / Consultorio
              </span>
              <span className="font-bold text-foreground flex items-center gap-1.5 pt-0.5">
                <Building2 className="size-3.5 text-teal-600" />
                {cita.sucursal_nombre}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Duración: {cita.duracion_minutos} minutos
              </span>
            </div>
          </div>

          {/* Motivo de consulta */}
          <div className="p-3 rounded-xl border border-border/70 bg-muted/15 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Motivo de la Cita
            </span>
            <p className="text-xs font-semibold text-foreground">
              {cita.motivo}
            </p>
            {cita.notas && (
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                Notas: {cita.notas}
              </p>
            )}
          </div>

          {/* ── BOTONES DE TRANSICIÓN RÁPIDA DE ESTADO ────────────── */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Avanzar Flujo de la Cita
            </span>

            <div className="flex flex-wrap gap-2">
              {cita.estado === 'programada' && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loadingAction}
                    onClick={() => handleCambiarEstado('confirmada')}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer gap-1.5 shadow-2xs"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirmar Cita</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loadingAction}
                    onClick={() => handleCambiarEstado('sala_espera')}
                    className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1.5 shadow-2xs"
                  >
                    <span>⏳ Ingresar a Sala de Espera</span>
                  </Button>
                </>
              )}

              {cita.estado === 'confirmada' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={loadingAction}
                  onClick={() => handleCambiarEstado('sala_espera')}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1.5 shadow-2xs"
                >
                  <span>⏳ Paciente en Sala de Espera</span>
                </Button>
              )}

              {cita.estado === 'sala_espera' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={loadingAction}
                  onClick={() => handleCambiarEstado('en_consulta')}
                  className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer gap-1.5 shadow-2xs animate-pulse"
                >
                  <Stethoscope className="size-3.5" />
                  <span>Pasar a Consulta (Llamar Paciente)</span>
                </Button>
              )}

              {cita.estado === 'en_consulta' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={loadingAction}
                  onClick={() => handleCambiarEstado('atendida')}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Finalizar Consulta (Atendida)</span>
                </Button>
              )}

              {cita.estado !== 'atendida' && cita.estado !== 'cancelada' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingAction}
                  onClick={() => handleCambiarEstado('cancelada')}
                  className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer gap-1"
                >
                  <Trash2 className="size-3" />
                  <span>Cancelar Cita</span>
                </Button>
              )}
            </div>
          </div>

          {/* ── NOTIFICACIÓN POR WHATSAPP ──────────────────────────── */}
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-foreground text-xs block">
                  Notificación por WhatsApp
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {cita.whatsapp_notificado
                    ? `Último recordatorio enviado el ${new Date(cita.whatsapp_notificado_at || '').toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Aún no se ha enviado recordatorio automático.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={loadingAction}
                onClick={handleNotificarWhatsApp}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs gap-1"
              >
                <Send className="size-3" />
                <span>{cita.whatsapp_notificado ? 'Reenviar' : 'Enviar WhatsApp'}</span>
              </Button>

              {cleanPhone && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
                  title="Abrir WhatsApp Web"
                >
                  Abrir Web
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2">
          {onOpenPatientRecord && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenPatientRecord(cita.paciente_id);
              }}
              className="h-8 text-xs cursor-pointer gap-1.5 mr-auto"
            >
              <FileText className="size-3.5 text-teal-600" />
              <span>Ver Ficha Médica</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onEdit(cita);
            }}
            className="h-8 text-xs cursor-pointer gap-1.5"
          >
            <Edit className="size-3.5" />
            <span>Editar Cita</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CitaQuickActionDialog;
