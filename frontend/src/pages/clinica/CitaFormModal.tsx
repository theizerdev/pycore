import React, { useState, useEffect } from 'react';
import { citasApi } from '../../api/citas';
import { medicosApi } from '../../api/medicos';
import { pacientesApi } from '../../api/pacientes';
import { sucursalesApi } from '../../api/sucursales';
import type { CitaMedica, Medico, Paciente, Sucursal } from '../../types';
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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  MessageCircle,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CitaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citaToEdit?: CitaMedica | null;
  initialDate?: string;
  initialTime?: string;
  initialMedicoId?: number;
  onSaved: () => void;
}

const DURACIONES = [
  { value: 15, label: '15 minutos' },
  { value: 20, label: '20 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
];

const HORAS_DISPONIBLES = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

export const CitaFormModal: React.FC<CitaFormModalProps> = ({
  open,
  onOpenChange,
  citaToEdit,
  initialDate,
  initialTime,
  initialMedicoId,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // Buscador de pacientes
  const [pacienteSearch, setPacienteSearch] = useState('');

  // Form State
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [especialidadId, setEspecialidadId] = useState<number | null>(null);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [horaInicio, setHoraInicio] = useState<string>('09:00');
  const [duracionMinutos, setDuracionMinutos] = useState<number>(30);
  const [motivo, setMotivo] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [notificarWhatsApp, setNotificarWhatsApp] = useState<boolean>(true);

  // Cargar catálogos
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        const [meds, pacs, sucs] = await Promise.all([
          medicosApi.list(),
          pacientesApi.list(),
          sucursalesApi.list(),
        ]);
        setMedicos(meds);
        setPacientes(pacs);
        setSucursales(sucs);

        if (citaToEdit) {
          setPacienteId(citaToEdit.paciente_id);
          setMedicoId(citaToEdit.medico_id);
          setEspecialidadId(citaToEdit.especialidad_id);
          setSucursalId(citaToEdit.sucursal_id);
          setFecha(citaToEdit.fecha);
          setHoraInicio(citaToEdit.hora_inicio);
          setDuracionMinutos(citaToEdit.duracion_minutos || 30);
          setMotivo(citaToEdit.motivo);
          setNotas(citaToEdit.notas || '');
          setNotificarWhatsApp(false);
        } else {
          // Valores iniciales
          if (initialDate) setFecha(initialDate);
          if (initialTime && HORAS_DISPONIBLES.includes(initialTime)) {
            setHoraInicio(initialTime);
          }
          if (initialMedicoId) {
            setMedicoId(initialMedicoId);
            const med = meds.find((m) => m.id === initialMedicoId);
            if (med) setEspecialidadId(med.especialidad_id);
          } else if (meds.length > 0) {
            setMedicoId(meds[0].id);
            setEspecialidadId(meds[0].especialidad_id);
          }
          if (sucs.length > 0) setSucursalId(sucs[0].id);
          setMotivo('');
          setNotas('');
          setNotificarWhatsApp(true);
        }
      } catch (err) {
        console.error('Error cargando catálogos para cita:', err);
      }
    };

    loadData();
  }, [open, citaToEdit, initialDate, initialTime, initialMedicoId]);

  // Al cambiar médico, asignar su especialidad y sucursal por defecto
  const handleMedicoChange = (medIdStr: string) => {
    const medId = Number(medIdStr);
    setMedicoId(medId);
    const med = medicos.find((m) => m.id === medId);
    if (med) {
      setEspecialidadId(med.especialidad_id);
      if (med.sucursal_defecto_id) setSucursalId(med.sucursal_defecto_id);
    }
  };

  // Calcular hora de fin
  const calcularHoraFin = (inicio: string, minutos: number): string => {
    const [h, m] = inicio.split(':').map(Number);
    const totalMin = h * 60 + m + minutos;
    const finH = Math.floor(totalMin / 60) % 24;
    const finM = totalMin % 60;
    return `${String(finH).padStart(2, '0')}:${String(finM).padStart(2, '0')}`;
  };

  // Pacientes filtrados
  const filteredPacientes = pacientes.filter((p) => {
    if (!pacienteSearch.trim()) return true;
    const term = pacienteSearch.toLowerCase();
    const doc = `${p.tipo_documento}-${p.documento_identidad}`.toLowerCase();
    const name = `${p.nombres} ${p.apellidos}`.toLowerCase();
    return doc.includes(term) || name.includes(term);
  });

  const selectedPaciente = pacientes.find((p) => p.id === pacienteId);
  const selectedMedico = medicos.find((m) => m.id === medicoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pacienteId) {
      toast.error('Debe seleccionar un paciente');
      return;
    }
    if (!medicoId || !especialidadId || !sucursalId) {
      toast.error('Debe seleccionar médico, especialidad y sucursal');
      return;
    }
    if (!motivo.trim()) {
      toast.error('Debe ingresar el motivo de la consulta');
      return;
    }

    const horaFin = calcularHoraFin(horaInicio, duracionMinutos);

    setLoading(true);
    try {
      if (citaToEdit) {
        await citasApi.update(citaToEdit.id, {
          sucursal_id: sucursalId,
          medico_id: medicoId,
          especialidad_id: especialidadId,
          paciente_id: pacienteId,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          duracion_minutos: duracionMinutos,
          motivo,
          notas,
        });
        toast.success('Cita médica modificada exitosamente');
      } else {
        await citasApi.create({
          sucursal_id: sucursalId,
          medico_id: medicoId,
          especialidad_id: especialidadId,
          paciente_id: pacienteId,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          duracion_minutos: duracionMinutos,
          motivo,
          notas,
          notificar_whatsapp: notificarWhatsApp,
        });
        toast.success('Cita médica agendada exitosamente', {
          description: notificarWhatsApp
            ? 'Se ha despachado la notificación automática por WhatsApp al paciente.'
            : undefined,
        });
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error guardando cita médica:', err);
      const detail = err.response?.data?.detail || 'Error al procesar la cita médica';
      toast.error('No se pudo guardar la cita', { description: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Calendar className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {citaToEdit ? 'Reprogramar / Modificar Cita' : 'Agendar Nueva Cita Médica'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Planificación asistencial y reserva de turno en la agenda del especialista.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* ── 1. SELECCIÓN DE PACIENTE ──────────────────────────── */}
          <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-card">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-teal-600" />
                <span>Paciente *</span>
              </Label>
              {selectedPaciente && (
                <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300 border-teal-500/30">
                  {selectedPaciente.tipo_documento}-{selectedPaciente.documento_identidad}
                </Badge>
              )}
            </div>

            {/* Buscador de paciente si aún no se seleccionó */}
            {!selectedPaciente ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={pacienteSearch}
                    onChange={(e) => setPacienteSearch(e.target.value)}
                    placeholder="Escriba nombre o cédula para buscar paciente..."
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 border border-border/60 rounded-lg p-1">
                  {filteredPacientes.length === 0 ? (
                    <p className="p-2 text-center text-muted-foreground text-[11px]">
                      No se encontraron pacientes.
                    </p>
                  ) : (
                    filteredPacientes.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setPacienteId(p.id)}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-teal-600/15 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-[10px]">
                            {p.nombres.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">
                              {p.nombres} {p.apellidos}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {p.tipo_documento}-{p.documento_identidad}
                            </span>
                          </div>
                        </div>

                        {p.telefono && (
                          <span className="text-[10px] text-emerald-600 font-mono">
                            {p.telefono}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                    {selectedPaciente.nombres.charAt(0)}{selectedPaciente.apellidos.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-xs block">
                      {selectedPaciente.nombres} {selectedPaciente.apellidos}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Teléfono: {selectedPaciente.telefono || 'Sin teléfono'} • Sangre: {selectedPaciente.grupo_sanguineo || 'N/R'}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPacienteId(null)}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          {/* ── 2. MÉDICO, ESPECIALIDAD Y SUCURSAL ─────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Médico */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Stethoscope className="size-3.5 text-teal-600" />
                <span>Médico Especialista *</span>
              </Label>
              <Select
                value={medicoId ? String(medicoId) : ''}
                onValueChange={handleMedicoChange}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Seleccionar médico..." />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: m.color || '#0d9488' }}
                        />
                        <span>
                          {m.nombres} {m.apellidos}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({m.especialidad_nombre})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sucursal / Sede */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-teal-600" />
                <span>Sede / Consultorio *</span>
              </Label>
              <Select
                value={sucursalId ? String(sucursalId) : ''}
                onValueChange={(val) => setSucursalId(Number(val))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Seleccionar sede..." />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── 3. FECHA, HORA Y DURACIÓN ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                <span>Fecha *</span>
              </Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="text-xs h-8 bg-card"
                required
              />
            </div>

            {/* Hora Inicio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" />
                <span>Hora de Inicio *</span>
              </Label>
              <Select value={horaInicio} onValueChange={setHoraInicio}>
                <SelectTrigger className="text-xs h-8 bg-card">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {HORAS_DISPONIBLES.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duración */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Duración</span>
                <span className="text-[10px] text-teal-600 font-mono font-bold">
                  Fin: {calcularHoraFin(horaInicio, duracionMinutos)}
                </span>
              </Label>
              <Select
                value={String(duracionMinutos)}
                onValueChange={(v) => setDuracionMinutos(Number(v))}
              >
                <SelectTrigger className="text-xs h-8 bg-card">
                  <SelectValue placeholder="Duración" />
                </SelectTrigger>
                <SelectContent>
                  {DURACIONES.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── 4. MOTIVO Y NOTAS ──────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Motivo de la Cita *
            </Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Chequeo preventivo, dolor precordial, lectura de ecografía..."
              className="text-xs h-8"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Notas Adicionales / Instrucciones
            </Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Indicaciones para el paciente (ej. venir en ayunas de 8 horas)..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* ── 5. NOTIFICACIÓN POR WHATSAPP ───────────────────────── */}
          {!citaToEdit && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="size-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-xs block">
                    Notificar confirmación por WhatsApp
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Envía de inmediato los detalles de la cita al paciente con la integración activa.
                  </span>
                </div>
              </div>

              <Switch
                checked={notificarWhatsApp}
                onCheckedChange={setNotificarWhatsApp}
                className="cursor-pointer"
              />
            </div>
          )}
        </form>

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
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
          >
            {loading ? (
              <span>Procesando...</span>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>{citaToEdit ? 'Guardar Cambios' : 'Confirmar y Agendar Cita'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CitaFormModal;
