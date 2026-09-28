import React, { useState } from 'react';
import { LockOpen, DollarSign, Coins, AlertCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cajasApi, type Caja, type TurnoCaja } from '../../api/cajas';

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
  const [fondoUsd, setFondoUsd] = useState<string>('0.00');
  const [fondoVes, setFondoVes] = useState<string>('0.00');
  const [notas, setNotas] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar selección si cambian las cajas
  React.useEffect(() => {
    if (cajas.length > 0 && !selectedCajaId) {
      setSelectedCajaId(String(cajas[0].id));
    }
  }, [cajas, selectedCajaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cajaIdNum = parseInt(selectedCajaId, 10);
    if (!cajaIdNum) {
      toast.error('Seleccione una caja para abrir el turno');
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

      toast.success('¡Turno de caja abierto exitosamente!');
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <LockOpen className="w-5 h-5" />
            <DialogTitle>Apertura de Turno de Caja</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Inicia tu sesión de cobro diario registrando el fondo inicial de sencillo disponible para dar cambio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Selector de Caja */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Punto de Cobro / Caja</Label>
            <Select
              value={selectedCajaId}
              onValueChange={setSelectedCajaId}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Seleccione una caja" />
              </SelectTrigger>
              <SelectContent>
                {cajas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fondos Iniciales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-200">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Fondo Inicial USD ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fondoUsd}
                onChange={(e) => setFondoUsd(e.target.value)}
                placeholder="0.00"
                className="font-bold text-sm"
                required
              />
              <span className="text-[10px] text-slate-400">Efectivo inicial en divisa</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-200">
                <Coins className="w-3.5 h-3.5 text-blue-500" />
                Fondo Inicial VES (Bs.)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fondoVes}
                onChange={(e) => setFondoVes(e.target.value)}
                placeholder="0.00"
                className="font-bold text-sm"
                required
              />
              <span className="text-[10px] text-slate-400">Efectivo inicial en Bolívares</span>
            </div>
          </div>

          {/* Notas de apertura */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observaciones / Novedades de Apertura</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Billetes de $5 y $10 para dar vuelto, sin novedad en punto de venta..."
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-700 dark:text-amber-400 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Una vez abierto el turno, todos los cobros que realices quedarán registrados bajo tu sesión de cajero hasta el cierre y arqueo.
            </span>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <LockOpen className="w-4 h-4" />
              {submitting ? 'Abriendo Turno...' : 'Confirmar Apertura'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TurnoAperturaModal;
