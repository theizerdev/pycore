import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

import { useAuth } from '../../context/AuthContext';
import { citasApi } from '../../api/citas';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import { sucursalesApi } from '../../api/sucursales';
import { pacientesApi } from '../../api/pacientes';
import type {
  CitaMedica,
  Medico,
  Especialidad,
  Sucursal,
  Paciente,
  CitaEstado,
  BloqueoAgenda,
  BloqueoTipo,
  BloqueoAgendaCreateInput,
} from '../../types';

import { CitaFormModal } from './CitaFormModal';
import { CitaQuickActionDialog } from './CitaQuickActionDialog';
import { PatientRecordDrawer } from './PatientRecordDrawer';
import { CitaStatusModal } from './CitaStatusModal';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  CalendarDays,
  Plus,
  Filter,
  RefreshCw,
  Clock,
  User,
  Stethoscope,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  Ban,
  Trash2,
  Zap,
  DollarSign,
  MessageCircle,
} from 'lucide-react';

export const AgendaCalendarioPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const calendarRef = useRef<any>(null);

  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAgenda[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all');
  const [selectedMedico, setSelectedMedico] = useState<string>('all');
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');

  const isDoctorUser = Boolean(user?.rol?.slug === 'medico');

  // Identificar el perfil médico del usuario autenticado
  const currentDoctor = useMemo(() => {
    if (!isDoctorUser || !user) return null;
    return medicos.find(
      (m) =>
        m.usuario_id === user.id ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [isDoctorUser, user, medicos]);

  useEffect(() => {
    if (currentDoctor) {
      setSelectedMedico(String(currentDoctor.id));
      setNewCitaInitialMedicoId(currentDoctor.id);
      setBloqueoMedicoId(currentDoctor.id);
    }
  }, [currentDoctor]);

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [citaToEdit, setCitaToEdit] = useState<CitaMedica | null>(null);
  const [newCitaInitialDate, setNewCitaInitialDate] = useState<string | undefined>(undefined);
  const [newCitaInitialTime, setNewCitaInitialTime] = useState<string | undefined>(undefined);
  const [newCitaInitialMedicoId, setNewCitaInitialMedicoId] = useState<number | undefined>(undefined);

  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [selectedCitaForAction, setSelectedCitaForAction] = useState<CitaMedica | null>(null);

  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false);
  const [patientForRecord, setPatientForRecord] = useState<Paciente | null>(null);

  // Modal para cambio rápido de estado (botón ovalado del evento)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedCitaForStatus, setSelectedCitaForStatus] = useState<CitaMedica | null>(null);

  // Modales y estados para Bloqueos de Agenda
  const [bloqueoModalOpen, setBloqueoModalOpen] = useState(false);
  const [bloqueoMedicoId, setBloqueoMedicoId] = useState<number | null>(null);
  const [bloqueoSucursalId, setBloqueoSucursalId] = useState<number | null>(null);
  const [bloqueoFecha, setBloqueoFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState<string>('12:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState<string>('14:00');
  const [bloqueoTipo, setBloqueoTipo] = useState<BloqueoTipo>('almuerzo');
  const [bloqueoMotivo, setBloqueoMotivo] = useState<string>('');
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);

  const [deleteBloqueoModalOpen, setDeleteBloqueoModalOpen] = useState(false);
  const [selectedBloqueoToDelete, setSelectedBloqueoToDelete] = useState<BloqueoAgenda | null>(null);
  const [eliminandoBloqueo, setEliminandoBloqueo] = useState(false);

  // Modal para Recordatorios WhatsApp Automáticos (Día Siguiente)
  const [recordatorioConfirmOpen, setRecordatorioConfirmOpen] = useState(false);
  const [enviandoRecordatorios, setEnviandoRecordatorios] = useState(false);

  // Cargar Citas y Bloqueos
  const fetchCitas = async () => {
    try {
      setLoading(true);
      const [dataCitas, dataBloqueos] = await Promise.all([
        citasApi.list(),
        citasApi.listarBloqueos(),
      ]);
      setCitas(dataCitas);
      setBloqueos(dataBloqueos);
    } catch (err) {
      console.error('Error cargando citas y bloqueos:', err);
      toast.error('Error al sincronizar la agenda médica');
    } finally {
      setLoading(false);
    }
  };

  // Cargar Catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [meds, esps, sucs] = await Promise.all([
          medicosApi.list(),
          especialidadesApi.list(),
          sucursalesApi.list(),
        ]);
        setMedicos(meds);
        setEspecialidades(esps);
        setSucursales(sucs);
        if (sucs.length > 0 && !bloqueoSucursalId) {
          setBloqueoSucursalId(sucs[0].id);
        }
        if (meds.length > 0 && !bloqueoMedicoId) {
          setBloqueoMedicoId(meds[0].id);
        }
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };

    fetchCitas();
    loadCatalogs();
  }, []);

  // Crear Bloqueo de Agenda
  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloqueoMedicoId) {
      toast.error('Debe seleccionar el especialista');
      return;
    }
    if (!bloqueoMotivo.trim()) {
      toast.error('Debe ingresar el motivo del bloqueo');
      return;
    }
    setGuardandoBloqueo(true);
    try {
      await citasApi.crearBloqueo({
        medico_id: bloqueoMedicoId,
        sucursal_id: bloqueoSucursalId,
        fecha: bloqueoFecha,
        hora_inicio: bloqueoHoraInicio,
        hora_fin: bloqueoHoraFin,
        tipo: bloqueoTipo,
        motivo: bloqueoMotivo.trim(),
      });
      toast.success('Horario bloqueado exitosamente en la agenda');
      setBloqueoModalOpen(false);
      setBloqueoMotivo('');
      fetchCitas();
    } catch (err: any) {
      console.error('Error creando bloqueo:', err);
      toast.error('No se pudo bloquear el horario', {
        description: err.response?.data?.detail || 'Revise que no existan conflictos previos.',
      });
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  // Eliminar Bloqueo de Agenda
  const handleEliminarBloqueo = async () => {
    if (!selectedBloqueoToDelete) return;
    setEliminandoBloqueo(true);
    try {
      await citasApi.eliminarBloqueo(selectedBloqueoToDelete.id);
      toast.success('Bloqueo de horario eliminado. Agenda liberada.');
      setDeleteBloqueoModalOpen(false);
      setSelectedBloqueoToDelete(null);
      fetchCitas();
    } catch (err: any) {
      console.error('Error eliminando bloqueo:', err);
      toast.error('No se pudo eliminar el bloqueo');
    } finally {
      setEliminandoBloqueo(false);
    }
  };

  // Despachar Recordatorios WhatsApp para mañana
  const handleEnviarRecordatorios = async () => {
    setEnviandoRecordatorios(true);
    try {
      const res = await citasApi.enviarRecordatoriosProximas();
      toast.success(res.message, {
        description: `${res.enviados} de ${res.total_citas} recordatorios enviados a los pacientes.`,
      });
      setRecordatorioConfirmOpen(false);
      fetchCitas();
    } catch (err: any) {
      console.error('Error enviando recordatorios:', err);
      toast.error('Error al enviar recordatorios', {
        description: err.response?.data?.detail || 'No se pudo completar el despacho',
      });
    } finally {
      setEnviandoRecordatorios(false);
    }
  };

  // Filtrado reactivo en memoria
  const filteredCitas = useMemo(() => {
    return citas.filter((c) => {
      if (selectedSucursal !== 'all' && c.sucursal_id !== Number(selectedSucursal)) {
        return false;
      }
      if (selectedMedico !== 'all' && c.medico_id !== Number(selectedMedico)) {
        return false;
      }
      if (selectedEspecialidad !== 'all' && c.especialidad_id !== Number(selectedEspecialidad)) {
        return false;
      }
      if (selectedEstado !== 'all' && c.estado !== selectedEstado) {
        return false;
      }
      return true;
    });
  }, [citas, selectedSucursal, selectedMedico, selectedEspecialidad, selectedEstado]);

  // Citas de hoy para el panel asistencial
  const todayStr = new Date().toISOString().split('T')[0];
  const citasHoy = useMemo(() => {
    return citas.filter((c) => c.fecha === todayStr && c.estado !== 'cancelada');
  }, [citas, todayStr]);

  const pacientesEnEspera = useMemo(() => {
    return citas.filter((c) => c.fecha === todayStr && c.estado === 'sala_espera');
  }, [citas, todayStr]);

  const pacientesEnConsulta = useMemo(() => {
    return citas.filter((c) => c.fecha === todayStr && c.estado === 'en_consulta');
  }, [citas, todayStr]);

  const pacientesAtendidosHoy = useMemo(() => {
    return citas.filter((c) => c.fecha === todayStr && c.estado === 'atendida');
  }, [citas, todayStr]);

  // Filtrado reactivo de bloqueos de agenda
  const filteredBloqueos = useMemo(() => {
    return bloqueos.filter((b) => {
      if (selectedSucursal !== 'all' && b.sucursal_id && b.sucursal_id !== Number(selectedSucursal)) {
        return false;
      }
      if (selectedMedico !== 'all' && b.medico_id !== Number(selectedMedico)) {
        return false;
      }
      return true;
    });
  }, [bloqueos, selectedSucursal, selectedMedico]);

  // Formateador a formato de 12 Horas con AM/PM (Ej: 08:00 AM - 08:20 AM)
  const format12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
  };

  // Mapear eventos a FullCalendar con color de Especialidad y Bloqueos de Agenda
  const events = useMemo(() => {
    const citaEvents = filteredCitas.map((c) => {
      // El fondo del bloque representa la especialidad clínica
      const color = c.especialidad_color || '#8b5cf6';
      return {
        id: `cita_${c.id}`,
        title: `${c.paciente_nombre} - ${c.medico_nombre}`,
        start: `${c.fecha}T${c.hora_inicio}:00`,
        end: `${c.fecha}T${c.hora_fin}:00`,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          cita: c,
        },
      };
    });

    const bloqueoEvents = filteredBloqueos.map((b) => ({
      id: `bloqueo_${b.id}`,
      title: `🔒 ${b.tipo.toUpperCase()}: ${b.motivo}`,
      start: `${b.fecha}T${b.hora_inicio}:00`,
      end: `${b.fecha}T${b.hora_fin}:00`,
      backgroundColor: '#334155',
      borderColor: '#475569',
      textColor: '#ffffff',
      classNames: ['fc-event-bloqueo'],
      editable: false,
      startEditable: false,
      durationEditable: false,
      extendedProps: {
        bloqueo: b,
      },
    }));

    return [...citaEvents, ...bloqueoEvents];
  }, [filteredCitas, filteredBloqueos]);

  // Click en un evento del calendario
  const handleEventClick = (info: any) => {
    const bloqueo = info.event.extendedProps.bloqueo as BloqueoAgenda;
    if (bloqueo) {
      setSelectedBloqueoToDelete(bloqueo);
      setDeleteBloqueoModalOpen(true);
      return;
    }

    const cita = info.event.extendedProps.cita as CitaMedica;
    if (cita) {
      setSelectedCitaForAction(cita);
      setQuickActionOpen(true);
    }
  };

  // Click en un slot de fecha / hora vacía
  const handleDateClick = (arg: { dateStr: string; allDay: boolean; date?: Date }) => {
    // Si viene con hora "YYYY-MM-DDTHH:mm:ss"
    let fecha = arg.dateStr;
    let hora = '09:00';

    if (arg.dateStr.includes('T')) {
      const parts = arg.dateStr.split('T');
      fecha = parts[0];
      hora = parts[1].substring(0, 5);
    }

    // Validar si la hora o fecha pulsada es anterior a la hora actual (debajo o antes de la barra roja)
    const slotDate = arg.date || new Date(arg.dateStr.includes('T') ? arg.dateStr : `${fecha}T${hora}:00`);
    const now = new Date();

    if (slotDate < now) {
      toast.error('No es permitido registrar citas en horas anteriores', {
        description: 'Por favor seleccione un horario posterior a la hora en curso (indicada por la línea roja).',
      });
      return;
    }

    setNewCitaInitialDate(fecha);
    setNewCitaInitialTime(hora);
    if (selectedMedico !== 'all') {
      setNewCitaInitialMedicoId(Number(selectedMedico));
    } else {
      setNewCitaInitialMedicoId(undefined);
    }
    setCitaToEdit(null);
    setFormModalOpen(true);
  };

  // Abrir ficha médica del paciente
  const handleOpenPatientRecord = async (pacienteId: number) => {
    try {
      const p = await pacientesApi.getById(pacienteId);
      setPatientForRecord(p);
      setRecordDrawerOpen(true);
    } catch (err) {
      toast.error('No se pudo cargar la ficha del paciente');
    }
  };

  // Transición rápida desde el widget de sala de espera
  const handleLlamarAConsulta = async (citaId: number) => {
    try {
      await citasApi.cambiarEstado(citaId, 'en_consulta');
      toast.success('Paciente llamado a consultorio (En Consulta)');
      fetchCitas();
    } catch (err) {
      toast.error('No se pudo cambiar el estado de la cita');
    }
  };

  // ── REPROGRAMACIÓN POR ARRASTRE (Drag & Drop a una hora o día específico) ──
  const handleEventDrop = async (info: any) => {
    if (info.event.extendedProps.bloqueo) {
      info.revert();
      return;
    }
    const cita = info.event.extendedProps.cita as CitaMedica;
    if (!cita) return;

    const newStart = info.event.start;
    const newEnd = info.event.end;
    if (!newStart) {
      info.revert();
      return;
    }

    const now = new Date();
    if (newStart < now) {
      info.revert();
      toast.error('No es permitido registrar citas en horas anteriores', {
        description: 'No se puede mover la cita a un horario previo a la hora en curso.',
      });
      return;
    }

    const year = newStart.getFullYear();
    const month = String(newStart.getMonth() + 1).padStart(2, '0');
    const day = String(newStart.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;

    const startH = String(newStart.getHours()).padStart(2, '0');
    const startM = String(newStart.getMinutes()).padStart(2, '0');
    const newStartTime = `${startH}:${startM}`;

    let newEndTime = cita.hora_fin;
    let newDuracion = cita.duracion_minutos;

    if (newEnd) {
      const endH = String(newEnd.getHours()).padStart(2, '0');
      const endM = String(newEnd.getMinutes()).padStart(2, '0');
      newEndTime = `${endH}:${endM}`;
      newDuracion = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));
    } else {
      const totalMin = Number(startH) * 60 + Number(startM) + newDuracion;
      const finH = Math.floor(totalMin / 60) % 24;
      const finM = totalMin % 60;
      newEndTime = `${String(finH).padStart(2, '0')}:${String(finM).padStart(2, '0')}`;
    }

    try {
      await citasApi.update(cita.id, {
        fecha: newDateStr,
        hora_inicio: newStartTime,
        hora_fin: newEndTime,
        duracion_minutos: newDuracion,
      });
      toast.success(
        `Cita de ${cita.paciente_nombre} reprogramada a las ${newStartTime} (${newDateStr})`
      );
      await fetchCitas();
    } catch (err: any) {
      info.revert();
      const msg = err.response?.data?.detail || 'No se pudo mover la cita al horario seleccionado';
      toast.error(msg);
    }
  };

  // ── AJUSTE DE DURACIÓN ESTIRANDO EL BORDE INFERIOR DEL EVENTO ──────────
  const handleEventResize = async (info: any) => {
    if (info.event.extendedProps.bloqueo) {
      info.revert();
      return;
    }
    const cita = info.event.extendedProps.cita as CitaMedica;
    if (!cita) return;

    const newStart = info.event.start;
    const newEnd = info.event.end;
    if (!newStart || !newEnd) {
      info.revert();
      return;
    }

    const endH = String(newEnd.getHours()).padStart(2, '0');
    const endM = String(newEnd.getMinutes()).padStart(2, '0');
    const newEndTime = `${endH}:${endM}`;
    const newDuracion = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));

    try {
      await citasApi.update(cita.id, {
        hora_fin: newEndTime,
        duracion_minutos: newDuracion,
      });
      toast.success(
        `Duración ajustada a ${newDuracion} min (${cita.hora_inicio} a ${newEndTime})`
      );
      await fetchCitas();
    } catch (err: any) {
      info.revert();
      const msg = err.response?.data?.detail || 'No se pudo cambiar la duración de la cita';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── BARRA DE TÍTULO Y ACCIÓN PRINCIPAL ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarDays className="size-7 text-teal-600" />
            <span>Agenda Médica y Turnos de Citas</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Calendario asistencial interactivo con control de sobreturnos, bloqueos y estados de pago.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Rápido de Médico */}
          {isDoctorUser && currentDoctor ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-200 text-xs font-semibold h-9">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: currentDoctor.color || '#0d9488' }}
              />
              <span className="truncate">Dr(a). {currentDoctor.nombres} {currentDoctor.apellidos}</span>
            </div>
          ) : (
            <Select value={selectedMedico} onValueChange={setSelectedMedico}>
              <SelectTrigger className="text-xs h-9 w-[170px]">
                <SelectValue placeholder="Médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Médicos: Todos</SelectItem>
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: m.color || '#0d9488' }}
                      />
                      <span className="truncate">
                        {m.nombres} {m.apellidos}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Filtro Rápido de Estado */}
          <Select value={selectedEstado} onValueChange={setSelectedEstado}>
            <SelectTrigger className="text-xs h-9 w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estados: Todos</SelectItem>
              <SelectItem value="programada">📅 Programadas</SelectItem>
              <SelectItem value="confirmada">✅ Confirmadas</SelectItem>
              <SelectItem value="sala_espera">⏳ Sala de Espera</SelectItem>
              <SelectItem value="en_consulta">🩺 En Consulta</SelectItem>
              <SelectItem value="atendida">🎉 Atendidas</SelectItem>
              <SelectItem value="cancelada">❌ Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCitas}
            disabled={loading}
            className="h-9 cursor-pointer gap-1.5"
            title="Sincronizar calendario"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {/* Botón Enviar Recordatorios WhatsApp Mañana */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRecordatorioConfirmOpen(true)}
            className="h-9 cursor-pointer gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            title="Enviar recordatorios de asistencia por WhatsApp a citas de mañana"
          >
            <Send className="size-3.5 text-emerald-600" />
            <span className="hidden xl:inline">Recordatorios WhatsApp</span>
          </Button>

          {/* Botón Bloquear Horario */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedMedico !== 'all') {
                setBloqueoMedicoId(Number(selectedMedico));
              }
              setBloqueoModalOpen(true);
            }}
            className="h-9 cursor-pointer gap-1.5 border-slate-500/30 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10"
            title="Bloquear horario por almuerzo, reunión, cirugía u otros"
          >
            <Lock className="size-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">Bloquear Horario</span>
          </Button>

          {/* Botón Agendar Cita */}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setCitaToEdit(null);
              setNewCitaInitialDate(new Date().toISOString().split('T')[0]);
              setNewCitaInitialTime('08:00');
              setFormModalOpen(true);
            }}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
          >
            <Plus className="size-4" />
            <span>Agendar Cita</span>
          </Button>
        </div>
      </div>

      {/* ── CONTENEDOR DEL FULLCALENDAR INTERACTIVO (Espacio Maximizado) ── */}
      <Card className="overflow-hidden border-border/80 shadow-2xs bg-card p-4">
        <style>{`
          .fc {
            --fc-border-color: var(--color-border, #e2e8f0);
            --fc-page-bg-color: transparent;
            --fc-now-indicator-color: #ef4444 !important;
            font-size: 0.825rem;
          }
          .dark .fc {
            --fc-border-color: #334155;
          }
          .fc-event-bloqueo {
            background: repeating-linear-gradient(
              -45deg,
              #1e293b,
              #1e293b 8px,
              #334155 8px,
              #334155 16px
            ) !important;
            border: 1px dashed #94a3b8 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
          }
          .fc .fc-toolbar-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--color-foreground, #0f172a);
          }
          .fc .fc-button-primary {
            background-color: #0d9488;
            border-color: #0d9488;
            font-weight: 600;
            font-size: 0.75rem;
            border-radius: 0.5rem;
            padding: 0.35rem 0.75rem;
            text-transform: capitalize;
          }
          .fc .fc-button-primary:hover {
            background-color: #0f766e;
            border-color: #0f766e;
          }
          .fc .fc-button-primary:disabled {
            background-color: #94a3b8;
            border-color: #94a3b8;
          }
          .fc .fc-button-active {
            background-color: #115e59 !important;
            border-color: #115e59 !important;
          }
          .fc-timegrid-slot {
            height: 2.7rem !important;
          }
          .fc-timegrid-event {
            border-radius: 0.375rem !important;
            border-width: 0 !important;
            overflow: hidden !important;
          }
          .fc-event-main {
            padding: 0 !important;
            height: 100% !important;
          }
          .fc-event {
            cursor: pointer;
            border-radius: 0.375rem;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .fc-event:hover {
            transform: scale(1.005);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
          }
          .fc-col-header-cell {
            padding: 6px 0;
            background-color: rgba(148, 163, 184, 0.08);
            font-weight: 700;
          }
          .fc .fc-list {
            border-radius: 0.5rem;
            overflow: hidden;
            border-color: var(--fc-border-color, #e2e8f0);
          }
          .fc-list-day-cushion {
            background-color: rgba(148, 163, 184, 0.12) !important;
            font-weight: 700 !important;
            font-size: 0.85rem !important;
            padding: 8px 14px !important;
          }
          .fc-list-event {
            cursor: pointer;
            transition: background-color 0.15s ease;
          }
          .fc-list-event:hover td {
            background-color: rgba(148, 163, 184, 0.08) !important;
          }
          .fc-list-event-time {
            font-size: 0.8rem !important;
            font-weight: 600 !important;
            padding: 10px 14px !important;
            white-space: nowrap !important;
            color: var(--color-foreground, #0f172a) !important;
          }
          .fc-list-event-title {
            padding: 6px 14px !important;
            width: 100%;
          }
          /* Barra roja que indica la hora en curso */
          .fc .fc-timegrid-now-indicator-line {
            border-color: #ef4444 !important;
            border-top: 3px solid #ef4444 !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
            z-index: 50 !important;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.8) !important;
          }
          .fc .fc-timegrid-now-indicator-arrow {
            border-color: #ef4444 !important;
            border-top-color: transparent !important;
            border-bottom-color: transparent !important;
            border-width: 6px 0 6px 8px !important;
            margin-top: -6px !important;
            z-index: 51 !important;
          }
        `}</style>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin] as any}
          initialView="timeGridDay"
          nowIndicator={true}
          now={new Date()}
          scrollTime={`${new Date().getHours().toString().padStart(2, '0')}:00:00`}
          nowIndicatorContent={() => (
            <div className="flex items-center -mt-3 ml-2 pointer-events-none">
              <span className="bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md tracking-wider uppercase flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                Hora Actual
              </span>
            </div>
          )}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          locale="es"
          slotMinTime="08:00:00"
          slotMaxTime="17:00:00"
          slotDuration="00:30:00"
          height="auto"
          allDaySlot={false}
          selectable={true}
          editable={true}
          eventStartEditable={true}
          eventDurationEditable={true}
          events={events}
          eventClick={(info: any) => handleEventClick(info)}
          dateClick={(arg: any) => handleDateClick(arg)}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventContent={(eventInfo) => {
            const bloqueo = eventInfo.event.extendedProps.bloqueo as BloqueoAgenda;
            const cita = eventInfo.event.extendedProps.cita as CitaMedica;

            // ── RENDERIZADO DE BLOQUEO DE AGENDA ───────────────────────────
            if (bloqueo) {
              const isListView = eventInfo.view.type.startsWith('list');
              const isMonthView = eventInfo.view.type === 'dayGridMonth';

              if (isListView) {
                return (
                  <div className="flex items-center justify-between gap-3 py-1 px-2 w-full text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔒</span>
                      <div>
                        <span className="font-bold text-xs capitalize text-foreground block">
                          Bloqueo ({bloqueo.tipo}): {bloqueo.motivo}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {bloqueo.medico_nombre || 'Especialista'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-slate-500/40 text-slate-700 dark:text-slate-300">
                      {bloqueo.hora_inicio} - {bloqueo.hora_fin}
                    </Badge>
                  </div>
                );
              }

              if (isMonthView) {
                return (
                  <div className="flex items-center gap-1 w-full px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] truncate">
                    <span>🔒</span>
                    <span className="truncate">{bloqueo.motivo}</span>
                  </div>
                );
              }

              return (
                <div className="relative w-full h-full p-2 flex flex-col justify-between text-white select-none overflow-hidden rounded-md border border-slate-500/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">🔒</span>
                      <span className="font-bold text-xs text-white truncate capitalize">
                        {bloqueo.tipo}: {bloqueo.motivo}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 block truncate">
                      {bloqueo.medico_nombre || 'Agenda bloqueada'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-200 font-mono mt-1">
                    <span>{format12Hour(bloqueo.hora_inicio)} - {format12Hour(bloqueo.hora_fin)}</span>
                    <span className="text-[9px] bg-slate-900/80 px-1.5 py-0.5 rounded text-amber-300 font-sans font-bold">
                      Bloqueado
                    </span>
                  </div>
                </div>
              );
            }

            if (!cita) return <div>{eventInfo.event.title}</div>;

            const timeRange = `${format12Hour(cita.hora_inicio)} - ${format12Hour(cita.hora_fin)}`;

            const estadoLabels: Record<string, { label: string; dot: string }> = {
              programada: { label: 'Por llegar', dot: 'bg-blue-400' },
              confirmada: { label: 'Confirmada', dot: 'bg-indigo-400' },
              sala_espera: { label: 'En sala', dot: 'bg-amber-400' },
              en_consulta: { label: 'En consulta', dot: 'bg-teal-400' },
              atendida: { label: 'Atendida', dot: 'bg-emerald-400' },
              cancelada: { label: 'Cancelada', dot: 'bg-rose-400' },
              no_asistio: { label: 'No asistió', dot: 'bg-slate-400' },
            };

            const cfg = estadoLabels[cita.estado] || { label: cita.estado, dot: 'bg-slate-400' };
            const isListView = eventInfo.view.type.startsWith('list');
            const isMonthView = eventInfo.view.type === 'dayGridMonth';

            // ── VISTA DE LISTADO (listWeek) ───────────────────────────
            if (isListView) {
              return (
                <div className="flex items-center justify-between gap-3 py-1 px-1 w-full text-foreground">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Badge de Especialidad */}
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: cita.especialidad_color || '#8b5cf6' }}
                    >
                      {cita.especialidad_nombre}
                    </span>

                    {/* Paciente y Doctor con badges informativos */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {cita.paciente_nombre}
                        </span>
                        {cita.es_sobreturno && (
                          <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 h-4">
                            ⚡ Sobreturno
                          </Badge>
                        )}
                        {cita.estado_pago === 'pagado' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold">
                            ✅ Pagado
                          </span>
                        )}
                        {cita.estado_pago === 'pendiente' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold">
                            ⏳ Cobro Pendiente
                          </span>
                        )}
                        {cita.recordatorio_enviado && (
                          <span title="Recordatorio WhatsApp Enviado" className="text-[11px]">
                            📲
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {cita.medico_nombre.startsWith('Dr') ? cita.medico_nombre : `Dr(a). ${cita.medico_nombre}`}
                      </span>
                    </div>
                  </div>

                  {/* Estado y Botón Ovalado de Acción */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/80 text-foreground border border-border">
                      <span className={`size-2 rounded-full ${cfg.dot}`} />
                      <span>{cfg.label}</span>
                    </span>

                    {/* Botón ovalado para cambiar estado */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCitaForStatus(cita);
                        setStatusModalOpen(true);
                      }}
                      className="h-4 w-8 rounded-full border-2 border-amber-400 bg-amber-400/25 hover:bg-amber-400/60 transition-all flex items-center justify-center cursor-pointer shadow-xs group/btn"
                      title="Cambiar estado de la cita"
                    >
                      <span className="sr-only">Cambiar Estado</span>
                    </button>
                  </div>
                </div>
              );
            }

            // ── VISTA MENSUAL (dayGridMonth) ───────────────────────────
            if (isMonthView) {
              return (
                <div
                  className="flex items-center justify-between gap-1 w-full px-1.5 py-0.5 rounded text-white overflow-hidden text-[11px] leading-tight"
                  style={{ backgroundColor: cita.especialidad_color || '#8b5cf6' }}
                >
                  <div className="flex items-center gap-1 truncate min-w-0">
                    <span className="font-mono text-[9px] opacity-90 shrink-0">
                      {cita.hora_inicio}
                    </span>
                    <span className="font-semibold truncate">
                      {cita.paciente_nombre}
                    </span>
                    {cita.es_sobreturno && (
                      <span className="text-[9px] text-amber-200">⚡</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCitaForStatus(cita);
                      setStatusModalOpen(true);
                    }}
                    className="h-2.5 w-5 shrink-0 rounded-full border border-amber-300 bg-amber-400/30 hover:bg-amber-400/60 transition-all cursor-pointer"
                    title="Cambiar estado de la cita"
                  />
                </div>
              );
            }

            // ── VISTA ASISTENCIAL HORARIA (timeGridWeek / timeGridDay) ─
            return (
              <div className="relative w-full h-full p-2 flex flex-col justify-between text-white select-none overflow-hidden rounded-md group">
                {/* ── BOTÓN OVALADO DERECHO (Modal para cambiar estado) ── */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCitaForStatus(cita);
                    setStatusModalOpen(true);
                  }}
                  className="absolute top-2 right-2 h-3.5 w-7 rounded-full border-2 border-amber-300 bg-amber-400/30 hover:bg-amber-400/60 transition-all flex items-center justify-center cursor-pointer shadow-xs z-20 group/btn"
                  title="Cambiar estado de la cita"
                >
                  <span className="sr-only">Cambiar Estado</span>
                </button>

                {/* ── DATOS: Paciente y Especialista ──────────────────── */}
                <div className="space-y-0.5 pr-8">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-bold text-xs leading-tight block truncate text-white drop-shadow-xs">
                      {cita.paciente_nombre}
                    </span>
                    {cita.es_sobreturno && (
                      <span className="bg-amber-500 text-black text-[9px] font-extrabold px-1 rounded shadow-xs shrink-0">
                        ⚡ Sobreturno
                      </span>
                    )}
                    {cita.recordatorio_enviado && (
                      <span title="Recordatorio WhatsApp Enviado" className="text-[10px] shrink-0">
                        📲
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] text-white/90 leading-tight block truncate font-medium">
                    {cita.medico_nombre.startsWith('Dr') ? cita.medico_nombre : `Dr(a). ${cita.medico_nombre}`}
                  </span>
                </div>

                {/* ── FILA INFERIOR: Pastilla de Estado + Pago + Rango de Hora ── */}
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-xs border border-white/20 text-white shrink-0">
                    <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </span>

                  {cita.estado_pago === 'pagado' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-400/40 font-bold shrink-0">
                      ✅ Pagado
                    </span>
                  )}
                  {cita.estado_pago === 'pendiente' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/40 shrink-0">
                      ⏳ Cobro
                    </span>
                  )}
                  {cita.estado_pago === 'aseguradora' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/35 text-blue-100 border border-blue-400/40 shrink-0">
                      🛡️ Póliza
                    </span>
                  )}
                  {cita.estado_pago === 'exonerado' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/35 text-purple-100 border border-purple-400/40 shrink-0">
                      🎁 Cortesía
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-white/95 font-medium shrink-0">
                    {timeRange}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </Card>

      {/* ── MODAL DE AGENDAMIENTO / EDICIÓN ────────────────────────── */}
      <CitaFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        citaToEdit={citaToEdit}
        initialDate={newCitaInitialDate}
        initialTime={newCitaInitialTime}
        initialMedicoId={newCitaInitialMedicoId}
        existingCitas={citas}
        onSaved={fetchCitas}
      />

      {/* ── MODAL DE ACCIÓN RÁPIDA Y ESTADOS ───────────────────────── */}
      <CitaQuickActionDialog
        open={quickActionOpen}
        onOpenChange={setQuickActionOpen}
        cita={selectedCitaForAction}
        onUpdated={fetchCitas}
        onEdit={(c) => {
          setCitaToEdit(c);
          setFormModalOpen(true);
        }}
        onOpenPatientRecord={handleOpenPatientRecord}
      />

      {/* ── MODAL CAMBIAR ESTADO (Desde el botón ovalado del bloque) ── */}
      <CitaStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        cita={selectedCitaForStatus}
        onUpdated={fetchCitas}
      />

      {/* ── FICHA CLÍNICA DEL PACIENTE (Si se solicita) ────────────── */}
      <PatientRecordDrawer
        open={recordDrawerOpen}
        onOpenChange={setRecordDrawerOpen}
        paciente={patientForRecord}
      />

      {/* ── MODAL DE BLOQUEO DE AGENDA ─────────────────────────────── */}
      <Dialog open={bloqueoModalOpen} onOpenChange={setBloqueoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Lock className="size-4 text-slate-700 dark:text-slate-300" />
              <span>Bloquear Horario en Agenda</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Inhabilita una franja de la agenda para cirugías, reuniones, almuerzo o descansos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearBloqueo} className="space-y-3.5 text-xs">
            {/* Especialista */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Médico Especialista *</Label>
              <Select
                value={bloqueoMedicoId ? String(bloqueoMedicoId) : ''}
                onValueChange={(val) => setBloqueoMedicoId(Number(val))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Seleccionar especialista..." />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nombres} {m.apellidos} ({m.especialidad_nombre})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha, Hora Inicio, Hora Fin */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Fecha *</Label>
                <Input
                  type="date"
                  value={bloqueoFecha}
                  onChange={(e) => setBloqueoFecha(e.target.value)}
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Inicio *</Label>
                <Input
                  type="time"
                  value={bloqueoHoraInicio}
                  onChange={(e) => setBloqueoHoraInicio(e.target.value)}
                  className="text-xs h-8 font-mono font-semibold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Fin *</Label>
                <Input
                  type="time"
                  value={bloqueoHoraFin}
                  onChange={(e) => setBloqueoHoraFin(e.target.value)}
                  className="text-xs h-8 font-mono font-semibold"
                  required
                />
              </div>
            </div>

            {/* Tipo de Bloqueo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Bloqueo *</Label>
              <Select
                value={bloqueoTipo}
                onValueChange={(val) => setBloqueoTipo(val as BloqueoTipo)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="almuerzo">🍱 Almuerzo / Descanso</SelectItem>
                  <SelectItem value="cirugia">🏥 Cirugía / Quirófano</SelectItem>
                  <SelectItem value="reunion">👥 Reunión / Comité Clínico</SelectItem>
                  <SelectItem value="personal">👤 Motivo Personal</SelectItem>
                  <SelectItem value="vacaciones">🏖️ Vacaciones / Permiso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motivo Detallado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo / Descripción *</Label>
              <Input
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                placeholder="Ej. Intervención quirúrgica programada en Quirófano 2"
                className="text-xs h-8"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBloqueoModalOpen(false)}
                disabled={guardandoBloqueo}
                className="h-8 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={guardandoBloqueo}
                className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer gap-1.5"
              >
                <Lock className="size-3.5" />
                <span>{guardandoBloqueo ? 'Bloqueando...' : 'Confirmar Bloqueo'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL ELIMINAR / DESBLOQUEAR AGENDA ─────────────────────── */}
      <Dialog open={deleteBloqueoModalOpen} onOpenChange={setDeleteBloqueoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <Unlock className="size-4 text-amber-600" />
              <span>Detalles del Bloqueo de Horario</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta franja horaria se encuentra actualmente reservada y bloqueada para citas.
            </DialogDescription>
          </DialogHeader>

          {selectedBloqueoToDelete && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] capitalize border-amber-500/40 text-amber-700 dark:text-amber-300">
                    Tipo: {selectedBloqueoToDelete.tipo}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {selectedBloqueoToDelete.hora_inicio} - {selectedBloqueoToDelete.hora_fin}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    {selectedBloqueoToDelete.motivo}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Fecha: {selectedBloqueoToDelete.fecha} • {selectedBloqueoToDelete.medico_nombre || 'Especialista'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteBloqueoModalOpen(false)}
              disabled={eliminandoBloqueo}
              className="h-8 text-xs cursor-pointer"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleEliminarBloqueo}
              disabled={eliminandoBloqueo}
              className="h-8 text-xs cursor-pointer gap-1.5"
            >
              <Trash2 className="size-3.5" />
              <span>{eliminandoBloqueo ? 'Liberando...' : 'Eliminar Bloqueo y Liberar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL CONFIRMACIÓN ENVÍO DE RECORDATORIOS WHATSAPP ──────── */}
      <Dialog open={recordatorioConfirmOpen} onOpenChange={setRecordatorioConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-300">
              <MessageCircle className="size-5 text-emerald-600" />
              <span>Enviar Recordatorios WhatsApp</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Despacho automatizado de recordatorios para las citas programadas de mañana.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
            <p className="font-medium">
              Esta acción buscará todas las citas confirmadas o programadas para el día de mañana y enviará un mensaje recordatorio con:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              <li>Nombre del paciente y del médico tratante</li>
              <li>Hora de la cita y sede asistencial</li>
              <li>Instrucciones y recordatorio de puntualidad</li>
            </ul>
            <p className="text-[10.5px] opacity-75 pt-1">
              Las citas que ya fueron notificadas no recibirán duplicados.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRecordatorioConfirmOpen(false)}
              disabled={enviandoRecordatorios}
              className="h-8 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleEnviarRecordatorios}
              disabled={enviandoRecordatorios}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer gap-1.5 shadow-xs"
            >
              <Send className="size-3.5" />
              <span>{enviandoRecordatorios ? 'Despachando...' : 'Confirmar y Enviar Recordatorios'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgendaCalendarioPage;
