import React, { useEffect, useMemo, useRef } from 'react';
import {
  Coins,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Activity,
  Calculator,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import type { CobroPagoItem } from '../../../api/cajas';
import { cn } from '../../../lib/utils';

interface PosPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketName: string;
  pacienteNombre?: string;
  pacienteSeguro?: string | null;
  monedaReferencia: 'USD' | 'EUR';
  tasaActiva: number;
  totalFacturaDivisa: number;
  totalFacturaVes: number;
  pagos: CobroPagoItem[];
  setPagos: React.Dispatch<React.SetStateAction<CobroPagoItem[]>>;
  tieneSeguro: boolean;
  setTieneSeguro: (val: boolean) => void;
  seguroNombre: string;
  setSeguroNombre: (val: string) => void;
  seguroPorcentaje: number;
  setSeguroPorcentaje: (val: number) => void;
  submittingCobro: boolean;
  preferredSubmitMode: 'ticket' | 'solo_cobrar';
  onConfirmCobro: (emitirTicket: boolean) => void;
  onPlayBeep: () => void;
}

export const PosPaymentModal: React.FC<PosPaymentModalProps> = ({
  open,
  onOpenChange,
  ticketName,
  pacienteNombre,
  pacienteSeguro,
  monedaReferencia,
  tasaActiva,
  totalFacturaDivisa,
  totalFacturaVes,
  pagos,
  setPagos,
  tieneSeguro,
  setTieneSeguro,
  seguroNombre,
  setSeguroNombre,
  seguroPorcentaje,
  setSeguroPorcentaje,
  submittingCobro,
  preferredSubmitMode,
  onConfirmCobro,
  onPlayBeep,
}) => {
  const cashReceivedInputRef = useRef<HTMLInputElement>(null);
  const refSym = monedaReferencia === 'EUR' ? '€' : '$';
  const safeTasa = tasaActiva > 0 ? tasaActiva : 1;

  const formatBs = (val: number) =>
    `Bs. ${(Number.isFinite(val) ? val : 0).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Cálculos en tiempo real de lo abonado, faltante y vuelto en Bs. y Divisa
  const totalAbonadoDivisa = useMemo(() => {
    return pagos.reduce((acc, p) => {
      const orig = Number(p.monto_moneda_origen) || 0;
      if (p.moneda === monedaReferencia) return acc + orig;
      if (p.moneda === 'VES') return acc + orig / safeTasa;
      return acc + orig;
    }, 0);
  }, [pagos, monedaReferencia, safeTasa]);

  const totalAbonadoVes = useMemo(() => {
    return pagos.reduce((acc, p) => {
      const orig = Number(p.monto_moneda_origen) || 0;
      if (p.moneda === 'VES') return acc + orig;
      return acc + orig * safeTasa;
    }, 0);
  }, [pagos, safeTasa]);

  const diffDivisa = totalAbonadoDivisa - totalFacturaDivisa;
  const saldoPendienteDivisa = diffDivisa < -0.009 ? Math.abs(diffDivisa) : 0;
  const vueltoDivisa = diffDivisa > 0.009 ? diffDivisa : 0;

  const saldoPendienteVes = saldoPendienteDivisa * safeTasa;
  const vueltoVes = vueltoDivisa * safeTasa;
  const isCubierto = saldoPendienteDivisa <= 0.01;

  // Atajos F11 (Cobrar y Ticket) / F12 (Solo Cobrar) dentro del modal de cobro
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (submittingCobro) return;
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        if (isCubierto) onConfirmCobro(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        if (isCubierto) onConfirmCobro(false);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [open, isCubierto, submittingCobro, onConfirmCobro]);

  // Enfoque inteligente al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        cashReceivedInputRef.current?.select();
      }, 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Selección rápida de modalidad única (FixSale Speed Presets)
  const applyQuickPreset = (
    preset: 'pago_movil' | 'punto_venta' | 'efectivo_ves' | 'efectivo_divisa',
    customAmount?: number
  ) => {
    onPlayBeep();
    setTieneSeguro(false);

    if (preset === 'pago_movil' || preset === 'punto_venta' || preset === 'efectivo_ves') {
      const exactBs = Math.round(totalFacturaVes * 100) / 100;
      setPagos([
        {
          metodo: preset,
          moneda: 'VES',
          monto_moneda_origen: customAmount ?? exactBs,
          referencia: '',
          banco_origen: '',
          notas: '',
        },
      ]);
      return;
    }

    const exactDiv = Math.round(totalFacturaDivisa * 100) / 100;
    setPagos([
      {
        metodo: monedaReferencia === 'EUR' ? 'efectivo_eur' : 'efectivo_usd',
        moneda: monedaReferencia,
        monto_moneda_origen: customAmount ?? exactDiv,
        referencia: '',
        banco_origen: '',
        notas: '',
      },
    ]);
  };

  // Agregar nueva fila de pago mixto con el saldo faltante precargado
  const handleAddPagoRow = () => {
    onPlayBeep();
    const faltaBs = Math.max(0.01, Math.round(saldoPendienteVes * 100) / 100);
    setPagos((prev) => [
      ...prev,
      {
        metodo: 'pago_movil',
        moneda: 'VES',
        monto_moneda_origen: faltaBs,
        referencia: '',
        banco_origen: '',
        notas: '',
      },
    ]);
  };

  // Completar saldo exacto en una fila específica
  const handleFillRemainingOnRow = (index: number) => {
    onPlayBeep();
    const otherDivisa = pagos.reduce((acc, p, idx) => {
      if (idx === index) return acc;
      const orig = Number(p.monto_moneda_origen) || 0;
      if (p.moneda === 'VES') return acc + orig / safeTasa;
      return acc + orig;
    }, 0);
    const neededDivisa = Math.max(0, totalFacturaDivisa - otherDivisa);
    const target = pagos[index];
    const newAmount =
      target.moneda === 'VES'
        ? Math.round(neededDivisa * safeTasa * 100) / 100
        : Math.round(neededDivisa * 100) / 100;

    setPagos((prev) =>
      prev.map((row, i) => (i === index ? { ...row, monto_moneda_origen: newAmount } : row))
    );
  };

  const handleRemovePagoRow = (index: number) => {
    if (pagos.length <= 1) return;
    onPlayBeep();
    setPagos((prev) => prev.filter((_, i) => i !== index));
  };

  const isSinglePayment = pagos.length === 1 && !tieneSeguro;
  const primaryPago = pagos[0];
  const needsReference = (metodo: string) =>
    ['pago_movil', 'punto_venta', 'transferencia', 'zelle', 'seguro_medico'].includes(metodo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[94vh] overflow-y-auto p-4 sm:p-5 rounded-2xl bg-card text-card-foreground border-border shadow-2xl">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-foreground">
              <Coins className="w-5 h-5 text-primary" />
              Completar Venta y Cobro POS
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono">
                {ticketName}
              </Badge>
              {pacienteNombre && (
                <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold">
                  {pacienteNombre}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs flex items-center justify-between flex-wrap gap-1 pt-0.5">
            <span>
              El comprobante impreso se emitirá <strong>100% en Bolívares (Bs.)</strong> conforme a normativa legal.
            </span>
            <span className="font-mono font-bold text-foreground">
              Tasa BCV: 1 {monedaReferencia} = {formatBs(safeTasa)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {/* 1. HERO TOTAL EN BOLÍVARES + ESTADO DE CAMBIO ESTILO FIXSALE */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Total a Pagar */}
            <div className="sm:col-span-7 p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  TOTAL A PAGAR EN BOLÍVARES
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                  Ref: {refSym}
                  {totalFacturaDivisa.toFixed(2)}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400 mt-1">
                {formatBs(totalFacturaVes)}
              </div>
              <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                Recibido: {formatBs(totalAbonadoVes)} ({refSym}
                {totalAbonadoDivisa.toFixed(2)})
              </div>
            </div>

            {/* Calculadora Dinámica de Vuelto / Falta por Cobrar (FixSale Signature) */}
            <div
              className={cn(
                'sm:col-span-5 p-3.5 rounded-xl border-2 flex flex-col justify-between transition-all',
                vueltoDivisa > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                  : saldoPendienteDivisa > 0.01
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-primary/10 border-primary/40 text-foreground'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {vueltoDivisa > 0
                    ? 'CAMBIO / VUELTO A DAR'
                    : saldoPendienteDivisa > 0.01
                    ? 'FALTA POR COBRAR'
                    : 'ESTADO DEL COBRO'}
                </span>
                {vueltoDivisa > 0 ? (
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : saldoPendienteDivisa > 0.01 ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </div>

              {vueltoDivisa > 0 ? (
                <>
                  <div className="text-xl sm:text-2xl font-black font-mono leading-tight mt-1">
                    {formatBs(vueltoVes)}
                  </div>
                  <div className="text-[10.5px] font-mono font-bold opacity-80">
                    Equiv. cajero: {refSym}
                    {vueltoDivisa.toFixed(2)}
                  </div>
                </>
              ) : saldoPendienteDivisa > 0.01 ? (
                <>
                  <div className="text-xl sm:text-2xl font-black font-mono leading-tight mt-1">
                    {formatBs(saldoPendienteVes)}
                  </div>
                  <div className="text-[10.5px] font-mono font-bold opacity-80">
                    Faltan: {refSym}
                    {saldoPendienteDivisa.toFixed(2)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base sm:text-lg font-black mt-1 flex items-center gap-1.5 text-primary">
                    <Sparkles className="w-4 h-4" />
                    PAGO EXACTO
                  </div>
                  <div className="text-[10.5px] text-muted-foreground font-medium">
                    Sin cambio pendiente por entregar
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. BOTONERA RÁPIDA 1-CLIC DE MODALIDAD Y DENOMINACIONES (FIXSALE) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Selección Rápida de Pago (1 Clic):
              </span>
              <span className="text-[10px] text-muted-foreground">
                Reemplaza por pago directo o combine abajo
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => applyQuickPreset('pago_movil')}
                className={cn(
                  'p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                  isSinglePayment && primaryPago?.metodo === 'pago_movil'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/60'
                )}
              >
                <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-extrabold block leading-none truncate">
                    Pago Móvil
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">Exacto Bs.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickPreset('punto_venta')}
                className={cn(
                  'p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                  isSinglePayment && primaryPago?.metodo === 'punto_venta'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/60'
                )}
              >
                <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-extrabold block leading-none truncate">
                    Punto / Tarjeta
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">Exacto Bs.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickPreset('efectivo_ves')}
                className={cn(
                  'p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                  isSinglePayment && primaryPago?.metodo === 'efectivo_ves'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/60'
                )}
              >
                <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-extrabold block leading-none truncate">
                    Efectivo Bs.
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">Bolívares</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyQuickPreset('efectivo_divisa')}
                className={cn(
                  'p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                  isSinglePayment &&
                    (primaryPago?.metodo === 'efectivo_usd' ||
                      primaryPago?.metodo === 'efectivo_eur')
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/60'
                )}
              >
                <Coins className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-extrabold block leading-none truncate">
                    Efectivo {monedaReferencia}
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">
                    Exacto {refSym}
                  </span>
                </div>
              </button>
            </div>

            {/* Billetes Rápidos para Cálculo de Vuelto Instantáneo */}
            <div className="grid grid-cols-6 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => applyQuickPreset('efectivo_ves')}
                className="py-1.5 px-2 rounded-lg bg-primary text-primary-foreground font-extrabold text-[11px] cursor-pointer hover:bg-primary/90 shadow-2xs truncate"
              >
                Exacto Bs.
              </button>
              {[5, 10, 20, 50, 100].map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => applyQuickPreset('efectivo_divisa', bill)}
                  className="py-1.5 px-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-extrabold text-xs cursor-pointer border border-border font-mono transition-colors"
                  title={`Equivale a ${formatBs(bill * safeTasa)}`}
                >
                  {refSym}
                  {bill}
                </button>
              ))}
            </div>
          </div>

          {/* 3. CAJA "¿CON CUÁNTO PAGA EL PACIENTE?" (CUANDO ES UN SOLO MEDIO DE PAGO) */}
          {isSinglePayment && primaryPago && (
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-300/70 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <Label className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  ¿Con cuánto paga el paciente? ({primaryPago.moneda === 'VES' ? 'Bs.' : refSym})
                </Label>
                <p className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80">
                  Ingrese el billete o monto entregado para calcular el vuelto automáticamente en Bolívares.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black font-mono text-amber-900 dark:text-amber-200">
                  {primaryPago.moneda === 'VES' ? 'Bs.' : refSym}
                </span>
                <Input
                  ref={cashReceivedInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={primaryPago.monto_moneda_origen || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPagos([{ ...primaryPago, monto_moneda_origen: val }]);
                  }}
                  className="h-9 w-36 text-right font-mono font-black text-base bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-700"
                />
              </div>
            </div>
          )}

          {/* 4. COBERTURA DE SEGURO MÉDICO / PÓLIZA */}
          <div className="p-2.5 rounded-xl border border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={tieneSeguro}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTieneSeguro(checked);
                    if (checked && pacienteSeguro && !seguroNombre) {
                      setSeguroNombre(pacienteSeguro);
                    }
                  }}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Aplicar Cobertura de Seguro Médico / Carta Aval</span>
              </label>
              {tieneSeguro && (
                <Badge className="bg-indigo-600 text-white text-[9.5px]">
                  Póliza {seguroPorcentaje}%
                </Badge>
              )}
            </div>

            {tieneSeguro && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-border">
                <div>
                  <Label className="text-[10px] text-muted-foreground font-semibold">
                    Aseguradora / Convenio:
                  </Label>
                  <Input
                    value={seguroNombre}
                    onChange={(e) => setSeguroNombre(e.target.value)}
                    placeholder="Ej. Seguros Caracas, Mercantil..."
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground font-semibold">
                    Porcentaje Cubierto por Póliza:
                  </Label>
                  <Select
                    value={String(seguroPorcentaje)}
                    onValueChange={(v) => setSeguroPorcentaje(parseInt(v, 10))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="50">50% Póliza / 50% Deducible</SelectItem>
                      <SelectItem value="70">70% Póliza / 30% Deducible</SelectItem>
                      <SelectItem value="80">80% Póliza / 20% Deducible</SelectItem>
                      <SelectItem value="90">90% Póliza / 10% Deducible</SelectItem>
                      <SelectItem value="100">100% Cubierto por Aseguradora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* 5. DESGLOSE DE MEDIOS DE PAGO (SIMPLE O MIXTO) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wide">
                Desglose de Pagos ({pagos.length}):
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddPagoRow}
                className="h-7 text-[11px] gap-1 font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Agregar Pago Mixto
              </Button>
            </div>

            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
              {pagos.map((p, idx) => {
                const lineBs =
                  p.moneda === 'VES'
                    ? Number(p.monto_moneda_origen) || 0
                    : (Number(p.monto_moneda_origen) || 0) * safeTasa;

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-border bg-background space-y-2 shadow-2xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Selector Método */}
                      <div className="sm:col-span-5">
                        <Select
                          value={p.metodo}
                          onValueChange={(val) => {
                            const updated = [...pagos];
                            const prevMoneda = updated[idx].moneda;
                            let nextMoneda: 'VES' | 'USD' | 'EUR' = 'VES';
                            if (
                              val === 'efectivo_usd' ||
                              val === 'zelle' ||
                              val === 'seguro_medico'
                            ) {
                              nextMoneda = 'USD';
                            } else if (val === 'efectivo_eur') {
                              nextMoneda = 'EUR';
                            } else {
                              nextMoneda = 'VES';
                            }

                            // Convertir automáticamente el monto al cambiar moneda
                            let nextMonto = Number(updated[idx].monto_moneda_origen) || 0;
                            if (prevMoneda !== 'VES' && nextMoneda === 'VES') {
                              nextMonto = Math.round(nextMonto * safeTasa * 100) / 100;
                            } else if (prevMoneda === 'VES' && nextMoneda !== 'VES') {
                              nextMonto = Math.round((nextMonto / safeTasa) * 100) / 100;
                            }

                            updated[idx] = {
                              ...updated[idx],
                              metodo: val,
                              moneda: nextMoneda,
                              monto_moneda_origen: nextMonto,
                            };
                            setPagos(updated);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="pago_movil">Pago Móvil (Bs.)</SelectItem>
                            <SelectItem value="punto_venta">Punto de Venta / Tarjeta (Bs.)</SelectItem>
                            <SelectItem value="efectivo_ves">Efectivo Bolívares (Bs.)</SelectItem>
                            <SelectItem value="transferencia">Transferencia Bancaria (Bs.)</SelectItem>
                            <SelectItem value="efectivo_usd">Efectivo Divisa ({refSym})</SelectItem>
                            <SelectItem value="efectivo_eur">Efectivo Euros (€)</SelectItem>
                            <SelectItem value="zelle">Transferencia Internacional / Zelle</SelectItem>
                            <SelectItem value="seguro_medico">Cobertura Póliza / Seguro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Monto + Moneda + Botón Completar Restante */}
                      <div className="sm:col-span-4 flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.monto_moneda_origen || ''}
                          onChange={(e) => {
                            const updated = [...pagos];
                            updated[idx] = {
                              ...updated[idx],
                              monto_moneda_origen: parseFloat(e.target.value) || 0,
                            };
                            setPagos(updated);
                          }}
                          className="h-8 text-xs font-mono font-bold text-right"
                        />
                        <span className="text-[10px] font-bold font-mono text-muted-foreground w-8 text-center">
                          {p.moneda === 'VES' ? 'Bs.' : p.moneda}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFillRemainingOnRow(idx)}
                          title="Ajustar al saldo restante exacto"
                          className="px-1.5 h-8 rounded-md border border-border bg-muted/50 hover:bg-primary/10 hover:text-primary text-[9.5px] font-bold cursor-pointer shrink-0"
                        >
                          Resto
                        </button>
                      </div>

                      {/* Referencia / Lote + Eliminar */}
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <Input
                          type="text"
                          placeholder={needsReference(p.metodo) ? 'Nro. Ref / Lote' : 'Nota opc.'}
                          value={p.referencia || ''}
                          onChange={(e) => {
                            const updated = [...pagos];
                            updated[idx] = { ...updated[idx], referencia: e.target.value };
                            setPagos(updated);
                          }}
                          className="h-8 text-[11px]"
                        />
                        {pagos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePagoRow(idx)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Quitar medio de pago"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {p.moneda !== 'VES' && (
                      <div className="text-[10px] text-muted-foreground font-mono flex justify-between px-0.5">
                        <span>Equivalente legal en ticket (Bs.):</span>
                        <span className="font-bold text-foreground">{formatBs(lineBs)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. FOOTER DOBLE ESTILO FIXSALE POS: [F12] SOLO COBRAR | [F11] EMITIR TICKET Y COBRAR */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submittingCobro}
            className="text-xs h-10 cursor-pointer"
          >
            Cancelar [ESC]
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              type="button"
              variant={preferredSubmitMode === 'solo_cobrar' ? 'default' : 'secondary'}
              disabled={submittingCobro || !isCubierto}
              onClick={() => onConfirmCobro(false)}
              className={cn(
                'h-10 text-xs font-extrabold gap-1.5 cursor-pointer',
                preferredSubmitMode === 'solo_cobrar'
                  ? 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'border border-border'
              )}
            >
              {submittingCobro ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <span>[F12] Solo Cobrar (Sin Ticket)</span>
            </Button>

            <Button
              type="button"
              disabled={submittingCobro || !isCubierto}
              onClick={() => onConfirmCobro(true)}
              className="h-10 px-4 text-xs font-black gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            >
              {submittingCobro ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>[F11] Emitir Ticket (Bs.) y Cobrar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

