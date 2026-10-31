import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Printer,
  Share2,
  CheckCircle2,
  Ban,
  Receipt,
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
import type { Cobro, CobroDetalleItem, CobroPagoItem } from '../../api/cajas';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import {
  type PosPrinterConfig,
  DEFAULT_POS_PRINTER_CONFIG,
  loadPosPrinterConfig,
  savePosPrinterConfig,
  formatTicketBs,
} from './pos/posPrinterConfig';

/**
 * Normaliza las etiquetas de métodos de pago para que jamás impriman menciones
 * a divisas extranjeras (USD, EUR, $, €, Zelle, etc.) en el ticket térmico.
 */
function getLegalPaymentMethodLabel(metodo?: string | null): string {
  const m = (metodo || '').toLowerCase().trim();
  if (m.includes('efectivo')) return 'EFECTIVO';
  if (m === 'pago_movil' || m.includes('movil')) return 'PAGO MÓVIL';
  if (m === 'punto_venta' || m.includes('punto') || m.includes('tarjeta')) {
    return 'PUNTO DE VENTA / TARJETA';
  }
  if (m === 'seguro_medico' || m.includes('seguro') || m.includes('poliza')) {
    return 'COBERTURA PÓLIZA / SEGURO';
  }
  if (m === 'transferencia' || m === 'zelle' || m === 'pasarela') {
    return 'TRANSFERENCIA / PAGO DIGITAL';
  }
  return (
    m
      .replace(/usd|eur|zelle|dolar|dólar|divisa|\$|€/gi, '')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase() || 'CONTADO'
  );
}

/**
 * Limpia referencias o notas libres por si contienen menciones accidentales a divisas.
 */
function sanitizeLegalNote(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\b(USD|EUR|USDT|ZELLE)\b/gi, '')
    .replace(/[$€]/g, 'Bs. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface CobroReciboModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cobro: Cobro | null;
  autoTriggerPrint?: boolean;
  onAutoPrintHandled?: () => void;
}

export const CobroReciboModal: React.FC<CobroReciboModalProps> = ({
  open,
  onOpenChange,
  cobro,
  autoTriggerPrint = false,
  onAutoPrintHandled,
}) => {
  const { user, sucursalActiva } = useAuth();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [printerConfig, setPrinterConfig] = useState<PosPrinterConfig>(() =>
    loadPosPrinterConfig()
  );

  // Recargar configuración de ticketera cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      setPrinterConfig(loadPosPrinterConfig());
    }
  }, [open]);

  const handleSwitchPaperSize = (size: '80mm' | '58mm') => {
    const updated: PosPrinterConfig = { ...printerConfig, paperSize: size };
    setPrinterConfig(updated);
    savePosPrinterConfig(updated);
  };

  // Cálculo 100% en Bolívares usando la tasa aplicada internamente a la operación
  const tasa = cobro && Number(cobro.tasa_bcv_aplicada) > 0 ? Number(cobro.tasa_bcv_aplicada) : 1;

  const getDetalleSubtotalBs = (d: CobroDetalleItem): number => {
    if (Number(d.subtotal_ves) > 0) return Number(d.subtotal_ves);
    const subtDiv =
      Number(d.subtotal_divisa) > 0
        ? Number(d.subtotal_divisa)
        : (Number(d.precio_unitario_divisa) || 0) * (Number(d.cantidad) || 1);
    return Math.round(subtDiv * tasa * 100) / 100;
  };

  const getDetallePrecioUnitBs = (d: CobroDetalleItem): number => {
    const cant = Math.max(1, Number(d.cantidad) || 1);
    const subBs = getDetalleSubtotalBs(d);
    return Math.round((subBs / cant) * 100) / 100;
  };

  const getPagoMontoBs = (p: CobroPagoItem): number => {
    const moneda = (p.moneda || '').toUpperCase();
    if (moneda === 'VES') {
      return Math.round((Number(p.monto_moneda_origen) || 0) * 100) / 100;
    }
    const equivDiv =
      Number(p.monto_equivalente_divisa) > 0
        ? Number(p.monto_equivalente_divisa)
        : Number(p.monto_moneda_origen) || 0;
    return Math.round(equivDiv * tasa * 100) / 100;
  };

  // Impresión dedicada estilo Ticket Térmico (80mm o 58mm) exclusivamente en Bolívares
  const handlePrint = useCallback(() => {
    if (!cobro) return;
    const is58 = printerConfig.paperSize === '58mm';
    const pageWidth = is58 ? '58mm' : '80mm';
    const wrapperWidth = is58 ? '53mm' : '74mm';
    const baseFontSize = is58 ? '9.5px' : '11px';

    const printWindow = window.open('', '_blank', 'width=450,height=760');
    if (!printWindow) {
      window.print();
      return;
    }

    const ticketHtml = ticketRef.current ? ticketRef.current.innerHTML : '';

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Comprobante_${cobro.numero_recibo}</title>
          <style>
            @page {
              size: ${pageWidth} auto;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              width: ${pageWidth};
              max-width: ${pageWidth};
              margin: 0 auto !important;
              padding: ${is58 ? '2mm 1.5mm 6mm 1.5mm' : '4mm 3mm 8mm 3mm'} !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, 'Lucida Console', monospace, system-ui !important;
              font-size: ${baseFontSize} !important;
              line-height: 1.25 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .ticket-print-wrapper {
              width: 100% !important;
              max-width: ${wrapperWidth} !important;
              margin: 0 auto !important;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .font-bold { font-weight: 700 !important; }
            .font-extrabold, .font-black { font-weight: 900 !important; }
            .font-mono { font-family: 'Courier New', Courier, monospace !important; }
            .uppercase { text-transform: uppercase !important; }
            .flex { display: flex !important; }
            .justify-between { justify-content: space-between !important; }
            .justify-center { justify-content: center !important; }
            .items-center { align-items: center !important; }
            .items-start { align-items: flex-start !important; }
            .items-baseline { align-items: baseline !important; }
            .flex-col { flex-direction: column !important; }
            .flex-wrap { flex-wrap: wrap !important; }
            .block { display: block !important; }
            .dashed-divider {
              border-top: 1px dashed #000000 !important;
              margin: 5px 0 !important;
              width: 100% !important;
            }
            .solid-divider {
              border-top: 1.5px solid #000000 !important;
              margin: 5px 0 !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              font-size: ${is58 ? '8.5px' : '10px'} !important;
              padding: 2px 0 !important;
              vertical-align: top !important;
              color: #000000 !important;
            }
            th {
              border-bottom: 1px solid #000000 !important;
            }
            tbody tr {
              border-bottom: 1px dotted #999999 !important;
            }
            .logo-img {
              max-height: ${is58 ? '42px' : '52px'} !important;
              max-width: ${is58 ? '120px' : '155px'} !important;
              object-fit: contain !important;
              margin: 0 auto 4px auto !important;
              display: block !important;
              filter: grayscale(100%) contrast(150%) !important;
            }
            .anulado-box {
              border: 2px solid #000000 !important;
              padding: 3px !important;
              margin: 4px 0 !important;
              text-align: center !important;
              font-weight: 900 !important;
            }
            .total-highlight {
              border-top: 1.5px solid #000000 !important;
              border-bottom: 1.5px solid #000000 !important;
              padding: 4px 0 !important;
              margin: 4px 0 !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="ticket-print-wrapper">
            ${ticketHtml}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [cobro, printerConfig.paperSize]);

  // Disparo automático si viene de [F11] Cobrar y Ticket con auto-impresión activa
  useEffect(() => {
    if (open && cobro && autoTriggerPrint) {
      const timer = setTimeout(() => {
        handlePrint();
        onAutoPrintHandled?.();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [open, cobro, autoTriggerPrint, handlePrint, onAutoPrintHandled]);

  if (!cobro) return null;

  // Datos de la empresa y sede activa
  const empresa = user?.empresa;
  const empresaNombre = empresa?.nombre || 'CENTRO MÉDICO & ODONTOLÓGICO';
  const empresaRif = empresa?.identificacion_fiscal || empresa?.documento || 'J-00000000-0';
  const empresaDireccion = sucursalActiva?.direccion || empresa?.direccion || '';
  const empresaCiudad = sucursalActiva?.ciudad || empresa?.ciudad || '';
  const empresaTelefono = sucursalActiva?.telefono || empresa?.telefono || '';
  const empresaEmail = empresa?.email || '';
  const empresaLogo = empresa?.logo_url || empresa?.logo_mini_url || empresa?.logo || null;
  const sucursalNombre = sucursalActiva?.nombre || 'Sede Principal';

  const fechaHora = (() => {
    try {
      const d = new Date(cobro.fecha_emision);
      return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return cobro.fecha_emision;
    }
  })();

  // Totales estrictamente en Bolívares (Bs.)
  const subtotalItemsBs = cobro.detalles.reduce((acc, d) => acc + getDetalleSubtotalBs(d), 0);
  const descuentoBs = Math.round((Number(cobro.descuento_divisa) || 0) * tasa * 100) / 100;
  const subtotalBs =
    subtotalItemsBs > 0
      ? subtotalItemsBs
      : Math.round((Number(cobro.subtotal_divisa) || 0) * tasa * 100) / 100;
  const totalPagadoBs =
    Number(cobro.total_ves) > 0
      ? Number(cobro.total_ves)
      : Math.max(0, Math.round((subtotalBs - descuentoBs) * 100) / 100);

  const montoRecibidoBs = cobro.pagos.reduce((acc, p) => acc + getPagoMontoBs(p), 0);
  const vueltoBs =
    Number(cobro.monto_vuelto_ves) > 0
      ? Number(cobro.monto_vuelto_ves)
      : Math.round((Number(cobro.monto_vuelto_divisa) || 0) * tasa * 100) / 100;

  // Comprobante por WhatsApp 100% expresado en Bolívares (Bs.)
  const handleSendWhatsApp = () => {
    if (!cobro.paciente_telefono) {
      toast.error('El paciente no tiene un número telefónico registrado para WhatsApp');
      return;
    }

    const cleanPhone = cobro.paciente_telefono.replace(/[^0-9]/g, '');
    const itemsText = cobro.detalles
      .map(
        (d) =>
          `• ${d.cantidad}x ${d.descripcion}${d.diente_fdi ? ` (Pieza ${d.diente_fdi})` : ''}: ${formatTicketBs(getDetalleSubtotalBs(d))}`
      )
      .join('\n');

    const message = encodeURIComponent(
      `🏥 *COMPROBANTE DE PAGO*\n` +
        `*${empresaNombre}*\n` +
        `RIF: ${empresaRif}\n\n` +
        `📄 *Comprobante:* ${cobro.numero_recibo}\n` +
        `📅 *Fecha:* ${fechaHora}\n` +
        `👤 *Paciente:* ${cobro.paciente_nombre || 'Particular'}${cobro.paciente_documento ? ` (${cobro.paciente_documento})` : ''}\n` +
        (cobro.medico_nombre ? `👨‍⚕️ *Especialista:* Dr(a). ${cobro.medico_nombre}\n` : '') +
        `\n📋 *Detalle de Conceptos:*\n${itemsText}\n\n` +
        (descuentoBs > 0 ? `🏷️ *Descuento:* -${formatTicketBs(descuentoBs)}\n` : '') +
        `💳 *TOTAL CANCELADO:* *${formatTicketBs(totalPagadoBs)}*\n\n` +
        `${printerConfig.footerMsg || DEFAULT_POS_PRINTER_CONFIG.footerMsg}`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const notaLimpia = sanitizeLegalNote(cobro.notas);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-5 print:p-0 print:m-0 print:border-none print:shadow-none bg-slate-100 dark:bg-slate-950 rounded-2xl">
        <DialogHeader className="print:hidden pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-primary">
              {cobro.estado === 'anulado' ? (
                <Ban className="w-5 h-5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {cobro.estado === 'anulado'
                  ? 'Comprobante Anulado'
                  : 'Ticket de Pago Emitido'}
              </DialogTitle>
            </div>

            {/* Selector rápido de papel térmico 80mm / 58mm */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSwitchPaperSize('80mm')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer',
                  printerConfig.paperSize === '80mm'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPaperSize('58mm')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer',
                  printerConfig.paperSize === '58mm'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                58mm
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Formato legal expresado 100% en Bolívares (Bs.).
            </p>
            <Badge
              variant="outline"
              className="text-[9.5px] font-mono border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
            >
              Solo Bs. (VES)
            </Badge>
          </div>
        </DialogHeader>

        {/* CONTENEDOR VISUAL ESTILO TICKET TÉRMICO (80MM / 58MM) */}
        <div className="flex justify-center my-1.5 print:m-0">
          <div
            ref={ticketRef}
            className={cn(
              'bg-white text-black p-4 rounded-xl shadow-md border border-slate-300 font-mono leading-tight select-text print:shadow-none print:border-none print:p-0 transition-all',
              printerConfig.paperSize === '58mm'
                ? 'w-full max-w-[255px] text-[10px]'
                : 'w-full max-w-[345px] text-[11px]'
            )}
          >
            {/* 1. LOGO E IDENTIDAD FISCAL */}
            {empresaLogo && (
              <div className="text-center mb-1.5">
                <img
                  src={empresaLogo}
                  alt={empresaNombre}
                  className="logo-img max-h-12 max-w-[150px] mx-auto object-contain filter grayscale contrast-125"
                />
              </div>
            )}

            <div className="text-center space-y-0.5 pb-1.5">
              <div className="font-extrabold text-[12.5px] uppercase tracking-tight text-black">
                {empresaNombre}
              </div>
              <div className="font-bold text-[10px] text-black">RIF: {empresaRif}</div>
              {empresaDireccion && (
                <div className="text-[9.5px] text-slate-800 leading-tight">
                  {empresaDireccion}
                  {empresaCiudad ? ` - ${empresaCiudad}` : ''}
                </div>
              )}
              <div className="text-[9px] text-slate-700">
                {empresaTelefono ? `Tel: ${empresaTelefono}` : ''}
                {empresaTelefono && empresaEmail ? ' | ' : ''}
                {empresaEmail ? empresaEmail : ''}
              </div>
              <div className="text-[9px] font-bold text-slate-700 uppercase">{sucursalNombre}</div>
              {printerConfig.headerMsg && (
                <div className="text-[9px] text-slate-800 pt-0.5 font-medium">
                  {sanitizeLegalNote(printerConfig.headerMsg)}
                </div>
              )}
            </div>

            {cobro.estado === 'anulado' && (
              <div className="anulado-box border-2 border-black py-1 my-1.5 text-center font-black text-[11px] uppercase tracking-wider">
                *** COMPROBANTE ANULADO ***
              </div>
            )}

            <div className="dashed-divider border-t border-dashed border-black my-1.5" />

            {/* 2. ENCABEZADO DEL COMPROBANTE */}
            <div className="text-center font-extrabold text-[11px] uppercase tracking-wide">
              COMPROBANTE DE PAGO
            </div>
            <div className="flex justify-between text-[10px] font-bold mt-1">
              <span>NRO: {cobro.numero_recibo}</span>
              <span>{fechaHora}</span>
            </div>

            <div className="space-y-0.5 mt-1 text-[10px]">
              <div className="flex justify-between gap-2">
                <span className="font-bold">PACIENTE:</span>
                <span className="text-right font-bold truncate">
                  {cobro.paciente_nombre || 'Particular'}
                </span>
              </div>
              {cobro.paciente_documento && (
                <div className="flex justify-between">
                  <span>DOC / CI:</span>
                  <span className="font-bold">{cobro.paciente_documento}</span>
                </div>
              )}
              {cobro.medico_nombre && (
                <div className="flex justify-between gap-2">
                  <span>ATENDIÓ:</span>
                  <span className="text-right font-bold truncate">
                    Dr(a). {cobro.medico_nombre}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span>CAJERO:</span>
                <span className="text-right truncate">
                  {cobro.cajero_nombre || user?.nombre || 'Recepción POS'}
                </span>
              </div>
            </div>

            <div className="dashed-divider border-t border-dashed border-black my-1.5" />

            {/* 3. TABLA DE CONCEPTOS FACTURADOS (100% EN BOLÍVARES) */}
            <table className="w-full text-[9.5px]">
              <thead>
                <tr className="border-b border-black font-extrabold text-black">
                  <th className="text-left py-1 w-6">CANT</th>
                  <th className="text-left py-1">DESCRIPCIÓN</th>
                  <th className="text-right py-1 w-20">P.U. (Bs.)</th>
                  <th className="text-right py-1 w-22">TOTAL (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-400">
                {cobro.detalles.map((d, idx) => {
                  const unitBs = getDetallePrecioUnitBs(d);
                  const lineBs = getDetalleSubtotalBs(d);
                  return (
                    <tr key={idx}>
                      <td className="py-1 font-bold align-top">{d.cantidad}</td>
                      <td className="py-1 pr-1 align-top">
                        <span className="font-bold block leading-tight">
                          {sanitizeLegalNote(d.descripcion)}
                        </span>
                        {d.diente_fdi && (
                          <span className="text-[8.5px] font-bold block">
                            Pieza FDI: {d.diente_fdi}
                          </span>
                        )}
                      </td>
                      <td className="py-1 text-right align-top whitespace-nowrap">
                        {unitBs.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-1 text-right font-bold align-top whitespace-nowrap">
                        {lineBs.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="dashed-divider border-t border-dashed border-black my-1.5" />

            {/* 4. TOTALES ESTRICTAMENTE EN BOLÍVARES */}
            <div className="space-y-0.5 text-[10.5px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span className="font-bold">{formatTicketBs(subtotalBs)}</span>
              </div>

              {descuentoBs > 0 && (
                <div className="flex justify-between">
                  <span>DESCUENTO:</span>
                  <span className="font-bold">-{formatTicketBs(descuentoBs)}</span>
                </div>
              )}

              <div className="total-highlight border-t-2 border-b-2 border-black py-1 my-1 flex justify-between items-baseline font-black text-[12.5px]">
                <span>TOTAL A PAGAR:</span>
                <span>{formatTicketBs(totalPagadoBs)}</span>
              </div>
            </div>

            {/* 5. DESGLOSE DE FORMAS DE PAGO (EXPRESADO EN BOLÍVARES) */}
            <div className="space-y-0.5 text-[10px] pt-0.5">
              <div className="font-extrabold uppercase">PAGADO CON:</div>
              {cobro.pagos.map((p, pidx) => {
                const montoPagoBs = getPagoMontoBs(p);
                const refClean = sanitizeLegalNote(p.referencia);
                return (
                  <div key={pidx} className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold">{getLegalPaymentMethodLabel(p.metodo)}</span>
                      {refClean && (
                        <span className="block text-[8.5px] text-slate-700">Ref: {refClean}</span>
                      )}
                    </div>
                    <span className="font-bold whitespace-nowrap">
                      {formatTicketBs(montoPagoBs)}
                    </span>
                  </div>
                );
              })}

              {montoRecibidoBs > 0 && (
                <div className="flex justify-between pt-0.5 border-t border-dotted border-slate-400">
                  <span>MONTO RECIBIDO:</span>
                  <span className="font-bold">{formatTicketBs(montoRecibidoBs)}</span>
                </div>
              )}

              {vueltoBs > 0 && (
                <div className="flex justify-between font-extrabold">
                  <span>CAMBIO / VUELTO:</span>
                  <span>{formatTicketBs(vueltoBs)}</span>
                </div>
              )}
            </div>

            {notaLimpia && (
              <div className="mt-1.5 text-[9px] italic text-slate-700 border-t border-dotted border-slate-400 pt-1">
                Obs: {notaLimpia}
              </div>
            )}

            <div className="dashed-divider border-t border-dashed border-black my-2" />

            {/* 6. CÓDIGO DE BARRAS Y PIE DE PÁGINA */}
            <div className="text-center space-y-1 text-[9.5px]">
              <div className="font-extrabold text-[10px] uppercase text-black">
                {sanitizeLegalNote(printerConfig.footerMsg) ||
                  DEFAULT_POS_PRINTER_CONFIG.footerMsg}
              </div>
              <div className="text-[8.5px] text-slate-700 leading-tight">
                Conserve este comprobante como soporte de su atención médica.
              </div>

              <div className="py-1 flex flex-col items-center justify-center">
                <svg className="h-8 w-40" viewBox="0 0 200 36">
                  <rect x="0" y="0" width="3" height="32" fill="black" />
                  <rect x="5" y="0" width="2" height="32" fill="black" />
                  <rect x="10" y="0" width="4" height="32" fill="black" />
                  <rect x="17" y="0" width="2" height="32" fill="black" />
                  <rect x="22" y="0" width="5" height="32" fill="black" />
                  <rect x="30" y="0" width="2" height="32" fill="black" />
                  <rect x="35" y="0" width="3" height="32" fill="black" />
                  <rect x="41" y="0" width="4" height="32" fill="black" />
                  <rect x="48" y="0" width="2" height="32" fill="black" />
                  <rect x="53" y="0" width="5" height="32" fill="black" />
                  <rect x="61" y="0" width="3" height="32" fill="black" />
                  <rect x="67" y="0" width="2" height="32" fill="black" />
                  <rect x="72" y="0" width="4" height="32" fill="black" />
                  <rect x="79" y="0" width="2" height="32" fill="black" />
                  <rect x="84" y="0" width="5" height="32" fill="black" />
                  <rect x="92" y="0" width="3" height="32" fill="black" />
                  <rect x="98" y="0" width="2" height="32" fill="black" />
                  <rect x="103" y="0" width="4" height="32" fill="black" />
                  <rect x="110" y="0" width="3" height="32" fill="black" />
                  <rect x="116" y="0" width="5" height="32" fill="black" />
                  <rect x="124" y="0" width="2" height="32" fill="black" />
                  <rect x="129" y="0" width="4" height="32" fill="black" />
                  <rect x="136" y="0" width="3" height="32" fill="black" />
                  <rect x="142" y="0" width="5" height="32" fill="black" />
                  <rect x="150" y="0" width="2" height="32" fill="black" />
                  <rect x="155" y="0" width="4" height="32" fill="black" />
                  <rect x="162" y="0" width="3" height="32" fill="black" />
                  <rect x="168" y="0" width="5" height="32" fill="black" />
                  <rect x="176" y="0" width="2" height="32" fill="black" />
                  <rect x="181" y="0" width="4" height="32" fill="black" />
                  <rect x="188" y="0" width="3" height="32" fill="black" />
                  <rect x="194" y="0" width="4" height="32" fill="black" />
                </svg>
                <span className="font-mono text-[8px] text-slate-700 tracking-widest mt-0.5">
                  {cobro.numero_recibo}
                </span>
              </div>

              <div className="text-[8px] text-slate-600">
                MediSoft POS ({printerConfig.paperSize}) • Montos expresados en Bolívares (Bs.)
              </div>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <DialogFooter className="gap-2 sm:gap-2 print:hidden pt-3 border-t border-slate-200 dark:border-slate-800">
          {cobro.paciente_telefono && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp (Bs.)
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            onClick={handlePrint}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm text-xs font-bold"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Ticket ({printerConfig.paperSize})
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 mr-1" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobroReciboModal;
