import React, { useEffect, useState, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { empresasApi } from '../../api/empresas';
import { planesApi } from '../../api/planes';
import { suscripcionesApi } from '../../api/suscripciones';
import type { Empresa, Plan, SuscripcionEmpresa } from '../../types';
import type { PagoSuscripcion } from '../../api/suscripciones';
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
  Building2,
  CreditCard,
  Layers,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  CalendarDays,
  Crown,
  BarChart3,
  PieChart,
  Globe,
  Hourglass,
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { toast } from 'sonner';

const ApexChart = React.lazy(() => import('../../components/charts/ApexChart'));

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const planEstadoBadge = (estado?: string | null) => {
  switch (estado) {
    case 'activo':
      return <Badge variant="teal">Activo</Badge>;
    case 'vencido':
      return <Badge variant="destructive">Vencido</Badge>;
    case 'suspendido':
      return <Badge variant="secondary">Suspendido</Badge>;
    default:
      return <Badge variant="outline">Sin Plan</Badge>;
  }
};

const pagoBadge = (estado: string) => {
  if (estado === 'approved')
    return <Badge variant="teal">Aprobado</Badge>;
  if (estado === 'rejected')
    return <Badge variant="destructive">Rechazado</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-600 border-amber-400/30">Pendiente</Badge>;
};

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
  loading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, colorClass, sub, loading }) => (
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
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Guard: solo superadmin o empresa_id === 1
  const isSuperAdmin = Boolean(user?.es_superadmin || user?.empresa_id === 1);
  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [suscripciones, setSuscripciones] = useState<SuscripcionEmpresa[]>([]);
  const [pagosPendientes, setPagosPendientes] = useState<PagoSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [empRes, planRes, suscRes, pagRes] = await Promise.allSettled([
        empresasApi.list(),
        planesApi.list(),
        planesApi.getTodasSuscripciones(),
        suscripcionesApi.getPagosPendientes(),
      ]);
      if (empRes.status === 'fulfilled') setEmpresas(empRes.value);
      if (planRes.status === 'fulfilled') setPlanes(planRes.value);
      if (suscRes.status === 'fulfilled') setSuscripciones(suscRes.value);
      if (pagRes.status === 'fulfilled') setPagosPendientes(pagRes.value);
    } catch (e) {
      console.error('Error cargando datos admin:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── KPIs derivados ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const activas = suscripciones.filter(s => s.plan_estado === 'activo').length;
    const vencidas = suscripciones.filter(s => s.plan_estado === 'vencido').length;
    return {
      totalEmpresas: empresas.length,
      suscripcionesActivas: activas,
      vencidas,
      pagosPendientesCount: pagosPendientes.length,
    };
  }, [empresas, suscripciones, pagosPendientes]);

  // ── Empresas recientes ──────────────────────────────────────────────────

  const empresasRecientes = useMemo(
    () => [...empresas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    [empresas]
  );

  // ── Distribución de planes para Donut Chart ─────────────────────────────

  const donutSeries = useMemo(() => {
    const counts: Record<string, number> = {};
    suscripciones.forEach(s => {
      const nombre = s.plan_activo?.nombre ?? 'Sin plan';
      counts[nombre] = (counts[nombre] ?? 0) + 1;
    });
    return { labels: Object.keys(counts), series: Object.values(counts) };
  }, [suscripciones]);

  // ── Empresas registradas por mes (últimos 6 meses) — Bar Chart ──────────

  const barChartData = useMemo(() => {
    const now = new Date();
    const meses: string[] = [];
    const conteos: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
      const count = empresas.filter(e => {
        const ec = new Date(e.created_at);
        return ec.getFullYear() === d.getFullYear() && ec.getMonth() === d.getMonth();
      }).length;
      meses.push(label);
      conteos.push(count);
    }
    return { categories: meses, series: conteos };
  }, [empresas]);

  // ── Top planes ──────────────────────────────────────────────────────────

  const topPlanes = useMemo(() => {
    const counts: Record<string, { plan: Plan; count: number }> = {};
    suscripciones.forEach(s => {
      if (!s.plan_activo) return;
      const key = String(s.plan_activo.id);
      if (!counts[key]) counts[key] = { plan: s.plan_activo, count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [suscripciones]);

  const maxPlanCount = topPlanes[0]?.count ?? 1;

  // ── ApexCharts Options ─────────────────────────────────────────────────

  const isDark = document.documentElement.classList.contains('dark');
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  const donutOptions: ApexOptions = {
    labels: donutSeries.labels,
    colors: ['#0d9488', '#0891b2', '#7c3aed', '#f59e0b', '#ef4444'],
    legend: { position: 'bottom', fontSize: '11px', labels: { colors: mutedText } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Empresas', fontSize: '11px' } } } } },
    stroke: { width: 2 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  const barOptions: ApexOptions = {
    xaxis: { categories: barChartData.categories, labels: { style: { colors: mutedText, fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: mutedText, fontSize: '11px' } }, tickAmount: 4 },
    colors: ['#0d9488'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 3 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 border border-violet-500/20 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-200 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>MEDISOFT ADMIN · Panel Super Administrador</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Panel de Control Global
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Visión integral de todas las empresas, suscripciones activas, planes contratados y pagos pendientes de aprobación.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Operador</span>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-violet-200 mt-0.5">
                <Globe className="w-4 h-4 text-violet-300 shrink-0" />
                <span className="truncate">{user.nombre} {user.apellido}</span>
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
          label="Empresas / Clínicas"
          value={kpis.totalEmpresas}
          icon={<Building2 className="w-4 h-4" />}
          colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          sub="Total de instituciones registradas"
          loading={loading}
        />
        <KpiCard
          label="Suscripciones Activas"
          value={kpis.suscripcionesActivas}
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          sub="Planes vigentes con acceso completo"
          loading={loading}
        />
        <KpiCard
          label="Pagos Pendientes"
          value={kpis.pagosPendientesCount}
          icon={<Hourglass className="w-4 h-4" />}
          colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          sub="Requieren revisión y aprobación"
          loading={loading}
        />
        <KpiCard
          label="Suscripciones Vencidas"
          value={kpis.vencidas}
          icon={<XCircle className="w-4 h-4" />}
          colorClass="bg-rose-500/10 text-rose-500 dark:text-rose-400"
          sub="Clientes con acceso suspendido"
          loading={loading}
        />
      </div>

      {/* ── CHARTS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar: Empresas por mes */}
        <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-violet-500" />
                Nuevas Empresas por Mes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Empresas registradas en los últimos 6 meses
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono border-violet-500/30 text-violet-600 dark:text-violet-400">
              Últimos 6 meses
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Cargando gráfico...</div>}>
              <ApexChart
                type="bar"
                options={barOptions}
                series={[{ name: 'Empresas', data: barChartData.series }]}
                height={250}
              />
            </React.Suspense>
          </CardContent>
        </Card>

        {/* Donut: Distribución de planes */}
        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieChart className="size-4 text-teal-500" />
              Distribución por Plan
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Empresas agrupadas por plan activo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {donutSeries.series.length > 0 ? (
              <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Cargando gráfico...</div>}>
                <ApexChart
                  type="donut"
                  options={donutOptions}
                  series={donutSeries.series}
                  height={250}
                />
              </React.Suspense>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                Sin datos de suscripciones aún
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── LOWER GRID: empresas recientes + top planes ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Empresas recientes */}
        <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                <Building2 className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">Empresas Recientes</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Últimas {empresasRecientes.length} instituciones registradas
                </CardDescription>
              </div>
            </div>
            <Link to="/seguridad/empresas">
              <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
                Ver todas <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : empresasRecientes.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay empresas registradas aún.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {empresasRecientes.map((emp) => {
                  const susc = suscripciones.find(s => s.empresa_id === emp.id);
                  return (
                    <div key={emp.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      {/* Avatar */}
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs border border-violet-500/20">
                        {emp.logo_mini_url
                          ? <img src={emp.logo_mini_url} alt={emp.nombre} className="w-full h-full object-contain rounded-xl" />
                          : getInitials(emp.nombre)
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{emp.nombre}</span>
                          {!emp.activo && <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground truncate">
                            {emp.ciudad || emp.pais?.nombre || 'Sin ubicación'}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <CalendarDays className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                          <span className="text-[11px] text-muted-foreground">{fmtDate(emp.created_at)}</span>
                        </div>
                      </div>
                      {/* Plan estado */}
                      <div className="shrink-0 text-right">
                        {susc ? planEstadoBadge(susc.plan_estado) : planEstadoBadge(null)}
                        {susc?.plan_activo && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{susc.plan_activo.nombre}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna derecha: Top Planes + Pagos Pendientes */}
        <div className="space-y-6">

          {/* Top Planes */}
          <Card className="border-border/70 bg-card shadow-xs">
            <CardHeader className="p-5 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-teal-500" />
                Planes Más Contratados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {loading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)
              ) : topPlanes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin datos de suscripciones</p>
              ) : (
                topPlanes.map(({ plan, count }) => (
                  <div key={plan.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{plan.nombre}</span>
                      </div>
                      <span className="text-xs font-black text-teal-600 dark:text-teal-400">{count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((count / maxPlanCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              <Link to="/saas/planes">
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 mt-2">
                  <span>Gestionar Planes</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pagos Pendientes */}
          <Card className="border-border/70 bg-card shadow-xs">
            <CardHeader className="p-5 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="size-4 text-amber-500" />
                Pagos por Aprobar
                {kpis.pagosPendientesCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[11px] font-bold">
                    {kpis.pagosPendientesCount}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {loading ? (
                [...Array(2)].map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)
              ) : pagosPendientes.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-5 text-center">
                  <CheckCircle2 className="w-8 h-8 text-teal-500/50" />
                  <p className="text-xs text-muted-foreground">Sin pagos pendientes</p>
                </div>
              ) : (
                pagosPendientes.slice(0, 4).map(pago => (
                  <div key={pago.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {pago.plan?.nombre ?? `Pago #${pago.id}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{fmtDate(pago.created_at)}</p>
                    </div>
                    {pagoBadge(pago.estado)}
                  </div>
                ))
              )}
              {pagosPendientes.length > 0 && (
                <Link to="/saas/suscripciones">
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-amber-600 hover:bg-amber-500/10 mt-1">
                    <span>Revisar todos los pagos</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
