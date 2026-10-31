import React, { useEffect, useMemo, useState } from 'react';
import {
  LockOpen,
  DollarSign,
  Coins,
  AlertCircle,
  RefreshCw,
  Building2,
  CheckCircle2,
  UserCheck,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cajasApi, type Caja, type TurnoCaja } from '../../api/cajas';
import { tasasApi } from '../../api/tasas';
import { cn } from '../../lib/utils';

interface TurnoAperturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cajas: Caja[];
  sucursalId: number;
  onTurnoOpened: (turno: TurnoCaja) => void;
}

export const TurnoAperturaModal: React.FC<TurnoAperturaModalProps> = ({
  open,
  onOpenChange,
  cajas,
  sucursalId,
  onTurnoOpened,
}) => {
  const [selectedCajaId, setSelectedCajaId] = useState<string>(
    cajas.length > 0 ? String(cajas[0].id) : ''
  );
  const [fondoVes, setFondoVes] = useState<string>('0.00');
  const [fondoUsd, setFondoUsd] = useState<string>('0.00');
  const [notas, setNotas] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Tasa BCV en vivo + sincronización (Réplica FixSale POS Apertura)
  const [tasaBcv, setTasaBcv] = useState<number>(0);
  const [monedaCobro, setMonedaCobro] = useState<'USD' | 'EUR'>('USD');
  const [loadingRate, setLoadingRate] = useState<boolean>(false);
  const [syncingBcv, setSyncingBcv] = useState<boolean>(false);

  // Turnos abiertos actualmente en la sucursal para marcar cajas ocupadas
  const [turnosAbiertos, setTurnosAbiertos] = useState<TurnoCaja[]>([]);

  const cajasActivas = useMemo(
    () => cajas.filter((c) => c.activa !== false),
    [cajas]
  );

  // Cargar tasa BCV y estado de ocupación de cajas al abrir el modal
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadContext = async () => {
      try {
        setLoadingRate(true);
        const [ratesRes, openShifts] = await Promise.all([
          tasasApi.getCurrentRates().catch(() => null),
          cajasApi
            .listTurnos({ sucursal_id: sucursalId, estado: 'abierta', limit: 50 })
            .catch(() => []),
        ]);

        if (cancelled) return;

        if (ratesRes) {
          const mon = ratesRes.moneda_cobro_activa || 'USD';
          setMonedaCobro(mon);
          const rateVal =
            ratesRes.tasa_cobro_activa ||
            ratesRes.tasas?.[mon]?.tasa ||
            ratesRes.tasas?.USD?.tasa ||
            0;
          setTasaBcv(Number(rateVal) || 0);
        }

        const shifts = openShifts || [];
        setTurnosAbiertos(shifts);

        // Seleccionar por defecto la primera caja libre
        const occupiedIds = new Set(shifts.map((t) => t.caja_id));
        const libre = cajasActivas.find((c) => !occupiedIds.has(c.id));
        if (libre) {
          setSelectedCajaId(String(libre.id));
        } else if (cajasActivas.length > 0 && !selectedCajaId) {
          setSelectedCajaId(String(cajasActivas[0].id));
        }
      } finally {
        if (!cancelled) setLoadingRate(false);
      }
    };

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [open, sucursalId, cajasActivas]);

  const handleSyncBcv = async () => {
    try {
      setSyncingBcv(true);
      const res = await tasasApi.syncRates();
      const updatedRate =
        res.tasas?.[monedaCobro]?.tasa || res.tasas?.USD?.tasa || tasaBcv;
      if (updatedRate) {
        setTasaBcv(Number(updatedRate));
      }
      toast.success('Tasa Oficial BCV sincronizada correctamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo sincronizar con BCV en este momento');
    } finally {
      setSyncingBcv(false);
    }
  };

  const ocupacionMap = useMemo(() => {
    const map = new Map<number, TurnoCaja>();
    for (const t of turnosAbiertos) {
      if (t.estado === 'abierta') {
        map.set(t.caja_id, t);
      }
    }
    return map;
  }, [turnosAbiertos]);

  const turnoOcupanteSeleccionado = useMemo(() => {
    const idNum = parseInt(selectedCajaId, 10);
    if (!idNum) return null;
    return ocupacionMap.get(idNum) || null;
  }, [selectedCajaId, ocupacionMap]);

  const totalFondoConsolidadoBs = useMemo(() => {
    const ves = parseFloat(fondoVes) || 0;
    const usd = parseFloat(fondoUsd) || 0;
    const rate = tasaBcv > 0 ? tasaBcv : 1;
    return Math.round((ves + usd * rate) * 100) / 100;
  }, [fondoVes, fondoUsd, tasaBcv]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cajaIdNum = parseInt(selectedCajaId, 10);
    if (!cajaIdNum) {
      toast.error('Seleccione una caja física para aperturar el turno');
      return;
    }

    if (turnoOcupanteSeleccionado) {
      toast.error(
        `Esta caja ya está abierta por ${turnoOcupanteSeleccionado.cajero_nombre || 'otro operador'}`
      );
      return;
    }

    const usdVal = parseFloat(fondoUsd) || 0;
    const vesVal = parseFloat(fondoVes) || 0;

    if (usdVal < 0 || vesVal < 0) {
      toast.error('Los fondos iniciales no pueden ser negativos');
      return;
    }

    try {
      setSubmitting(true);
      const nuevoTurno = await cajasApi.openTurno({
        caja_id: cajaIdNum,
        sucursal_id: sucursalId,
        fondo_inicial_usd: usdVal,
        fondo_inicial_ves: vesVal,
        notas_apertura: notas.trim() || undefined,
      });

      toast.success('¡Turno de caja aperturado exitosamente!');
      onTurnoOpened(nuevoTurno);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al abrir el turno de caja');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <LockOpen className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black">
                Apertura de Turno de Caja
              </DialogTitle>
              <DialogDescription className="text-xs">
                Verifique la tasa oficial del día y declare el fondo inicial en gaveta para iniciar cobranzas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tarjeta Tasa Oficial BCV en vivo + Botón Sincronizar (Réplica FixSale POS) */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-primary">
                  Tasa Oficial BCV Activa
                </span>
                <Badge
                  variant="outline"
                  className="text-[9.5px] h-4 px-1.5 border-primary/30 text-primary font-mono"
                >
                  {monedaCobro}
                </Badge>
              </div>
              <div className="text-base font-black font-mono text-foreground">
                {loadingRate ? (
                  <span className="text-xs text-muted-foreground">Consultando tasa...</span>
                ) : tasaBcv > 0 ? (
                  <>
                    1 {monedaCobro} = Bs.{' '}
                    {tasaBcv.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </>
                ) : (
                  <span className="text-xs text-amber-600">Sin tasa registrada hoy</span>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncBcv}
              disabled={syncingBcv}
              className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncingBcv && 'animate-spin')} />
              {syncingBcv ? 'Sincronizando...' : 'Sincronizar BCV'}
            </Button>
          </div>

          {/* Selector de Caja Física con estado Libre / Ocupada */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Punto de Cobro / Caja Física
            </Label>
            <Select value={selectedCajaId} onValueChange={setSelectedCajaId}>
              <SelectTrigger className="h-10 text-xs font-semibold">
                <SelectValue placeholder="Seleccione una caja física" />
              </SelectTrigger>
              <SelectContent>
                {cajasActivas.map((c) => {
                  const ocupada = ocupacionMap.get(c.id);
                  return (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="font-bold">{c.nombre}</span>
                        {ocupada ? (
                          <span className="text-[10px] font-semibold text-amber-600">
                            ● En uso ({ocupada.cajero_nombre || 'Cajero'})
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            ● Disponible
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {turnoOcupanteSeleccionado && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2 font-semibold">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>
                  Esta caja se encuentra abierta por{' '}
                  <strong>{turnoOcupanteSeleccionado.cajero_nombre}</strong> (Turno #
                  {turnoOcupanteSeleccionado.id}). Seleccione otra caja libre.
                </span>
              </div>
            )}
          </div>

          {/* Fondos Iniciales en Gaveta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Fondo en Bolívares */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                Fondo Inicial en Bolívares (Bs.)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fondoVes}
                onChange={(e) => setFondoVes(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="font-black font-mono text-sm h-9 bg-background"
                required
              />
              <div className="flex items-center gap-1 flex-wrap">
                {[0, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFondoVes(preset.toFixed(2))}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-background hover:bg-blue-50 dark:hover:bg-slate-800 border border-border text-muted-foreground hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    Bs.{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Fondo en Divisa */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Fondo Inicial Divisa ({monedaCobro})
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fondoUsd}
                onChange={(e) => setFondoUsd(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="font-black font-mono text-sm h-9 bg-background"
                required
              />
              <div className="flex items-center gap-1 flex-wrap">
                {[0, 20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFondoUsd(preset.toFixed(2))}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-background hover:bg-emerald-50 dark:hover:bg-slate-800 border border-border text-muted-foreground hover:text-emerald-600 cursor-pointer transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Equivalente Consolidado del Fondo de Apertura */}
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Fondo Inicial Consolidado (Ref. Bs.):
            </span>
            <span className="font-black font-mono text-sm text-emerald-700 dark:text-emerald-300">
              Bs.{' '}
              {totalFondoConsolidadoBs.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Notas de apertura */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">
              Observaciones de Apertura (Opcional)
            </Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Sencillo verificado en gaveta, punto bancario operativo..."
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Todos los recibos emitidos y movimientos de efectivo quedarán asociados a su usuario hasta realizar el Corte Z de cierre.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-1">
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
              disabled={submitting || Boolean(turnoOcupanteSeleccionado)}
              className="h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
            >
              <LockOpen className="w-4 h-4" />
              {submitting ? 'Abriendo Turno...' : 'Confirmar Apertura de Caja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TurnoAperturaModal;
