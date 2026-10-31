import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Lock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Ban,
  Wallet,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Layers,
  Search,
  XCircle,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  cajasApi,
  type Cobro,
  type TurnoCaja,
  type TurnoDetalleResumen,
} from '../../api/cajas';
import type { Usuario } from '../../types';
import { cn } from '../../lib/utils';

export function canUserCloseTurno(turno: TurnoCaja, user: Usuario | null): boolean {
  if (!user) return false;
  if (turno.usuario_id === user.id) return true;
  if (user.es_superadmin) return true;
  const slug = (user.rol?.slug || '').toLowerCase().trim();
  return ['admin', 'administrador', 'superadmin', 'gerente', 'director'].includes(slug);
}

interface TurnoDetalleViewProps {
  turnoId: number;
  currentUser: Usuario | null;
  onBack: () => void;
  onOpenPrintCorte: (turno: TurnoCaja, detalle: TurnoDetalleResumen | null) => void;
  onOpenCerrarTurno: (turno: TurnoCaja) => void;
  onOpenRegistrarMovimiento: (turno: TurnoCaja) => void;
  onOpenReciboCobro: (cobro: Cobro) => void;
  onOpenAnularCobro: (cobro: Cobro) => void;
  refreshSignal?: number;
}

export const TurnoDetalleView: React.FC<TurnoDetalleViewProps> = ({
  turnoId,
  currentUser,
  onBack,
  onOpenPrintCorte,
  onOpenCerrarTurno,
  onOpenRegistrarMovimiento,
  onOpenReciboCobro,
  onOpenAnularCobro,
  refreshSignal = 0,
}) => {
  const [detalle, setDetalle] = useState<TurnoDetalleResumen | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [subTab, setSubTab] = useState<'flujo' | 'metodos' | 'conceptos'>('flujo');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'ingresos' | 'egresos' | 'anulados'>(
    'todos'
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchDetalle = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await cajasApi.getTurnoDetalle(turnoId);
      setDetalle(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo cargar el detalle del turno');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [turnoId]);

  useEffect(() => {
    fetchDetalle();
  }, [fetchDetalle, refreshSignal]);

  const turno = detalle?.turno || null;
  const tasa = detalle && detalle.tasa_bcv_actual > 0 ? detalle.tasa_bcv_actual : 1;

  // Libro unificado cronológico del turno (Cobros + Movimientos de Caja Chica)
  const unifiedItems = useMemo(() => {
    if (!detalle) return [];

    type LedgerRow =
      | {
          kind: 'cobro';
          id: string;
          timestamp: string;
          esIngreso: boolean;
          esAnulado: boolean;
          titulo: string;
          subtitulo: string;
          metodosLabel: string;
          montoBs: number;
          montoDivisa: number;
          monedaOrigen: string;
          rawCobro: Cobro;
        }
      | {
          kind: 'movimiento';
          id: string;
          timestamp: string;
          esIngreso: boolean;
          esAnulado: boolean;
          titulo: string;
          subtitulo: string;
          metodosLabel: string;
          montoBs: number;
          montoDivisa: number;
          monedaOrigen: string;
        };

    const rows: LedgerRow[] = [];

    for (const c of detalle.cobros || []) {
      const esAnulado = c.estado === 'anulado';
      const conceptosStr = (c.detalles || [])
        .map((d) => `${d.cantidad > 1 ? `${d.cantidad}x ` : ''}${d.descripcion}`)
        .join(', ');
      const metodosStr = (c.pagos || [])
        .map((p) => `${p.metodo.replace(/_/g, ' ')} (${p.moneda} ${p.monto_moneda_origen.toFixed(2)})`)
        .join(' + ');

      rows.push({
        kind: 'cobro',
        id: `cobro-${c.id}`,
        timestamp: c.fecha_emision,
        esIngreso: !esAnulado,
        esAnulado,
        titulo: `${c.numero_recibo} — ${c.paciente_nombre || 'Paciente'}`,
        subtitulo: conceptosStr || 'Cobro asistencial',
        metodosLabel: metodosStr || 'Contado',
        montoBs: Number(c.total_ves || 0),
        montoDivisa: Number(c.total_divisa || 0),
        monedaOrigen: c.moneda_referencia || 'USD',
        rawCobro: c,
      });
    }

    for (const m of detalle.movimientos || []) {
      const isIng = m.tipo === 'ingreso';
      const mon = (m.moneda || 'USD').toUpperCase();
      const montoNum = Number(m.monto || 0);
      const montoBs = mon === 'VES' ? montoNum : Math.round(montoNum * tasa * 100) / 100;
      const montoDiv =
        mon === 'VES'
          ? tasa > 0
            ? Math.round((montoNum / tasa) * 100) / 100
            : 0
          : montoNum;

      rows.push({
        kind: 'movimiento',
        id: `mov-${m.id}`,
        timestamp: m.created_at,
        esIngreso: isIng,
        esAnulado: false,
        titulo: m.concepto,
        subtitulo: `Registrado por: ${m.usuario_nombre || 'Operador'}`,
        metodosLabel: `Efectivo (${mon})`,
        montoBs,
        montoDivisa: montoDiv,
        monedaOrigen: mon,
      });
    }

    rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return rows.filter((r) => {
      if (tipoFiltro === 'ingresos' && (!r.esIngreso || r.esAnulado)) return false;
      if (tipoFiltro === 'egresos' && (r.esIngreso || r.esAnulado)) return false;
      if (tipoFiltro === 'anulados' && !r.esAnulado) return false;

      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        r.titulo.toLowerCase().includes(q) ||
        r.subtitulo.toLowerCase().includes(q) ||
        r.metodosLabel.toLowerCase().includes(q)
      );
    });
  }, [detalle, tipoFiltro, searchTerm, tasa]);

  const getMetodoIcon = (metodo: string) => {
    const m = metodo.toLowerCase();
    if (m.includes('efectivo')) return <Banknote className="w-4 h-4 text-emerald-600" />;
    if (m.includes('punto') || m.includes('tarjeta'))
      return <CreditCard className="w-4 h-4 text-sky-600" />;
    if (m.includes('movil')) return <Smartphone className="w-4 h-4 text-amber-600" />;
    if (m.includes('seguro')) return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    return <Wallet className="w-4 h-4 text-slate-500" />;
  };

  if (loading && !detalle) {
    return (
      <div className="p-12 rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-3">
        <span className="size-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-muted-foreground">
          Cargando auditoría y conciliación financiera del Turno #{turnoId}...
        </p>
      </div>
    );
  }

  if (!detalle || !turno) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3">
        <p className="text-sm font-bold text-muted-foreground">
          No se encontró información del turno solicitado.
        </p>
        <Button variant="outline" size="sm" onClick={onBack} className="cursor-pointer">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver a Control de Cajas
        </Button>
      </div>
    );
  }

  const isOpen = turno.estado === 'abierta';
  const isOwner = currentUser?.id === turno.usuario_id;
  const canClose = canUserCloseTurno(turno, currentUser);

  const fondoInicialConsolidadoBs =
    Math.round(
      ((Number(turno.fondo_inicial_ves) || 0) +
        (Number(turno.fondo_inicial_usd) || 0) * tasa) *
        100
    ) / 100;

  const salidasExtraBs =
    Math.round(
      ((Number(detalle.efectivo_egresos_ves) || 0) +
        (Number(detalle.efectivo_egresos_usd) || 0) * tasa) *
        100
    ) / 100;

  const entradasExtraBs =
    Math.round(
      ((Number(detalle.efectivo_ingresos_extra_ves) || 0) +
        (Number(detalle.efectivo_ingresos_extra_usd) || 0) * tasa) *
        100
    ) / 100;

  const esperadoTotalBs =
    Math.round(
      ((Number(detalle.esperado_gaveta_ves) || 0) +
        (Number(detalle.esperado_gaveta_usd) || 0) * tasa) *
        100
    ) / 100;

  const declaradoTotalBs =
    turno.arqueo_declarado_ves != null || turno.arqueo_declarado_usd != null
      ? Math.round(
          ((Number(turno.arqueo_declarado_ves) || 0) +
            (Number(turno.arqueo_declarado_usd) || 0) * tasa) *
            100
        ) / 100
      : null;

  const diferenciaTotalBs =
    declaradoTotalBs !== null
      ? Math.round((declaradoTotalBs - esperadoTotalBs) * 100) / 100
      : null;

  return (
    <div className="space-y-4">
      {/* 1. ENCABEZADO DEL TURNO / CAJA (RÉPLICA FIXSALE POS SHOW.TSX) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cajas</span>
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                {turno.caja_nombre || 'Caja'} — Turno #{turno.id}
              </h2>
              <Badge
                className={cn(
                  'text-[10.5px] font-extrabold gap-1.5 px-2.5 py-0.5',
                  isOpen
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {isOpen && <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {isOpen ? 'EN CURSO / ABIERTA' : 'CERRADA (CORTE Z)'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1 font-semibold text-foreground/85">
                <User className="w-3.5 h-3.5 text-primary" />
                Cajero: {turno.cajero_nombre || 'Operador'}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Apertura:{' '}
                {new Date(turno.apertura_at).toLocaleString('es-VE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              {turno.cierre_at && (
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  Cierre:{' '}
                  {new Date(turno.cierre_at).toLocaleString('es-VE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones del Turno */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDetalle}
            disabled={refreshing}
            className="h-9 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            <span>Actualizar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenPrintCorte(turno, detalle)}
            className="h-9 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir {isOpen ? 'Arqueo X' : 'Corte Z'} (Bs.)</span>
          </Button>

          {isOpen && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenRegistrarMovimiento(turno)}
                className="h-9 text-xs font-bold gap-1.5 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Movimiento</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={!canClose}
                onClick={() => onOpenCerrarTurno(turno)}
                title={
                  canClose
                    ? 'Ejecutar Corte Z y cerrar caja'
                    : `Solo ${turno.cajero_nombre} o un Administrador puede cerrar esta caja`
                }
                className="h-9 px-3.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white gap-1.5 rounded-xl cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Caja (Corte Z)</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. BANNER DE CONTROL INTERNO / TITULARIDAD DE CAJA (RÉPLICA FIXSALE POS) */}
      {isOpen && !isOwner && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs',
            canClose
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
          )}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {canClose ? (
              <span>
                <strong>Supervisión Administrativa:</strong> Este turno fue aperturado por{' '}
                <strong>{turno.cajero_nombre}</strong>. Como Administrador, usted cuenta con autorización para auditar movimientos o ejecutar un cierre administrativo.
              </span>
            ) : (
              <span>
                <strong>Política de Control Interno:</strong> Esta caja fue aperturada por{' '}
                <strong>{turno.cajero_nombre}</strong>. Solo el cajero titular o un Administrador puede ejecutar el cierre de este turno.
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. TARJETA DE RESULTADO DEL ARQUEO (CUANDO LA CAJA ESTÁ CERRADA) */}
      {!isOpen && declaradoTotalBs !== null && (
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Resultado Oficial del Arqueo Físico (Corte Z)
            </h3>
            {diferenciaTotalBs !== null && (
              <Badge
                className={cn(
                  'text-xs font-extrabold px-2.5 py-0.5',
                  Math.abs(diferenciaTotalBs) < 0.05
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : diferenciaTotalBs > 0
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                )}
              >
                {Math.abs(diferenciaTotalBs) < 0.05
                  ? '✓ Cuadre Exacto sin Diferencias'
                  : diferenciaTotalBs > 0
                    ? `Sobrante Consolidado: +Bs. ${diferenciaTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                    : `Faltante Consolidado: -Bs. ${Math.abs(diferenciaTotalBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-[10.5px] font-bold text-muted-foreground block">
                Efectivo Esperado por Sistema
              </span>
              <span className="text-base font-black font-mono text-foreground block mt-0.5">
                Bs. {detalle.esperado_gaveta_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                + Gaveta Divisa: {detalle.moneda_referencia}{' '}
                {detalle.esperado_gaveta_usd.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-[10.5px] font-bold text-muted-foreground block">
                Efectivo Físico Contado por Cajero
              </span>
              <span className="text-base font-black font-mono text-foreground block mt-0.5">
                Bs.{' '}
                {Number(turno.arqueo_declarado_ves || 0).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                + Gaveta Divisa: {detalle.moneda_referencia}{' '}
                {Number(turno.arqueo_declarado_usd || 0).toFixed(2)}
              </span>
            </div>

            <div
              className={cn(
                'p-3 rounded-xl border',
                diferenciaTotalBs === null || Math.abs(diferenciaTotalBs) < 0.05
                  ? 'bg-emerald-500/10 border-emerald-500/25'
                  : diferenciaTotalBs > 0
                    ? 'bg-blue-500/10 border-blue-500/25'
                    : 'bg-rose-500/10 border-rose-500/25'
              )}
            >
              <span className="text-[10.5px] font-bold text-muted-foreground block">
                Diferencia por Gaveta
              </span>
              <span className="text-base font-black font-mono text-foreground block mt-0.5">
                Bs. {Number(turno.diferencia_ves || 0) > 0 ? '+' : ''}
                {Number(turno.diferencia_ves || 0).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Divisa: {Number(turno.diferencia_usd || 0) > 0 ? '+' : ''}
                {Number(turno.diferencia_usd || 0).toFixed(2)} {detalle.moneda_referencia}
              </span>
            </div>
          </div>

          {(turno.notas_apertura || turno.notas_cierre) && (
            <div className="pt-1 text-xs text-muted-foreground flex flex-wrap gap-4">
              {turno.notas_apertura && (
                <span>
                  <strong className="text-foreground">Nota Apertura:</strong>{' '}
                  {turno.notas_apertura}
                </span>
              )}
              {turno.notas_cierre && (
                <span>
                  <strong className="text-foreground">Nota Cierre:</strong>{' '}
                  {turno.notas_cierre}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. BANNER DE CONCILIACIÓN DE VENTAS ANULADAS (RÉPLICA FIXSALE POS) */}
      {detalle.cantidad_anuladas > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-rose-900 dark:text-rose-200">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-black">
                Control de Recibos Anulados ({detalle.cantidad_anuladas} operación/es):
              </span>{' '}
              Los montos anulados fueron deducidos automáticamente del efectivo esperado en cajón para evitar descuadres.
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] font-bold">
            <span className="text-muted-foreground">
              Bruto: Bs. {detalle.ventas_brutas_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-rose-600">
              Anulado: -Bs. {detalle.total_anuladas_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400">
              Neto: Bs. {detalle.ventas_netas_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* 5. CUATRO TARJETAS KPI DEL TURNO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Fondo Inicial */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold">Fondo Inicial Apertura</span>
            <Wallet className="w-4 h-4 text-slate-500" />
          </div>
          <div className="pt-1 font-mono">
            <span className="text-xl font-black text-foreground block">
              Bs.{' '}
              {fondoInicialConsolidadoBs.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Bs. {turno.fondo_inicial_ves.toFixed(2)} + {detalle.moneda_referencia}{' '}
              {turno.fondo_inicial_usd.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Ventas Netas del Turno */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold">Ventas Netas Turno</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="pt-1 font-mono">
            <span className="text-xl font-black text-emerald-600 block">
              +Bs.{' '}
              {detalle.ventas_netas_ves.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {detalle.cantidad_completadas} cobro(s) • Ref. {detalle.moneda_referencia}{' '}
              {detalle.ventas_netas_divisa.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Movimientos de Caja Chica */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold">Caja Chica (Salidas / Entradas)</span>
            <ArrowDownRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="pt-1 font-mono flex items-baseline justify-between">
            <div>
              <span className="text-lg font-black text-rose-600 block">
                -Bs. {salidasExtraBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10.5px] text-emerald-600 font-bold">
                +Bs. {entradasExtraBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} entradas
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {detalle.movimientos.length} mov.
            </Badge>
          </div>
        </div>

        {/* Saldo Esperado en Gaveta + Medios Bancarios */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/25 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-primary">
            <span className="font-extrabold">Efectivo Esperado en Cajón</span>
            <Banknote className="w-4 h-4" />
          </div>
          <div className="pt-1 font-mono">
            <span className="text-xl font-black text-foreground block">
              Bs. {detalle.esperado_gaveta_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
              + Gaveta {detalle.moneda_referencia}: {detalle.esperado_gaveta_usd.toFixed(2)}
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 block">
              Banco/Digital: Bs.{' '}
              {detalle.ingresos_electronicos_ves.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 6. PESTAÑAS DEL TURNO: FLUJO / MÉTODOS DE PAGO / CONCEPTOS */}
      <Tabs value={subTab} onValueChange={(v: any) => setSubTab(v)} className="space-y-3">
        <TabsList className="bg-muted p-1 rounded-xl h-auto gap-1 grid grid-cols-3 max-w-xl">
          <TabsTrigger value="flujo" className="rounded-lg text-xs font-bold py-1.5 cursor-pointer">
            Flujo y Operaciones ({detalle.cobros.length + detalle.movimientos.length})
          </TabsTrigger>
          <TabsTrigger
            value="metodos"
            className="rounded-lg text-xs font-bold py-1.5 cursor-pointer"
          >
            Formas de Pago ({detalle.por_metodo_pago.length})
          </TabsTrigger>
          <TabsTrigger
            value="conceptos"
            className="rounded-lg text-xs font-bold py-1.5 cursor-pointer"
          >
            Conceptos ({detalle.por_concepto.length})
          </TabsTrigger>
        </TabsList>

        {/* Sub-Tab 1: Flujo unificado del turno */}
        <TabsContent value="flujo" className="outline-none">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por recibo, paciente, concepto o forma de pago..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-xl text-xs">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'ingresos', label: 'Ingresos (+)' },
                    { id: 'egresos', label: 'Salidas (-)' },
                    { id: 'anulados', label: 'Anulados' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTipoFiltro(f.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer',
                      tipoFiltro === f.id
                        ? 'bg-background text-primary shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Hora</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Operación / Paciente / Concepto</th>
                    <th className="py-2.5 px-3">Forma de Pago / Gaveta</th>
                    <th className="py-2.5 px-3 text-right">Monto Bs.</th>
                    <th className="py-2.5 px-3 text-right">Ref.</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unifiedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No hay operaciones que coincidan con el filtro en este turno.
                      </td>
                    </tr>
                  ) : (
                    unifiedItems.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          item.esAnulado && 'opacity-65 bg-rose-500/5'
                        )}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString('es-VE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.esAnulado ? (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px]">
                              Anulado
                            </Badge>
                          ) : item.esIngreso ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-[10px] gap-1"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              {item.kind === 'cobro' ? 'Cobro POS' : 'Entrada'}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-rose-500/40 text-rose-700 dark:text-rose-400 text-[10px] gap-1"
                            >
                              <ArrowDownRight className="w-3 h-3" />
                              Salida
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-[280px]">
                          <span
                            className={cn(
                              'font-bold text-foreground block truncate',
                              item.esAnulado && 'line-through'
                            )}
                          >
                            {item.titulo}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground block truncate">
                            {item.subtitulo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-mono text-muted-foreground">
                          {item.metodosLabel}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right font-black font-mono',
                            item.esAnulado
                              ? 'text-muted-foreground line-through'
                              : item.esIngreso
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                          )}
                        >
                          {item.esAnulado ? '' : item.esIngreso ? '+' : '-'}Bs.{' '}
                          {item.montoBs.toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-muted-foreground">
                          {item.montoDivisa.toFixed(2)} {detalle.moneda_referencia}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.kind === 'cobro' ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenReciboCobro(item.rawCobro)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                title="Imprimir Recibo (Bs.)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!item.esAnulado && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAnularCobro(item.rawCobro)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                  title="Anular Recibo"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Caja chica</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Sub-Tab 2: Formas de Pago del Turno */}
        <TabsContent value="metodos" className="outline-none">
          <div className="p-4 rounded-2xl bg-card border border-border">
            {detalle.por_metodo_pago.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sin métodos de pago registrados en este turno.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {detalle.por_metodo_pago.map((m, idx) => {
                  const montoBs =
                    m.moneda.toUpperCase() === 'VES'
                      ? m.total_monto_origen
                      : Math.round(m.total_equivalente_divisa * tasa * 100) / 100;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          {getMetodoIcon(m.metodo)}
                          {m.nombre_legible}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {m.porcentaje}%
                        </Badge>
                      </div>
                      <div className="font-mono">
                        <span className="text-lg font-black text-foreground block">
                          Bs.{' '}
                          {montoBs.toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {m.moneda} {m.total_monto_origen.toFixed(2)} • {m.cantidad_transacciones}{' '}
                          op(s)
                        </span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${Math.min(100, m.porcentaje)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sub-Tab 3: Conceptos Clínicos del Turno */}
        <TabsContent value="conceptos" className="outline-none">
          <div className="p-4 rounded-2xl bg-card border border-border">
            {detalle.por_concepto.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sin conceptos clínicos facturados en este turno.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {detalle.por_concepto.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        {c.nombre_legible}
                      </span>
                      <span className="font-mono text-primary">{c.porcentaje}%</span>
                    </div>
                    <div className="font-mono">
                      <span className="text-base font-black text-foreground block">
                        Bs.{' '}
                        {c.total_ves.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.cantidad_items} ítem(s) • Ref. {detalle.moneda_referencia}{' '}
                        {c.total_divisa.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TurnoDetalleView;
