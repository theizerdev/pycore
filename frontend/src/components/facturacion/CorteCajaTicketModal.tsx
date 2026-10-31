import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Printer, FileCheck2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cajasApi, type TurnoCaja, type TurnoDetalleResumen } from '../../api/cajas';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import {
  type PosPrinterConfig,
  loadPosPrinterConfig,
  savePosPrinterConfig,
  formatTicketBs,
} from './pos/posPrinterConfig';

/**
 * Normaliza etiquetas de métodos de pago para cumplimiento legal en Venezuela:
 * cero referencias a divisas extranjeras en comprobantes térmicos impresos.
 */
function getLegalMethodName(metodo?: string | null): string {
  const m = (metodo || '').toLowerCase().trim();
  if (m.includes('efectivo')) return 'EFECTIVO EN CAJA';
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
      .replace(/usd|eur|zelle|dolar|dólar|divisa/gi, '')
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s/_-]/g, '')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase() || 'OTROS MEDIOS'
  );
}

/**
 * Limpia textos libres de observaciones para evitar impresión accidental de divisas.
 */
function sanitizeLegalText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\b(USD|EUR|USDT|ZELLE|DOLARES|DÓLARES|DIVISAS|DIVISA)\b/gi, '')
    .replace(/\u0024|\u20AC/g, 'Bs. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface CorteCajaTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turnoId: number | null;
  initialDetalle?: TurnoDetalleResumen | null;
  fallbackTurno?: TurnoCaja | null;
  autoTriggerPrint?: boolean;
  onAutoPrintHandled?: () => void;
}

export const CorteCajaTicketModal: React.FC<CorteCajaTicketModalProps> = ({
  open,
  onOpenChange,
  turnoId,
  initialDetalle = null,
  fallbackTurno = null,
  autoTriggerPrint = false,
  onAutoPrintHandled,
}) => {
  const { user, sucursalActiva } = useAuth();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [printerConfig, setPrinterConfig] = useState<PosPrinterConfig>(() =>
    loadPosPrinterConfig()
  );
  const [detalle, setDetalle] = useState<TurnoDetalleResumen | null>(initialDetalle);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPrinterConfig(loadPosPrinterConfig());
    }
  }, [open]);

  useEffect(() => {
    if (!open || !turnoId) return;
    if (initialDetalle && initialDetalle.turno.id === turnoId) {
      setDetalle(initialDetalle);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await cajasApi.getTurnoDetalle(turnoId);
        if (!cancelled) setDetalle(data);
      } catch {
        if (!cancelled) setDetalle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [open, turnoId, initialDetalle]);

  const handleSwitchPaperSize = (size: '80mm' | '58mm') => {
    const updated: PosPrinterConfig = { ...printerConfig, paperSize: size };
    setPrinterConfig(updated);
    savePosPrinterConfig(updated);
  };

  const turno = detalle?.turno || fallbackTurno;
  const tasa = detalle && detalle.tasa_bcv_actual > 0 ? detalle.tasa_bcv_actual : 1;

  // Consolidación 100% en Bolívares (Bs.) para impresión térmica legal
  const cifrasBs = useMemo(() => {
    if (!turno) {
      return {
        fondoInicialBs: 0,
        ventasBrutasBs: 0,
        anuladasBs: 0,
        cantidadAnuladas: 0,
        ventasNetasBs: 0,
        cantidadCompletadas: 0,
        efectivoVentasBs: 0,
        entradasExtraBs: 0,
        salidasExtraBs: 0,
        esperadoGavetaBs: 0,
        electronicosBs: 0,
        declaradoGavetaBs: null as number | null,
        diferenciaBs: null as number | null,
        metodosAgrupadosBs: [] as Array<{ nombre: string; montoBs: number; ops: number }>,
      };
    }

    const fondoInicialBs =
      Math.round(
        ((Number(turno.fondo_inicial_ves) || 0) +
          (Number(turno.fondo_inicial_usd) || 0) * tasa) *
          100
      ) / 100;

    if (!detalle) {
      const ingresosEfecBs =
        Math.round(
          ((Number(turno.total_ingresos_ves) || 0) +
            (Number(turno.total_ingresos_usd) || 0) * tasa) *
            100
        ) / 100;
      const salidasBs =
        Math.round(
          ((Number(turno.total_egresos_ves) || 0) +
            (Number(turno.total_egresos_usd) || 0) * tasa) *
            100
        ) / 100;
      const esperadoBs = Math.round((fondoInicialBs + ingresosEfecBs - salidasBs) * 100) / 100;
      const tieneDeclarado =
        turno.arqueo_declarado_ves != null || turno.arqueo_declarado_usd != null;
      const declaradoBs = tieneDeclarado
        ? Math.round(
            ((Number(turno.arqueo_declarado_ves) || 0) +
              (Number(turno.arqueo_declarado_usd) || 0) * tasa) *
              100
          ) / 100
        : null;
      const difBs =
        declaradoBs !== null ? Math.round((declaradoBs - esperadoBs) * 100) / 100 : null;

      return {
        fondoInicialBs,
        ventasBrutasBs: ingresosEfecBs,
        anuladasBs: 0,
        cantidadAnuladas: 0,
        ventasNetasBs: ingresosEfecBs,
        cantidadCompletadas: 0,
        efectivoVentasBs: ingresosEfecBs,
        entradasExtraBs: 0,
        salidasExtraBs: salidasBs,
        esperadoGavetaBs: esperadoBs,
        electronicosBs: 0,
        declaradoGavetaBs: declaradoBs,
        diferenciaBs: difBs,
        metodosAgrupadosBs: [],
      };
    }

    const efectivoVentasBs =
      Math.round(
        ((Number(detalle.efectivo_ventas_ves) || 0) +
          (Number(detalle.efectivo_ventas_usd) || 0) * tasa) *
          100
      ) / 100;

    const entradasExtraBs =
      Math.round(
        ((Number(detalle.efectivo_ingresos_extra_ves) || 0) +
          (Number(detalle.efectivo_ingresos_extra_usd) || 0) * tasa) *
          100
      ) / 100;

    const salidasExtraBs =
      Math.round(
        ((Number(detalle.efectivo_egresos_ves) || 0) +
          (Number(detalle.efectivo_egresos_usd) || 0) * tasa) *
          100
      ) / 100;

    const esperadoGavetaBs =
      Math.round(
        ((Number(detalle.esperado_gaveta_ves) || 0) +
          (Number(detalle.esperado_gaveta_usd) || 0) * tasa) *
          100
      ) / 100;

    const tieneDeclarado =
      turno.arqueo_declarado_ves != null || turno.arqueo_declarado_usd != null;
    const declaradoGavetaBs = tieneDeclarado
      ? Math.round(
          ((Number(turno.arqueo_declarado_ves) || 0) +
            (Number(turno.arqueo_declarado_usd) || 0) * tasa) *
            100
        ) / 100
      : null;

    const diferenciaBs =
      declaradoGavetaBs !== null
        ? Math.round((declaradoGavetaBs - esperadoGavetaBs) * 100) / 100
        : null;

    // Agrupar métodos de pago por etiqueta legal unificada en Bs.
    const groupedMap = new Map<string, { nombre: string; montoBs: number; ops: number }>();
    for (const m of detalle.por_metodo_pago || []) {
      const label = getLegalMethodName(m.metodo);
      const montoBs =
        (m.moneda || '').toUpperCase() === 'VES'
          ? Number(m.total_monto_origen) || 0
          : Math.round((Number(m.total_equivalente_divisa) || 0) * tasa * 100) / 100;
      const existing = groupedMap.get(label);
      if (existing) {
        existing.montoBs = Math.round((existing.montoBs + montoBs) * 100) / 100;
        existing.ops += Number(m.cantidad_transacciones) || 0;
      } else {
        groupedMap.set(label, {
          nombre: label,
          montoBs: Math.round(montoBs * 100) / 100,
          ops: Number(m.cantidad_transacciones) || 0,
        });
      }
    }

    const metodosAgrupadosBs = Array.from(groupedMap.values()).sort(
      (a, b) => b.montoBs - a.montoBs
    );

    return {
      fondoInicialBs,
      ventasBrutasBs: Number(detalle.ventas_brutas_ves) || 0,
      anuladasBs: Number(detalle.total_anuladas_ves) || 0,
      cantidadAnuladas: Number(detalle.cantidad_anuladas) || 0,
      ventasNetasBs: Number(detalle.ventas_netas_ves) || 0,
      cantidadCompletadas: Number(detalle.cantidad_completadas) || 0,
      efectivoVentasBs,
      entradasExtraBs,
      salidasExtraBs,
      esperadoGavetaBs,
      electronicosBs: Number(detalle.ingresos_electronicos_ves) || 0,
      declaradoGavetaBs,
      diferenciaBs,
      metodosAgrupadosBs,
    };
  }, [turno, detalle, tasa]);

  const handlePrint = useCallback(() => {
    if (!turno) return;
    const is58 = printerConfig.paperSize === '58mm';
    const pageWidth = is58 ? '58mm' : '80mm';
    const wrapperWidth = is58 ? '53mm' : '74mm';
    const baseFontSize = is58 ? '9.5px' : '11px';

    const printWindow = window.open('', '_blank', 'width=450,height=780');
    if (!printWindow) {
      window.print();
      return;
    }

    const ticketHtml = ticketRef.current ? ticketRef.current.innerHTML : '';
    const tipoTitulo = turno.estado === 'cerrada' ? `CorteZ_Turno_${turno.id}` : `ArqueoX_Turno_${turno.id}`;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${tipoTitulo}</title>
          <style>
            @page {
              size: ${pageWidth} auto;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              color: #000000 !important;
            }
            html, body {
              width: ${pageWidth};
              background: #ffffff;
              font-family: 'Courier New', Courier, monospace;
              font-size: ${baseFontSize};
              line-height: 1.32;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .ticket-wrapper {
              width: ${wrapperWidth};
              margin: 0 auto;
              padding: 2.5mm 1.5mm 5mm 1.5mm;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .divider {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }
            .divider-double {
              border-top: 2px solid #000;
              margin: 5px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              gap: 4px;
              margin: 2px 0;
            }
            .banner-box {
              border: 1.5px solid #000;
              padding: 3px 4px;
              margin: 5px 0;
              text-align: center;
              font-weight: 900;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 78%;
              margin: 24px auto 3px auto;
            }
            .small { font-size: ${is58 ? '8.5px' : '9.5px'}; }
          </style>
        </head>
        <body>
          <div class="ticket-wrapper">
            ${ticketHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 220);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [turno, printerConfig.paperSize]);

  useEffect(() => {
    if (open && autoTriggerPrint && turno && !loading) {
      const timer = setTimeout(() => {
        handlePrint();
        onAutoPrintHandled?.();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [open, autoTriggerPrint, turno, loading, handlePrint, onAutoPrintHandled]);

  if (!turno) return null;

  const isClosed = turno.estado === 'cerrada';
  const empresaNombre = user?.empresa?.nombre || 'CENTRO MÉDICO ASISTENCIAL';
  const empresaDoc =
    user?.empresa?.identificacion_fiscal || user?.empresa?.documento || '';
  const sucursalNombre = sucursalActiva?.nombre || 'Sede Principal';
  const sucursalDir = sucursalActiva?.direccion || user?.empresa?.direccion || '';
  const sucursalTel = sucursalActiva?.telefono || user?.empresa?.telefono || '';

  const notasAperturaLimpias = sanitizeLegalText(turno.notas_apertura);
  const notasCierreLimpias = sanitizeLegalText(turno.notas_cierre);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isClosed ? (
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <DialogTitle className="text-sm font-black">
                  {isClosed ? 'Comprobante de Corte Z' : 'Arqueo Parcial (Corte X)'}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  Ticket térmico legal expresado 100% en Bolívares (Bs.)
                </p>
              </div>
            </div>

            {/* Selector rápido 80mm / 58mm */}
            <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg">
              {(['80mm', '58mm'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSwitchPaperSize(sz)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-black font-mono cursor-pointer transition-colors',
                    printerConfig.paperSize === sz
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Vista previa fiel de papel térmico */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 flex justify-center">
          {loading ? (
            <div className="py-16 text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Calculando conciliación del turno en Bolívares...
            </div>
          ) : (
            <div
              className={cn(
                'bg-white text-black shadow-md border border-slate-300 rounded-sm p-4 font-mono text-[11px] leading-snug select-text transition-all',
                printerConfig.paperSize === '58mm' ? 'w-[245px] text-[10px]' : 'w-[330px]'
              )}
            >
              <div ref={ticketRef}>
                {/* Encabezado Fiscal / Clínica */}
                <div className="text-center">
                  <div className="font-black uppercase" style={{ fontSize: '13px' }}>
                    {empresaNombre}
                  </div>
                  {empresaDoc && <div className="font-bold">RIF: {empresaDoc}</div>}
                  <div>{sucursalNombre}</div>
                  {sucursalDir && <div className="small">{sucursalDir}</div>}
                  {sucursalTel && <div className="small">TEL: {sucursalTel}</div>}
                </div>

                {/* Título del Comprobante */}
                <div className="banner-box border-2 border-black py-1 px-2 my-2 text-center font-black">
                  <div>
                    {isClosed ? 'COMPROBANTE DE CORTE Z' : 'ARQUEO PARCIAL (CORTE X)'}
                  </div>
                  <div className="small font-bold">
                    {turno.caja_nombre || 'CAJA'} — TURNO #{turno.id}
                  </div>
                </div>

                {/* Metadatos del Turno */}
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="row flex justify-between">
                    <span className="font-bold">CAJERO:</span>
                    <span>{turno.cajero_nombre || 'Operador'}</span>
                  </div>
                  <div className="row flex justify-between">
                    <span className="font-bold">APERTURA:</span>
                    <span>
                      {new Date(turno.apertura_at).toLocaleString('es-VE', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="row flex justify-between">
                    <span className="font-bold">CIERRE:</span>
                    <span>
                      {turno.cierre_at
                        ? new Date(turno.cierre_at).toLocaleString('es-VE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'EN CURSO (ABIERTA)'}
                    </span>
                  </div>
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                {/* Resumen de Flujo en Bolívares */}
                <div className="font-black uppercase mb-1">RESUMEN DE FLUJO (Bs.)</div>

                <div className="row flex justify-between">
                  <span>Fondo Inicial:</span>
                  <span className="font-bold">{formatTicketBs(cifrasBs.fondoInicialBs)}</span>
                </div>

                {cifrasBs.cantidadAnuladas > 0 && (
                  <>
                    <div className="row flex justify-between">
                      <span>Ventas Brutas:</span>
                      <span>{formatTicketBs(cifrasBs.ventasBrutasBs)}</span>
                    </div>
                    <div className="row flex justify-between">
                      <span>Anuladas ({cifrasBs.cantidadAnuladas}):</span>
                      <span>-{formatTicketBs(cifrasBs.anuladasBs)}</span>
                    </div>
                  </>
                )}

                <div className="row flex justify-between">
                  <span>Ventas Netas ({cifrasBs.cantidadCompletadas} ops.):</span>
                  <span className="font-bold">+{formatTicketBs(cifrasBs.ventasNetasBs)}</span>
                </div>

                <div className="row flex justify-between">
                  <span>Cobros en Efectivo:</span>
                  <span>+{formatTicketBs(cifrasBs.efectivoVentasBs)}</span>
                </div>

                {cifrasBs.entradasExtraBs > 0 && (
                  <div className="row flex justify-between">
                    <span>Entradas Caja Chica:</span>
                    <span>+{formatTicketBs(cifrasBs.entradasExtraBs)}</span>
                  </div>
                )}

                <div className="row flex justify-between">
                  <span>Salidas / Gastos Caja:</span>
                  <span>-{formatTicketBs(cifrasBs.salidasExtraBs)}</span>
                </div>

                <div className="divider-double border-t-2 border-black my-1.5" />

                <div className="row flex justify-between font-black">
                  <span>EFECTIVO ESPERADO CAJÓN:</span>
                  <span>{formatTicketBs(cifrasBs.esperadoGavetaBs)}</span>
                </div>

                <div className="row flex justify-between small mt-0.5">
                  <span>Medios Bancarios/Digitales:</span>
                  <span>{formatTicketBs(cifrasBs.electronicosBs)}</span>
                </div>

                {/* Desglose por Método de Pago en Bs. */}
                {cifrasBs.metodosAgrupadosBs.length > 0 && (
                  <>
                    <div className="divider border-t border-dashed border-black my-2" />
                    <div className="font-black uppercase mb-1">FORMAS DE PAGO (Bs.)</div>
                    {cifrasBs.metodosAgrupadosBs.map((m, idx) => (
                      <div key={idx} className="row flex justify-between">
                        <span>
                          {m.nombre} ({m.ops}):
                        </span>
                        <span className="font-bold">{formatTicketBs(m.montoBs)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Resultado del Arqueo Físico (si está cerrado) */}
                {isClosed && cifrasBs.declaradoGavetaBs !== null && (
                  <>
                    <div className="divider border-t border-dashed border-black my-2" />
                    <div className="font-black uppercase mb-1">ARQUEO FÍSICO DE CAJA</div>
                    <div className="row flex justify-between">
                      <span>Esperado Sistema:</span>
                      <span>{formatTicketBs(cifrasBs.esperadoGavetaBs)}</span>
                    </div>
                    <div className="row flex justify-between font-bold">
                      <span>Efectivo Contado:</span>
                      <span>{formatTicketBs(cifrasBs.declaradoGavetaBs)}</span>
                    </div>
                    <div className="row flex justify-between font-black mt-0.5">
                      <span>DIFERENCIA:</span>
                      <span>
                        {cifrasBs.diferenciaBs === null || Math.abs(cifrasBs.diferenciaBs) < 0.01
                          ? 'CUADRE EXACTO (Bs. 0,00)'
                          : cifrasBs.diferenciaBs > 0
                            ? `SOBRANTE +${formatTicketBs(cifrasBs.diferenciaBs)}`
                            : `FALTANTE -${formatTicketBs(Math.abs(cifrasBs.diferenciaBs))}`}
                      </span>
                    </div>
                  </>
                )}

                {/* Observaciones limpias */}
                {(notasAperturaLimpias || notasCierreLimpias) && (
                  <>
                    <div className="divider border-t border-dashed border-black my-2" />
                    <div className="small space-y-0.5">
                      {notasAperturaLimpias && (
                        <div>
                          <span className="font-bold">OBS. APERTURA: </span>
                          <span>{notasAperturaLimpias}</span>
                        </div>
                      )}
                      {notasCierreLimpias && (
                        <div>
                          <span className="font-bold">OBS. CIERRE: </span>
                          <span>{notasCierreLimpias}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Firmas de Conformidad (Réplica FixSale POS) */}
                <div className="text-center mt-6 pt-2">
                  <div className="signature-line border-t border-black w-4/5 mx-auto mb-1" />
                  <div className="small font-bold uppercase">
                    FIRMA CAJERO: {turno.cajero_nombre || 'OPERADOR'}
                  </div>
                </div>

                <div className="text-center mt-5 pt-1">
                  <div className="signature-line border-t border-black w-4/5 mx-auto mb-1" />
                  <div className="small font-bold uppercase">
                    SUPERVISOR / ADMINISTRACIÓN
                  </div>
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                <div className="text-center small">
                  <div>TODOS LOS MONTOS EXPRESADOS EN BOLÍVARES (Bs.)</div>
                  <div>
                    IMPRESO:{' '}
                    {new Date().toLocaleString('es-VE', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border bg-card flex items-center justify-between sm:justify-between gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            100% Legal en Bs.
          </Badge>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs cursor-pointer"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={handlePrint}
              className="h-9 px-4 text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir {isClosed ? 'Corte Z' : 'Arqueo X'} ({printerConfig.paperSize})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CorteCajaTicketModal;

