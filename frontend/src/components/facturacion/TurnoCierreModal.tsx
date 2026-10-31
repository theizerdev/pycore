import React, { useEffect, useMemo, useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Coins,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Sparkles,
  Ban,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  cajasApi,
  type TurnoCaja,
  type TurnoDetalleResumen,
} from '../../api/cajas';
import { cn } from '../../lib/utils';
import { CorteCajaTicketModal } from './CorteCajaTicketModal';

interface TurnoCierreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turno: TurnoCaja | null;
  onTurnoClosed: (turnoCerrado: TurnoCaja) => void;
  onRequestPrintCorte?: (turnoCerrado: TurnoCaja, autoPrint: boolean) => void;
}

export const TurnoCierreModal: React.FC<TurnoCierreModalProps> = ({
  open,
  onOpenChange,
  turno,
  onTurnoClosed,
  onRequestPrintCorte,
}) => {
  const [detalle, setDetalle] = useState<TurnoDetalleResumen | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState<boolean>(false);

  const [arqueoVes, setArqueoVes] = useState<string>('');
  const [arqueoUsd, setArqueoUsd] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [autoPrintCorteZ, setAutoPrintCorteZ] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Vista previa local de Arqueo Parcial (Corte X) antes de cerrar
  const [previewCorteXOpen, setPreviewCorteXOpen] = useState(false);

  useEffect(() => {
    if (!open || !turno?.id) return;

    setArqueoVes('');
    setArqueoUsd('');
    setNotas('');

    let cancelled = false;
    const load = async () => {
      try {
        setLoadingDetalle(true);
        const res = await cajasApi.getTurnoDetalle(turno.id);
        if (!cancelled) {
          setDetalle(res);
        }
      } catch {
        if (!cancelled) {
          setDetalle(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetalle(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, turno?.id]);

  const tasa = detalle && detalle.tasa_bcv_actual > 0 ? detalle.tasa_bcv_actual : 1;

  // Saldo físico esperado en gaveta (conciliado por el backend o fallback inmediato)
  const esperadoUsd = useMemo(() => {
    if (detalle) return Number(detalle.esperado_gaveta_usd || 0);
    if (!turno) return 0;
    return (
      Math.round(
        (Number(turno.fondo_inicial_usd || 0) +
          Number(turno.total_ingresos_usd || 0) -
          Number(turno.total_egresos_usd || 0)) *
          100
      ) / 100
    );
  }, [detalle, turno]);

  const esperadoVes = useMemo(() => {
    if (detalle) return Number(detalle.esperado_gaveta_ves || 0);
    if (!turno) return 0;
    return (
      Math.round(
        (Number(turno.fondo_inicial_ves || 0) +
          Number(turno.total_ingresos_ves || 0) -
          Number(turno.total_egresos_ves || 0)) *
          100
      ) / 100
    );
  }, [detalle, turno]);

  // Cálculos en vivo de diferencias por gaveta
  const diferenciaVes = useMemo(() => {
    if (arqueoVes.trim() === '') return null;
    const val = parseFloat(arqueoVes);
    if (isNaN(val)) return null;
    return Math.round((val - esperadoVes) * 100) / 100;
  }, [arqueoVes, esperadoVes]);

  const diferenciaUsd = useMemo(() => {
    if (arqueoUsd.trim() === '') return null;
    const val = parseFloat(arqueoUsd);
    if (isNaN(val)) return null;
    return Math.round((val - esperadoUsd) * 100) / 100;
  }, [arqueoUsd, esperadoUsd]);

  // Diferencia consolidada equivalente en Bolívares
  const diferenciaConsolidadaBs = useMemo(() => {
    if (diferenciaVes === null && diferenciaUsd === null) return null;
    const dVes = diferenciaVes ?? 0;
    const dUsd = diferenciaUsd ?? 0;
    return Math.round((dVes + dUsd * tasa) * 100) / 100;
  }, [diferenciaVes, diferenciaUsd, tasa]);

  const handleUsarSaldoEsperado = () => {
    setArqueoVes(Math.max(0, esperadoVes).toFixed(2));
    setArqueoUsd(Math.max(0, esperadoUsd).toFixed(2));
  };

  const getMetodoIcon = (metodo: string) => {
    const m = metodo.toLowerCase();
    if (m.includes('efectivo')) return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
    if (m.includes('punto') || m.includes('tarjeta'))
      return <CreditCard className="w-3.5 h-3.5 text-sky-600" />;
    if (m.includes('movil')) return <Smartphone className="w-3.5 h-3.5 text-amber-600" />;
    if (m.includes('seguro')) return <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />;
    return <Building className="w-3.5 h-3.5 text-slate-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turno) return;

    const vesVal = arqueoVes.trim() === '' ? NaN : parseFloat(arqueoVes);
    const usdVal = arqueoUsd.trim() === '' ? NaN : parseFloat(arqueoUsd);

    if (isNaN(vesVal) || vesVal < 0 || isNaN(usdVal) || usdVal < 0) {
      toast.error(
        'Ingrese el conteo físico en Bolívares y Divisas (o pulse "Usar Saldo Esperado")'
      );
      return;
    }

    try {
      setSubmitting(true);
      const turnoCerrado = await cajasApi.closeTurno(turno.id, {
        arqueo_declarado_usd: usdVal,
        arqueo_declarado_ves: vesVal,
        notas_cierre: notas.trim() || undefined,
      });

      toast.success('¡Corte Z ejecutado y turno de caja cerrado correctamente!');
      onOpenChange(false);
      onTurnoClosed(turnoCerrado);

      if (autoPrintCorteZ && onRequestPrintCorte) {
        onRequestPrintCorte(turnoCerrado, true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cerrar el turno de caja');
    } finally {
      setSubmitting(false);
    }
  };

  if (!turno) return null;

  const fondoInicialTotalBs =
    Math.round(
      ((Number(turno.fondo_inicial_ves) || 0) +
        (Number(turno.fondo_inicial_usd) || 0) * tasa) *
        100
    ) / 100;

  const ventasNetasBs = detalle
    ? Number(detalle.ventas_netas_ves || 0)
    : Math.round(
        ((Number(turno.total_ingresos_ves) || 0) +
          (Number(turno.total_ingresos_usd) || 0) * tasa) *
          100
      ) / 100;

  const salidasTotalBs = detalle
    ? Math.round(
        ((Number(detalle.efectivo_egresos_ves) || 0) +
          (Number(detalle.efectivo_egresos_usd) || 0) * tasa) *
          100
      ) / 100
    : Math.round(
        ((Number(turno.total_egresos_ves) || 0) +
          (Number(turno.total_egresos_usd) || 0) * tasa) *
          100
      ) / 100;

  const entradasExtraTotalBs = detalle
    ? Math.round(
        ((Number(detalle.efectivo_ingresos_extra_ves) || 0) +
          (Number(detalle.efectivo_ingresos_extra_usd) || 0) * tasa) *
          100
      ) / 100
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[93vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          {/* Header estilo Eleventa / FixSale POS */}
          <DialogHeader className="px-5 pt-4 pb-3.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black flex items-center gap-2">
                    <span>Corte de Caja y Arqueo de Turno (Corte Z)</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    >
                      Turno #{turno.id}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {turno.caja_nombre || 'Caja Principal'} • Cajero:{' '}
                    <strong>{turno.cajero_nombre || 'Operador'}</strong> • Apertura:{' '}
                    {new Date(turno.apertura_at).toLocaleString('es-VE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </DialogDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewCorteXOpen(true)}
                className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-primary" />
                Imprimir Corte X (Bs.)
              </Button>
            </div>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-5 space-y-4"
          >
            {/* Franja Superior de 4 KPIs del Turno (Réplica FixSale POS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Fondo Inicial */}
              <div className="p-3 rounded-xl border border-border bg-muted/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Fondo Inicial
                </span>
                <span className="text-sm font-black font-mono text-foreground block mt-0.5">
                  Bs.{' '}
                  {fondoInicialTotalBs.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Bs.{Number(turno.fondo_inicial_ves || 0).toFixed(2)} + Ref.{' '}
                  {Number(turno.fondo_inicial_usd || 0).toFixed(2)}
                </span>
              </div>

              {/* 2. Ventas Netas del Turno */}
              <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Ventas Netas (+)
                </span>
                <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300 block mt-0.5">
                  +Bs.{' '}
                  {ventasNetasBs.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
                  {detalle ? `${detalle.cantidad_completadas} cobro(s) efectivos` : 'Cobros del turno'}
                </span>
              </div>

              {/* 3. Anulaciones Conciliadas o Entradas Extra */}
              {detalle && detalle.cantidad_anuladas > 0 ? (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Anuladas ({detalle.cantidad_anuladas})
                  </span>
                  <span className="text-sm font-black font-mono text-rose-700 dark:text-rose-300 block mt-0.5">
                    -Bs.{' '}
                    {detalle.total_anuladas_ves.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400">
                    Ya deducidas del cajón
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-sky-500/25 bg-sky-500/5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                    Entradas Caja Chica (+)
                  </span>
                  <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300 block mt-0.5">
                    +Bs.{' '}
                    {entradasExtraTotalBs.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Aportes de sencillo
                  </span>
                </div>
              )}

              {/* 4. Salidas / Egresos */}
              <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  Salidas / Gastos (-)
                </span>
                <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
                  -Bs.{' '}
                  {salidasTotalBs.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {detalle ? `${detalle.movimientos.filter((m) => m.tipo === 'egreso').length} retiro(s)` : 'Egresos menores'}
                </span>
              </div>
            </div>

            {/* Cuerpo Principal de 2 Columnas (Izquierda: Sistema | Derecha: Conteo Físico) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* COLUMNA IZQUIERDA (7 cols): Esperado en Cajón + Medios Bancarios + Formas de Pago */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Tarjeta Efectivo Físico Esperado en Gaveta */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">
                      Dinero Físico Esperado en Cajón (Gaveta)
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Fondo + Efectivo Neto - Salidas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                      <span className="text-[10.5px] font-bold text-blue-700 dark:text-blue-300 block">
                        Gaveta Bolívares (Bs.)
                      </span>
                      <span className="text-lg font-black font-mono text-blue-800 dark:text-blue-200">
                        Bs.{' '}
                        {esperadoVes.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 block">
                        Gaveta Divisas ({detalle?.moneda_referencia || 'USD'})
                      </span>
                      <span className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-200">
                        {esperadoUsd.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-xs font-bold">
                          {detalle?.moneda_referencia || 'USD'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Aviso FixSale POS sobre pagos electrónicos acreditados en banco */}
                  {detalle && detalle.ingresos_electronicos_ves > 0 && (
                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          Medios Bancarios / Digitales (+Bs.{' '}
                          {detalle.ingresos_electronicos_ves.toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          ):
                        </span>{' '}
                        Punto de Venta, Pago Móvil, Transferencias y Seguros se acreditan directamente en banco, no en el cajón físico.
                      </div>
                    </div>
                  )}
                </div>

                {/* Desglose por Forma de Pago del Turno */}
                <div className="p-3.5 rounded-2xl border border-border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground">
                      Desglose por Forma de Pago en este Turno
                    </span>
                    {loadingDetalle && (
                      <span className="text-[10px] text-muted-foreground">Actualizando...</span>
                    )}
                  </div>

                  {detalle && detalle.por_metodo_pago.length > 0 ? (
                    <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
                      {detalle.por_metodo_pago.map((m, idx) => {
                        const equivBs =
                          m.moneda.toUpperCase() === 'VES'
                            ? m.total_monto_origen
                            : Math.round(m.total_equivalente_divisa * tasa * 100) / 100;
                        return (
                          <div
                            key={idx}
                            className="px-3 py-2 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {getMetodoIcon(m.metodo)}
                              <div>
                                <span className="font-bold text-foreground block leading-tight">
                                  {m.nombre_legible}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {m.cantidad_transacciones} op(s) • {m.porcentaje}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-black text-foreground block">
                                Bs.{' '}
                                {equivBs.toLocaleString('es-VE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              {m.moneda.toUpperCase() !== 'VES' && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({m.moneda} {m.total_monto_origen.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-5 text-center text-xs text-muted-foreground">
                      Sin cobros registrados en este turno hasta el momento.
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA (5 cols): Conteo Físico + Resultado del Cuadre + Notas */}
              <div className="lg:col-span-5 space-y-3.5">
                <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-foreground">
                      Conteo Físico en Gaveta
                    </span>
                    <button
                      type="button"
                      onClick={handleUsarSaldoEsperado}
                      className="text-[10.5px] font-extrabold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Usar Saldo Esperado
                    </button>
                  </div>

                  {/* Input Conteo Físico Bs. */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-600" />
                      Efectivo Físico Bolívares (Bs.) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={arqueoVes}
                      onChange={(e) => setArqueoVes(e.target.value)}
                      placeholder={`Esperado: ${esperadoVes.toFixed(2)}`}
                      className="font-black font-mono text-sm h-10"
                      required
                    />
                    {diferenciaVes !== null && (
                      <div
                        className={cn(
                          'text-[11px] font-bold flex items-center gap-1 font-mono',
                          Math.abs(diferenciaVes) < 0.01 && 'text-emerald-600',
                          diferenciaVes >= 0.01 && 'text-blue-600',
                          diferenciaVes <= -0.01 && 'text-rose-600'
                        )}
                      >
                        {Math.abs(diferenciaVes) < 0.01 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cuadre exacto en Bs.
                          </>
                        ) : diferenciaVes > 0 ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" /> Sobrante: +Bs.{' '}
                            {diferenciaVes.toFixed(2)}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" /> Faltante: -Bs.{' '}
                            {Math.abs(diferenciaVes).toFixed(2)}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Input Conteo Físico Divisa */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Efectivo Físico Divisas ({detalle?.moneda_referencia || 'USD'}) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={arqueoUsd}
                      onChange={(e) => setArqueoUsd(e.target.value)}
                      placeholder={`Esperado: ${esperadoUsd.toFixed(2)}`}
                      className="font-black font-mono text-sm h-10"
                      required
                    />
                    {diferenciaUsd !== null && (
                      <div
                        className={cn(
                          'text-[11px] font-bold flex items-center gap-1 font-mono',
                          Math.abs(diferenciaUsd) < 0.01 && 'text-emerald-600',
                          diferenciaUsd >= 0.01 && 'text-blue-600',
                          diferenciaUsd <= -0.01 && 'text-rose-600'
                        )}
                      >
                        {Math.abs(diferenciaUsd) < 0.01 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cuadre exacto en divisa
                          </>
                        ) : diferenciaUsd > 0 ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" /> Sobrante: +
                            {diferenciaUsd.toFixed(2)} {detalle?.moneda_referencia || 'USD'}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" /> Faltante: -
                            {Math.abs(diferenciaUsd).toFixed(2)}{' '}
                            {detalle?.moneda_referencia || 'USD'}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Semáforo Consolidado de Cuadre (Réplica FixSale POS) */}
                  {diferenciaConsolidadaBs !== null && (
                    <div
                      className={cn(
                        'p-3 rounded-xl border text-xs flex items-center justify-between font-bold',
                        Math.abs(diferenciaConsolidadaBs) < 0.05
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                          : diferenciaConsolidadaBs > 0
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                      )}
                    >
                      <span>
                        {Math.abs(diferenciaConsolidadaBs) < 0.05
                          ? 'Cuadre Perfecto'
                          : diferenciaConsolidadaBs > 0
                            ? 'Sobrante Consolidado'
                            : 'Faltante Consolidado'}
                      </span>
                      <span className="font-black font-mono">
                        {diferenciaConsolidadaBs > 0 ? '+' : ''}Bs.{' '}
                        {diferenciaConsolidadaBs.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Observaciones y Auto-Impresión de Corte Z */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold">
                    Observaciones / Novedades del Cierre
                  </Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: Efectivo entregado a administración, cierre de lote bancario verificado..."
                    className="text-xs resize-none"
                    rows={2}
                  />

                  {onRequestPrintCorte && (
                    <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoPrintCorteZ}
                        onChange={(e) => setAutoPrintCorteZ(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Imprimir Comprobante Térmico de Corte Z (Bs.) al cerrar</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 px-5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {submitting ? 'Ejecutando Corte Z...' : 'Ejecutar Corte Z y Cerrar Turno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Impresión de Arqueo Parcial (Corte X) en Bs. */}
      <CorteCajaTicketModal
        open={previewCorteXOpen}
        onOpenChange={setPreviewCorteXOpen}
        turnoId={turno.id}
        initialDetalle={detalle}
        fallbackTurno={turno}
      />
    </>
  );
};

export default TurnoCierreModal;
