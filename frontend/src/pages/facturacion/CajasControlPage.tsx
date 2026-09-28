import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  CircleDollarSign,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Share2,
  Lock,
  LockOpen,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Building2,
  Layers,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  User,
  Stethoscope,
  ChevronRight,
  Eye,
  Percent,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ModuleHeader } from '../../components/common/ModuleHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import {
  cajasApi,
  type Caja,
  type TurnoCaja,
  type Cobro,
  type MovimientoCaja,
  type ResumenAnaliticoCajaResponse,
} from '../../api/cajas';
import { useAuth } from '../../context/AuthContext';
import { CobroReciboModal } from '../../components/facturacion/CobroReciboModal';
import { TurnoAperturaModal } from '../../components/facturacion/TurnoAperturaModal';
import { TurnoCierreModal } from '../../components/facturacion/TurnoCierreModal';
import { cn } from '../../lib/utils';

export const CajasControlPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, sucursalActiva } = useAuth();
  const currentSucursalId = sucursalActiva?.id || 1;

  // Estado de navegación
  const [activeTab, setActiveTab] = useState<'cajas' | 'ventas' | 'movimientos' | 'metodos' | 'conceptos'>('cajas');

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [turnos, setTurnos] = useState<TurnoCaja[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(null);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [resumen, setResumen] = useState<ResumenAnaliticoCajaResponse | null>(null);

  // Filtros de fecha y texto
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('hoy');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [searchVentasQuery, setSearchVentasQuery] = useState('');
  const [filtroEstadoVenta, setFiltroEstadoVenta] = useState<'todos' | 'completado' | 'anulado'>('todos');

  // Modales
  const [aperturaModalOpen, setAperturaModalOpen] = useState(false);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [reciboModalOpen, setReciboModalOpen] = useState(false);
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);

  // Modal Nueva Caja
  const [newCajaModalOpen, setNewCajaModalOpen] = useState(false);
  const [newCajaNombre, setNewCajaNombre] = useState('');
  const [newCajaDesc, setNewCajaDesc] = useState('');
  const [savingCaja, setSavingCaja] = useState(false);

  // Modal Nuevo Movimiento de Caja Chica
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMoneda, setMovMoneda] = useState<'USD' | 'VES'>('USD');
  const [movMonto, setMovMonto] = useState('');
  const [savingMov, setSavingMov] = useState(false);

  // Modal Anulación de Cobro
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [cobroToAnular, setCobroToAnular] = useState<Cobro | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  // Configuración de fechas según filtroPeriodo
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (filtroPeriodo === 'hoy') {
      const todayStr = toYMD(now);
      setFechaDesde(todayStr);
      setFechaHasta(todayStr);
    } else if (filtroPeriodo === 'semana') {
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      setFechaDesde(toYMD(monday));
      setFechaHasta(toYMD(now));
    } else if (filtroPeriodo === 'mes') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFechaDesde(toYMD(firstDay));
      setFechaHasta(toYMD(now));
    } else {
      setFechaDesde('');
      setFechaHasta('');
    }
  }, [filtroPeriodo]);

  // Carga inicial y recarga de datos
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [cajasRes, turnosRes, activeTurnoRes, cobrosRes, movsRes, resumenRes] =
        await Promise.all([
          cajasApi.listCajas(currentSucursalId),
          cajasApi.listTurnos({
            sucursal_id: currentSucursalId,
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
            limit: 50,
          }),
          cajasApi.getActiveTurno(),
          cajasApi.listCobros({
            sucursal_id: currentSucursalId,
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
            limit: 150,
          }),
          cajasApi.listMovimientos({
            sucursal_id: currentSucursalId,
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
            limit: 100,
          }),
          cajasApi.getResumenAnalitico({
            sucursal_id: currentSucursalId,
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
          }),
        ]);

      setCajas(cajasRes || []);
      setTurnos(turnosRes || []);
      setTurnoActivo(activeTurnoRes);
      setCobros(cobrosRes || []);
      setMovimientos(movsRes || []);
      setResumen(resumenRes || null);
    } catch (err: any) {
      console.error('Error al cargar datos de control de cajas:', err);
      toast.error('Error al sincronizar datos de caja y facturación');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentSucursalId, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manejo de Creación de Caja
  const handleCreateCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCajaNombre.trim()) {
      toast.error('Indique el nombre de la caja');
      return;
    }
    try {
      setSavingCaja(true);
      await cajasApi.createCaja({
        nombre: newCajaNombre.trim(),
        descripcion: newCajaDesc.trim() || undefined,
        sucursal_id: currentSucursalId,
        activa: true,
      });
      toast.success('Nueva caja registrada exitosamente');
      setNewCajaNombre('');
      setNewCajaDesc('');
      setNewCajaModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al crear la caja');
    } finally {
      setSavingCaja(false);
    }
  };

  // Manejo de Movimiento de Caja Chica
  const handleCreateMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoActivo) {
      toast.error('Debe haber un turno de caja abierto para registrar movimientos');
      return;
    }
    const montoNum = parseFloat(movMonto);
    if (!montoNum || montoNum <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    if (!movConcepto.trim()) {
      toast.error('Indique el concepto o motivo del movimiento');
      return;
    }

    try {
      setSavingMov(true);
      await cajasApi.createMovimiento({
        turno_caja_id: turnoActivo.id,
        sucursal_id: currentSucursalId,
        tipo: movTipo,
        concepto: movConcepto.trim(),
        moneda: movMoneda,
        monto: montoNum,
      });
      toast.success(`Movimiento de ${movTipo.toUpperCase()} registrado`);
      setMovConcepto('');
      setMovMonto('');
      setMovModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al registrar movimiento');
    } finally {
      setSavingMov(false);
    }
  };

  // Manejo de Anulación
  const handleConfirmAnulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobroToAnular) return;
    if (!motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo para anular el cobro');
      return;
    }
    try {
      setAnulando(true);
      await cajasApi.anularCobro(cobroToAnular.id, motivoAnulacion.trim());
      toast.success(`Recibo ${cobroToAnular.numero_recibo} anulado correctamente`);
      setAnularModalOpen(false);
      setCobroToAnular(null);
      setMotivoAnulacion('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al anular el recibo');
    } finally {
      setAnulando(false);
    }
  };

  // Filtrado de Ventas en Memoria
  const filteredCobros = useMemo(() => {
    return cobros.filter((c) => {
      const matchEstado =
        filtroEstadoVenta === 'todos' || c.estado === filtroEstadoVenta;
      const q = searchVentasQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        c.numero_recibo.toLowerCase().includes(q) ||
        (c.paciente_nombre && c.paciente_nombre.toLowerCase().includes(q)) ||
        (c.paciente_documento && c.paciente_documento.toLowerCase().includes(q)) ||
        (c.cajero_nombre && c.cajero_nombre.toLowerCase().includes(q));
      return matchEstado && matchQuery;
    });
  }, [cobros, filtroEstadoVenta, searchVentasQuery]);

  // Ícono de método de pago
  const getMetodoIcon = (metodo: string) => {
    if (metodo.includes('efectivo')) return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
    if (metodo.includes('punto') || metodo.includes('tarjeta')) return <CreditCard className="w-3.5 h-3.5 text-sky-600" />;
    if (metodo.includes('pago_movil')) return <Smartphone className="w-3.5 h-3.5 text-amber-600" />;
    if (metodo.includes('seguro')) return <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />;
    return <DollarSign className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1750px] mx-auto select-none">
      {/* Header del Módulo */}
      <ModuleHeader
        title="Gestión Integral de Cajas & Arqueos"
        description="Supervisión en tiempo real de cajas registradoras, turnos operativos, detalle de ventas, egresos y clasificación del dinero multimoneda."
        icon={<Wallet className="h-6 w-6 text-white" />}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Acceso Rápido a Terminal POS */}
          <Button
            onClick={() => navigate('/facturacion/cobro')}
            className="h-9 px-3.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white gap-2 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <CircleDollarSign className="w-4 h-4" />
            <span>Terminal POS de Cobro [F1]</span>
          </Button>

          {/* Botón Refrescar */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="h-9 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            <span>Actualizar</span>
          </Button>

          {/* Botón Crear Caja */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewCajaModalOpen(true)}
            className="h-9 text-xs font-bold gap-1.5 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Caja Física</span>
          </Button>

          {/* Botón Registrar Movimiento */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMovModalOpen(true)}
            disabled={!turnoActivo}
            className="h-9 text-xs font-bold gap-1.5 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 cursor-pointer disabled:opacity-50"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>[+/-] Mov. Caja Chica</span>
          </Button>

          {/* Estado de Turno del Usuario */}
          {turnoActivo ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCierreModalOpen(true)}
              className="h-9 text-xs font-black gap-1.5 rounded-xl cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Turno (Arqueo)</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setAperturaModalOpen(true)}
              className="h-9 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl cursor-pointer"
            >
              <LockOpen className="w-3.5 h-3.5" />
              <span>Abrir Mi Turno</span>
            </Button>
          )}
        </div>
      </ModuleHeader>

      {/* Tarjetas KPI Financieras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Recaudación Total Ventas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold">Total Recaudación Ventas</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="pt-1">
            <span className="font-black font-mono text-2xl text-slate-900 dark:text-white">
              ${(resumen?.total_ventas_divisa || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400 block font-mono">
              Bs. {(resumen?.total_ventas_ves || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
            <span>{resumen?.total_cobros_count || 0} cobro(s) completados</span>
            {resumen && resumen.total_cobros_anulados > 0 && (
              <span className="text-rose-500 font-semibold">{resumen.total_cobros_anulados} anulados</span>
            )}
          </div>
        </div>

        {/* Cajas Registradas & Operativas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold">Cajas en Sucursal</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="pt-1">
            <span className="font-black font-mono text-2xl text-slate-900 dark:text-white">
              {cajas.length}
            </span>
            <span className="text-xs text-slate-400 block font-medium">
              {turnos.filter((t) => t.estado === 'abierta').length} turno(s) abierto(s) actualmente
            </span>
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 pt-1 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Puntos de cobro activos</span>
          </div>
        </div>

        {/* Movimientos Menores (Entradas vs Salidas) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold">Caja Menor / Egresos</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="pt-1 flex items-baseline justify-between">
            <div>
              <span className="font-black font-mono text-xl text-rose-600">
                -${(resumen?.total_egresos_extra_usd || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Bs. {(resumen?.total_egresos_extra_ves || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="font-black font-mono text-xs text-emerald-600 block">
                +${(resumen?.total_ingresos_extra_usd || 0).toFixed(2)} Entradas
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {movimientos.length} movimiento(s)
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Gastos operativos y fondo de cambio
          </div>
        </div>

        {/* Descuentos y Cortesías Otorgadas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold">Descuentos Concedidos</span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="pt-1">
            <span className="font-black font-mono text-2xl text-slate-900 dark:text-white">
              ${(resumen?.total_descuentos_divisa || 0).toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 block font-medium">
              En rebajas y convenios autorizados
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Deducido del total facturado
          </div>
        </div>
      </div>

      {/* Barra de Filtro de Período Global */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Período de Análisis:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
            {(['hoy', 'semana', 'mes', 'todos'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFiltroPeriodo(p)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize',
                  filtroPeriodo === p
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta Semana' : p === 'mes' ? 'Este Mes' : 'Histórico Total'}
              </button>
            ))}
          </div>
        </div>

        {/* Rango Manual de Fechas */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Desde:</span>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFiltroPeriodo('todos');
                setFechaDesde(e.target.value);
              }}
              className="h-8 text-xs w-36 bg-slate-50 dark:bg-slate-800 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Hasta:</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFiltroPeriodo('todos');
                setFechaHasta(e.target.value);
              }}
              className="h-8 text-xs w-36 bg-slate-50 dark:bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Tabs Principales de Navegación del Módulo */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl h-auto gap-1 grid grid-cols-2 sm:grid-cols-5">
          <TabsTrigger
            value="cajas"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 rounded-xl text-xs font-bold py-2 gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Cajas & Turnos ({turnos.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="ventas"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 rounded-xl text-xs font-bold py-2 gap-1.5 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Detalle de Ventas ({cobros.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="movimientos"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 rounded-xl text-xs font-bold py-2 gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Salidas/Entradas ({movimientos.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="metodos"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 rounded-xl text-xs font-bold py-2 gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Por Métodos de Pago ({resumen?.por_metodo_pago.length || 0})</span>
          </TabsTrigger>

          <TabsTrigger
            value="conceptos"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 rounded-xl text-xs font-bold py-2 gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Por Conceptos & Servicios</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: CAJAS FÍSICAS & HISTORIAL DE TURNOS */}
        {/* ======================================================== */}
        <TabsContent value="cajas" className="space-y-4 outline-none">
          {/* Grilla de Cajas Físicas Registradas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Cajas Registradas en la Sucursal
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewCajaModalOpen(true)}
                className="h-8 text-xs font-bold gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Caja
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {cajas.map((caja) => {
                const turnoDeEstaCaja = turnos.find(
                  (t) => t.caja_id === caja.id && t.estado === 'abierta'
                );
                return (
                  <div
                    key={caja.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                            #{caja.id}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {caja.nombre}
                            </h4>
                            <span className="text-[11px] text-slate-400 block">
                              {caja.descripcion || 'Sin descripción adicional'}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold',
                            turnoDeEstaCaja
                              ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-800'
                          )}
                        >
                          {turnoDeEstaCaja ? '● Abierta' : '○ Cerrada'}
                        </Badge>
                      </div>

                      {/* Info del Turno Activo en la caja */}
                      {turnoDeEstaCaja ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-500">Cajero en turno:</span>
                            <span className="font-bold">{turnoDeEstaCaja.cajero_nombre}</span>
                          </div>
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-[11px] text-slate-500">Fondo Inicial:</span>
                            <span className="font-bold">${turnoDeEstaCaja.fondo_inicial_usd.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-[11px] text-slate-500">Ventas en Turno:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              ${turnoDeEstaCaja.total_ingresos_usd.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 text-center">
                          Esta caja no tiene turno abierto en este momento.
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">
                        {caja.activa ? 'Caja activa para operaciones' : 'Caja inactiva'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/facturacion/cobro')}
                        className="h-7 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 cursor-pointer gap-1"
                      >
                        Cobrar aquí
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historial de Turnos de Caja (Arqueos) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Historial de Turnos & Arqueos de Caja
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {turnos.length} turno(s) registrado(s)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Turno / Caja</th>
                    <th className="py-2.5 px-3">Cajero Responsable</th>
                    <th className="py-2.5 px-3">Apertura</th>
                    <th className="py-2.5 px-3">Cierre</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Fondo Inicial</th>
                    <th className="py-2.5 px-3 text-right">Ingresos</th>
                    <th className="py-2.5 px-3 text-right">Egresos</th>
                    <th className="py-2.5 px-3 text-right">Arqueo Declarado</th>
                    <th className="py-2.5 px-3 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {turnos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No hay turnos registrados en este período.
                      </td>
                    </tr>
                  ) : (
                    turnos.map((t) => {
                      const difUsd = t.diferencia_usd ?? 0;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold font-mono">
                            <span className="text-emerald-700 dark:text-emerald-400">#{t.id}</span>
                            <span className="text-slate-400 block text-[10px] font-sans">
                              {t.caja_nombre || 'Caja'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {t.cajero_nombre || 'Cajero'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {new Date(t.apertura_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {t.cierre_at
                              ? new Date(t.cierre_at).toLocaleString('es-ES', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '— En curso —'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-bold',
                                t.estado === 'abierta'
                                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                  : 'border-slate-300 text-slate-600 bg-slate-100'
                              )}
                            >
                              {t.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            ${t.fondo_inicial_usd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                            ${t.total_ingresos_usd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-500">
                            ${t.total_egresos_usd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {t.arqueo_declarado_usd != null ? `$${Number(t.arqueo_declarado_usd).toFixed(2)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {t.diferencia_usd != null ? (
                              <span
                                className={cn(
                                  difUsd === 0
                                    ? 'text-slate-500'
                                    : difUsd > 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                )}
                              >
                                {difUsd > 0 ? `+${difUsd.toFixed(2)}` : difUsd.toFixed(2)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: DETALLE DE VENTAS & COBROS */}
        {/* ======================================================== */}
        <TabsContent value="ventas" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3.5">
            {/* Filtros de Ventas */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por recibo, paciente, cédula o cajero..."
                    value={searchVentasQuery}
                    onChange={(e) => setSearchVentasQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Estado:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                  {(['todos', 'completado', 'anulado'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFiltroEstadoVenta(st)}
                      className={cn(
                        'px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer',
                        filtroEstadoVenta === st
                          ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabla Detallada de Cobros */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Recibo / Fecha</th>
                    <th className="py-2.5 px-3">Paciente</th>
                    <th className="py-2.5 px-3">Médico / Especialidad</th>
                    <th className="py-2.5 px-3">Conceptos Facturados</th>
                    <th className="py-2.5 px-3">Métodos de Pago</th>
                    <th className="py-2.5 px-3 text-right">Total Divisa</th>
                    <th className="py-2.5 px-3 text-right">Equivalente BCV</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCobros.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No se encontraron cobros registrados con estos criterios.
                      </td>
                    </tr>
                  ) : (
                    filteredCobros.map((c) => {
                      const isAnulado = c.estado === 'anulado';
                      return (
                        <tr
                          key={c.id}
                          className={cn(
                            'hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors',
                            isAnulado && 'bg-rose-50/30 dark:bg-rose-950/10 opacity-75'
                          )}
                        >
                          {/* Recibo y Fecha */}
                          <td className="py-2.5 px-3">
                            <span className="font-black font-mono text-emerald-700 dark:text-emerald-400 block">
                              {c.numero_recibo}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(c.fecha_emision).toLocaleString('es-ES', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </td>

                          {/* Paciente */}
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[160px]">
                              {c.paciente_nombre || 'Paciente'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              CI: {c.paciente_documento || 'S/D'}
                            </span>
                          </td>

                          {/* Médico */}
                          <td className="py-2.5 px-3">
                            <span className="text-slate-700 dark:text-slate-300 font-medium block truncate max-w-[150px]">
                              {c.medico_nombre ? `Dr(a). ${c.medico_nombre}` : 'Particular / Centro'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Cajero: {c.cajero_nombre}
                            </span>
                          </td>

                          {/* Conceptos */}
                          <td className="py-2.5 px-3 max-w-[200px]">
                            <div className="space-y-0.5">
                              {c.detalles.slice(0, 2).map((d, dIdx) => (
                                <div key={dIdx} className="text-[11px] truncate text-slate-800 dark:text-slate-200">
                                  • {d.cantidad > 1 ? `${d.cantidad}x ` : ''}
                                  {d.descripcion}
                                </div>
                              ))}
                              {c.detalles.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-semibold block">
                                  +{c.detalles.length - 2} concepto(s) más...
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Métodos de Pago */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {c.pagos.map((p, pIdx) => (
                                <Badge
                                  key={pIdx}
                                  variant="outline"
                                  className="text-[9.5px] px-1.5 py-0 font-mono gap-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                >
                                  {getMetodoIcon(p.metodo)}
                                  <span>{p.moneda} {p.monto_moneda_origen.toFixed(2)}</span>
                                </Badge>
                              ))}
                            </div>
                          </td>

                          {/* Total Divisa */}
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-black font-mono text-sm text-slate-900 dark:text-white block">
                              {c.moneda_referencia === 'EUR' ? '€' : '$'}
                              {c.total_divisa.toFixed(2)}
                            </span>
                            {c.descuento_divisa > 0 && (
                              <span className="text-[10px] text-rose-500 font-mono block">
                                Dcto: -${c.descuento_divisa.toFixed(2)}
                              </span>
                            )}
                          </td>

                          {/* Total Bs. */}
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-extrabold font-mono text-xs text-slate-700 dark:text-slate-300 block">
                              Bs. {c.total_ves.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Tasa: {c.tasa_bcv_aplicada.toFixed(2)}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className={cn(
                                'text-[10px] font-bold',
                                isAnulado
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              )}
                            >
                              {isAnulado ? 'Anulado' : 'Completado'}
                            </Badge>
                          </td>

                          {/* Acciones */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCobro(c);
                                  setReciboModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                title="Imprimir / Ver Recibo Térmico 80mm"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {!isAnulado && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCobroToAnular(c);
                                    setMotivoAnulacion('');
                                    setAnularModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                  title="Anular Recibo"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: SALIDAS Y ENTRADAS DE DINERO (CAJA MENOR) */}
        {/* ======================================================== */}
        <TabsContent value="movimientos" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  Movimientos Extraordinarios de Caja Chica
                </h3>
                <span className="text-xs text-slate-400">
                  Control de compras menores, insumos de emergencia y aportes de cambio.
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => setMovModalOpen(true)}
                disabled={!turnoActivo}
                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 rounded-xl cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Entrada / Salida
              </Button>
            </div>

            {/* Tabla de Movimientos */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Fecha & Hora</th>
                    <th className="py-2.5 px-3">Turno / Caja</th>
                    <th className="py-2.5 px-3">Tipo de Movimiento</th>
                    <th className="py-2.5 px-3">Concepto / Justificación</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                    <th className="py-2.5 px-3">Usuario Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No hay movimientos extraordinarios registrados en este período.
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((m) => {
                      const isIngreso = m.tipo === 'ingreso';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {new Date(m.created_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            Turno #{m.turno_caja_id}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-bold gap-1',
                                isIngreso
                                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                  : 'border-rose-500 text-rose-700 bg-rose-50'
                              )}
                            >
                              {isIngreso ? (
                                <>
                                  <ArrowUpRight className="w-3 h-3" />
                                  Ingreso de Efectivo
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-3 h-3" />
                                  Egreso / Gasto Menor
                                </>
                              )}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {m.concepto}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black font-mono">
                            <span className={isIngreso ? 'text-emerald-600' : 'text-rose-600'}>
                              {isIngreso ? '+' : '-'}
                              {m.moneda === 'USD' ? '$' : 'Bs. '}
                              {m.monto.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {m.usuario_nombre || 'Usuario'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 4: CLASIFICACIÓN DEL DINERO POR MÉTODO DE PAGO */}
        {/* ======================================================== */}
        <TabsContent value="metodos" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Clasificación de Ingresos por Método de Pago
              </h3>
              <p className="text-xs text-slate-400">
                Consolidación de montos recaudados según forma de pago y divisa de origen.
              </p>
            </div>

            {/* Grilla de Métodos de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {(resumen?.por_metodo_pago || []).map((met, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      {getMetodoIcon(met.metodo)}
                      {met.nombre_legible}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800">
                      {met.porcentaje}%
                    </Badge>
                  </div>

                  <div className="pt-1">
                    <span className="font-black font-mono text-xl text-slate-900 dark:text-white block">
                      ${met.total_equivalente_divisa.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {met.moneda} {met.total_monto_origen.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, met.porcentaje)}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{met.cantidad_transacciones} pago(s) registrados</span>
                    <span className="font-mono">{met.moneda}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Si no hay datos */}
            {(!resumen?.por_metodo_pago || resumen.por_metodo_pago.length === 0) && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay transacciones registradas para clasificar métodos de pago en este rango de fechas.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 5: CLASIFICACIÓN POR CONCEPTOS DE SERVICIOS */}
        {/* ======================================================== */}
        <TabsContent value="conceptos" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Desglose por Tipo de Concepto (5 cols) */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Recaudación por Tipo de Concepto
              </h3>

              <div className="space-y-2.5">
                {(resumen?.por_concepto || []).map((con, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-100">
                        {con.nombre_legible}
                      </span>
                      <span className="font-mono text-emerald-600">
                        ${con.total_divisa.toFixed(2)} ({con.porcentaje}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, con.porcentaje)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{con.cantidad_items} ítem(s) facturado(s)</span>
                      <span>Bs. {con.total_ves.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}

                {(!resumen?.por_concepto || resumen.por_concepto.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Sin datos de conceptos para este período.
                  </p>
                )}
              </div>
            </div>

            {/* Top 10 Servicios con Mayor Recaudación (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Top Servicios con Mayor Facturación
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Servicio / Procedimiento</th>
                      <th className="py-2 px-3">Categoría</th>
                      <th className="py-2 px-3 text-center">Cantidad</th>
                      <th className="py-2 px-3 text-right">Total Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {(resumen?.top_servicios || []).map((srv, sIdx) => (
                      <tr key={sIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-bold text-slate-400">
                          #{sIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100">
                          {srv.descripcion}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[9.5px] uppercase">
                            {srv.tipo_concepto}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center font-bold font-mono">
                          {srv.cantidad}
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono text-emerald-600">
                          ${srv.total_divisa.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {(!resumen?.top_servicios || resumen.top_servicios.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No hay servicios registrados en este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODAL NUEVA CAJA FÍSICA */}
      {/* ======================================================== */}
      <Dialog open={newCajaModalOpen} onOpenChange={setNewCajaModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Registrar Nueva Caja Física
            </DialogTitle>
            <DialogDescription className="text-xs">
              Agregue un nuevo punto de cobranza para la sucursal activa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCaja} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nombre de la Caja *</Label>
              <Input
                type="text"
                placeholder="Ej. Caja Odontología, Caja Piso 2, etc."
                value={newCajaNombre}
                onChange={(e) => setNewCajaNombre(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Descripción (Opcional)</Label>
              <Textarea
                placeholder="Ubicación o propósito de este punto de cobro..."
                value={newCajaDesc}
                onChange={(e) => setNewCajaDesc(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewCajaModalOpen(false)}
                className="h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingCaja}
                className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                {savingCaja ? 'Guardando...' : 'Crear Caja'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL REGISTRAR MOVIMIENTO EXTRAORDINARIO DE CAJA */}
      {/* ======================================================== */}
      <Dialog open={movModalOpen} onOpenChange={setMovModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-amber-600" />
              Movimiento de Caja Chica
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre un gasto menor operativo o un ingreso de efectivo para fondo de cambio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMovimiento} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Tipo de Operación *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovTipo('egreso')}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                    movTipo === 'egreso'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                  )}
                >
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  <span>Salida / Gasto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovTipo('ingreso')}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                    movTipo === 'ingreso'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                  )}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>Entrada / Aporte</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Moneda *</Label>
                <Select value={movMoneda} onValueChange={(v: any) => setMovMoneda(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="USD">Dólares ($ USD)</SelectItem>
                    <SelectItem value="VES">Bolívares (Bs. VES)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={movMonto}
                  onChange={(e) => setMovMonto(e.target.value)}
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Concepto / Motivo *</Label>
              <Input
                type="text"
                placeholder="Ej. Insumos de limpieza, reposición de sencillo..."
                value={movConcepto}
                onChange={(e) => setMovConcepto(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMovModalOpen(false)}
                className="h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingMov}
                className={cn(
                  'h-9 text-xs font-bold text-white cursor-pointer',
                  movTipo === 'egreso' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {savingMov ? 'Registrando...' : 'Confirmar Movimiento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL ANULAR COBRO */}
      {/* ======================================================== */}
      <Dialog open={anularModalOpen} onOpenChange={setAnularModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              Anulación de Recibo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Esta acción revertirá los pagos y volverá a marcar la cita o consulta como pendiente de pago.
            </DialogDescription>
          </DialogHeader>

          {cobroToAnular && (
            <form onSubmit={handleConfirmAnulacion} className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recibo:</span>
                  <span className="font-bold">{cobroToAnular.numero_recibo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total:</span>
                  <span className="font-bold">${cobroToAnular.total_divisa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paciente:</span>
                  <span className="font-bold font-sans">{cobroToAnular.paciente_nombre}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Motivo de Anulación *</Label>
                <Textarea
                  placeholder="Indique la justificación para anular esta venta..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  required
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAnularModalOpen(false)}
                  className="h-9 text-xs cursor-pointer"
                >
                  Regresar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={anulando}
                  className="h-9 text-xs font-bold cursor-pointer"
                >
                  {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modales de Apertura y Cierre */}
      <TurnoAperturaModal
        open={aperturaModalOpen}
        onOpenChange={setAperturaModalOpen}
        cajas={cajas}
        sucursalId={currentSucursalId}
        onTurnoOpened={() => {
          fetchData();
        }}
      />
      {turnoActivo && (
        <TurnoCierreModal
          open={cierreModalOpen}
          onOpenChange={setCierreModalOpen}
          turno={turnoActivo}
          onTurnoClosed={() => {
            fetchData();
          }}
        />
      )}

      {/* Modal Recibo 80mm */}
      <CobroReciboModal
        open={reciboModalOpen}
        onOpenChange={setReciboModalOpen}
        cobro={selectedCobro}
      />
    </div>
  );
};

export default CajasControlPage;
