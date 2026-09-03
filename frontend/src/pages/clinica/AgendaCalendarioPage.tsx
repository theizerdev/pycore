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
import type { CitaMedica, Medico, Especialidad, Sucursal, Paciente, CitaEstado } from '../../types';

import { CitaFormModal } from './CitaFormModal';
import { CitaQuickActionDialog } from './CitaQuickActionDialog';
import { PatientRecordDrawer } from './PatientRecordDrawer';
import { toast } from 'sonner';

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
} from 'lucide-react';

export const AgendaCalendarioPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const calendarRef = useRef<any>(null);

  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all');
  const [selectedMedico, setSelectedMedico] = useState<string>('all');
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');

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

  // Cargar Citas
  const fetchCitas = async () => {
    try {
      setLoading(true);
      const data = await citasApi.list();
      setCitas(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
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
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };

    fetchCitas();
    loadCatalogs();
  }, []);

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

  // Mapear eventos a FullCalendar
  const events = useMemo(() => {
    return filteredCitas.map((c) => {
      const color = c.medico_color || '#0d9488';
      return {
        id: String(c.id),
        title: `${c.hora_inicio} - ${c.paciente_nombre}`,
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
  }, [filteredCitas]);

  // Click en un evento del calendario
  const handleEventClick = (info: any) => {
    const cita = info.event.extendedProps.cita as CitaMedica;
    if (cita) {
      setSelectedCitaForAction(cita);
      setQuickActionOpen(true);
    }
  };

  // Click en un slot de fecha / hora vacía
  const handleDateClick = (arg: { dateStr: string; allDay: boolean }) => {
    // Si viene con hora "YYYY-MM-DDTHH:mm:ss"
    let fecha = arg.dateStr;
    let hora = '09:00';

    if (arg.dateStr.includes('T')) {
      const parts = arg.dateStr.split('T');
      fecha = parts[0];
      hora = parts[1].substring(0, 5);
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
            Calendario asistencial interactivo, gestión de flujo de estados y recordatorios automáticos por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCitas}
            disabled={loading}
            className="h-9 cursor-pointer gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setCitaToEdit(null);
              setNewCitaInitialDate(new Date().toISOString().split('T')[0]);
              setNewCitaInitialTime('09:00');
              setFormModalOpen(true);
            }}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
          >
            <Plus className="size-4" />
            <span>Agendar Cita</span>
          </Button>
        </div>
      </div>

      {/* ── PANEL DE ESTADO ASISTENCIAL EN VIVO (HOY) ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Citas de Hoy */}
        <Card className="shadow-2xs border-border/70 hover:border-teal-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Citas de Hoy
              </span>
              <span className="text-2xl font-extrabold text-foreground mt-0.5 block">
                {citasHoy.length}
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5 block">
                Programadas para la fecha
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* En Sala de Espera */}
        <Card className="shadow-2xs border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 hover:border-amber-500/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                En Sala de Espera
              </span>
              <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5 block">
                {pacientesEnEspera.length}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 block">
                {pacientesEnEspera.length > 0 ? 'Pacientes esperando' : 'Sin espera actual'}
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* En Consulta Activa */}
        <Card className="shadow-2xs border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/10 hover:border-teal-500/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                En Consulta
              </span>
              <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 mt-0.5 block">
                {pacientesEnConsulta.length}
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 block">
                En atención médica
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300">
              <Stethoscope className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Atendidas Hoy */}
        <Card className="shadow-2xs border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Atendidas Hoy
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                {pacientesAtendidosHoy.length}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Consultas finalizadas
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MINI-BANNER SALA DE ESPERA EN VIVO (Si hay pacientes esperando) ── */}
      {pacientesEnEspera.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 uppercase tracking-wide">
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              Turnero: Pacientes Presentes en Sala de Espera ({pacientesEnEspera.length})
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Haga clic para llamar a consultorio
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pacientesEnEspera.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-background border border-amber-500/30 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div>
                  <span className="font-bold text-foreground text-xs block">
                    {c.paciente_nombre}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                    <span className="font-mono">{c.hora_inicio}</span>
                    <span>•</span>
                    <span className="truncate">{c.medico_nombre}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleLlamarAConsulta(c.id)}
                  className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shrink-0 shadow-2xs gap-1"
                >
                  <Stethoscope className="size-3" />
                  <span>Llamar</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BARRA DE FILTROS ASISTENCIALES ─────────────────────────── */}
      <Card className="shadow-2xs border-border/70">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Sucursal */}
            <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sedes: Todas</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Especialidad */}
            <Select value={selectedEspecialidad} onValueChange={setSelectedEspecialidad}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Especialidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Especialidad: Todas</SelectItem>
                {especialidades.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Médico con Color */}
            <Select value={selectedMedico} onValueChange={setSelectedMedico}>
              <SelectTrigger className="text-xs h-8">
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
                      <span>
                        {m.nombres} {m.apellidos}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Estado */}
            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estados: Todos</SelectItem>
                <SelectItem value="programada">📅 Programadas</SelectItem>
                <SelectItem value="confirmada">✅ Confirmadas</SelectItem>
                <SelectItem value="sala_espera">⏳ En Sala de Espera</SelectItem>
                <SelectItem value="en_consulta">🩺 En Consulta</SelectItem>
                <SelectItem value="atendida">🎉 Atendidas</SelectItem>
                <SelectItem value="cancelada">❌ Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── CONTENEDOR DEL FULLCALENDAR INTERACTIVO ───────────────── */}
      <Card className="overflow-hidden border-border/80 shadow-2xs bg-card p-4">
        <style>{`
          .fc {
            --fc-border-color: var(--color-border, #e2e8f0);
            --fc-page-bg-color: transparent;
            font-size: 0.825rem;
          }
          .dark .fc {
            --fc-border-color: #334155;
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
            height: 2.2rem !important;
          }
          .fc-event {
            cursor: pointer;
            border-radius: 0.375rem;
            padding: 2px 4px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .fc-event:hover {
            transform: scale(1.01);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .fc-col-header-cell {
            padding: 6px 0;
            background-color: rgba(148, 163, 184, 0.08);
            font-weight: 700;
          }
        `}</style>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin] as any}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          locale="es"
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          selectable={true}
          events={events}
          eventClick={(info: any) => handleEventClick(info)}
          dateClick={(arg: any) => handleDateClick(arg)}
          eventContent={(eventInfo) => {
            const cita = eventInfo.event.extendedProps.cita as CitaMedica;
            if (!cita) return <div>{eventInfo.event.title}</div>;

            const estadoIcon =
              cita.estado === 'sala_espera'
                ? '⏳ '
                : cita.estado === 'en_consulta'
                ? '🩺 '
                : cita.estado === 'atendida'
                ? '✅ '
                : '';

            return (
              <div className="flex flex-col text-[11px] leading-tight overflow-hidden p-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="truncate">
                    {estadoIcon}{cita.paciente_nombre}
                  </span>
                  <span className="text-[9px] opacity-90 font-mono ml-1 shrink-0">
                    {cita.hora_inicio}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 truncate">
                  {cita.medico_nombre}
                </span>
              </div>
            );
          }}
          height="auto"
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

      {/* ── FICHA CLÍNICA DEL PACIENTE (Si se solicita) ────────────── */}
      <PatientRecordDrawer
        open={recordDrawerOpen}
        onOpenChange={setRecordDrawerOpen}
        paciente={patientForRecord}
      />
    </div>
  );
};

export default AgendaCalendarioPage;
