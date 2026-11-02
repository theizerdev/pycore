import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '../../context/AuthContext';
import { citasApi } from '../../api/citas';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import { sucursalesApi } from '../../api/sucursales';
import { pacientesApi } from '../../api/pacientes';
import type {
  BloqueoAgenda,
  BloqueoTipo,
  CitaEstado,
  CitaMedica,
  Especialidad,
  Medico,
  Paciente,
  Sucursal,
} from '../../types';

import { CitaFormModal } from './CitaFormModal';
import { CitaQuickActionDialog } from './CitaQuickActionDialog';
import { PatientRecordDrawer } from './PatientRecordDrawer';
import { CitaStatusModal } from './CitaStatusModal';
import { PatientFormModal } from './PatientFormModal';
import { evaluarPuntualidadCita } from '../../utils/punctuality';
import { cn, getLocalDateString } from '../../lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { TooltipProvider } from '../../components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import MdiIcon from '../../components/clinica/calendar/calendar-mdi';
import CalendarCommandHeader from '../../components/clinica/calendar/CalendarCommandHeader';
import CalendarTimeGrid from '../../components/clinica/calendar/CalendarTimeGrid';
import CalendarMonthGrid from '../../components/clinica/calendar/CalendarMonthGrid';
import CalendarAgendaTimeline from '../../components/clinica/calendar/CalendarAgendaTimeline';
import CalendarSideDock from '../../components/clinica/calendar/CalendarSideDock';
import {
  CITA_ESTADO_META,
  addDaysLocal,
  addMonthsLocal,
  addWeeksLocal,
  buildCalendarItems,
  endOfWeekSunday,
  isSameLocalMonth,
  parseDateKey,
  startOfWeekMonday,
  toDateKey,
  type CalendarColorMode,
  type CalendarGridDensity,
  type CalendarHoursRange,
  type CalendarViewMode,
} from '../../components/clinica/calendar/calendar-types';

const PREFS_STORAGE_KEY = 'medisoft_calendar_prefs_v1';

interface CalendarSavedPrefs {
  mode: CalendarViewMode;
  colorMode: CalendarColorMode;
  hoursRange: CalendarHoursRange;
  density: CalendarGridDensity;
  sideDockOpen: boolean;
  showCancelled: boolean;
  resourceColumnsMode: boolean;
}

const DEFAULT_PREFS: CalendarSavedPrefs = {
  mode: 'week',
  colorMode: 'especialidad',
  hoursRange: 'clinical',
  density: 'comfortable',
  sideDockOpen: true,
  showCancelled: true,
  resourceColumnsMode: false,
};

export const AgendaCalendarioPage: React.FC = () => {
  const { user } = useAuth();

  // Preferencias visuales persistentes del usuario
  const [prefs, setPrefs] = useState<CalendarSavedPrefs>(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
    return DEFAULT_PREFS;
  });

  const updatePref = useCallback(
    <K extends keyof CalendarSavedPrefs>(key: K, value: CalendarSavedPrefs[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignorar
        }
        return next;
      });
    },
    []
  );

  // Estado temporal y modo enfoque
  const [activeDate, setActiveDate] = useState<Date>(() => new Date());
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Reloj reactivo cada 30 segundos para línea láser de hora actual y puntualidad
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Datos de API
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAgenda[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros clínicos
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all');
  const [selectedMedico, setSelectedMedico] = useState<string>('all');
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [selectedModalidad, setSelectedModalidad] = useState<string>('all');
  const [filtroPuntualidad, setFiltroPuntualidad] = useState<
    'all' | 'paciente_retrasado' | 'doctor_retrasado' | 'alertas'
  >('all');

  const isDoctorUser = Boolean(user?.rol?.slug === 'medico' || user?.empresa?.tipo_entidad === 'medico_independiente');

  const currentDoctor = useMemo(() => {
    if (!isDoctorUser || !user) return null;
    return medicos.find(
      (m) =>
        m.usuario_id === user.id ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [isDoctorUser, user, medicos]);

  // Estados de Modales Clínicos
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [citaToEdit, setCitaToEdit] = useState<CitaMedica | null>(null);
  const [newCitaInitialDate, setNewCitaInitialDate] = useState<string | undefined>(undefined);
  const [newCitaInitialTime, setNewCitaInitialTime] = useState<string | undefined>(undefined);
  const [newCitaInitialDuration, setNewCitaInitialDuration] = useState<number | undefined>(30);
  const [newCitaInitialMedicoId, setNewCitaInitialMedicoId] = useState<number | undefined>(
    undefined
  );
  const [newCitaInitialPacienteId, setNewCitaInitialPacienteId] = useState<number | undefined>(
    undefined
  );
  const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);

  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [selectedCitaForAction, setSelectedCitaForAction] = useState<CitaMedica | null>(null);

  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false);
  const [patientForRecord, setPatientForRecord] = useState<Paciente | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedCitaForStatus, setSelectedCitaForStatus] = useState<CitaMedica | null>(null);

  // Bloqueos de Agenda
  const [bloqueoModalOpen, setBloqueoModalOpen] = useState(false);
  const [bloqueoMedicoId, setBloqueoMedicoId] = useState<number | null>(null);
  const [bloqueoSucursalId, setBloqueoSucursalId] = useState<number | null>(null);
  const [bloqueoFecha, setBloqueoFecha] = useState<string>(getLocalDateString());
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState<string>('12:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState<string>('14:00');
  const [bloqueoTipo, setBloqueoTipo] = useState<BloqueoTipo>('almuerzo');
  const [bloqueoMotivo, setBloqueoMotivo] = useState<string>('');
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);

  const [deleteBloqueoModalOpen, setDeleteBloqueoModalOpen] = useState(false);
  const [selectedBloqueoToDelete, setSelectedBloqueoToDelete] = useState<BloqueoAgenda | null>(
    null
  );
  const [eliminandoBloqueo, setEliminandoBloqueo] = useState(false);

  // Recordatorios WhatsApp
  const [recordatorioConfirmOpen, setRecordatorioConfirmOpen] = useState(false);
  const [enviandoRecordatorios, setEnviandoRecordatorios] = useState(false);

  // Carga de citas y bloqueos
  const fetchCitas = useCallback(
    async (docIdOverride?: number) => {
      try {
        setLoading(true);
        const targetDoctorId =
          docIdOverride ?? (isDoctorUser && currentDoctor ? currentDoctor.id : undefined);
        const params = targetDoctorId ? { medico_id: targetDoctorId } : undefined;
        const [dataCitas, dataBloqueos] = await Promise.all([
          citasApi.list(params),
          citasApi.listarBloqueos(params),
        ]);
        setCitas(dataCitas);
        setBloqueos(dataBloqueos);
      } catch (err) {
        console.error('Error cargando citas y bloqueos:', err);
        toast.error('Error al sincronizar la agenda médica');
      } finally {
        setLoading(false);
      }
    },
    [isDoctorUser, currentDoctor]
  );

  useEffect(() => {
    if (currentDoctor) {
      setSelectedMedico(String(currentDoctor.id));
      setNewCitaInitialMedicoId(currentDoctor.id);
      setBloqueoMedicoId(currentDoctor.id);
      void fetchCitas(currentDoctor.id);
    }
  }, [currentDoctor, fetchCitas]);

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
        if (sucs.length > 0) {
          setBloqueoSucursalId((prev) => prev ?? sucs[0].id);
        }
        if (meds.length > 0) {
          setBloqueoMedicoId((prev) => prev ?? meds[0].id);
        }
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };

    void fetchCitas();
    void loadCatalogs();
  }, []);

  // Navegación temporal según modo activo
  const handleNavigatePrev = useCallback(() => {
    setActiveDate((d) => {
      if (prefs.mode === 'day') return addDaysLocal(d, -1);
      if (prefs.mode === 'week') return addWeeksLocal(d, -1);
      return addMonthsLocal(d, -1);
    });
  }, [prefs.mode]);

  const handleNavigateNext = useCallback(() => {
    setActiveDate((d) => {
      if (prefs.mode === 'day') return addDaysLocal(d, 1);
      if (prefs.mode === 'week') return addWeeksLocal(d, 1);
      return addMonthsLocal(d, 1);
    });
  }, [prefs.mode]);

  const handleGoToday = useCallback(() => {
    setActiveDate(new Date());
  }, []);

  const handleOpenNewCitaDefault = useCallback(() => {
    const now = new Date();
    const nextSlotMin = Math.ceil((now.getHours() * 60 + now.getMinutes() + 5) / 30) * 30;
    const h = Math.min(19, Math.max(8, Math.floor(nextSlotMin / 60)));
    const m = nextSlotMin % 60 >= 30 ? '30' : '00';

    const selectedKey = toDateKey(activeDate);
    const todayKey = getLocalDateString();
    const targetDate = selectedKey >= todayKey ? selectedKey : todayKey;

    setCitaToEdit(null);
    setNewCitaInitialDate(targetDate);
    setNewCitaInitialTime(
      targetDate === todayKey ? `${String(h).padStart(2, '0')}:${m}` : '08:00'
    );
    setNewCitaInitialDuration(30);
    setNewCitaInitialPacienteId(undefined);

    if (isDoctorUser && currentDoctor) {
      setNewCitaInitialMedicoId(currentDoctor.id);
    } else if (selectedMedico !== 'all') {
      setNewCitaInitialMedicoId(Number(selectedMedico));
    } else {
      setNewCitaInitialMedicoId(undefined);
    }
    setFormModalOpen(true);
  }, [activeDate, isDoctorUser, currentDoctor, selectedMedico]);

  // Atajos de teclado clínicos (D, S/W, M, A/L, T, N, F, Flechas)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('[role="dialog"]'))
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'd') {
        e.preventDefault();
        updatePref('mode', 'day');
      } else if (key === 's' || key === 'w') {
        e.preventDefault();
        updatePref('mode', 'week');
      } else if (key === 'm') {
        e.preventDefault();
        updatePref('mode', 'month');
      } else if (key === 'a' || key === 'l') {
        e.preventDefault();
        updatePref('mode', 'agenda');
      } else if (key === 't') {
        e.preventDefault();
        handleGoToday();
      } else if (key === 'n') {
        e.preventDefault();
        handleOpenNewCitaDefault();
      } else if (key === 'f') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigatePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigateNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    updatePref,
    handleGoToday,
    handleOpenNewCitaDefault,
    handleNavigatePrev,
    handleNavigateNext,
    isFullscreen,
  ]);

  // Métricas en vivo del día actual
  const todayStr = getLocalDateString();
  const citasHoy = useMemo(() => {
    return citas.filter((c) => {
      if (isDoctorUser && currentDoctor && c.medico_id !== currentDoctor.id) return false;
      return c.fecha === todayStr && c.estado !== 'cancelada';
    });
  }, [citas, todayStr, isDoctorUser, currentDoctor]);

  const resumenPuntualidadHoy = useMemo(() => {
    let pacientesRetrasados = 0;
    let doctoresDemorados = 0;
    let consultasSobretiempo = 0;

    citasHoy.forEach((c) => {
      const p = evaluarPuntualidadCita(c, currentTime);
      if (p.tipo === 'paciente_retrasado') pacientesRetrasados++;
      else if (p.tipo === 'doctor_retrasado') doctoresDemorados++;
      else if (p.tipo === 'consulta_prolongada') consultasSobretiempo++;
    });

    return {
      pacientesRetrasados,
      doctoresDemorados,
      consultasSobretiempo,
      totalAlertas: pacientesRetrasados + doctoresDemorados + consultasSobretiempo,
    };
  }, [citasHoy, currentTime]);

  const pacientesEnEspera = useMemo(
    () => citasHoy.filter((c) => c.estado === 'sala_espera'),
    [citasHoy]
  );

  const pacientesEnConsulta = useMemo(
    () => citasHoy.filter((c) => c.estado === 'en_consulta'),
    [citasHoy]
  );

  const pacientesAtendidosHoy = useMemo(
    () => citasHoy.filter((c) => c.estado === 'atendida'),
    [citasHoy]
  );

  // Filtrado reactivo en memoria
  const filteredCitas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return citas.filter((c) => {
      if (isDoctorUser && currentDoctor && c.medico_id !== currentDoctor.id) return false;
      if (!prefs.showCancelled && c.estado === 'cancelada' && selectedEstado !== 'cancelada') {
        return false;
      }
      if (selectedSucursal !== 'all' && c.sucursal_id !== Number(selectedSucursal)) return false;
      if (selectedMedico !== 'all' && c.medico_id !== Number(selectedMedico)) return false;
      if (selectedEspecialidad !== 'all' && c.especialidad_id !== Number(selectedEspecialidad)) {
        return false;
      }
      if (selectedEstado !== 'all' && c.estado !== selectedEstado) return false;
      if (selectedModalidad !== 'all' && (c.modalidad || 'presencial') !== selectedModalidad) return false;

      if (filtroPuntualidad !== 'all') {
        const p = evaluarPuntualidadCita(c, currentTime);
        if (filtroPuntualidad === 'paciente_retrasado' && p.tipo !== 'paciente_retrasado') {
          return false;
        }
        if (filtroPuntualidad === 'doctor_retrasado' && p.tipo !== 'doctor_retrasado') {
          return false;
        }
        if (
          filtroPuntualidad === 'alertas' &&
          p.tipo !== 'paciente_retrasado' &&
          p.tipo !== 'doctor_retrasado' &&
          p.tipo !== 'consulta_prolongada'
        ) {
          return false;
        }
      }

      if (q) {
        const match =
          c.paciente_nombre.toLowerCase().includes(q) ||
          (c.paciente_documento && c.paciente_documento.toLowerCase().includes(q)) ||
          c.medico_nombre.toLowerCase().includes(q) ||
          (c.especialidad_nombre && c.especialidad_nombre.toLowerCase().includes(q)) ||
          (c.motivo && c.motivo.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [
    citas,
    isDoctorUser,
    currentDoctor,
    prefs.showCancelled,
    selectedSucursal,
    selectedMedico,
    selectedEspecialidad,
    selectedEstado,
    filtroPuntualidad,
    currentTime,
    searchQuery,
  ]);

  const filteredBloqueos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bloqueos.filter((b) => {
      if (isDoctorUser && currentDoctor && b.medico_id !== currentDoctor.id) return false;
      if (
        selectedSucursal !== 'all' &&
        b.sucursal_id &&
        b.sucursal_id !== Number(selectedSucursal)
      ) {
        return false;
      }
      if (selectedMedico !== 'all' && b.medico_id !== Number(selectedMedico)) return false;
      if (q) {
        const match =
          b.motivo.toLowerCase().includes(q) ||
          (b.medico_nombre && b.medico_nombre.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [bloqueos, isDoctorUser, currentDoctor, selectedSucursal, selectedMedico, searchQuery]);

  // Construcción unificada de ítems del calendario
  const calendarItems = useMemo(
    () => buildCalendarItems(filteredCitas, filteredBloqueos, prefs.colorMode, currentTime),
    [filteredCitas, filteredBloqueos, prefs.colorMode, currentTime]
  );

  // Contador contextual de citas en el periodo visible
  const visiblePeriodCitaCount = useMemo(() => {
    if (prefs.mode === 'day') {
      const ds = toDateKey(activeDate);
      return filteredCitas.filter((c) => c.fecha === ds).length;
    }
    if (prefs.mode === 'week') {
      const s = toDateKey(startOfWeekMonday(activeDate));
      const e = toDateKey(endOfWeekSunday(activeDate));
      return filteredCitas.filter((c) => c.fecha >= s && c.fecha <= e).length;
    }
    return filteredCitas.filter((c) => isSameLocalMonth(parseDateKey(c.fecha), activeDate)).length;
  }, [filteredCitas, prefs.mode, activeDate]);

  // ── INTERACCIONES DE AGENDA: CREAR, MOVER, REDIMENSIONAR, LLAMAR ───────

  const handleSlotSelect = (
    dateStr: string,
    startTime: string,
    durationMinutes: number,
    slotMedicoId?: number
  ) => {
    const slotDate = new Date(`${dateStr}T${startTime}:00`);
    const now = new Date();

    if (slotDate < now) {
      toast.error('No es permitido registrar citas en horas anteriores', {
        description:
          'Seleccione un bloque horario posterior a la hora actual indicada por la línea en vivo.',
      });
      return;
    }

    setNewCitaInitialDate(dateStr);
    setNewCitaInitialTime(startTime);
    setNewCitaInitialDuration(durationMinutes);
    setNewCitaInitialPacienteId(undefined);

    if (isDoctorUser && currentDoctor) {
      setNewCitaInitialMedicoId(currentDoctor.id);
    } else if (slotMedicoId) {
      setNewCitaInitialMedicoId(slotMedicoId);
    } else if (selectedMedico !== 'all') {
      setNewCitaInitialMedicoId(Number(selectedMedico));
    } else {
      setNewCitaInitialMedicoId(undefined);
    }

    setCitaToEdit(null);
    setFormModalOpen(true);
  };

  const handleQuickCreateOnDate = (dateStr: string) => {
    const todayKey = getLocalDateString();
    if (dateStr < todayKey) {
      toast.error('No es permitido registrar citas en fechas pasadas');
      return;
    }
    let startTime = '08:00';
    if (dateStr === todayKey) {
      const now = new Date();
      const nextSlot = Math.ceil((now.getHours() * 60 + now.getMinutes() + 5) / 30) * 30;
      if (nextSlot >= 23 * 60 + 30) {
        toast.error('La jornada de hoy ha finalizado. Seleccione el día siguiente.');
        return;
      }
      const h = Math.max(8, Math.floor(nextSlot / 60));
      const m = nextSlot % 60 >= 30 ? '30' : '00';
      startTime = `${String(h).padStart(2, '0')}:${m}`;
    }
    handleSlotSelect(dateStr, startTime, 30);
  };

  const handleRescheduleCita = async (
    cita: CitaMedica,
    newDateStr: string,
    newStartTime: string,
    newEndTime: string,
    newDuration: number,
    newMedicoId?: number
  ) => {
    const targetDateTime = new Date(`${newDateStr}T${newStartTime}:00`);
    if (targetDateTime < new Date()) {
      toast.error('No es permitido mover citas a horarios pasados', {
        description: 'Seleccione una franja posterior a la hora actual.',
      });
      return;
    }

    const prevCitas = citas;
    const targetMedico = newMedicoId ? medicos.find((m) => m.id === newMedicoId) : undefined;

    // Actualización optimista inmediata para fluidez visual total
    setCitas((curr) =>
      curr.map((c) =>
        c.id === cita.id
          ? {
              ...c,
              fecha: newDateStr,
              hora_inicio: newStartTime,
              hora_fin: newEndTime,
              duracion_minutos: newDuration,
              ...(targetMedico
                ? {
                    medico_id: targetMedico.id,
                    medico_nombre: `${targetMedico.nombres} ${targetMedico.apellidos}`,
                    medico_color: targetMedico.color,
                    especialidad_id: targetMedico.especialidad_id,
                    especialidad_nombre:
                      targetMedico.especialidad_nombre || c.especialidad_nombre,
                    especialidad_color:
                      targetMedico.especialidad_color || c.especialidad_color,
                  }
                : {}),
            }
          : c
      )
    );

    try {
      await citasApi.update(cita.id, {
        fecha: newDateStr,
        hora_inicio: newStartTime,
        hora_fin: newEndTime,
        duracion_minutos: newDuration,
        ...(newMedicoId ? { medico_id: newMedicoId } : {}),
      });
      toast.success(
        `Cita de ${cita.paciente_nombre} reprogramada a las ${newStartTime} (${newDateStr})`
      );
      await fetchCitas();
    } catch (err: any) {
      setCitas(prevCitas);
      const msg =
        err.response?.data?.detail || 'No se pudo mover la cita al horario seleccionado';
      toast.error(msg);
    }
  };

  const handleMoveCitaToDate = async (cita: CitaMedica, targetDateStr: string) => {
    await handleRescheduleCita(
      cita,
      targetDateStr,
      cita.hora_inicio,
      cita.hora_fin,
      cita.duracion_minutos
    );
  };

  const handleResizeCita = async (
    cita: CitaMedica,
    newEndTime: string,
    newDuration: number
  ) => {
    const prevCitas = citas;
    setCitas((curr) =>
      curr.map((c) =>
        c.id === cita.id ? { ...c, hora_fin: newEndTime, duracion_minutos: newDuration } : c
      )
    );

    try {
      await citasApi.update(cita.id, {
        hora_fin: newEndTime,
        duracion_minutos: newDuration,
      });
      toast.success(
        `Duración ajustada a ${newDuration} min (${cita.hora_inicio} a ${newEndTime})`
      );
      await fetchCitas();
    } catch (err: any) {
      setCitas(prevCitas);
      const msg = err.response?.data?.detail || 'No se pudo ajustar la duración de la cita';
      toast.error(msg);
    }
  };

  const handleOpenPatientRecord = async (pacienteId: number) => {
    try {
      const p = await pacientesApi.getById(pacienteId);
      setPatientForRecord(p);
      setRecordDrawerOpen(true);
    } catch {
      toast.error('No se pudo cargar la ficha clínica del paciente');
    }
  };

  const handleLlamarAConsulta = async (citaId: number) => {
    try {
      await citasApi.cambiarEstado(citaId, 'en_consulta');
      toast.success('Paciente llamado a consultorio (En Consulta)');
      await fetchCitas();
    } catch {
      toast.error('No se pudo actualizar el estado de la cita');
    }
  };

  const handleDirectChangeEstado = async (cita: CitaMedica, nuevoEstado: CitaEstado) => {
    if (nuevoEstado === 'cancelada') {
      setSelectedCitaForStatus(cita);
      setStatusModalOpen(true);
      return;
    }

    const prevCitas = citas;
    setCitas((curr) =>
      curr.map((c) => (c.id === cita.id ? { ...c, estado: nuevoEstado } : c))
    );

    try {
      await citasApi.cambiarEstado(cita.id, nuevoEstado);
      const label = CITA_ESTADO_META[nuevoEstado]?.label || nuevoEstado;
      toast.success(`Estado actualizado: ${label}`, {
        description: `${cita.paciente_nombre} (${cita.hora_inicio} - ${cita.hora_fin})`,
      });
      await fetchCitas();
    } catch (err: any) {
      setCitas(prevCitas);
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado de la cita');
    }
  };

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
      await fetchCitas();
    } catch (err: any) {
      toast.error('No se pudo bloquear el horario', {
        description: err.response?.data?.detail || 'Revise que no existan conflictos previos.',
      });
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  const handleEliminarBloqueo = async () => {
    if (!selectedBloqueoToDelete) return;
    setEliminandoBloqueo(true);
    try {
      await citasApi.eliminarBloqueo(selectedBloqueoToDelete.id);
      toast.success('Bloqueo eliminado. Franja horaria liberada.');
      setDeleteBloqueoModalOpen(false);
      setSelectedBloqueoToDelete(null);
      await fetchCitas();
    } catch {
      toast.error('No se pudo eliminar el bloqueo');
    } finally {
      setEliminandoBloqueo(false);
    }
  };

  const handleEnviarRecordatorios = async () => {
    setEnviandoRecordatorios(true);
    try {
      const res = await citasApi.enviarRecordatoriosProximas();
      toast.success(res.message, {
        description: `${res.enviados} de ${res.total_citas} recordatorios enviados por WhatsApp.`,
      });
      setRecordatorioConfirmOpen(false);
      await fetchCitas();
    } catch (err: any) {
      toast.error('Error al enviar recordatorios', {
        description: err.response?.data?.detail || 'No se pudo completar el despacho',
      });
    } finally {
      setEnviandoRecordatorios(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    if (!isDoctorUser) setSelectedMedico('all');
    setSelectedEspecialidad('all');
    setSelectedSucursal('all');
    setSelectedEstado('all');
    setSelectedModalidad('all');
    setFiltroPuntualidad('all');
    updatePref('showCancelled', true);
  };

  return (
    <TooltipProvider delayDuration={240}>
    <div
      className={cn(
        'flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background text-foreground',
        isFullscreen ? 'fixed inset-0 z-50 h-dvh w-screen' : 'h-full w-full'
      )}
    >
      {/* ══ CABECERA UNIFICADA DE COMANDO DEL CALENDARIO ══ */}
      <CalendarCommandHeader
        date={activeDate}
        onDateChange={setActiveDate}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onGoToday={handleGoToday}
        mode={prefs.mode}
        onModeChange={(m) => updatePref('mode', m)}
        visibleCount={visiblePeriodCitaCount}
        waitingCount={pacientesEnEspera.length}
        inConsultCount={pacientesEnConsulta.length}
        punctualitySummary={resumenPuntualidadHoy}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedMedico={selectedMedico}
        onSelectedMedicoChange={setSelectedMedico}
        selectedEspecialidad={selectedEspecialidad}
        onSelectedEspecialidadChange={setSelectedEspecialidad}
        selectedSucursal={selectedSucursal}
        onSelectedSucursalChange={setSelectedSucursal}
        selectedEstado={selectedEstado}
        onSelectedEstadoChange={setSelectedEstado}
        selectedModalidad={selectedModalidad}
        onSelectedModalidadChange={setSelectedModalidad}
        filtroPuntualidad={filtroPuntualidad}
        onFiltroPuntualidadChange={setFiltroPuntualidad}
        showCancelled={prefs.showCancelled}
        onShowCancelledChange={(v) => updatePref('showCancelled', v)}
        onResetFilters={handleResetFilters}
        isDoctorUser={isDoctorUser}
        currentDoctor={currentDoctor}
        medicos={medicos}
        especialidades={especialidades}
        sucursales={sucursales}
        colorMode={prefs.colorMode}
        onColorModeChange={(m) => updatePref('colorMode', m)}
        hoursRange={prefs.hoursRange}
        onHoursRangeChange={(r) => updatePref('hoursRange', r)}
        density={prefs.density}
        onDensityChange={(d) => updatePref('density', d)}
        resourceColumnsMode={prefs.resourceColumnsMode}
        onResourceColumnsModeChange={(v) => updatePref('resourceColumnsMode', v)}
        loading={loading}
        onRefresh={() => void fetchCitas()}
        onOpenNewCita={handleOpenNewCitaDefault}
        onOpenNewPatient={() => setQuickPatientModalOpen(true)}
        onOpenBloqueoModal={() => {
          if (selectedMedico !== 'all') {
            setBloqueoMedicoId(Number(selectedMedico));
          }
          setBloqueoFecha(toDateKey(activeDate));
          setBloqueoModalOpen(true);
        }}
        onOpenWhatsAppReminders={() => setRecordatorioConfirmOpen(true)}
        sideDockOpen={prefs.sideDockOpen}
        onToggleSideDock={() => updatePref('sideDockOpen', !prefs.sideDockOpen)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
      />

      {/* ══ LIENZO 100% DEDICADO AL CALENDARIO + DOCK TÁCTICO ACOPLABLE ══ */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {(prefs.mode === 'day' || prefs.mode === 'week') && (
          <CalendarTimeGrid
            mode={prefs.mode}
            date={activeDate}
            now={currentTime}
            items={calendarItems}
            medicos={medicos}
            hoursRange={prefs.hoursRange}
            density={prefs.density}
            resourceColumnsMode={
              prefs.mode === 'day' &&
              !isDoctorUser &&
              selectedMedico === 'all' &&
              prefs.resourceColumnsMode
            }
            onSelectDateAndDayMode={(d) => {
              setActiveDate(d);
              if (prefs.mode !== 'day') {
                updatePref('mode', 'day');
              }
            }}
            onSlotSelect={handleSlotSelect}
            onSelectCita={(c) => {
              setSelectedCitaForAction(c);
              setQuickActionOpen(true);
            }}
            onQuickStatusCita={(c) => {
              setSelectedCitaForStatus(c);
              setStatusModalOpen(true);
            }}
            onDirectChangeEstado={handleDirectChangeEstado}
            onOpenPatientRecord={handleOpenPatientRecord}
            onSelectBloqueo={(b) => {
              setSelectedBloqueoToDelete(b);
              setDeleteBloqueoModalOpen(true);
            }}
            onRescheduleCita={handleRescheduleCita}
            onResizeCita={handleResizeCita}
          />
        )}

        {prefs.mode === 'month' && (
          <CalendarMonthGrid
            date={activeDate}
            now={currentTime}
            items={calendarItems}
            onSelectDateAndDayMode={(d) => {
              setActiveDate(d);
              updatePref('mode', 'day');
            }}
            onQuickCreateOnDate={handleQuickCreateOnDate}
            onSelectCita={(c) => {
              setSelectedCitaForAction(c);
              setQuickActionOpen(true);
            }}
            onQuickStatusCita={(c) => {
              setSelectedCitaForStatus(c);
              setStatusModalOpen(true);
            }}
            onDirectChangeEstado={handleDirectChangeEstado}
            onOpenPatientRecord={handleOpenPatientRecord}
            onSelectBloqueo={(b) => {
              setSelectedBloqueoToDelete(b);
              setDeleteBloqueoModalOpen(true);
            }}
            onMoveCitaToDate={handleMoveCitaToDate}
          />
        )}

        {prefs.mode === 'agenda' && (
          <CalendarAgendaTimeline
            date={activeDate}
            now={currentTime}
            items={calendarItems}
            onSelectDateAndDayMode={(d) => {
              setActiveDate(d);
              updatePref('mode', 'day');
            }}
            onSelectCita={(c) => {
              setSelectedCitaForAction(c);
              setQuickActionOpen(true);
            }}
            onQuickStatusCita={(c) => {
              setSelectedCitaForStatus(c);
              setStatusModalOpen(true);
            }}
            onDirectChangeEstado={handleDirectChangeEstado}
            onSelectBloqueo={(b) => {
              setSelectedBloqueoToDelete(b);
              setDeleteBloqueoModalOpen(true);
            }}
            onLlamarAConsulta={handleLlamarAConsulta}
            onOpenPatientRecord={handleOpenPatientRecord}
            onOpenNewCita={handleOpenNewCitaDefault}
          />
        )}

        {/* Panel Lateral Táctico (Mini-Calendario + Pulso + Sala de Espera) */}
        <CalendarSideDock
          open={prefs.sideDockOpen}
          onOpenChange={(v) => updatePref('sideDockOpen', v)}
          date={activeDate}
          now={currentTime}
          onSelectDate={setActiveDate}
          items={calendarItems}
          citasHoyCount={citasHoy.length}
          atendidasHoyCount={pacientesAtendidosHoy.length}
          pacientesEnEspera={pacientesEnEspera}
          pacientesEnConsulta={pacientesEnConsulta}
          punctualitySummary={resumenPuntualidadHoy}
          filtroPuntualidad={filtroPuntualidad}
          onFiltroPuntualidadChange={setFiltroPuntualidad}
          onSelectCita={(c) => {
            setSelectedCitaForAction(c);
            setQuickActionOpen(true);
          }}
          onQuickStatusCita={(c) => {
            setSelectedCitaForStatus(c);
            setStatusModalOpen(true);
          }}
          onLlamarAConsulta={handleLlamarAConsulta}
          onOpenPatientRecord={handleOpenPatientRecord}
        />
      </div>

      {/* ══ MODALES CLÍNICOS DE AGENDAMIENTO Y FLUJO ASISTENCIAL ══ */}
      <CitaFormModal
        open={formModalOpen}
        onOpenChange={(isOpen) => {
          setFormModalOpen(isOpen);
          if (!isOpen) setNewCitaInitialPacienteId(undefined);
        }}
        citaToEdit={citaToEdit}
        initialDate={newCitaInitialDate}
        initialTime={newCitaInitialTime}
        initialDuration={newCitaInitialDuration}
        initialMedicoId={newCitaInitialMedicoId}
        initialPacienteId={newCitaInitialPacienteId}
        existingCitas={citas}
        onSaved={() => void fetchCitas()}
      />

      {quickPatientModalOpen && (
        <PatientFormModal
          open={quickPatientModalOpen}
          onOpenChange={setQuickPatientModalOpen}
          onSaved={(savedPatient) => {
            setQuickPatientModalOpen(false);
            if (savedPatient) {
              toast.success(
                `Paciente ${savedPatient.nombres} ${savedPatient.apellidos} registrado con éxito`,
                {
                  action: {
                    label: 'Agendar Cita',
                    onClick: () => {
                      setCitaToEdit(null);
                      setNewCitaInitialDate(getLocalDateString());
                      setNewCitaInitialTime(
                        new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      );
                      setNewCitaInitialDuration(30);
                      setNewCitaInitialPacienteId(savedPatient.id);
                      if (isDoctorUser && currentDoctor) {
                        setNewCitaInitialMedicoId(currentDoctor.id);
                      } else if (selectedMedico !== 'all') {
                        setNewCitaInitialMedicoId(Number(selectedMedico));
                      } else {
                        setNewCitaInitialMedicoId(undefined);
                      }
                      setFormModalOpen(true);
                    },
                  },
                }
              );
            }
          }}
        />
      )}

      <CitaQuickActionDialog
        open={quickActionOpen}
        onOpenChange={setQuickActionOpen}
        cita={selectedCitaForAction}
        onUpdated={() => void fetchCitas()}
        onEdit={(c) => {
          setCitaToEdit(c);
          setFormModalOpen(true);
        }}
        onOpenPatientRecord={handleOpenPatientRecord}
      />

      <CitaStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        cita={selectedCitaForStatus}
        onUpdated={() => void fetchCitas()}
      />

      <PatientRecordDrawer
        open={recordDrawerOpen}
        onOpenChange={setRecordDrawerOpen}
        paciente={patientForRecord}
      />

      {/* Modal Bloquear Horario */}
      <Dialog open={bloqueoModalOpen} onOpenChange={setBloqueoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <MdiIcon icon="mdi:calendar-lock-outline" className="size-5 text-primary" />
              <span>Bloquear Horario en Agenda</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reserva una franja operativa para quirófano, comité médico, descanso o permisos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearBloqueo} className="space-y-3.5 text-xs">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoría Operativa *</Label>
              <Select
                value={bloqueoTipo}
                onValueChange={(val) => setBloqueoTipo(val as BloqueoTipo)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="almuerzo">Almuerzo / Descanso</SelectItem>
                  <SelectItem value="cirugia">Cirugía / Quirófano</SelectItem>
                  <SelectItem value="reunion">Reunión / Comité Clínico</SelectItem>
                  <SelectItem value="personal">Reserva Personal</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones / Permiso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo / Descripción *</Label>
              <Input
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                placeholder="Ej. Intervención programada en Quirófano 2"
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
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer gap-1.5"
              >
                <MdiIcon icon="mdi:lock-outline" className="size-3.5" />
                <span>{guardandoBloqueo ? 'Bloqueando...' : 'Confirmar Bloqueo'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar / Desbloquear Horario */}
      <Dialog open={deleteBloqueoModalOpen} onOpenChange={setDeleteBloqueoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <MdiIcon icon="mdi:lock-open-variant-outline" className="size-5 text-amber-500" />
              <span>Detalles del Bloqueo Operativo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta franja horaria se encuentra reservada e inhabilitada para turnos regulares.
            </DialogDescription>
          </DialogHeader>

          {selectedBloqueoToDelete && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize border-amber-500/40 text-amber-700 dark:text-amber-300"
                  >
                    Tipo: {selectedBloqueoToDelete.tipo}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {selectedBloqueoToDelete.hora_inicio} – {selectedBloqueoToDelete.hora_fin}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    {selectedBloqueoToDelete.motivo}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Fecha: {selectedBloqueoToDelete.fecha} •{' '}
                    {selectedBloqueoToDelete.medico_nombre || 'Especialista'}
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
              <MdiIcon icon="mdi:trash-can-outline" className="size-3.5" />
              <span>{eliminandoBloqueo ? 'Liberando...' : 'Eliminar Bloqueo y Liberar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación Recordatorios WhatsApp */}
      <Dialog open={recordatorioConfirmOpen} onOpenChange={setRecordatorioConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-300">
              <MdiIcon icon="mdi:whatsapp" className="size-5 text-emerald-500" />
              <span>Enviar Recordatorios WhatsApp</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Despacho automatizado de avisos de asistencia para las citas de mañana.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
            <p className="font-medium">
              Se notificarán las citas programadas o confirmadas para mañana incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              <li>Nombre del paciente y especialista tratante</li>
              <li>Horario asignado y sede asistencial</li>
              <li>Recomendaciones de puntualidad</li>
            </ul>
            <p className="text-[10.5px] opacity-75 pt-1">
              Las citas previamente notificadas no recibirán mensajes duplicados.
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
              <MdiIcon icon="mdi:send" className="size-3.5" />
              <span>
                {enviandoRecordatorios ? 'Despachando...' : 'Confirmar y Enviar Recordatorios'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};

export default AgendaCalendarioPage;
