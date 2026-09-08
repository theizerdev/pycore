import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRegional } from '../../context/RegionalContext';
import { citasApi } from '../../api/citas';
import { consultasApi, type ConsultaMedica } from '../../api/consultas';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import type { CitaMedica, Medico, Especialidad } from '../../types';
import { ApexChart } from '../../components/charts/ApexChart';
import type { ApexOptions } from 'apexcharts';
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
  RefreshCw,
  DollarSign,
  HeartPulse,
  PieChart,
  BarChart3,
  CalendarRange,
  Filter,
  Coins,
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { toast } from 'sonner';

type DateRangePreset = 'hoy' | 'semana' | 'mes' | '30dias' | 'personalizado';

export const MedicoDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, sucursalActiva } = useAuth();
  const {
    formatMoney,
    formatMoneyDual,
    tasaBcv,
    tasaBcvFecha,
    tasaBcvFuente,
    refreshBcvRate,
    moneda,
  } = useRegional();

  // Estados de datos
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [citasRango, setCitasRango] = useState<CitaMedica[]>([]);
  const [consultasRango, setConsultasRango] = useState<ConsultaMedica[]>([]);
  const [consultasHoy, setConsultasHoy] = useState<ConsultaMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de Rango de Fechas
  const todayIso = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [dateRangeMode, setDateRangeMode] = useState<DateRangePreset>('mes');
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [fechaHasta, setFechaHasta] = useState<string>(todayIso);

  // Filtros de tabla de pacientes
  const [activeTab, setActiveTab] = useState<'hoy_espera' | 'hoy_consulta' | 'hoy_todas' | 'rango_todas'>('hoy_espera');
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

  // Manejo de preset de fechas
  const handleSelectPreset = (preset: DateRangePreset) => {
    setDateRangeMode(preset);
    const now = new Date();
    const hoyStr = now.toLocaleDateString('en-CA');

    if (preset === 'hoy') {
      setFechaDesde(hoyStr);
      setFechaHasta(hoyStr);
    } else if (preset === 'semana') {
      const d = new Date();
      d.setDate(now.getDate() - 6);
      setFechaDesde(d.toLocaleDateString('en-CA'));
      setFechaHasta(hoyStr);
    } else if (preset === 'mes') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setFechaDesde(d.toLocaleDateString('en-CA'));
      setFechaHasta(hoyStr);
    } else if (preset === '30dias') {
      const d = new Date();
      d.setDate(now.getDate() - 29);
      setFechaDesde(d.toLocaleDateString('en-CA'));
      setFechaHasta(hoyStr);
    }
  };

  // Carga de datos principal
  const fetchData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [medRes, espRes] = await Promise.allSettled([
        medicosApi.list({ activo: true }),
        especialidadesApi.list({ activo: true }),
      ]);

      const medicosList = medRes.status === 'fulfilled' ? medRes.value : [];
      setMedicos(medicosList);

      if (espRes.status === 'fulfilled') {
        setEspecialidades(espRes.value);
      }

      const doc = user
        ? medicosList.find(
            (m) =>
              m.usuario_id === user.id ||
              (m.email && m.email.toLowerCase() === user.email.toLowerCase())
          )
        : null;

      if (doc) {
        const [citasRangoRes, consultasRangoRes, consultasHoyRes] = await Promise.allSettled([
          citasApi.list({
            medico_id: doc.id,
            sucursal_id: sucursalActiva?.id,
            fecha_inicio: fechaDesde,
            fecha_fin: fechaHasta,
          }),
          consultasApi.getConsultas({
            medico_id: doc.id,
            sucursal_id: sucursalActiva?.id,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
          }),
          consultasApi.getConsultas({
            medico_id: doc.id,
            sucursal_id: sucursalActiva?.id,
            fecha: todayIso,
          }),
        ]);

        if (citasRangoRes.status === 'fulfilled') {
          setCitasRango(citasRangoRes.value || []);
        }
        if (consultasRangoRes.status === 'fulfilled') {
          setConsultasRango(consultasRangoRes.value || []);
        }
        if (consultasHoyRes.status === 'fulfilled') {
          setConsultasHoy(consultasHoyRes.value || []);
        }
      }

      if (isManualRefresh) {
        toast.success('Métricas del panel médico actualizadas');
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard médico:', err);
      toast.error('Error al actualizar datos del panel médico');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, sucursalActiva?.id, fechaDesde, fechaHasta]);

  // Cálculos de métricas inmediatas de HOY
  const enEsperaHoy = useMemo(() => {
    return consultasHoy.filter((c) => c.estado === 'en_espera');
  }, [consultasHoy]);

  const enConsultaHoy = useMemo(() => {
    return consultasHoy.filter((c) => c.estado === 'en_curso');
  }, [consultasHoy]);

  const atendidasHoy = useMemo(() => {
    return consultasHoy.filter((c) => c.estado === 'finalizada');
  }, [consultasHoy]);

  // Métricas del PERÍODO
  const kpisPeriodo = useMemo(() => {
    const totalConsultas = consultasRango.length;
    const finalizadas = consultasRango.filter((c) => c.estado === 'finalizada').length;
    const citasTotal = citasRango.length;
    const citasCompletadas = citasRango.filter((c) => c.estado === 'atendida').length;

    // Tasa de asistencia/efectividad
    const tasaAsistencia = citasTotal > 0 ? Math.round((citasCompletadas / citasTotal) * 100) : 100;

    // Pacientes únicos
    const pacientesUnicosIds = new Set([
      ...consultasRango.map((c) => c.paciente_id),
      ...citasRango.map((c) => c.paciente_id),
    ]);

    // Estimación económica de prestaciones en el período
    const facturacionEstimada = citasRango.reduce((acc, c) => {
      if (c.estado === 'atendida' || c.estado_pago === 'pagado') {
        return acc + (Number(c.precio_estimado) || 0);
      }
      return acc;
    }, 0);

    return {
      totalConsultas,
      finalizadas,
      citasTotal,
      citasCompletadas,
      tasaAsistencia,
      pacientesUnicos: pacientesUnicosIds.size,
      facturacionEstimada,
    };
  }, [consultasRango, citasRango]);

  // Diagnósticos más frecuentes del período
  const topDiagnosticos = useMemo(() => {
    const conteo: Record<string, number> = {};
    consultasRango.forEach((c) => {
      const diag = c.diagnostico_principal || c.motivo_consulta;
      if (diag && diag.trim()) {
        conteo[diag.trim()] = (conteo[diag.trim()] || 0) + 1;
      }
    });
    return Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [consultasRango]);

  // ── APEXCHARTS 1: Evolución Temporal de Consultas vs Citas (Area Chart) ──
  const chartTimelineData = useMemo(() => {
    // Agrupar por fecha dentro del rango
    const fechasMap: Record<string, { consultas: number; citas: number }> = {};

    // Obtener días intermedios ordenados
    const start = new Date(fechaDesde);
    const end = new Date(fechaHasta);
    const cur = new Date(start);

    while (cur <= end) {
      const key = cur.toLocaleDateString('en-CA');
      fechasMap[key] = { consultas: 0, citas: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    consultasRango.forEach((c) => {
      const d = c.fecha_consulta?.split('T')[0] || c.created_at?.split('T')[0];
      if (d && fechasMap[d]) {
        if (c.estado === 'finalizada') {
          fechasMap[d].consultas += 1;
        }
      }
    });

    citasRango.forEach((c) => {
      const d = c.fecha?.split('T')[0];
      if (d && fechasMap[d]) {
        fechasMap[d].citas += 1;
      }
    });

    const categories = Object.keys(fechasMap).map((f) => {
      const parts = f.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    const seriesConsultas = Object.values(fechasMap).map((v) => v.consultas);
    const seriesCitas = Object.values(fechasMap).map((v) => v.citas);

    return { categories, seriesConsultas, seriesCitas };
  }, [consultasRango, citasRango, fechaDesde, fechaHasta]);

  const timelineChartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'area',
      height: 290,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    colors: ['#0d9488', '#0284c7'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartTimelineData.categories,
      labels: {
        style: { fontSize: '11px', colors: '#94a3b8' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#94a3b8' },
      },
    },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.15)',
      strokeDashArray: 4,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      markers: { size: 5 },
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => `${val} ${val === 1 ? 'paciente' : 'pacientes'}`,
      },
    },
  }), [chartTimelineData.categories]);

  // ── APEXCHARTS 2: Categorías de Atención / Servicios (Donut Chart) ────
  const chartCategoriasData = useMemo(() => {
    const counts: Record<string, number> = {};
    consultasRango.forEach((c) => {
      let cat = 'Consulta Médica';
      if (c.cita?.servicio?.categoria) {
        cat = c.cita.servicio.categoria;
      } else if (c.motivo_consulta && c.motivo_consulta.toLowerCase().includes('control')) {
        cat = 'Control Clínico';
      } else if (c.estudios_solicitados && c.estudios_solicitados.length > 0) {
        cat = 'Estudio / Examen';
      }
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const series = Object.values(counts);

    if (labels.length === 0) {
      return { labels: ['Sin registros'], series: [1] };
    }
    return { labels, series };
  }, [consultasRango]);

  const donutChartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'donut',
      height: 290,
      fontFamily: 'inherit',
    },
    labels: chartCategoriasData.labels,
    colors: ['#0d9488', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981'],
    legend: {
      position: 'bottom',
      fontSize: '11px',
      horizontalAlign: 'center',
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Atenciones',
              fontSize: '13px',
              fontWeight: 700,
              color: '#94a3b8',
              formatter: () => `${consultasRango.length}`,
            },
          },
        },
      },
    },
    tooltip: { theme: 'dark' },
  }), [chartCategoriasData, consultasRango.length]);

  // ── APEXCHARTS 3: Distribución Horaria de Atención (Column Chart) ──────
  const chartHorariosData = useMemo(() => {
    const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const counts = new Array(slots.length).fill(0);

    citasRango.forEach((c) => {
      if (c.hora_inicio) {
        const hourStr = c.hora_inicio.slice(0, 2);
        const hour = parseInt(hourStr, 10);
        if (hour >= 8 && hour <= 17) {
          counts[hour - 8] += 1;
        }
      }
    });

    return { categories: slots, series: counts };
  }, [citasRango]);

  const barHorariosOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      height: 290,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '45%',
      },
    },
    colors: ['#0d9488'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartHorariosData.categories,
      labels: {
        style: { fontSize: '10px', colors: '#94a3b8' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#94a3b8' },
      },
    },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.15)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => `${val} citas`,
      },
    },
  }), [chartHorariosData.categories]);

  // ── APEXCHARTS 4: Tasa de Asistencia / Cumplimiento (RadialBar) ────────
  const radialChartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'radialBar',
      height: 290,
      fontFamily: 'inherit',
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '68%' },
        track: {
          background: 'rgba(148, 163, 184, 0.15)',
          strokeWidth: '100%',
        },
        dataLabels: {
          name: {
            fontSize: '12px',
            color: '#94a3b8',
            offsetY: -8,
          },
          value: {
            fontSize: '24px',
            fontWeight: 800,
            color: '#10b981',
            offsetY: 6,
            formatter: (v: number) => `${v}%`,
          },
        },
      },
    },
    colors: ['#10b981'],
    labels: ['Asistencia'],
  }), []);

  // Lista de pacientes según la pestaña activa
  const pacientesAMostrar = useMemo(() => {
    let sourceList: ConsultaMedica[] = [];
    if (activeTab === 'hoy_espera') {
      sourceList = enEsperaHoy;
    } else if (activeTab === 'hoy_consulta') {
      sourceList = enConsultaHoy;
    } else if (activeTab === 'hoy_todas') {
      sourceList = consultasHoy;
    } else {
      sourceList = consultasRango;
    }

    if (!searchQuery.trim()) return sourceList;

    const q = searchQuery.toLowerCase();
    return sourceList.filter((c) => {
      const pacNom = `${c.paciente?.nombres || ''} ${c.paciente?.apellidos || ''}`.toLowerCase();
      const doc = (c.paciente?.documento_identidad || c.paciente?.numero_documento || '').toLowerCase();
      const mot = (c.motivo_consulta || '').toLowerCase();
      return pacNom.includes(q) || doc.includes(q) || mot.includes(q);
    });
  }, [activeTab, enEsperaHoy, enConsultaHoy, consultasHoy, consultasRango, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── HERO BANNER DEL FACULTATIVO ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-500/20 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold tracking-wide">
                <HeartPulse className="size-3.5 text-teal-400" />
                PANEL CLÍNICO DEL FACULTATIVO • MEDISOFT SUITE
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
              Métricas asistenciales, evolución de atenciones, afluencia de pacientes y flujo en tiempo real
              de su consultorio médico.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="size-3.5 text-teal-400" />
                {sucursalActiva?.nombre || 'Sede Principal'}
              </span>
              {currentDoctor?.licencia_medica && (
                <span className="flex items-center gap-1.5 text-slate-300 font-mono">
                  <ShieldCheck className="size-3.5 text-teal-400" />
                  Licencia / Colegiado: {currentDoctor.licencia_medica}
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

      {/* ── BARRA DE FILTRO POR RANGO DE FECHAS ──────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <CalendarRange className="size-4 text-teal-600 dark:text-teal-400" />
            Período:
          </span>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
            {(
              [
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: '7 Días' },
                { id: 'mes', label: 'Este Mes' },
                { id: '30dias', label: '30 Días' },
                { id: 'personalizado', label: 'Personalizado' },
              ] as { id: DateRangePreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                  dateRangeMode === preset.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas personalizadas y botón refrescar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Desde:</span>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setDateRangeMode('personalizado');
                setFechaDesde(e.target.value);
              }}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Hasta:</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setDateRangeMode('personalizado');
                setFechaHasta(e.target.value);
              }}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-8 text-xs cursor-pointer border-border/80"
          >
            <RefreshCw className={cn('size-3.5 mr-1.5 text-teal-600 dark:text-teal-400', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Cargando...' : 'Actualizar'}</span>
          </Button>

          {/* Badge Tasa Oficial BCV */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl shadow-2xs">
            <Coins className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Tasa BCV:
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                Bs. {tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-muted-foreground">/ USD</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await refreshBcvRate();
                toast.success('Tasa oficial del BCV sincronizada');
              }}
              title="Actualizar tasa del BCV"
              className="p-1 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md transition cursor-pointer ml-0.5"
            >
              <RefreshCw className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── TARJETAS KPI EJECUTIVAS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        {/* 1. Atendidas en el Período */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atendidas (Rango)</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {kpisPeriodo.finalizadas}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Completadas</span>
            </p>
          </CardContent>
        </Card>

        {/* 2. Citas Agendadas */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Citas (Rango)</p>
            <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
              {kpisPeriodo.citasTotal}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
              <CalendarDays className="size-3 text-sky-500" />
              <span>Programadas</span>
            </p>
          </CardContent>
        </Card>

        {/* 3. Pacientes en Espera (Hoy) */}
        <Card
          onClick={() => navigate('/clinica/consultas/sala-espera')}
          className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-amber-500/40 transition cursor-pointer"
        >
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>En Espera (Hoy)</span>
              {enEsperaHoy.length > 0 && <span className="size-2 rounded-full bg-amber-500 animate-pulse" />}
            </p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {enEsperaHoy.length}
            </h3>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium flex items-center gap-1">
              <Hourglass className="size-3" />
              <span>En sala ahora</span>
            </p>
          </CardContent>
        </Card>

        {/* 4. En Consulta Activa (Hoy) */}
        <Card
          onClick={() => navigate('/clinica/consultas/en-consulta')}
          className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-primary/40 transition cursor-pointer"
        >
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>En Consulta</span>
              {enConsultaHoy.length > 0 && <span className="size-2 rounded-full bg-sky-500 animate-pulse" />}
            </p>
            <h3 className="text-2xl font-black text-primary mt-1">
              {enConsultaHoy.length}
            </h3>
            <p className="text-[10px] text-primary/80 mt-0.5 font-medium flex items-center gap-1">
              <Activity className="size-3" />
              <span>En consultorio</span>
            </p>
          </CardContent>
        </Card>

        {/* 5. Pacientes Únicos */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pacientes Únicos</p>
            <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {kpisPeriodo.pacientesUnicos}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
              <Users className="size-3 text-teal-500" />
              <span>Expedientes</span>
            </p>
          </CardContent>
        </Card>

        {/* 6. Tarifas Estimadas / Facturación */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tarifas / Ingresos</p>
              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-emerald-600 border-emerald-500/30">
                {moneda === 'USD' ? 'USD ($)' : 'VES (Bs.)'}
              </Badge>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate font-mono">
              {formatMoneyDual(kpisPeriodo.facturacionEstimada).primary}
            </h3>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1 truncate font-mono">
              <Coins className="size-3 text-emerald-500 shrink-0" />
              <span className="text-foreground/80 font-bold">{formatMoneyDual(kpisPeriodo.facturacionEstimada).secondary}</span>
            </div>
            <p className="text-[9px] text-muted-foreground/70 mt-1 truncate">
              {moneda === 'USD' ? `≈ Equiv. BCV (${tasaBcv.toFixed(2)} Bs/$)` : `≈ Equiv. USD (${tasaBcv.toFixed(2)} Bs/$)`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── SECCIÓN APEXCHARTS: EVOLUCIÓN ASISTENCIAL & CATEGORÍAS ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolución Temporal (Area Chart) (2/3 de ancho) */}
        <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-teal-500" />
                <span>Evolución Asistencial en el Período</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Comparativa diaria de consultas atendidas y citas agendadas
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono border-teal-500/30 text-teal-600 dark:text-teal-400">
              {fechaDesde} al {fechaHasta}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <ApexChart
              type="area"
              options={timelineChartOptions}
              series={[
                { name: 'Consultas Atendidas', data: chartTimelineData.seriesConsultas },
                { name: 'Citas Agendadas', data: chartTimelineData.seriesCitas },
              ]}
              height={290}
            />
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribución por Servicio / Categoría (Donut Chart) (1/3 de ancho) */}
        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieChart className="size-4 text-teal-500" />
              <span>Servicios y Prestaciones</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Distribución por categoría de atención
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <ApexChart
              type="donut"
              options={donutChartOptions}
              series={chartCategoriasData.series}
              height={290}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── SECCIÓN APEXCHARTS 2: DEMANDA HORARIA & ASISTENCIA ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 3: Demanda Horaria (Column Chart) (2/3 de ancho) */}
        <Card className="lg:col-span-2 border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-teal-500" />
                <span>Afluencia por Franja Horaria</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Distribución de pacientes según la hora de agendamiento
              </CardDescription>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="size-3.5 text-teal-500" />
              Horas pico
            </span>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <ApexChart
              type="bar"
              options={barHorariosOptions}
              series={[{ name: 'Pacientes', data: chartHorariosData.series }]}
              height={290}
            />
          </CardContent>
        </Card>

        {/* Gráfico 4: Tasa de Cumplimiento / Asistencia (RadialBar) (1/3) */}
        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-teal-500" />
              <span>Efectividad Asistencial</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Tasa de asistencia de pacientes citados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3 flex flex-col items-center justify-center">
            <ApexChart
              type="radialBar"
              options={radialChartOptions}
              series={[kpisPeriodo.tasaAsistencia]}
              height={260}
            />
            <p className="text-xs text-muted-foreground text-center font-medium mt-1">
              {kpisPeriodo.citasCompletadas} de {kpisPeriodo.citasTotal} citas completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── CUERPO PRINCIPAL: LISTADO DE PACIENTES + ACCESOS RÁPIDOS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: Flujo Asistencial de Pacientes (2/3) */}
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
                      Flujo de Pacientes en Consultorio
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Gestión directa de pacientes en espera, en consulta o completados
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-44 sm:w-56">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Buscar paciente o DNI..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Pestañas de Vista */}
              <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setActiveTab('hoy_espera')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
                    activeTab === 'hoy_espera'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  <span>En Espera (Hoy)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-bold">
                    {enEsperaHoy.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('hoy_consulta')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
                    activeTab === 'hoy_consulta'
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
                  onClick={() => setActiveTab('hoy_todas')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    activeTab === 'hoy_todas'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  Todas de Hoy ({consultasHoy.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rango_todas')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    activeTab === 'rango_todas'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  Todo el Período ({consultasRango.length})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Cargando pacientes del consultorio...
                </div>
              ) : pacientesAMostrar.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">
                      {searchQuery
                        ? 'No se encontraron pacientes con ese criterio'
                        : activeTab === 'hoy_espera'
                        ? 'No hay pacientes en espera en este momento'
                        : activeTab === 'hoy_consulta'
                        ? 'No hay consultas activas en curso'
                        : 'No hay consultas registradas para este filtro'}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery
                        ? 'Verifique los términos de búsqueda o intente con otro criterio.'
                        : 'Puede consultar la agenda para programar citas o revisar el historial.'}
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
                  {pacientesAMostrar.map((c) => {
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
                              {c.fecha_consulta && (
                                <span>{c.fecha_consulta.split('T')[0]}</span>
                              )}
                              {c.cita?.precio_estimado ? (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                  <DollarSign className="size-3 text-emerald-500" />
                                  <span>{formatMoney(c.cita.precio_estimado)}</span>
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    (≈ {formatMoneyDual(c.cita.precio_estimado).secondary})
                                  </span>
                                </span>
                              ) : null}
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

        {/* Columna Derecha: Ficha del Médico y Diagnósticos (1/3) */}
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
                    {kpisPeriodo.pacientesUnicos}
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

          {/* Diagnósticos Más Frecuentes del Período */}
          {topDiagnosticos.length > 0 && (
            <Card className="border-border/70 bg-card shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-teal-500" />
                  <span>Diagnósticos Frecuentes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {topDiagnosticos.map(([diag, count], idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                    <span className="font-medium text-foreground truncate max-w-[200px]" title={diag}>
                      {diag}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-600 dark:text-teal-400 font-bold shrink-0">
                      {count} {count === 1 ? 'caso' : 'casos'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Widget Informativo de Moneda y Tasa Oficial */}
          <Card className="border-border/70 bg-gradient-to-br from-emerald-500/5 via-card to-card shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Coins className="size-3.5" />
                <span>Moneda Base & Tasa Oficial</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Moneda de la Clínica:</span>
                <Badge variant="outline" className="font-mono text-[11px] font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                  {moneda === 'USD' ? 'Dólar (USD - $)' : 'Bolívar (VES - Bs.)'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tasa Oficial BCV:</span>
                <span className="font-mono font-black text-xs text-foreground">
                  Bs. {tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="truncate">{tasaBcvFuente}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await refreshBcvRate();
                    toast.success('Tasa BCV actualizada');
                  }}
                  className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <RefreshCw className="size-2.5" />
                  Actualizar
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Accesos Directos Asistenciales */}
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

export default MedicoDashboardPage;
