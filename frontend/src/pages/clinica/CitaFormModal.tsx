import React, { useState, useEffect } from 'react';
import { citasApi } from '../../api/citas';
import { medicosApi } from '../../api/medicos';
import { pacientesApi } from '../../api/pacientes';
import { sucursalesApi } from '../../api/sucursales';
import { serviciosApi } from '../../api/servicios';
import type { CitaMedica, Medico, Paciente, Sucursal, Servicio, CitaEstadoPago } from '../../types';
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
  DollarSign,
  CreditCard,
  Zap,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';

interface CitaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citaToEdit?: CitaMedica | null;
  initialDate?: string;
  initialTime?: string;
  initialMedicoId?: number;
  existingCitas?: CitaMedica[];
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
  existingCitas,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [allCitas, setAllCitas] = useState<CitaMedica[]>([]);

  // Buscador de pacientes
  const [pacienteSearch, setPacienteSearch] = useState('');

  // Form State
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [especialidadId, setEspecialidadId] = useState<number | null>(null);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [horaInicio, setHoraInicio] = useState<string>('09:00');
  const [duracionMinutos, setDuracionMinutos] = useState<number>(30);
  const [motivo, setMotivo] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [precioEstimado, setPrecioEstimado] = useState<number | ''>('');
  const [estadoPago, setEstadoPago] = useState<CitaEstadoPago>('pendiente');
  const [metodoPago, setMetodoPago] = useState<string>('');
  const [esSobreturno, setEsSobreturno] = useState<boolean>(false);
  const [motivoSobreturno, setMotivoSobreturno] = useState<string>('');
  const [notificarWhatsApp, setNotificarWhatsApp] = useState<boolean>(true);

  // Cargar catálogos
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        const [meds, pacs, sucs, servs] = await Promise.all([
          medicosApi.list(),
          pacientesApi.list(),
          sucursalesApi.list(),
          serviciosApi.list({ activo: true }),
        ]);
        setMedicos(meds);
        setPacientes(pacs);
        setSucursales(sucs);
        setServicios(servs);

        if (citaToEdit) {
          setPacienteId(citaToEdit.paciente_id);
          setMedicoId(citaToEdit.medico_id);
          setEspecialidadId(citaToEdit.especialidad_id);
          setSucursalId(citaToEdit.sucursal_id);
          setServicioId(citaToEdit.servicio_id || null);
          setFecha(citaToEdit.fecha);
          setHoraInicio(citaToEdit.hora_inicio);
          setDuracionMinutos(citaToEdit.duracion_minutos || 30);
          setMotivo(citaToEdit.motivo);
          setNotas(citaToEdit.notas || '');
          setPrecioEstimado(
            citaToEdit.precio_estimado !== undefined && citaToEdit.precio_estimado !== null
              ? citaToEdit.precio_estimado
              : ''
          );
          setEstadoPago(citaToEdit.estado_pago || 'pendiente');
          setMetodoPago(citaToEdit.metodo_pago || '');
          setEsSobreturno(!!citaToEdit.es_sobreturno);
          setMotivoSobreturno(citaToEdit.motivo_sobreturno || '');
          setNotificarWhatsApp(false);
        } else {
          // Tomar siempre la fecha y hora exacta seleccionada/pulsada
          if (initialDate) setFecha(initialDate);
          if (initialTime) {
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
          setServicioId(null);
          setPrecioEstimado('');
          setEstadoPago('pendiente');
          setMetodoPago('');
          setEsSobreturno(false);
          setMotivoSobreturno('');
          setMotivo('');
          setNotas('');
          setNotificarWhatsApp(true);
        }

        // Cargar citas si no se suministraron
        if (!existingCitas) {
          const cData = await citasApi.list();
          setAllCitas(cData);
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

  // Servicios filtrados por especialidad
  const serviciosFiltrados = React.useMemo(() => {
    if (!especialidadId) return servicios;
    return servicios.filter(
      (s) => !s.especialidad_id || s.especialidad_id === especialidadId
    );
  }, [servicios, especialidadId]);

  // Selección de servicio del catálogo
  const handleServicioChange = (val: string) => {
    if (val === 'ninguno') {
      setServicioId(null);
      return;
    }
    const sId = Number(val);
    setServicioId(sId);
    const s = servicios.find((item) => item.id === sId);
    if (s) {
      if (s.duracion_estimada_minutos) {
        setDuracionMinutos(s.duracion_estimada_minutos);
      }
      if (s.precio_base !== undefined && s.precio_base !== null) {
        setPrecioEstimado(Number(s.precio_base));
      }
      if (!motivo.trim() || servicios.some((item) => item.nombre === motivo)) {
        setMotivo(s.nombre);
      }
    }
  };

  // Calcular hora de fin
  const calcularHoraFin = (inicio: string, minutos: number): string => {
    if (!inicio) return '';
    const [h, m] = inicio.split(':').map(Number);
    const totalMin = (h || 0) * 60 + (m || 0) + minutos;
    const finH = Math.floor(totalMin / 60) % 24;
    const finM = totalMin % 60;
    return `${String(finH).padStart(2, '0')}:${String(finM).padStart(2, '0')}`;
  };

  const toMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const toTimeStr = (totalMin: number): string => {
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Citas agendadas para el médico en la fecha seleccionada
  const citasDelDia = React.useMemo(() => {
    if (!medicoId || !fecha) return [];
    const source = existingCitas || allCitas;
    return source
      .filter(
        (c) =>
          c.medico_id === medicoId &&
          c.fecha === fecha &&
          c.estado !== 'cancelada' &&
          c.id !== citaToEdit?.id
      )
      .sort((a, b) => toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio));
  }, [existingCitas, allCitas, medicoId, fecha, citaToEdit]);

  // Detección y cálculo de huecos libres entre citas
  const huecosDisponibles = React.useMemo(() => {
    const DAY_START = 7 * 60; // 07:00
    const DAY_END = 19 * 60;  // 19:00

    if (citasDelDia.length === 0) {
      return [
        {
          inicio: toTimeStr(DAY_START),
          fin: toTimeStr(DAY_END),
          duracionMinutos: DAY_END - DAY_START,
          esEntreCitas: false,
          label: 'Jornada completa disponible (07:00 a 19:00)',
        },
      ];
    }

    const gaps: Array<{
      inicio: string;
      fin: string;
      duracionMinutos: number;
      esEntreCitas: boolean;
      citaAnterior?: string;
      citaSiguiente?: string;
      label?: string;
    }> = [];

    // Hueco antes de la primera cita
    const firstStart = toMinutes(citasDelDia[0].hora_inicio);
    if (firstStart - DAY_START >= 15) {
      gaps.push({
        inicio: toTimeStr(DAY_START),
        fin: citasDelDia[0].hora_inicio,
        duracionMinutos: firstStart - DAY_START,
        esEntreCitas: false,
        citaSiguiente: citasDelDia[0].paciente_nombre,
        label: `Antes de ${citasDelDia[0].paciente_nombre}`,
      });
    }

    // Huecos entre citas consecutivas
    for (let i = 0; i < citasDelDia.length - 1; i++) {
      const finActual = toMinutes(citasDelDia[i].hora_fin);
      const inicioSiguiente = toMinutes(citasDelDia[i + 1].hora_inicio);
      const diff = inicioSiguiente - finActual;

      if (diff >= 15) {
        gaps.push({
          inicio: citasDelDia[i].hora_fin,
          fin: citasDelDia[i + 1].hora_inicio,
          duracionMinutos: diff,
          esEntreCitas: true,
          citaAnterior: citasDelDia[i].paciente_nombre,
          citaSiguiente: citasDelDia[i + 1].paciente_nombre,
          label: `Entre ${citasDelDia[i].paciente_nombre} y ${citasDelDia[i + 1].paciente_nombre}`,
        });
      }
    }

    // Hueco después de la última cita
    const lastEnd = toMinutes(citasDelDia[citasDelDia.length - 1].hora_fin);
    if (DAY_END - lastEnd >= 15) {
      gaps.push({
        inicio: citasDelDia[citasDelDia.length - 1].hora_fin,
        fin: toTimeStr(DAY_END),
        duracionMinutos: DAY_END - lastEnd,
        esEntreCitas: false,
        citaAnterior: citasDelDia[citasDelDia.length - 1].paciente_nombre,
        label: `Después de ${citasDelDia[citasDelDia.length - 1].paciente_nombre}`,
      });
    }

    return gaps;
  }, [citasDelDia]);

  // Validar solapamiento / conflicto con la hora actual seleccionada
  const conflictoHorario = React.useMemo(() => {
    if (!horaInicio) return null;
    const miInicio = toMinutes(horaInicio);
    const miFin = miInicio + duracionMinutos;

    return citasDelDia.find((c) => {
      const cInicio = toMinutes(c.hora_inicio);
      const cFin = toMinutes(c.hora_fin);
      return Math.max(miInicio, cInicio) < Math.min(miFin, cFin);
    });
  }, [citasDelDia, horaInicio, duracionMinutos]);

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

  // Verificación de horario habitual del médico
  const advertenciaHorarioMedico = React.useMemo(() => {
    if (!selectedMedico?.horario_atencion || !fecha) return null;
    try {
      const [y, m, d] = fecha.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const diaSemana = dateObj.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaNombre = diasNombres[diaSemana];

      const h = selectedMedico.horario_atencion;
      if (Array.isArray(h)) {
        const configDia = h.find((item: any) => item.dia === diaSemana);
        if (!configDia || !configDia.activo) {
          return `El Dr(a). ${selectedMedico.nombres} ${selectedMedico.apellidos} no suele tener atención programada los ${diaNombre}s.`;
        }
        if (configDia.inicio && horaInicio < configDia.inicio) {
          return `La hora (${horaInicio}) es anterior al inicio de atención configurado (${configDia.inicio}).`;
        }
        const finCita = calcularHoraFin(horaInicio, duracionMinutos);
        if (configDia.fin && finCita > configDia.fin) {
          return `La cita finalizaría a las ${finCita}, posterior al horario habitual (${configDia.fin}).`;
        }
      } else if (typeof h === 'object') {
        if (Array.isArray(h.dias) && !h.dias.includes(diaSemana)) {
          return `El Dr(a). ${selectedMedico.nombres} ${selectedMedico.apellidos} no atiende regularmente los días ${diaNombre}.`;
        }
        if (h.hora_inicio && horaInicio < h.hora_inicio) {
          return `La hora (${horaInicio}) es anterior a su horario regular (${h.hora_inicio}).`;
        }
        const finCita = calcularHoraFin(horaInicio, duracionMinutos);
        if (h.hora_fin && finCita > h.hora_fin) {
          return `La cita finalizaría a las ${finCita}, después de su horario habitual (${h.hora_fin}).`;
        }
      }
    } catch (e) {
      console.error('Error evaluando horario del médico:', e);
    }
    return null;
  }, [selectedMedico, fecha, horaInicio, duracionMinutos]);

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

    if (conflictoHorario && !esSobreturno) {
      toast.error('Conflicto de horario detectado', {
        description: `Coincide con la cita de ${conflictoHorario.paciente_nombre}. Seleccione otro horario o active la casilla "⚡ Cita de Sobreturno".`,
      });
      return;
    }

    const horaFin = calcularHoraFin(horaInicio, duracionMinutos);

    // Validar que no sea en fecha u hora anterior a la actual
    const [y, m, d] = fecha.split('-').map(Number);
    const [h, min] = horaInicio.split(':').map(Number);
    const citaStartDateTime = new Date(y, m - 1, d, h, min);
    const now = new Date();

    if (citaStartDateTime < now) {
      toast.error('No es permitido registrar citas en horas anteriores', {
        description: 'Por favor elija una fecha y hora posterior a la hora actual en curso.',
      });
      return;
    }

    setLoading(true);
    try {
      const payloadBase = {
        sucursal_id: sucursalId,
        medico_id: medicoId,
        especialidad_id: especialidadId,
        servicio_id: servicioId,
        paciente_id: pacienteId,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_minutos: duracionMinutos,
        motivo,
        notas,
        precio_estimado: precioEstimado !== '' ? Number(precioEstimado) : undefined,
        estado_pago: estadoPago,
        metodo_pago: metodoPago.trim() ? metodoPago : undefined,
        es_sobreturno: esSobreturno,
        motivo_sobreturno: esSobreturno && motivoSobreturno.trim() ? motivoSobreturno : undefined,
      };

      if (citaToEdit) {
        await citasApi.update(citaToEdit.id, payloadBase);
        toast.success('Cita médica modificada exitosamente');
      } else {
        await citasApi.create({
          ...payloadBase,
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

          {/* ── 2.1 SERVICIO CLÍNICO DEL CATÁLOGO ────────────────────── */}
          <div className="space-y-1.5 p-3 rounded-xl border border-border/80 bg-card">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-teal-600" />
                <span>Servicio Clínico / Tipo de Consulta</span>
              </Label>
              {servicioId && (
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md">
                  Autocompleta duración y precio estimado
                </span>
              )}
            </div>
            <Select
              value={servicioId ? String(servicioId) : 'ninguno'}
              onValueChange={handleServicioChange}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Seleccionar servicio del catálogo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">
                  <span className="text-muted-foreground">-- Consulta Médica Estándar (Sin servicio específico) --</span>
                </SelectItem>
                {serviciosFiltrados.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.nombre}</span>
                        <span className="text-[10px] text-muted-foreground">({s.categoria})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <span>⏱️ {s.duracion_estimada_minutos} min</span>
                        <span className="text-teal-700 dark:text-teal-300 font-bold">${Number(s.precio_base).toFixed(2)}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="text-xs h-8 bg-card font-mono font-semibold"
                required
              />
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

            {/* Aviso si la fecha u hora está fuera del horario de atención del médico */}
            {advertenciaHorarioMedico && (
              <div className="col-span-1 sm:col-span-3 p-2.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200 text-xs flex items-start gap-2">
                <CalendarClock className="size-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Aviso sobre Jornada de Atención:</span>
                  <span>{advertenciaHorarioMedico}</span>
                </div>
              </div>
            )}

            {/* ── PANEL DE DISPONIBILIDAD Y HUECOS ENTRE CITAS ────────────── */}
            <div className="col-span-1 sm:col-span-3 space-y-2 pt-1">
              {/* Alerta de Conflicto o Disponibilidad */}
              {conflictoHorario ? (
                esSobreturno ? (
                  <div className="p-2.5 rounded-lg border border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                    <Zap className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold flex items-center gap-1.5">
                        <span>Coincidencia de Horario (Modo Sobreturno Activo)</span>
                        <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0 h-4">⚡ Sobreturno</Badge>
                      </span>
                      <span>
                        Existe solapamiento con la cita de <strong>{conflictoHorario.paciente_nombre}</strong> ({conflictoHorario.hora_inicio} a {conflictoHorario.hora_fin}). Se guardará como excepción prioritaria.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200 text-[11px] flex items-start gap-2">
                    <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        ¡Conflicto de Horario detectado!
                      </span>
                      <span>
                        El especialista ya tiene una cita agendada de{' '}
                        <strong>{conflictoHorario.hora_inicio} a {conflictoHorario.hora_fin}</strong> con{' '}
                        <strong>{conflictoHorario.paciente_nombre}</strong>. Seleccione un hueco libre o active la opción <strong>⚡ Cita de Sobreturno</strong> si es una urgencia.
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-2 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-teal-600 shrink-0" />
                    <span>
                      Horario <strong>{horaInicio} - {calcularHoraFin(horaInicio, duracionMinutos)}</strong> libre y disponible sin solapamientos.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80 shrink-0">
                    {citasDelDia.length} citas hoy
                  </span>
                </div>
              )}

              {/* Lista de Huecos Disponibles entre citas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3 text-teal-600" />
                    <span>Huecos Disponibles para Citas:</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Haga clic en un hueco para asignar la hora
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap max-h-32 overflow-y-auto p-1">
                  {huecosDisponibles.map((h, idx) => {
                    const isEntre = h.esEntreCitas;
                    const isCurrent = horaInicio >= h.inicio && horaInicio < h.fin;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setHoraInicio(h.inicio)}
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          isEntre
                            ? 'border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                            : 'border-border/80 bg-background hover:bg-muted text-foreground'
                        } ${isCurrent ? 'ring-2 ring-teal-500 font-semibold' : ''}`}
                      >
                        {isEntre ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500 text-white shrink-0">
                            ✨ Entre citas
                          </span>
                        ) : (
                          <span className="inline-block size-1.5 rounded-full bg-teal-500 shrink-0" />
                        )}
                        <span className="font-mono text-[11px] font-bold">
                          {h.inicio} - {h.fin}
                        </span>
                        <span className="text-[10px] opacity-75 font-sans">
                          ({h.duracionMinutos} min)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. CONTROL DE RECEPCIÓN Y PAGO ───────────────────────── */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-teal-600" />
                <span>Control de Recepción & Estado de Pago</span>
              </span>
              {precioEstimado !== '' && (
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
                  Total: ${Number(precioEstimado).toFixed(2)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Precio Estimado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="size-3 text-muted-foreground" />
                  <span>Honorarios / Precio Estimado ($)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioEstimado}
                    onChange={(e) => setPrecioEstimado(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="pl-7 text-xs h-8 font-mono"
                  />
                </div>
              </div>

              {/* Estado de Pago */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Estado de Pago en Caja</Label>
                <Select
                  value={estadoPago}
                  onValueChange={(val) => setEstadoPago(val as CitaEstadoPago)}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span>⏳ Pendiente de Pago</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="pagado">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span>✅ Pagado en Recepción</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="aseguradora">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500" />
                        <span>🛡️ Cobertura Aseguradora / Póliza</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="exonerado">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-purple-500" />
                        <span>🎁 Exonerado / Cortesía</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Método de pago si ya pagó */}
            {estadoPago === 'pagado' && (
              <div className="pt-2 border-t border-border/60">
                <Label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Método de Pago Utilizado:
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo' },
                    { id: 'tarjeta', label: 'Tarjeta' },
                    { id: 'transferencia', label: 'Transferencia' },
                    { id: 'pago_movil', label: 'Pago Móvil' },
                  ].map((met) => (
                    <button
                      key={met.id}
                      type="button"
                      onClick={() => setMetodoPago(metodoPago === met.id ? '' : met.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                        metodoPago === met.id
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold'
                          : 'border-border/70 hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {met.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 5. SOBRETURNO / EXCEPCIÓN MÉDICA ─────────────────────── */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Zap className="size-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-xs block">
                    ⚡ Cita de Sobreturno / Cupo Extraordinario
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Permite agendar aún con solapamiento horario para pacientes de urgencia o prioridad médica.
                  </span>
                </div>
              </div>
              <Switch
                checked={esSobreturno}
                onCheckedChange={setEsSobreturno}
                className="cursor-pointer data-[state=checked]:bg-amber-600"
              />
            </div>

            {esSobreturno && (
              <div className="pt-2 border-t border-amber-500/20 space-y-1">
                <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                  Justificación Médica del Sobreturno (Opcional):
                </Label>
                <Input
                  value={motivoSobreturno}
                  onChange={(e) => setMotivoSobreturno(e.target.value)}
                  placeholder="Ej. Paciente derivado de urgencia, dolor agudo, revisión prioritaria post-quirúrgica..."
                  className="text-xs h-8 bg-background border-amber-500/30"
                />
              </div>
            )}
          </div>

          {/* ── 6. MOTIVO Y NOTAS ──────────────────────────────────── */}
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

          {/* ── 7. NOTIFICACIÓN POR WHATSAPP ───────────────────────── */}
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
