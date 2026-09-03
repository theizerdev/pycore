import React, { useState } from 'react';
import { citasApi } from '../../api/citas';
import type { CitaMedica, CitaEstado } from '../../types';
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
import { Badge } from '../../components/ui/badge';
import {
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Calendar,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface CitaStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cita: CitaMedica | null;
  onUpdated: () => void;
}

interface StatusOption {
  value: CitaEstado;
  label: string;
  sublabel: string;
  badgeBg: string;
  badgeText: string;
  borderActive: string;
  icon: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'programada',
    label: 'Por Llegar / Programada',
    sublabel: 'Cita agendada para el horario establecido',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5',
    icon: '📅',
  },
  {
    value: 'confirmada',
    label: 'Confirmada',
    sublabel: 'Paciente confirmó asistencia previa',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5',
    icon: '✅',
  },
  {
    value: 'sala_espera',
    label: 'En Sala de Espera',
    sublabel: 'Paciente presente en recepción esperando turno',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5',
    icon: '⏳',
  },
  {
    value: 'en_consulta',
    label: 'En Consulta',
    sublabel: 'El médico está atendiendo al paciente en consultorio',
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-800 dark:text-teal-300',
    borderActive: 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-500/5',
    icon: '🩺',
  },
  {
    value: 'atendida',
    label: 'Atendida',
    sublabel: 'Consulta médica completada con éxito',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5',
    icon: '🎉',
  },
  {
    value: 'no_asistio',
    label: 'No Asistió',
    sublabel: 'El paciente no acudió a su cita programada',
    badgeBg: 'bg-slate-500/15',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderActive: 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-500/5',
    icon: '⚠️',
  },
  {
    value: 'cancelada',
    label: 'Cancelada',
    sublabel: 'Cita anulada por el paciente o la clínica',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-400',
    borderActive: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/5',
    icon: '❌',
  },
];

export const CitaStatusModal: React.FC<CitaStatusModalProps> = ({
  open,
  onOpenChange,
  cita,
  onUpdated,
}) => {
  const [selectedEstado, setSelectedEstado] = useState<CitaEstado | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [loading, setLoading] = useState(false);

  // Inicializar estado cuando se abre el modal
  React.useEffect(() => {
    if (cita) {
      setSelectedEstado(cita.estado);
      setMotivoCancelacion(cita.motivo_cancelacion || '');
    }
  }, [cita, open]);

  if (!cita) return null;

  const handleSave = async () => {
    if (!selectedEstado) return;
    setLoading(true);
    try {
      await citasApi.cambiarEstado(
        cita.id,
        selectedEstado,
        selectedEstado === 'cancelada' ? motivoCancelacion : undefined
      );
      const opt = STATUS_OPTIONS.find((s) => s.value === selectedEstado);
      toast.success(`Estado actualizado a: ${opt?.label || selectedEstado}`);
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error actualizando estado de la cita:', err);
      toast.error('No se pudo actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Franja superior con el color de la especialidad */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: cita.especialidad_color || '#8b5cf6' }}
        />

        <DialogHeader className="p-5 pb-3 border-b border-border/70">
          <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
            <span>Cambiar Estado de la Cita</span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-border/80"
            >
              #{cita.id}
            </Badge>
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <span className="font-bold text-foreground block">
              {cita.paciente_nombre}
            </span>
            <span className="text-[11px] text-muted-foreground block">
              {cita.hora_inicio} - {cita.hora_fin} • {cita.medico_nombre}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
          <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Seleccione el nuevo estado
          </Label>

          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedEstado === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setSelectedEstado(opt.value)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? opt.borderActive
                      : 'border-border/70 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base shrink-0">{opt.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {opt.sublabel}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`size-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Campo condicional para motivo de cancelación */}
          {selectedEstado === 'cancelada' && (
            <div className="pt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
              <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Motivo de la cancelación *
              </Label>
              <Input
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej. Paciente no pudo asistir, fuerza mayor..."
                className="text-xs h-8"
              />
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-8 text-xs cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={loading || (selectedEstado === 'cancelada' && !motivoCancelacion.trim())}
            className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
          >
            {loading ? 'Guardando...' : 'Aplicar Estado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CitaStatusModal;
