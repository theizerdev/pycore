import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRegional } from '../../context/RegionalContext';
import { citasApi } from '../../api/citas';
import { consultasApi, type ConsultaMedica } from '../../api/consultas';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import type { CitaMedica, Medico, Especialidad } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import {
  Stethoscope,
  CalendarDays,
  Hourglass,
  Activity,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  Layers,
  Search,
  FileText,
  AlertCircle,
  Phone,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  User,
  HeartPulse,
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { toast } from 'sonner';

export const MedicoDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, sucursalActiva } = useAuth();
  const { formatMoney } = useRegional();

  // Estados de datos
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [consultas, setConsultas] = useState<ConsultaMedica[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de listado rápido
  const [activeTab, setActiveTab] = useState<'todas' | 'espera' | 'consulta' | 'atendidas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Identificar el doctor autenticado
  const currentDoctor = useMemo(() => {
    if (!user) return null;
    return medicos.find(
      (m) =>
        m.usuario_id === user.id ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [user, medicos]);

  const doctorEspecialidad = useMemo(() => {
    if (!currentDoctor?.especialidad_id) return null;
    return especialidades.find((e) => e.id === currentDoctor.especialidad_id) || null;
  }, [currentDoctor, especialidades]);

  // Carga de datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toLocaleDateString('en-CA');

      const [medRes, espRes] = await Promise.allSettled([
        medicosApi.list({ activo: true }),
        especialidadesApi.list({ activo: true }),
      ]);

      const medicosList = medRes.status === 'fulfilled' ? medRes.value : [];
      setMedicos(medicosList);

      if (espRes.status === 'fulfilled') {
        setEspecialidades(espRes.value);
      }

      // Encontrar doctor
      const doc = user
        ? medicosList.find(
            (m) =>
              m.usuario_id === user.id ||
              (m.email && m.email.toLowerCase() === user.email.toLowerCase())
          )
        : null;

      if (doc) {
        const [citasRes, consultasRes] = await Promise.allSettled([
          citasApi.list({
            medico_id: doc.id,
            sucursal_id: sucursalActiva?.id,
            fecha_inicio: todayStr,
            fecha_fin: todayStr,
          }),
          consultasApi.getConsultas({
            medico_id: doc.id,
            sucursal_id: sucursalActiva?.id,
          }),
        ]);

        if (citasRes.status === 'fulfilled') {
          setCitas(citasRes.value || []);
        }
        if (consultasRes.status === 'fulfilled') {
          setConsultas(consultasRes.value || []);
        }
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard médico:', err);
      toast.error('No se pudieron cargar todas las métricas del consultorio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, sucursalActiva?.id]);

  // Fecha de hoy en formato amigable
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const formattedToday = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Consultas de hoy del médico
  const consultasHoy = useMemo(() => {
    return consultas.filter((c) => {
      const f = c.fecha_consulta?.split('T')[0] || c.created_at?.split('T')[0];
      return f === todayStr;
    });
  }, [consultas, todayStr]);

  // Pacientes en espera hoy
  const enEsperaHoy = useMemo(() => {
    return consultasHoy.filter((c) => c.estado === 'en_espera');
  }, [consultasHoy]);

  // Pacientes en consulta actualmente
  const enConsultaHoy = useMemo(() => {
    return consultasHoy.filter((c) => c.estado === 'en_curso');
  }, [consultasHoy]);

  // Pacientes atendidos hoy
  const atendidasHoy = useMemo(() => {
    return consultasHoy.filter((c) => c.estado === 'finalizada');
  }, [consultasHoy]);

  // Total pacientes únicos atendidos por este médico
  const totalPacientesUnicos = useMemo(() => {
    const ids = new Set(consultas.map((c) => c.paciente_id));
    return ids.size;
  }, [consultas]);

  // Filtrado de la lista rápida de pacientes de hoy
  const filteredConsultasHoy = useMemo(() => {
    return consultasHoy.filter((c) => {
      if (activeTab === 'espera' && c.estado !== 'en_espera') return false;
      if (activeTab === 'consulta' && c.estado !== 'en_curso') return false;
      if (activeTab === 'atendidas' && c.estado !== 'finalizada') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pacNom = `${c.paciente?.nombres || ''} ${c.paciente?.apellidos || ''}`.toLowerCase();
        const doc = (c.paciente?.documento_identidad || c.paciente?.numero_documento || '').toLowerCase();
        const mot = (c.motivo_consulta || '').toLowerCase();
        if (!pacNom.includes(q) && !doc.includes(q) && !mot.includes(q)) return false;
      }
      return true;
    });
  }, [consultasHoy, activeTab, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── HERO BANNER EJECUTIVO MÉDICO ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-500/20 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold tracking-wide">
                <HeartPulse className="size-3.5 text-teal-400" />
                PANEL DEL FACULTATIVO • MEDISOFT CLÍNICO
              </span>
              {doctorEspecialidad && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: `${doctorEspecialidad.color || '#0ea5e9'}20`,
                    borderColor: `${doctorEspecialidad.color || '#0ea5e9'}40`,
                    color: doctorEspecialidad.color || '#38bdf8',
                  }}
                >
                  <Stethoscope className="size-3" />
                  {doctorEspecialidad.nombre}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>
                Dr(a). {currentDoctor ? `${currentDoctor.nombres} ${currentDoctor.apellidos}` : `${user?.nombre} ${user?.apellido}`}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bienvenido a su espacio clínico. Aquí dispone de una vista centralizada de su jornada asistencial,
              pacientes en sala de espera, consultas en progreso y acceso directo a sus expedientes.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-medium">
              <span className="flex items-center gap-1.5 capitalize text-teal-200">
                <Calendar className="size-3.5 text-teal-400" />
                {formattedToday}
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="size-3.5 text-teal-400" />
                {sucursalActiva?.nombre || 'Sede Principal'}
              </span>
              {currentDoctor?.licencia_medica && (
                <span className="flex items-center gap-1.5 text-slate-300 font-mono">
                  <ShieldCheck className="size-3.5 text-teal-400" />
                  Licencia: {currentDoctor.licencia_medica}
                </span>
              )}
            </div>
          </div>

          {/* Acciones Rápidas del Hero */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => navigate('/clinica/consultas/sala-espera')}
              size="sm"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg shadow-teal-500/20 cursor-pointer text-xs h-9"
            >
              <Hourglass className="size-4 mr-1.5" />
              <span>Sala de Espera</span>
              {enEsperaHoy.length > 0 && (
                <Badge className="ml-2 bg-slate-950 text-teal-300 border-none font-bold text-[10px] px-1.5 py-0">
                  {enEsperaHoy.length}
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => navigate('/clinica/agenda')}
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white cursor-pointer text-xs h-9 backdrop-blur-md"
            >
              <CalendarDays className="size-4 mr-1.5 text-teal-300" />
              <span>Mi Agenda</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── TARJETAS KPI DE ATENCIÓN MÉDICA ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* 1. Sala de Espera */}
        <Card
          onClick={() => navigate('/clinica/consultas/sala-espera')}
          className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-amber-500/40 hover:shadow-md transition cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span>En Espera (Hoy)</span>
                {enEsperaHoy.length > 0 && (
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {enEsperaHoy.length}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors flex items-center gap-1">
                <span>Ver lista de espera</span>
                <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Hourglass className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 2. En Consulta Activa */}
        <Card
          onClick={() => navigate('/clinica/consultas/en-consulta')}
          className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-primary/40 hover:shadow-md transition cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span>En Consulta</span>
                {enConsultaHoy.length > 0 && (
                  <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
                )}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {enConsultaHoy.length}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors flex items-center gap-1">
                <span>Atención activa</span>
                <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 3. Atendidas Hoy */}
        <Card
          onClick={() => navigate('/clinica/consultas/atendidas')}
          className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 hover:shadow-md transition cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Atendidas (Hoy)</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {atendidasHoy.length}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors flex items-center gap-1">
                <span>Historial del día</span>
                <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Citas Programadas Hoy */}
        <Card
          onClick={() => navigate('/clinica/agenda')}
          className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-teal-500/40 hover:shadow-md transition cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Citas de Hoy</p>
              <h3 className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">
                {citas.length || consultasHoy.length}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors flex items-center gap-1">
                <span>Revisar agenda</span>
                <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <CalendarDays className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── CUERPO PRINCIPAL: 2 COLUMNAS (LISTA DE PACIENTES + WIDGETS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: Flujo de Pacientes de Hoy (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/70 bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <Stethoscope className="size-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Pacientes y Consultas de Hoy
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Flujo de atención de su consultorio para la jornada actual
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-44 sm:w-52">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Buscar paciente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Pestañas de Estado */}
              <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setActiveTab('todas')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    activeTab === 'todas'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  Todas ({consultasHoy.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('espera')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
                    activeTab === 'espera'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  <span>En Espera</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-bold">
                    {enEsperaHoy.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('consulta')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
                    activeTab === 'consulta'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  <span>En Consulta</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-bold">
                    {enConsultaHoy.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('atendidas')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
                    activeTab === 'atendidas'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  <span>Atendidas</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-bold">
                    {atendidasHoy.length}
                  </span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Cargando consultas de la jornada...
                </div>
              ) : filteredConsultasHoy.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">
                      {searchQuery
                        ? 'No se encontraron pacientes con ese criterio'
                        : activeTab === 'espera'
                        ? 'No hay pacientes en sala de espera en este momento'
                        : activeTab === 'consulta'
                        ? 'No hay consultas activas en curso'
                        : 'No tiene citas registradas para hoy'}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery
                        ? 'Intente con otro nombre o documento de identidad.'
                        : 'Puede consultar la agenda general o revisar el directorio de pacientes.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/clinica/agenda')}
                      className="text-xs cursor-pointer"
                    >
                      <CalendarDays className="size-3.5 mr-1.5" />
                      Ver Agenda Completa
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredConsultasHoy.map((c) => {
                    const pac = c.paciente;
                    const nombrePac = pac ? `${pac.nombres} ${pac.apellidos}` : 'Paciente sin nombre';
                    const docId = pac?.documento_identidad || pac?.numero_documento || 'S/D';

                    let estadoBadge = (
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                        En Espera
                      </Badge>
                    );
                    if (c.estado === 'en_curso') {
                      estadoBadge = (
                        <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                          En Consulta
                        </Badge>
                      );
                    } else if (c.estado === 'finalizada') {
                      estadoBadge = (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          Atendida
                        </Badge>
                      );
                    }

                    return (
                      <div
                        key={c.id}
                        className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 font-black text-xs border border-teal-500/20">
                            {getInitials(nombrePac)}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate">
                                {nombrePac}
                              </span>
                              {estadoBadge}
                              {c.preconsulta?.estado === 'completada' && (
                                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                                  Triaje Listo
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                              <span>Doc: {docId}</span>
                              {pac?.telefono && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3 text-muted-foreground" />
                                  {pac.telefono}
                                </span>
                              )}
                              {c.cita?.hora_inicio && (
                                <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold">
                                  <Clock className="size-3" />
                                  {c.cita.hora_inicio}
                                </span>
                              )}
                            </div>
                            {c.motivo_consulta && (
                              <p className="text-xs text-foreground/80 font-medium truncate max-w-md">
                                <span className="text-muted-foreground font-normal">Motivo: </span>
                                {c.motivo_consulta}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botones de Acción Inmediata */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {c.estado === 'en_espera' && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/clinica/consultas/${c.id}/atencion`)}
                              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs h-8 cursor-pointer shadow-xs"
                            >
                              <Stethoscope className="size-3.5 mr-1" />
                              <span>Atender</span>
                            </Button>
                          )}

                          {c.estado === 'en_curso' && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/clinica/consultas/${c.id}/atencion`)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 cursor-pointer shadow-xs"
                            >
                              <Activity className="size-3.5 mr-1" />
                              <span>Continuar</span>
                            </Button>
                          )}

                          {c.estado === 'finalizada' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/clinica/consultas/${c.id}/detalle`)}
                              className="text-xs h-8 cursor-pointer border-border/80"
                            >
                              <FileText className="size-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                              <span>Ver Ficha</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Widgets y Perfil Profesional (1/3) */}
        <div className="space-y-4">
          {/* Tarjeta Perfil del Médico */}
          <Card className="border-border/70 bg-card shadow-xs overflow-hidden">
            <div
              className="h-2 w-full"
              style={{ backgroundColor: doctorEspecialidad?.color || '#0d9488' }}
            />
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-black text-sm">
                  {getInitials(
                    currentDoctor
                      ? `${currentDoctor.nombres} ${currentDoctor.apellidos}`
                      : user?.nombre || 'Doc'
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate">
                    Dr(a). {currentDoctor ? `${currentDoctor.nombres} ${currentDoctor.apellidos}` : user?.nombre}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {doctorEspecialidad?.nombre || 'Especialista Médico'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Licencia / Colegiado</span>
                  <p className="font-mono font-bold text-foreground">
                    {currentDoctor?.licencia_medica || 'N/A'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Pacientes</span>
                  <p className="font-mono font-black text-teal-600 dark:text-teal-400 text-sm">
                    {totalPacientesUnicos}
                  </p>
                </div>
              </div>

              {currentDoctor?.email && (
                <div className="pt-2 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                    Correo Electrónico
                  </span>
                  <span className="text-xs text-foreground font-mono truncate block">
                    {currentDoctor.email}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accesos Directos Clínicos */}
          <Card className="border-border/70 bg-card shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-teal-500" />
                <span>Accesos Asistenciales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <Link
                to="/clinica/consultas/sala-espera"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 transition text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Hourglass className="size-3.5" />
                  </div>
                  <span>Sala de Espera</span>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-[10px]">
                  {enEsperaHoy.length}
                </Badge>
              </Link>

              <Link
                to="/clinica/agenda"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 transition text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <CalendarDays className="size-3.5" />
                  </div>
                  <span>Agenda y Turnos</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/administracion/servicios"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 transition text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Layers className="size-3.5" />
                  </div>
                  <span>Servicios de Mi Especialidad</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/clinica/pacientes"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 transition text-xs font-semibold text-foreground group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Users className="size-3.5" />
                  </div>
                  <span>Directorio de Pacientes</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>

          {/* Tarjeta Informativa de Buenas Prácticas Clínicas */}
          <div className="p-4 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-teal-500/10 to-transparent space-y-2">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-bold text-xs">
              <ShieldCheck className="size-4 text-teal-500" />
              <span>Recordatorio Clínico</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Recuerde registrar el examen físico, diagnósticos principales y generar la receta electrónica o estudios solicitados antes de finalizar cada consulta para mantener el expediente al día.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
