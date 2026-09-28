import React, { useRef } from 'react';
import {
  Printer,
  Share2,
  CheckCircle2,
  DollarSign,
  Coins,
  ShieldCheck,
  Calendar,
  User,
  CreditCard,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Cobro } from '../../api/cajas';
import { useAuth } from '../../context/AuthContext';

interface CobroReciboModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cobro: Cobro | null;
}

export const CobroReciboModal: React.FC<CobroReciboModalProps> = ({
  open,
  onOpenChange,
  cobro,
}) => {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  if (!cobro) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!cobro.paciente_telefono) {
      toast.error('El paciente no tiene un número telefónico registrado para WhatsApp');
      return;
    }

    const cleanPhone = cobro.paciente_telefono.replace(/[^0-9]/g, '');
    const itemsText = cobro.detalles
      .map((d) => `• ${d.cantidad}x ${d.descripcion}: $${Number(d.subtotal_divisa || 0).toFixed(2)} (Bs. ${Number(d.subtotal_ves || 0).toFixed(2)})`)
      .join('\n');

    const message = encodeURIComponent(
      `🏥 *COMPROBANTE DE PAGO - ${user?.empresa?.nombre || 'Medisoft Suite'}*\n\n` +
      `📄 *Recibo:* ${cobro.numero_recibo}\n` +
      `📅 *Fecha:* ${new Date(cobro.fecha_emision).toLocaleString('es-ES')}\n` +
      `👤 *Paciente:* ${cobro.paciente_nombre || 'Particular'}\n` +
      `💱 *Tasa Oficial Aplicada:* ${cobro.moneda_referencia} = Bs. ${Number(cobro.tasa_bcv_aplicada).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n\n` +
      `📋 *Detalle de Servicios:*\n${itemsText}\n\n` +
      `💵 *TOTAL PAGADO:* $${cobro.total_divisa.toFixed(2)} / Bs. ${cobro.total_ves.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n\n` +
      `¡Gracias por confiar en nuestra atención médica!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto print:p-0 print:m-0 print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">Comprobante de Pago Emitido</DialogTitle>
            </div>
            <Badge className="bg-emerald-500 text-white font-mono text-xs">
              {cobro.numero_recibo}
            </Badge>
          </div>
        </DialogHeader>

        {/* Cuerpo del Recibo para Impresión y Visualización */}
        <div ref={printRef} className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white print:border-none print:p-0">
          {/* Encabezado de la Clínica */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
            <h2 className="font-black text-base uppercase tracking-wide">
              {user?.empresa?.nombre || 'Clínica & Servicios Médicos'}
            </h2>
            {user?.empresa?.identificacion_fiscal && (
              <p className="text-xs text-slate-500 font-medium">
                RIF / ID Fiscal: {user.empresa.identificacion_fiscal}
              </p>
            )}
            {user?.empresa?.direccion && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {user.empresa.direccion}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
              RECIBO DE CAJA: {cobro.numero_recibo}
            </div>
          </div>

          {/* Datos del Paciente y Emisión */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">PACIENTE:</span>
              <span className="font-bold">{cobro.paciente_nombre || 'Cliente Particular'}</span>
              {cobro.paciente_documento && (
                <span className="text-slate-500 block text-[11px]">CI/Doc: {cobro.paciente_documento}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">FECHA & HORA:</span>
              <span className="font-medium text-[11px]">
                {new Date(cobro.fecha_emision).toLocaleString('es-ES')}
              </span>
              <span className="text-slate-500 block text-[11px]">
                Cajero: {cobro.cajero_nombre || 'Recepción'}
              </span>
            </div>
          </div>

          {/* Tasa Oficial Aplicada */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Tasa Oficial Aplicada:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
              1 {cobro.moneda_referencia} = Bs. {Number(cobro.tasa_bcv_aplicada).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
          </div>

          {/* Tabla de Conceptos */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Conceptos / Servicios
            </span>
            <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {cobro.detalles.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {item.descripcion}
                    </span>
                    {item.diente_fdi && (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">
                        Pieza Dental FDI: {item.diente_fdi}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Cant: {item.cantidad} x ${Number(item.precio_unitario_divisa).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold block text-slate-900 dark:text-white">
                      ${Number(item.subtotal_divisa).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Bs. {Number(item.subtotal_ves).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>${Number(cobro.subtotal_divisa).toFixed(2)}</span>
            </div>
            {Number(cobro.descuento_divisa) > 0 && (
              <div className="flex justify-between text-rose-500">
                <span>Descuento aplicado:</span>
                <span>-${Number(cobro.descuento_divisa).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1 border-t font-black text-sm">
              <span>TOTAL FACTURADO:</span>
              <div className="text-right">
                <span className="text-emerald-600 dark:text-emerald-400 text-base">
                  ${Number(cobro.total_divisa).toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 block font-normal">
                  Bs. {Number(cobro.total_ves).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Medios de Pago Utilizados (Pago Mixto) */}
          <div className="space-y-1 pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Formas de Pago Aplicadas
            </span>
            <div className="space-y-1 text-xs">
              {cobro.pagos.map((p, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {p.metodo.replace('_', ' ')}
                      </span>
                      {p.referencia && (
                        <span className="text-[10px] text-slate-400 block">Ref: {p.referencia}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {p.moneda === 'USD' ? '$' : p.moneda === 'EUR' ? '€' : 'Bs.'}{' '}
                      {Number(p.monto_moneda_origen).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                    {p.moneda !== cobro.moneda_referencia && (
                      <span className="text-[10px] text-slate-400 block">
                        Equiv: ${Number(p.monto_equivalente_divisa).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vuelto / Cambio entregado si hubo */}
          {(Number(cobro.monto_vuelto_divisa) > 0 || Number(cobro.monto_vuelto_ves) > 0) && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex justify-between font-semibold text-amber-700 dark:text-amber-300">
              <span>Cambio / Vuelto entregado:</span>
              <span>
                ${Number(cobro.monto_vuelto_divisa).toFixed(2)} (Bs. {Number(cobro.monto_vuelto_ves).toFixed(2)})
              </span>
            </div>
          )}

          {/* Pie de comprobante */}
          <div className="text-center pt-3 text-[10px] text-slate-400">
            Comprobante digital válido de atención clínica. ¡Gracias por su visita!
          </div>
        </div>

        {/* Acciones */}
        <DialogFooter className="gap-2 sm:gap-2 print:hidden pt-2">
          {cobro.paciente_telefono && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="gap-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Enviar WhatsApp
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            onClick={handlePrint}
            className="gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprobante
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobroReciboModal;
