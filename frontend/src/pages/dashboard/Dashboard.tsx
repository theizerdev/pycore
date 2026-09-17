import React, { useEffect, useState, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pacientesApi } from '../../api/pacientes';
import { citasApi } from '../../api/citas';
import { consultasApi, type ConsultaMedica } from '../../api/consultas';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import type { CitaMedica, Medico, Especialidad } from '../../types';
import type { ApexOptions } from 'apexcharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Users,
  Stethoscope,
  CalendarDays,
  Activity,
  ArrowRight,
  RefreshCw,
  HeartPulse,
  BarChart3,
  PieChart,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { toast } from 'sonner';

const ApexChart = React.lazy(() => import('../../components/charts/ApexChart'));

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtHora = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short' });
};

const citaEstadoBadge = (estado: string) => {
  const map: Record<string, React.ReactNode> = {
    programada: <Badge className="bg-blue-500/15 text-blue-600 border-blue-400/30 text-[10px]">Programada</Badge>,
    confirmada: <Badge variant="teal" className="text-[10px]">Confirmada</Badge>,
    en_sala: <Badge className="bg-amber-500/15 text-amber-600 border-amber-400/30 text-[10px]">En sala</Badge>,
    en_consulta: <Badge className="bg-violet-500/15 text-violet-600 border-violet-400/30 text-[10px]">En consulta</Badge>,
    completada: <Badge variant="teal" className="text-[10px]">Completada</Badge>,
    cancelada: <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>,
    no_asistio: <Badge variant="secondary" className="text-[10px]">No asistió</Badge>,
  };
  return map[estado] ?? <Badge variant="outline" className="text-[10px]">{estado}</Badge>;
};

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
  loading?: boolean;
  trend?: { value: number; label: string };
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, colorClass, sub, loading, trend }) => (
  <Card className="hover:shadow-md hover:border-teal-500/30 transition-all duration-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-semibold text-muted-foreground">{label}</CardTitle>
      <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center', colorClass)}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black tracking-tight text-foreground">
        {loading ? <span className="inline-block w-10 h-7 rounded bg-muted animate-pulse" /> : value}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        {trend && (
          <span className={cn('text-[11px] font-semibold', trend.value >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500')}>
            {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { user, sucursalActiva } = useAuth();

  // Redirect superadmin to admin dashboard
  if (user?.es_superadmin || user?.empresa_id === 1) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Redirect doctors
  if (user?.rol?.slug === 'medico') {
    return <Navigate to="/medico/dashboard" replace />;
  }

  const todayIso = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const mesInicioIso = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  }, []);

  // ── State ──────────────────────────────────────────────────────────────
  const [pacientesCount, setPacientesCount] = useState(0);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [citasHoy, setCitasHoy] = useState<CitaMedica[]>([]);
  const [citasMes, setCitasMes] = useState<CitaMedica[]>([]);
  const [consultasMes, setConsultasMes] = useState<ConsultaMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [pacRes, medRes, espRes, citHoyRes, citMesRes, consRes] = await Promise.allSettled([
        pacientesApi.list({ limit: 1 }),
        medicosApi.list(),
        especialidadesApi.list(),
        citasApi.list({ fecha_inicio: todayIso, fecha_fin: todayIso }),
        citasApi.list({ fecha_inicio: mesInicioIso, fecha_fin: todayIso }),
        consultasApi.getConsultas({ fecha_desde: mesInicioIso, fecha_hasta: todayIso }),
      ]);

      const allPac = await pacientesApi.list();
      setPacientesCount(allPac.length);

      if (medRes.status === 'fulfilled') setMedicos(medRes.value);
      if (espRes.status === 'fulfilled') setEspecialidades(espRes.value);
      if (citHoyRes.status === 'fulfilled') setCitasHoy(citHoyRes.value);
      if (citMesRes.status === 'fulfilled') setCitasMes(citMesRes.value);
      if (consRes.status === 'fulfilled') setConsultasMes(consRes.value);
    } catch (e) {
      console.error('Error cargando dashboard clínico:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── KPIs ───────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    pacientes: pacientesCount,
    consultasMes: consultasMes.length,
    doctoresActivos: medicos.filter(m => m.activo).length,
    citasHoy: citasHoy.length,
  }), [pacientesCount, consultasMes, medicos, citasHoy]);

  // ── Chart 1: Consultas de los últimos 7 días (Area) ────────────────────
  const areaChartData = useMemo(() => {
    const days: string[] = [];
    const counts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toLocaleDateString('en-CA');
      const label = d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' });
      days.push(label);
      counts.push(
        consultasMes.filter(c => (c.fecha_consulta || c.created_at || '').startsWith(iso)).length
      );
    }
    return { categories: days, series: counts };
  }, [consultasMes]);

  // ── Chart 2: Estado de citas del mes (Donut) ───────────────────────────
  const donutData = useMemo(() => {
    const estadoMap: Record<string, number> = {};
    citasMes.forEach(c => {
      estadoMap[c.estado] = (estadoMap[c.estado] ?? 0) + 1;
    });
    const labels = Object.keys(estadoMap).map(e => e.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
    return { labels, series: Object.values(estadoMap) };
  }, [citasMes]);

  // ── Chart 3: Top 5 especialidades (Bar horizontal) ─────────────────────
  const topEspecialidades = useMemo(() => {
    const counts: Record<number, number> = {};
    consultasMes.forEach(c => {
      if (c.especialidad_id) counts[c.especialidad_id] = (counts[c.especialidad_id] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({
        especialidad: especialidades.find(e => e.id === Number(id)),
        count,
      }))
      .filter(x => x.especialidad)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [consultasMes, especialidades]);

  const isDark = document.documentElement.classList.contains('dark');
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  // ── ApexCharts Options ─────────────────────────────────────────────────

  const areaOptions: ApexOptions = {
    xaxis: { categories: areaChartData.categories, labels: { style: { colors: mutedText, fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: mutedText, fontSize: '11px' } }, tickAmount: 4, min: 0 },
    colors: ['#0d9488'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    stroke: { curve: 'smooth', width: 2.5 },
    dataLabels: { enabled: false },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 3 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    markers: { size: 4, colors: ['#0d9488'], strokeColors: '#fff', strokeWidth: 2 },
  };

  const donutOptions: ApexOptions = {
    labels: donutData.labels,
    colors: ['#0d9488', '#0891b2', '#f59e0b', '#ef4444', '#8b5cf6'],
    legend: { position: 'bottom', fontSize: '11px', labels: { colors: mutedText } },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: { show: true, total: { show: true, label: 'Citas', fontSize: '11px', color: mutedText } },
        },
      },
    },
    stroke: { width: 2 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  const barEspOptions: ApexOptions = {
    xaxis: {
      categories: topEspecialidades.map(x => x.especialidad?.nombre ?? ''),
      labels: { style: { colors: mutedText, fontSize: '11px' } },
    },
    yaxis: {
      labels: { style: { colors: mutedText, fontSize: '11px' } },
    },
    colors: ['#0d9488'],
    plotOptions: { bar: { borderRadius: 5, horizontal: true, barHeight: '60%' } },
    dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#fff'] } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 3 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  // ── Citas de hoy ordenadas ─────────────────────────────────────────────
  const citasHoyOrdenadas = useMemo(
    () => [...citasHoy].sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')).slice(0, 7),
    [citasHoy]
  );

  // ── Doctores activos ───────────────────────────────────────────────────
  const medicosActivos = useMemo(
    () => medicos.filter(m => m.activo).slice(0, 5),
    [medicos]
  );

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-500/20 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -mb-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>MEDISOFT · Panel Clínico Asistencial</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Bienvenido, {user?.nombre} {user?.apellido}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Resumen operativo de pacientes, consultas, citas del día y rendimiento de especialidades médicas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Sede Activa</span>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-teal-300 mt-0.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="truncate">{sucursalActiva?.nombre || 'Sede Central'}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { loadData(true); toast.success('Datos actualizados'); }}
              disabled={refreshing}
              className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', refreshing && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pacientes Registrados"
          value={kpis.pacientes}
          icon={<Users className="w-4 h-4" />}
          colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          sub="Total en el sistema"
          loading={loading}
        />
        <KpiCard
          label="Consultas del Mes"
          value={kpis.consultasMes}
          icon={<Stethoscope className="w-4 h-4" />}
          colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          sub={`Desde el 1 del mes`}
          loading={loading}
        />
        <KpiCard
          label="Doctores Activos"
          value={kpis.doctoresActivos}
          icon={<Activity className="w-4 h-4" />}
          colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          sub="Con acceso al sistema"
          loading={loading}
        />
        <KpiCard
          label="Citas de Hoy"
          value={kpis.citasHoy}
          icon={<CalendarDays className="w-4 h-4" />}
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          sub={new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          loading={loading}
        />
      </div>

      {/* ── CHARTS ROW 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area: Consultas últimos 7 días */}
        <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-teal-500" />
                Consultas — Últimos 7 Días
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Evolución diaria de consultas médicas atendidas
              </CardDescription>
            </div>
            <Link to="/clinica/consultas/sala-espera">
              <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
                Ver consultas <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <React.Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Cargando gráfico...</div>}>
              <ApexChart
                type="area"
                options={areaOptions}
                series={[{ name: 'Consultas', data: areaChartData.series }]}
                height={240}
              />
            </React.Suspense>
          </CardContent>
        </Card>

        {/* Donut: Estado citas del mes */}
        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieChart className="size-4 text-cyan-500" />
              Estado de Citas del Mes
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {citasMes.length} citas agendadas este mes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {donutData.series.length > 0 ? (
              <React.Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Cargando gráfico...</div>}>
                <ApexChart
                  type="donut"
                  options={donutOptions}
                  series={donutData.series}
                  height={240}
                />
              </React.Suspense>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <CalendarDays className="w-10 h-10 opacity-30" />
                <p className="text-xs">Sin citas este mes aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── CHARTS ROW 2 + LOWER PANELS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar horizontal: Top especialidades */}
        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-indigo-500" />
              Top Especialidades
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Consultas por especialidad este mes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {topEspecialidades.length > 0 ? (
              <React.Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Cargando gráfico...</div>}>
                <ApexChart
                  type="bar"
                  options={barEspOptions}
                  series={[{ name: 'Consultas', data: topEspecialidades.map(x => x.count) }]}
                  height={240}
                />
              </React.Suspense>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Stethoscope className="w-10 h-10 opacity-30" />
                <p className="text-xs">Sin datos de especialidades aún</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Citas de hoy */}
        <Card className="border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CalendarDays className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Agenda de Hoy</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {kpis.citasHoy} citas programadas
                </CardDescription>
              </div>
            </div>
            <Link to="/clinica/agenda">
              <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
                Ver agenda <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : citasHoyOrdenadas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 opacity-30" />
                <p className="text-xs">Sin citas agendadas para hoy</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {citasHoyOrdenadas.map(cita => (
                  <div key={cita.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="shrink-0 text-center">
                      <div className="text-[11px] font-black text-teal-600 dark:text-teal-400">{fmtHora(cita.hora_inicio)}</div>
                      {cita.hora_fin && <div className="text-[10px] text-muted-foreground">{fmtHora(cita.hora_fin)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {cita.paciente_nombre || `Cita #${cita.id}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {cita.especialidad_nombre ?? cita.medico_nombre ?? '—'}
                      </p>
                    </div>
                    <div className="shrink-0">{citaEstadoBadge(cita.estado)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctores activos */}
        <Card className="border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Stethoscope className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Doctores Activos</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {kpis.doctoresActivos} médicos en el sistema
                </CardDescription>
              </div>
            </div>
            <Link to="/clinica/doctores">
              <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
                Ver todos <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : medicosActivos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Activity className="w-10 h-10 opacity-30" />
                <p className="text-xs">Sin doctores registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {medicosActivos.map(medico => {
                  const citasDoc = citasHoy.filter(c => c.medico_id === medico.id).length;
                  return (
                    <div key={medico.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20 shrink-0 overflow-hidden">
                        {getInitials(`${medico.nombres} ${medico.apellidos}`)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          Dr. {medico.nombres} {medico.apellidos}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {medico.especialidad_nombre ?? 'Sin especialidad'}
                        </p>
                      </div>
                      {citasDoc > 0 && (
                        <Badge className="bg-teal-500/15 text-teal-600 border-teal-400/30 text-[10px]">
                          {citasDoc} hoy
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;
