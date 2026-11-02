import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Printer,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Layers,
  Landmark,
} from 'lucide-react';
import type { LiquidacionHonorarioResponse } from '../../api/honorarios';
import { useAuth } from '../../context/AuthContext';

interface LiquidacionReciboModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacion: LiquidacionHonorarioResponse | null;
}

export const LiquidacionReciboModal: React.FC<LiquidacionReciboModalProps> = ({
  open,
  onOpenChange,
  liquidacion,
}) => {
  const { user, sucursalActiva } = useAuth();
  const [vistaActiva, setVistaActiva] = useState<'liquidacion' | 'retencion_islr'>('liquidacion');

  if (!liquidacion) return null;

  const empresaNombre = user?.empresa?.nombre || 'CENTRO CLÍNICO Y QUIRÚRGICO MEDISOFT';
  const empresaDoc = user?.empresa?.identificacion_fiscal || user?.empresa?.documento || 'J-12345678-0';
  const empresaDireccion = user?.empresa?.direccion || 'Venezuela';
  const empresaTelefono = user?.empresa?.telefono || '';
  const sucursalNombre = sucursalActiva?.nombre || 'Sede Principal';

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatVES = (val: number) => {
    return `Bs. ${new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0)}`;
  };

  const isPagado = liquidacion.estado === 'pagado';
  const isAnulado = liquidacion.estado === 'anulado';

  const fechaEmisionObj = liquidacion.fecha_emision ? new Date(liquidacion.fecha_emision) : new Date();
  const anoFiscal = fechaEmisionObj.getFullYear();
  const mesFiscal = String(fechaEmisionObj.getMonth() + 1).padStart(2, '0');
  const correlativoISLR =
    liquidacion.numero_comprobante_islr || `${anoFiscal}${mesFiscal}${String(liquidacion.id).padStart(8, '0')}`;

  const honorariosBrutosUSD = Number(liquidacion.monto_honorarios_usd) || 0;
  const tasaBCV = Number(liquidacion.tasa_bcv_aplicada) || 1;
  const baseImponibleVES = Math.round(honorariosBrutosUSD * tasaBCV * 100) / 100;
  const pctISLR = Number(liquidacion.porcentaje_retencion_islr) || 0;
  const retencionISLRUSD = Number(liquidacion.monto_retencion_islr_usd) || 0;
  const retencionISLRVES =
    Number(liquidacion.monto_retencion_islr_ves) || Math.round(retencionISLRUSD * tasaBCV * 100) / 100;

  const handlePrint = () => {
    const printableId =
      vistaActiva === 'liquidacion' ? 'area-imprimible-liquidacion' : 'area-imprimible-islr';
    const printableElement = document.getElementById(printableId);
    if (!printableElement) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=1050');
    if (!printWin) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${vistaActiva === 'liquidacion' ? `Liquidacion_${liquidacion.codigo_liquidacion}` : `Retencion_ISLR_${correlativoISLR}`}</title>
          ${styles}
          <style>
            @page {
              size: letter portrait;
              margin: 8mm 12mm 8mm 12mm;
            }
            body {
              background-color: white !important;
              color: #18181b !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #${printableId} {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
          </style>
        </head>
        <body class="bg-white text-zinc-900">
          <div id="${printableId}" class="p-4">
            ${printableElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl">
        {/* Cabecera del Modal con Selector de Documento (No imprimible) */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Comprobante Contable de Honorarios Médicos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Liquidación #{' '}
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                    {liquidacion.codigo_liquidacion}
                  </span>{' '}
                  | Dr(a).{' '}
                  <strong className="text-foreground">{liquidacion.medico_nombre_completo}</strong>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle de Vistas */}
            <div className="flex items-center p-1 rounded-xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setVistaActiva('liquidacion')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vistaActiva === 'liquidacion'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="size-3.5" />
                <span>Liquidación Clínica</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaActiva('retencion_islr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vistaActiva === 'retencion_islr'
                    ? 'bg-background text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck className="size-3.5" />
                <span>Retención ISLR (SENIAT)</span>
              </button>
            </div>

            <Button
              onClick={handlePrint}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm h-9 px-4 cursor-pointer text-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </Button>
          </div>
        </div>

        {/* Contenedor Imprimible */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ── VISTA 1: COMPROBANTE DE LIQUIDACIÓN FORMAL DE HONORARIOS ─────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {vistaActiva === 'liquidacion' && (
            <div
              id="area-imprimible-liquidacion"
              className="w-full max-w-[760px] bg-white text-zinc-900 p-6 sm:p-8 rounded-xl shadow-xl border border-zinc-200 print:border-none print:shadow-none space-y-4 text-xs"
            >
              {/* 1. Membrete Institucional */}
              <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
                <div>
                  <h1 className="text-base font-black text-zinc-900 uppercase tracking-tight">
                    {empresaNombre}
                  </h1>
                  {empresaDoc && (
                    <p className="text-[10px] text-zinc-600 font-mono font-semibold">
                      RIF: {empresaDoc}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-500">{sucursalNombre}</p>
                  <p className="text-[9.5px] text-zinc-400">
                    Dpto. de Administración y Liquidación de Honorarios Médicos
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="inline-block px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-black font-mono">
                    {liquidacion.codigo_liquidacion}
                  </span>
                  <p className="text-[9.5px] text-zinc-500">
                    Emisión:{' '}
                    {liquidacion.fecha_emision
                      ? new Date(liquidacion.fecha_emision).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                  </p>
                  <div className="pt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        isPagado
                          ? 'bg-emerald-100 text-emerald-800'
                          : isAnulado
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPagado ? 'PAGADO / LIQUIDADO' : isAnulado ? 'ANULADO' : 'PENDIENTE DE PAGO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Tarjetas de Información del Médico y Período */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Especialista Médico
                  </p>
                  <p className="text-xs font-black text-zinc-900">
                    {liquidacion.medico_nombre_completo}
                  </p>
                  {liquidacion.medico_documento && (
                    <p className="text-[10px] text-zinc-600 font-mono">
                      C.I. / RIF: {liquidacion.medico_documento}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-600">
                    Régimen:{' '}
                    <strong className="text-zinc-800">
                      {liquidacion.tipo_comision_aplicado === 'porcentaje'
                        ? `${liquidacion.porcentaje_aplicado}% de Honorarios`
                        : `$${liquidacion.monto_fijo_aplicado} Fijo por Consulta`}
                    </strong>
                  </p>
                </div>

                <div className="space-y-0.5 text-right sm:text-left">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Período Liquidado
                  </p>
                  <p className="text-xs font-bold text-zinc-900">
                    {String(liquidacion.periodo_desde).split('T')[0]} al{' '}
                    {String(liquidacion.periodo_hasta).split('T')[0]}
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    Consultas / Recibos incluidos:{' '}
                    <strong className="text-zinc-900 font-mono">{liquidacion.total_cobros}</strong>
                  </p>
                  {isPagado && liquidacion.fecha_pago && (
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Pagado el:{' '}
                      {new Date(liquidacion.fecha_pago).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Desglose de Recibos y Consultas */}
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Detalle de Atenciones y Consultas Liquidadas
                </h3>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                      <tr>
                        <th className="py-1.5 px-2">Recibo</th>
                        <th className="py-1.5 px-2">Fecha</th>
                        <th className="py-1.5 px-2">Paciente</th>
                        <th className="py-1.5 px-2">Concepto</th>
                        <th className="py-1.5 px-2 text-right">Recaudado</th>
                        <th className="py-1.5 px-2 text-right">Ret. Clínica</th>
                        <th className="py-1.5 px-2 text-right">Honorario Bruto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {liquidacion.desglose_cobros && liquidacion.desglose_cobros.length > 0 ? (
                        liquidacion.desglose_cobros.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="py-1 px-2 font-mono text-zinc-600">{item.numero_recibo}</td>
                            <td className="py-1 px-2 text-zinc-500 whitespace-nowrap">
                              {item.fecha?.split(' ')[0]}
                            </td>
                            <td className="py-1 px-2 font-medium text-zinc-800">{item.paciente}</td>
                            <td className="py-1 px-2 text-zinc-600 truncate max-w-[140px]">
                              {item.concepto}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-zinc-700">
                              {formatMoney(item.monto_cobro_usd)}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-zinc-500">
                              {formatMoney(item.retencion_clinica_usd)}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-teal-700">
                              {formatMoney(item.honorario_usd)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-3 text-center text-zinc-400">
                            {liquidacion.total_cobros} recibos consolidados en esta liquidación
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Datos de Desembolso y Liquidación de Totales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Datos Bancarios */}
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[10px] space-y-1">
                  <p className="font-bold text-zinc-700 uppercase tracking-wider text-[9px] flex items-center gap-1">
                    <Landmark className="size-3 text-teal-600" />
                    Datos de Pago Registrados
                  </p>
                  {liquidacion.datos_bancarios_medico &&
                  Object.keys(liquidacion.datos_bancarios_medico).length > 0 ? (
                    <div className="space-y-0.5 text-zinc-600 font-mono">
                      {liquidacion.datos_bancarios_medico.banco && (
                        <p>
                          Banco:{' '}
                          <strong className="text-zinc-900 font-sans">
                            {liquidacion.datos_bancarios_medico.banco}
                          </strong>
                        </p>
                      )}
                      {liquidacion.datos_bancarios_medico.numero_cuenta && (
                        <p>Cuenta: {liquidacion.datos_bancarios_medico.numero_cuenta}</p>
                      )}
                      {liquidacion.datos_bancarios_medico.titular && (
                        <p>Titular: {liquidacion.datos_bancarios_medico.titular}</p>
                      )}
                      {liquidacion.datos_bancarios_medico.pago_movil && (
                        <p>Pago Móvil: {liquidacion.datos_bancarios_medico.pago_movil}</p>
                      )}
                      {liquidacion.datos_bancarios_medico.zelle && (
                        <p>Zelle: {liquidacion.datos_bancarios_medico.zelle}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-400 italic">No se registraron datos bancarios en el perfil.</p>
                  )}

                  {isPagado && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 text-emerald-800 font-semibold space-y-0.5">
                      <p className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Método: {liquidacion.metodo_pago?.toUpperCase()}
                      </p>
                      {liquidacion.referencia_pago && (
                        <p className="font-mono text-[9px]">Ref: {liquidacion.referencia_pago}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Liquidación de Totales Contables con ISLR */}
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600 text-[11px]">
                    <span>Total Recaudado en Consultas:</span>
                    <span className="font-mono font-semibold">
                      {formatMoney(liquidacion.monto_total_recaudado_usd)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-[11px]">
                    <span>Retención Institucional (Clínica):</span>
                    <span className="font-mono font-semibold text-zinc-500">
                      - {formatMoney(liquidacion.monto_retencion_clinica_usd)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-800 text-[11px] font-bold border-t border-zinc-200 pt-1">
                    <span>Honorarios Brutos del Médico:</span>
                    <span className="font-mono">{formatMoney(liquidacion.monto_honorarios_usd)}</span>
                  </div>

                  {/* Retención ISLR según Ley Venezolana */}
                  {retencionISLRUSD > 0 && (
                    <div className="flex justify-between text-rose-700 text-[11px]">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="size-3 text-rose-600" />
                        Retención ISLR ({pctISLR}% Decreto 1.808):
                      </span>
                      <span className="font-mono font-bold">
                        - {formatMoney(retencionISLRUSD)} ({formatVES(retencionISLRVES)})
                      </span>
                    </div>
                  )}

                  {Number(liquidacion.monto_deducciones_usd) > 0 && (
                    <div className="flex justify-between text-rose-700 text-[11px]">
                      <span>
                        Otras Deducciones / Insumos{' '}
                        {liquidacion.motivo_deduccion ? `(${liquidacion.motivo_deduccion})` : ''}:
                      </span>
                      <span className="font-mono font-bold">
                        - {formatMoney(liquidacion.monto_deducciones_usd)}
                      </span>
                    </div>
                  )}

                  <div className="border-t-2 border-teal-600 pt-1.5 flex justify-between items-baseline">
                    <div>
                      <span className="font-black text-xs text-zinc-900 uppercase block">
                        Neto a Percibir:
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Tasa BCV: {liquidacion.tasa_bcv_aplicada} Bs/$
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-teal-800 font-mono block">
                        {formatMoney(liquidacion.monto_neto_pagar_usd)}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-700 font-mono">
                        {formatVES(liquidacion.monto_neto_pagar_ves)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Firmas y Conformidad */}
              <div className="pt-6 border-t border-zinc-200">
                <div className="grid grid-cols-2 gap-12 text-center text-[10px] text-zinc-500">
                  <div className="space-y-1">
                    <div className="w-48 mx-auto border-b border-zinc-400 pb-8" />
                    <p className="font-bold text-zinc-900">{liquidacion.medico_nombre_completo}</p>
                    <p className="text-zinc-500">Firma del Especialista Médico</p>
                    <p className="text-[8.5px] text-zinc-400">Conforme con la liquidación practicada</p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-48 mx-auto border-b border-zinc-400 pb-8" />
                    <p className="font-bold text-zinc-900">{empresaNombre}</p>
                    <p className="text-zinc-500">Administración y Tesorería</p>
                    <p className="text-[8.5px] text-zinc-400">Comprobante Contable de Honorarios</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ── VISTA 2: COMPROBANTE OFICIAL DE RETENCIÓN DE ISLR (SENIAT) ───── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {vistaActiva === 'retencion_islr' && (
            <div
              id="area-imprimible-islr"
              className="w-full max-w-[760px] bg-white text-zinc-900 p-6 sm:p-8 rounded-xl shadow-xl border border-zinc-300 print:border-none print:shadow-none space-y-4 text-xs font-sans"
            >
              {/* Encabezado Oficial SENIAT */}
              <div className="border border-zinc-800 p-3 space-y-2">
                <div className="text-center space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                    REPÚBLICA BOLIVARIANA DE VENEZUELA
                  </p>
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                    COMPROBANTE DE RETENCIÓN DE IMPUESTO SOBRE LA RENTA (I.S.L.R.)
                  </h2>
                  <p className="text-[9px] text-zinc-600 font-medium">
                    (Decreto N° 1.808 de fecha 23 de abril de 1997 - Gaceta Oficial N° 36.203)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-400 text-[10px]">
                  <div>
                    <span className="text-zinc-500 font-bold block">NÚMERO DE COMPROBANTE:</span>
                    <span className="font-mono font-black text-xs text-zinc-900">
                      {correlativoISLR}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 font-bold block">FECHA DE EMISIÓN:</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {fechaEmisionObj.toLocaleDateString('es-VE')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-[10px]">
                  <div>
                    <span className="text-zinc-500 font-bold">PERÍODO FISCAL:</span>{' '}
                    <span className="font-mono font-bold">{anoFiscal} - {mesFiscal}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 font-bold">TASA OFICIAL BCV:</span>{' '}
                    <span className="font-mono font-bold">{tasaBCV} Bs/$</span>
                  </div>
                </div>
              </div>

              {/* Datos de las Partes (Agente y Sujeto) */}
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                {/* Agente de Retención */}
                <div className="border border-zinc-300 p-3 rounded space-y-1">
                  <p className="font-black text-zinc-800 uppercase text-[9px] border-b border-zinc-200 pb-0.5">
                    1. DATOS DEL AGENTE DE RETENCIÓN
                  </p>
                  <p>
                    <span className="text-zinc-500 font-semibold">Razón Social:</span>{' '}
                    <strong className="text-zinc-900">{empresaNombre}</strong>
                  </p>
                  <p>
                    <span className="text-zinc-500 font-semibold">N° de RIF:</span>{' '}
                    <strong className="font-mono text-zinc-900">{empresaDoc}</strong>
                  </p>
                  {empresaDireccion && (
                    <p className="text-zinc-600">
                      <span className="text-zinc-500 font-semibold">Dirección Fiscal:</span>{' '}
                      {empresaDireccion}
                    </p>
                  )}
                  {empresaTelefono && (
                    <p className="text-zinc-600">
                      <span className="text-zinc-500 font-semibold">Teléfono:</span> {empresaTelefono}
                    </p>
                  )}
                </div>

                {/* Sujeto Retenido */}
                <div className="border border-zinc-300 p-3 rounded space-y-1">
                  <p className="font-black text-zinc-800 uppercase text-[9px] border-b border-zinc-200 pb-0.5">
                    2. DATOS DEL SUJETO RETENIDO (BENEFICIARIO)
                  </p>
                  <p>
                    <span className="text-zinc-500 font-semibold">Especialista:</span>{' '}
                    <strong className="text-zinc-900">{liquidacion.medico_nombre_completo}</strong>
                  </p>
                  <p>
                    <span className="text-zinc-500 font-semibold">C.I. / RIF:</span>{' '}
                    <strong className="font-mono text-zinc-900">
                      {liquidacion.medico_documento || 'No indicado'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-zinc-500 font-semibold">Concepto:</span>{' '}
                    <span className="text-zinc-800">Honorarios Médicos Profesionales</span>
                  </p>
                  <p>
                    <span className="text-zinc-500 font-semibold">Exención IVA:</span>{' '}
                    <span className="text-emerald-700 font-semibold">
                      Exento (Art. 18 Num. 3 LIVA)
                    </span>
                  </p>
                </div>
              </div>

              {/* Tabla de Determinación del Tributo */}
              <div className="border border-zinc-400 rounded overflow-hidden">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300">
                    <tr>
                      <th className="py-2 px-2.5">Operación / Referencia</th>
                      <th className="py-2 px-2.5">Concepto Gravable</th>
                      <th className="py-2 px-2.5 text-right">Base Imponible ($)</th>
                      <th className="py-2 px-2.5 text-right">Base Imponible (Bs)</th>
                      <th className="py-2 px-2.5 text-center">% Ret.</th>
                      <th className="py-2 px-2.5 text-right">Total Retenido (Bs)</th>
                      <th className="py-2 px-2.5 text-right">Total Retenido ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    <tr>
                      <td className="py-2 px-2.5 font-mono text-zinc-700">
                        {liquidacion.codigo_liquidacion}
                      </td>
                      <td className="py-2 px-2.5 text-zinc-800">
                        Honorarios Profesionales Médicos ({liquidacion.total_cobros} consultas)
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-700">
                        {formatMoney(honorariosBrutosUSD)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-700 font-semibold">
                        {formatVES(baseImponibleVES)}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-zinc-900">
                        {pctISLR.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-rose-700">
                        {formatVES(retencionISLRVES)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-rose-700">
                        {formatMoney(retencionISLRUSD)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-zinc-50 border-t-2 border-zinc-400 font-bold text-[10px]">
                    <tr>
                      <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-zinc-700">
                        TOTAL IMPUESTO RETENIDO A ENTERAR AL SENIAT:
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-zinc-900 text-xs">
                        {formatVES(retencionISLRVES)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-zinc-900 text-xs">
                        {formatMoney(retencionISLRUSD)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Base Legal y Disposiciones */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-[9px] text-zinc-600 space-y-1">
                <p className="font-bold text-zinc-800 uppercase">FUNDAMENTO TRIBUTARIO:</p>
                <p>
                  • Retención practicada en aplicación del <strong>Artículo 9, Numeral 1, Literal a) del Decreto N° 1.808</strong> (Reglamento Parcial de la Ley de Impuesto Sobre la Renta en materia de Retenciones).
                </p>
                <p>
                  • De conformidad con el <strong>Artículo 18, Numeral 3 de la Ley que establece el Impuesto al Valor Agregado (LIVA)</strong>, las prestaciones médico-asistenciales se encuentran estrictamente exentas del pago del IVA.
                </p>
                <p>
                  • Conversión cambiaria liquidada a la Tasa Oficial de Cambio del <strong>Banco Central de Venezuela (BCV)</strong> según el Convenio Cambiario N° 1.
                </p>
              </div>

              {/* Firmas y Sellos SENIAT */}
              <div className="pt-8">
                <div className="grid grid-cols-2 gap-12 text-center text-[10px] text-zinc-500">
                  <div className="space-y-1">
                    <div className="w-52 mx-auto border-b border-zinc-500 pb-10" />
                    <p className="font-bold text-zinc-900">{empresaNombre}</p>
                    <p className="font-mono text-[9px] text-zinc-600">RIF: {empresaDoc}</p>
                    <p className="text-zinc-500 font-semibold">FIRMA Y SELLO AGENTE DE RETENCIÓN</p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-52 mx-auto border-b border-zinc-500 pb-10" />
                    <p className="font-bold text-zinc-900">{liquidacion.medico_nombre_completo}</p>
                    <p className="font-mono text-[9px] text-zinc-600">
                      Doc: {liquidacion.medico_documento}
                    </p>
                    <p className="text-zinc-500 font-semibold">FIRMA DEL BENEFICIARIO (SUJETO RETENIDO)</p>
                    <p className="text-[8px] text-zinc-400">Fecha de Recepción: ____/____/________</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex sm:justify-between items-center gap-2 print:hidden">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {vistaActiva === 'liquidacion'
              ? 'Mostrando Liquidación Contable de Consultas'
              : 'Mostrando Comprobante Oficial de Retención de ISLR (SENIAT)'}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cerrar
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir {vistaActiva === 'liquidacion' ? 'Liquidación' : 'Comprobante ISLR'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LiquidacionReciboModal;
