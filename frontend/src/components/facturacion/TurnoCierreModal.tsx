import React, { useState, useMemo } from 'react';
import { Lock, Calculator, CheckCircle2, AlertTriangle, AlertCircle, DollarSign, Coins } from 'lucide-react';
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
import { cajasApi, type TurnoCaja } from '../../api/cajas';
import { cn } from '../../lib/utils';

interface TurnoCierreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turno: TurnoCaja;
  onTurnoClosed: (turno: TurnoCaja) => void;
}

export const TurnoCierreModal: React.FC<TurnoCierreModalProps> = ({
  open,
  onOpenChange,
  turno,
  onTurnoClosed,
}) => {
  const [arqueoUsd, setArqueoUsd] = useState<string>('');
  const [arqueoVes, setArqueoVes] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Efectivo esperado en caja = Fondo Inicial + Ingresos Efectivo - Egresos
  const esperadoUsd = useMemo(() => {
    return Number(turno.fondo_inicial_usd || 0) + Number(turno.total_ingresos_usd || 0) - Number(turno.total_egresos_usd || 0);
  }, [turno]);

  const esperadoVes = useMemo(() => {
    return Number(turno.fondo_inicial_ves || 0) + Number(turno.total_ingresos_ves || 0) - Number(turno.total_egresos_ves || 0);
  }, [turno]);

  // Cálculos en vivo de diferencias
  const diferenciaUsd = useMemo(() => {
    const val = parseFloat(arqueoUsd);
    if (isNaN(val)) return null;
    return Math.round((val - esperadoUsd) * 100) / 100;
  }, [arqueoUsd, esperadoUsd]);

  const diferenciaVes = useMemo(() => {
    const val = parseFloat(arqueoVes);
    if (isNaN(val)) return null;
    return Math.round((val - esperadoVes) * 100) / 100;
  }, [arqueoVes, esperadoVes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usdVal = parseFloat(arqueoUsd);
    const vesVal = parseFloat(arqueoVes);

    if (isNaN(usdVal) || usdVal < 0 || isNaN(vesVal) || vesVal < 0) {
      toast.error('Ingrese los montos de efectivo físico contados en caja (mayor o igual a 0)');
      return;
    }

    try {
      setSubmitting(true);
      const turnoCerrado = await cajasApi.closeTurno(turno.id, {
        arqueo_declarado_usd: usdVal,
        arqueo_declarado_ves: vesVal,
        notas_cierre: notas.trim() || undefined,
      });

      toast.success('¡Turno de caja cerrado y arqueo registrado correctamente!');
      onTurnoClosed(turnoCerrado);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cerrar el turno de caja');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <Lock className="w-5 h-5" />
            <DialogTitle>Cierre de Turno & Arqueo de Caja</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Ingresa el conteo físico del dinero en gaveta para comparar contra los cobros registrados por el sistema.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de Expectativas del Sistema */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span>Efectivo Esperado según Sistema:</span>
            <span className="text-[10px] text-slate-400">Fondo Inicial + Cobros - Egresos</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                Esperado en Dólares ($)
              </span>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                $ {esperadoUsd.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block">
                Esperado en Bolívares (Bs.)
              </span>
              <span className="text-base font-black text-blue-700 dark:text-blue-300">
                Bs. {esperadoVes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Conteo Físico Declarado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Conteo Físico USD ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={arqueoUsd}
                onChange={(e) => setArqueoUsd(e.target.value)}
                placeholder="0.00"
                className="font-bold text-sm"
                required
              />
              {diferenciaUsd !== null && (
                <div className={cn(
                  "text-[11px] font-semibold flex items-center gap-1",
                  diferenciaUsd === 0 && "text-emerald-600",
                  diferenciaUsd > 0 && "text-blue-600",
                  diferenciaUsd < 0 && "text-rose-600"
                )}>
                  {diferenciaUsd === 0 ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Cuadre exacto</>
                  ) : diferenciaUsd > 0 ? (
                    <><AlertCircle className="w-3.5 h-3.5" /> Sobrante: +${diferenciaUsd}</>
                  ) : (
                    <><AlertTriangle className="w-3.5 h-3.5" /> Faltante: -${Math.abs(diferenciaUsd)}</>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-blue-500" />
                Conteo Físico VES (Bs.)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={arqueoVes}
                onChange={(e) => setArqueoVes(e.target.value)}
                placeholder="0.00"
                className="font-bold text-sm"
                required
              />
              {diferenciaVes !== null && (
                <div className={cn(
                  "text-[11px] font-semibold flex items-center gap-1",
                  diferenciaVes === 0 && "text-emerald-600",
                  diferenciaVes > 0 && "text-blue-600",
                  diferenciaVes < 0 && "text-rose-600"
                )}>
                  {diferenciaVes === 0 ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Cuadre exacto</>
                  ) : diferenciaVes > 0 ? (
                    <><AlertCircle className="w-3.5 h-3.5" /> Sobrante: +Bs.{diferenciaVes}</>
                  ) : (
                    <><AlertTriangle className="w-3.5 h-3.5" /> Faltante: -Bs.{Math.abs(diferenciaVes)}</>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notas de Cierre */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observaciones de Cierre / Justificación de Arqueo</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Se entregó el efectivo al administrador, punto de venta cuadrado con lote 14..."
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              <Lock className="w-4 h-4" />
              {submitting ? 'Cerrando Turno...' : 'Finalizar Turno & Cerrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TurnoCierreModal;
