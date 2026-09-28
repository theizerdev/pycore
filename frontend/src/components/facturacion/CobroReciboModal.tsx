import React, { useRef } from 'react';
import {
  Printer,
  Share2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Stethoscope,
  Receipt
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
  const { user, sucursalActiva } = useAuth();
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!cobro) return null;

  // Datos de la empresa del usuario logueado
  const empresa = user?.empresa;
  const empresaNombre = empresa?.nombre || 'CLÍNICA MÉDICA & ODONTOLÓGICA';
  const empresaRif = empresa?.identificacion_fiscal || empresa?.documento || 'J-00000000-0';
  const empresaDireccion = empresa?.direccion || '';
  const empresaCiudad = empresa?.ciudad || '';
  const empresaTelefono = empresa?.telefono || '';
  const empresaEmail = empresa?.email || '';
  const empresaLogo = empresa?.logo_url || empresa?.logo_mini_url || empresa?.logo || null;
  const sucursalNombre = sucursalActiva?.nombre || 'Sede Principal';

  // Fecha y hora formateadas
  const fechaHora = (() => {
    try {
      const d = new Date(cobro.fecha_emision);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return cobro.fecha_emision;
    }
  })();

  const monedaSimbolo = cobro.moneda_referencia === 'EUR' ? '€' : '$';

  // Impresión dedicada estilo Ticket 80mm
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=750');
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
          <title>Ticket_${cobro.numero_recibo}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto !important;
              padding: 4mm 3mm 8mm 3mm !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, 'Lucida Console', monospace, system-ui !important;
              font-size: 11px !important;
              line-height: 1.25 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .ticket-print-wrapper {
              width: 100% !important;
              max-width: 74mm !important;
              margin: 0 auto !important;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .font-bold { font-weight: bold !important; }
            .font-mono { font-family: 'Courier New', Courier, monospace !important; }
            .uppercase { text-transform: uppercase !important; }
            .dashed-divider {
              border-top: 1px dashed #000000 !important;
              margin: 5px 0 !important;
              width: 100% !important;
            }
            .solid-divider {
              border-top: 1.5px solid #000000 !important;
              margin: 6px 0 !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              font-size: 10px !important;
              padding: 2px 0 !important;
              vertical-align: top !important;
            }
            .logo-img {
              max-height: 55px !important;
              max-width: 160px !important;
              object-fit: contain !important;
              margin: 0 auto 4px auto !important;
              display: block !important;
              filter: grayscale(100%) contrast(150%) !important;
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
  };

  const handleSendWhatsApp = () => {
    if (!cobro.paciente_telefono) {
      toast.error('El paciente no tiene un número telefónico registrado para WhatsApp');
      return;
    }

    const cleanPhone = cobro.paciente_telefono.replace(/[^0-9]/g, '');
    const itemsText = cobro.detalles
      .map((d) => `• ${d.cantidad}x ${d.descripcion}: ${monedaSimbolo}${Number(d.subtotal_divisa || 0).toFixed(2)} (Bs. ${Number(d.subtotal_ves || 0).toFixed(2)})`)
      .join('\n');

    const message = encodeURIComponent(
      `🏥 *COMPROBANTE DE PAGO (TICKET 80mm)*\n` +
      `*${empresaNombre}*\n` +
      `RIF: ${empresaRif}\n\n` +
      `📄 *Recibo:* ${cobro.numero_recibo}\n` +
      `📅 *Fecha:* ${fechaHora}\n` +
      `👤 *Paciente:* ${cobro.paciente_nombre || 'Particular'} ${cobro.paciente_documento ? `(${cobro.paciente_documento})` : ''}\n` +
      (cobro.medico_nombre ? `👨‍⚕️ *Médico:* Dr(a). ${cobro.medico_nombre}\n` : '') +
      `💱 *Tasa Oficial BCV:* 1 ${cobro.moneda_referencia} = Bs. ${Number(cobro.tasa_bcv_aplicada).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}\n\n` +
      `📋 *Detalle de Servicios:*\n${itemsText}\n\n` +
      `💵 *TOTAL PAGADO:* ${monedaSimbolo}${cobro.total_divisa.toFixed(2)} / Bs. ${Number(cobro.total_ves).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n\n` +
      `¡Gracias por su confianza en nuestra atención de salud!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:m-0 print:border-none print:shadow-none bg-slate-100 dark:bg-slate-950">
        <DialogHeader className="print:hidden pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <DialogTitle className="text-base font-bold">Comprobante de Pago Emitido</DialogTitle>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              80mm POS
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vista previa del ticket térmico listo para impresora de 80mm.
          </p>
        </DialogHeader>

        {/* CONTENEDOR VISUAL ESTILO TICKET TÉRMICO 80MM */}
        <div className="flex justify-center my-1 print:m-0">
          <div
            ref={ticketRef}
            className="w-full max-w-[340px] bg-white text-slate-950 p-4 rounded-xl shadow-md border border-slate-300 font-mono text-[11px] leading-tight select-text print:shadow-none print:border-none print:p-0 print:max-w-[74mm]"
          >
            {/* 1. LOGO DE LA EMPRESA */}
            {empresaLogo && (
              <div className="text-center mb-2">
                <img
                  src={empresaLogo}
                  alt={empresaNombre}
                  className="logo-img max-h-12 max-w-[150px] mx-auto object-contain filter grayscale contrast-125"
                />
              </div>
            )}

            {/* 2. DATOS DE LA EMPRESA DEL USUARIO LOGUEADO */}
            <div className="text-center space-y-0.5 pb-2">
              <h1 className="font-extrabold text-[13px] uppercase tracking-tight text-black">
                {empresaNombre}
              </h1>
              <p className="font-bold text-[10.5px] text-slate-800">
                RIF / ID FISCAL: {empresaRif}
              </p>
              {empresaDireccion && (
                <p className="text-[10px] text-slate-700 leading-tight">
                  {empresaDireccion}{empresaCiudad ? `, ${empresaCiudad}` : ''}
                </p>
              )}
              <div className="text-[9.5px] text-slate-600 flex flex-wrap justify-center gap-x-2">
                {empresaTelefono && <span>Telf: {empresaTelefono}</span>}
                {empresaEmail && <span>Email: {empresaEmail}</span>}
              </div>
              <p className="text-[9.5px] text-slate-500 font-medium">
                {sucursalNombre}
              </p>
            </div>

            {/* LÍNEA DE CORTE / SEPARADOR */}
            <div className="dashed-divider border-t border-dashed border-slate-400 my-2" />

            {/* 3. METADATOS DEL TICKET */}
            <div className="text-center font-bold text-[11px] uppercase tracking-wide">
              RECIBO DE CAJA / TICKET POS
            </div>
            <div className="text-center font-extrabold text-[12px] text-black">
              {cobro.numero_recibo}
            </div>

            <div className="space-y-1 my-2 text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-slate-600">FECHA:</span>
                <span className="font-bold">{fechaHora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">CAJERO:</span>
                <span className="font-bold truncate max-w-[180px]">
                  {cobro.cajero_nombre || user?.nombre || 'Caja Recepción'}
                </span>
              </div>

              {/* DATOS DEL PACIENTE */}
              <div className="border-t border-dotted border-slate-300 pt-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">PACIENTE:</span>
                  <span className="font-bold text-right truncate max-w-[180px]">
                    {cobro.paciente_nombre || 'Cliente Particular'}
                  </span>
                </div>
                {cobro.paciente_documento && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">DOC/CI:</span>
                    <span className="font-bold">{cobro.paciente_documento}</span>
                  </div>
                )}
                {cobro.paciente_telefono && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">TELÉFONO:</span>
                    <span>{cobro.paciente_telefono}</span>
                  </div>
                )}
              </div>

              {/* DATOS DEL MÉDICO / CONSULTA */}
              {(cobro.medico_nombre || cobro.consulta_id) && (
                <div className="border-t border-dotted border-slate-300 pt-1 mt-1">
                  {cobro.medico_nombre && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">MÉDICO:</span>
                      <span className="font-bold text-right truncate max-w-[180px]">
                        Dr(a). {cobro.medico_nombre}
                      </span>
                    </div>
                  )}
                  {cobro.consulta_id && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">CONSULTA:</span>
                      <span className="font-bold"># {cobro.consulta_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LÍNEA DE CORTE */}
            <div className="dashed-divider border-t border-dashed border-slate-400 my-2" />

            {/* 4. TABLA DE CONCEPTOS / SERVICIOS FACTURADOS */}
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-dashed border-slate-400 text-slate-700">
                  <th className="text-left font-bold py-1 w-8">CANT</th>
                  <th className="text-left font-bold py-1">DESCRIPCIÓN</th>
                  <th className="text-right font-bold py-1 w-16">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-200">
                {cobro.detalles.map((d, i) => (
                  <tr key={i}>
                    <td className="py-1 text-center font-bold align-top">{d.cantidad}</td>
                    <td className="py-1 pr-1 align-top">
                      <span className="font-bold block leading-tight">{d.descripcion}</span>
                      {d.diente_fdi && (
                        <span className="text-[9px] text-teal-800 font-bold block">
                          Pieza FDI: {d.diente_fdi}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-500 block">
                        P.U: {monedaSimbolo}{Number(d.precio_unitario_divisa).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 text-right align-top">
                      <span className="font-bold block">
                        {monedaSimbolo}{Number(d.subtotal_divisa).toFixed(2)}
                      </span>
                      <span className="text-[8.5px] text-slate-500 block">
                        Bs. {Number(d.subtotal_ves).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* LÍNEA DE CORTE */}
            <div className="dashed-divider border-t border-dashed border-slate-400 my-2" />

            {/* 5. TOTALES Y TASA BCV */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{monedaSimbolo}{Number(cobro.subtotal_divisa).toFixed(2)}</span>
              </div>
              {Number(cobro.descuento_divisa) > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>DESCUENTO:</span>
                  <span>-{monedaSimbolo}{Number(cobro.descuento_divisa).toFixed(2)}</span>
                </div>
              )}

              {/* TOTAL DESTACADO */}
              <div className="border-t-2 border-black pt-1 my-1">
                <div className="flex justify-between items-baseline font-extrabold text-[13px]">
                  <span>TOTAL PAGADO:</span>
                  <span>{monedaSimbolo}{Number(cobro.total_divisa).toFixed(2)}</span>
                </div>
              </div>

              {/* TASA OFICIAL APLICADA */}
              <div className="p-1 rounded bg-slate-100 text-[10px] space-y-0.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">TASA OFICIAL BCV ({cobro.moneda_referencia}):</span>
                  <span className="font-bold">
                    Bs. {Number(cobro.tasa_bcv_aplicada).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[11px] text-black">
                  <span>TOTAL EN BOLÍVARES:</span>
                  <span>Bs. {Number(cobro.total_ves).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* LÍNEA DE CORTE */}
            <div className="dashed-divider border-t border-dashed border-slate-400 my-2" />

            {/* 6. FORMAS DE PAGO / PAGO MIXTO */}
            <div className="space-y-1">
              <span className="font-bold text-[10px] uppercase block tracking-wider text-slate-700">
                FORMAS DE PAGO:
              </span>
              <div className="space-y-1">
                {cobro.pagos.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[10px]">
                    <div>
                      <span className="font-bold uppercase block">
                        • {p.metodo.replace('_', ' ')}
                      </span>
                      {p.referencia && (
                        <span className="text-[9px] text-slate-600 block">
                          Ref: {p.referencia}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold">
                        {p.moneda === 'USD' ? '$' : p.moneda === 'EUR' ? '€' : 'Bs.'}{' '}
                        {Number(p.monto_moneda_origen).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                      {p.moneda !== cobro.moneda_referencia && (
                        <span className="text-[9px] text-slate-500 block">
                          (Equiv: {monedaSimbolo}{Number(p.monto_equivalente_divisa).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VUELTO SI APLICA */}
            {(Number(cobro.monto_vuelto_divisa) > 0 || Number(cobro.monto_vuelto_ves) > 0) && (
              <div className="mt-2 p-1.5 rounded bg-slate-100 border border-slate-300 flex justify-between font-bold text-[10.5px]">
                <span>CAMBIO / VUELTO:</span>
                <span>
                  {monedaSimbolo}{Number(cobro.monto_vuelto_divisa).toFixed(2)} (Bs. {Number(cobro.monto_vuelto_ves).toFixed(2)})
                </span>
              </div>
            )}

            {/* NOTAS SI EXISTEN */}
            {cobro.notas && (
              <div className="mt-2 text-[9.5px] italic text-slate-600 border-t border-dotted border-slate-300 pt-1">
                Nota: {cobro.notas}
              </div>
            )}

            {/* LÍNEA DE CORTE FINAL */}
            <div className="dashed-divider border-t border-dashed border-slate-400 my-2.5" />

            {/* 7. PIE DE TICKET TÉRMICO */}
            <div className="text-center space-y-1 text-[9.5px] text-slate-700">
              <p className="font-bold text-[10.5px] text-black uppercase">
                ¡GRACIAS POR SU PREFERENCIA!
              </p>
              <p className="leading-tight">
                Conserve este comprobante como soporte de pago de su atención médica.
              </p>

              {/* SIMULACIÓN DE CÓDIGO DE BARRAS TÉRMICO (SVG) */}
              <div className="py-1 flex flex-col items-center justify-center">
                <svg className="h-9 w-44" viewBox="0 0 200 40">
                  {/* Patrón de barras estilo Code128 */}
                  <rect x="0" y="0" width="3" height="35" fill="black" />
                  <rect x="5" y="0" width="2" height="35" fill="black" />
                  <rect x="10" y="0" width="4" height="35" fill="black" />
                  <rect x="17" y="0" width="2" height="35" fill="black" />
                  <rect x="22" y="0" width="5" height="35" fill="black" />
                  <rect x="30" y="0" width="2" height="35" fill="black" />
                  <rect x="35" y="0" width="3" height="35" fill="black" />
                  <rect x="41" y="0" width="4" height="35" fill="black" />
                  <rect x="48" y="0" width="2" height="35" fill="black" />
                  <rect x="53" y="0" width="5" height="35" fill="black" />
                  <rect x="61" y="0" width="3" height="35" fill="black" />
                  <rect x="67" y="0" width="2" height="35" fill="black" />
                  <rect x="72" y="0" width="4" height="35" fill="black" />
                  <rect x="79" y="0" width="2" height="35" fill="black" />
                  <rect x="84" y="0" width="5" height="35" fill="black" />
                  <rect x="92" y="0" width="3" height="35" fill="black" />
                  <rect x="98" y="0" width="2" height="35" fill="black" />
                  <rect x="103" y="0" width="4" height="35" fill="black" />
                  <rect x="110" y="0" width="3" height="35" fill="black" />
                  <rect x="116" y="0" width="5" height="35" fill="black" />
                  <rect x="124" y="0" width="2" height="35" fill="black" />
                  <rect x="129" y="0" width="4" height="35" fill="black" />
                  <rect x="136" y="0" width="3" height="35" fill="black" />
                  <rect x="142" y="0" width="5" height="35" fill="black" />
                  <rect x="150" y="0" width="2" height="35" fill="black" />
                  <rect x="155" y="0" width="4" height="35" fill="black" />
                  <rect x="162" y="0" width="3" height="35" fill="black" />
                  <rect x="168" y="0" width="5" height="35" fill="black" />
                  <rect x="176" y="0" width="2" height="35" fill="black" />
                  <rect x="181" y="0" width="4" height="35" fill="black" />
                  <rect x="188" y="0" width="3" height="35" fill="black" />
                  <rect x="194" y="0" width="4" height="35" fill="black" />
                </svg>
                <span className="font-mono text-[8.5px] text-slate-500 tracking-wider">
                  {cobro.numero_recibo}
                </span>
              </div>

              <p className="text-[8px] text-slate-400 font-sans">
                Medisoft Suite POS • Impreso: {fechaHora}
              </p>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL MODAL */}
        <DialogFooter className="gap-2 sm:gap-2 print:hidden pt-3 border-t border-slate-200 dark:border-slate-800">
          {cobro.paciente_telefono && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer text-xs"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            onClick={handlePrint}
            className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer shadow-md text-xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir Ticket 80mm
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobroReciboModal;
