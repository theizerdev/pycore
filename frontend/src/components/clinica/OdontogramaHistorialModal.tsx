import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import OdontogramaWidget, {
  type OdontogramaData,
  type EstadoPieza,
  HERRAMIENTAS,
  NOMBRES_DIENTES,
} from './OdontogramaWidget';
import type { PrimerOdontogramaInfo } from '../../api/consultas';
import {
  Smile,
  Download,
  Calendar,
  UserCheck,
  Stethoscope,
  Info,
  Clock,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  Filter,
  Check,
} from 'lucide-react';

interface OdontogramaHistorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primerOdontograma: PrimerOdontogramaInfo | null;
  pacienteNombre?: string;
  pacienteEdad?: number;
  onCargarEnConsultaActual?: () => void;
  readOnly?: boolean;
}

export const OdontogramaHistorialModal: React.FC<OdontogramaHistorialModalProps> = ({
  open,
  onOpenChange,
  primerOdontograma,
  pacienteNombre,
  pacienteEdad,
  onCargarEnConsultaActual,
  readOnly = false,
}) => {
  if (!primerOdontograma) return null;

  const [modalDenticion, setModalDenticion] = useState<'adulto' | 'infantil'>(
    primerOdontograma.denticion ||
      ((primerOdontograma.odontograma?.denticion as 'adulto' | 'infantil') || 'adulto')
  );

  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  // Sincronizar si cambia el odontograma
  React.useEffect(() => {
    if (primerOdontograma?.denticion) {
      setModalDenticion(primerOdontograma.denticion);
    } else if (primerOdontograma?.odontograma?.denticion) {
      setModalDenticion(primerOdontograma.odontograma.denticion as 'adulto' | 'infantil');
    }
  }, [primerOdontograma]);

  const piezasObj: Record<number, EstadoPieza> = useMemo(() => {
    return (primerOdontograma.odontograma?.piezas || {}) as Record<number, EstadoPieza>;
  }, [primerOdontograma.odontograma?.piezas]);

  const piezasList = useMemo(() => Object.values(piezasObj), [piezasObj]);

  // Cálculos estadísticos de patologías y tratamientos iniciales
  const conteoCaries = useMemo(() => {
    return piezasList.reduce((acc, p) => {
      return acc + Object.values(p.caras || {}).filter((c) => c === 'caries').length;
    }, 0);
  }, [piezasList]);

  const conteoObturadas = useMemo(() => {
    return piezasList.reduce((acc, p) => {
      return acc + Object.values(p.caras || {}).filter((c) => c === 'obturacion').length;
    }, 0);
  }, [piezasList]);

  const conteoAusentes = useMemo(() => {
    return piezasList.filter((p) => p.condicionGeneral === 'ausente').length;
  }, [piezasList]);

  const conteoEndodoncias = useMemo(() => {
    return piezasList.filter((p) => p.condicionGeneral === 'endodoncia').length;
  }, [piezasList]);

  const conteoCoronas = useMemo(() => {
    return piezasList.filter((p) => p.condicionGeneral === 'corona').length;
  }, [piezasList]);

  const conteoFracturas = useMemo(() => {
    return piezasList.reduce((acc, p) => {
      return acc + Object.values(p.caras || {}).filter((c) => c === 'fractura').length;
    }, 0);
  }, [piezasList]);

  const conteoSellantes = useMemo(() => {
    return piezasList.reduce((acc, p) => {
      return acc + Object.values(p.caras || {}).filter((c) => c === 'sellante').length;
    }, 0);
  }, [piezasList]);

  const piezasConHallazgos = useMemo(() => {
    return piezasList.filter((p) => {
      const tieneCaras = Object.values(p.caras || {}).some((c) => c !== 'sano');
      return tieneCaras || (p.condicionGeneral && p.condicionGeneral !== 'sano');
    });
  }, [piezasList]);

  // Filtrar según el chip seleccionado
  const piezasFiltradas = useMemo(() => {
    if (!filtroTipo) return piezasConHallazgos;
    return piezasConHallazgos.filter((p) => {
      if (filtroTipo === 'caries') {
        return Object.values(p.caras || {}).some((c) => c === 'caries');
      }
      if (filtroTipo === 'obturacion') {
        return Object.values(p.caras || {}).some((c) => c === 'obturacion');
      }
      if (filtroTipo === 'ausente') {
        return p.condicionGeneral === 'ausente';
      }
      if (filtroTipo === 'endodoncia') {
        return p.condicionGeneral === 'endodoncia';
      }
      if (filtroTipo === 'corona') {
        return p.condicionGeneral === 'corona';
      }
      if (filtroTipo === 'fractura') {
        return Object.values(p.caras || {}).some((c) => c === 'fractura');
      }
      return true;
    });
  }, [piezasConHallazgos, filtroTipo]);

  const fechaFormat = new Date(primerOdontograma.fecha_consulta).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const piezaActual = piezaSeleccionada ? piezasObj[piezaSeleccionada] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden border-teal-500/30 rounded-2xl shadow-2xl bg-card">
        {/* ── CABECERA PRINCIPAL MODAL ─────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border-b border-border/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20 shrink-0">
                <Smile className="size-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Odontograma Basal — Primera Consulta
                  </h3>
                  <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-mono text-[11px] shadow-2xs">
                    Consulta #{primerOdontograma.consulta_id}
                  </Badge>
                  {primerOdontograma.codigo && (
                    <Badge variant="outline" className="font-mono text-[11px] border-border/80 text-muted-foreground">
                      {primerOdontograma.codigo}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground">
                    {pacienteNombre ? `${pacienteNombre} ` : ''}
                    {pacienteEdad ? `(${pacienteEdad} años)` : ''}
                  </span>
                  <span>·</span>
                  <span>{fechaFormat}</span>
                  <span>·</span>
                  <span className="text-teal-700 dark:text-teal-300 font-medium">
                    {primerOdontograma.medico_nombre || 'Especialista en Odontología'}
                  </span>
                </p>
              </div>
            </div>

            {/* Selector de Dentición en el Header */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Tabs
                value={modalDenticion}
                onValueChange={(val: string) => setModalDenticion(val as 'adulto' | 'infantil')}
                className="h-8"
              >
                <TabsList className="h-8 p-0.5 bg-muted/80 border border-border/50">
                  <TabsTrigger value="adulto" className="text-xs px-2.5 h-7 cursor-pointer">
                    Adultos (32)
                  </TabsTrigger>
                  <TabsTrigger value="infantil" className="text-xs px-2.5 h-7 cursor-pointer">
                    Pediátrico (20)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* ── BARRA EJECUTIVA DE DIAGNÓSTICO Y KPIs INICIALES ───────────── */}
          <div className="mt-3.5 pt-3 border-t border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            {/* Chips de KPIs de Hallazgos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
                Hallazgos:
              </span>

              <button
                type="button"
                onClick={() => setFiltroTipo(filtroTipo === 'caries' ? null : 'caries')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                  filtroTipo === 'caries'
                    ? 'bg-red-600 text-white ring-2 ring-red-500/40 shadow-xs'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20'
                }`}
                title="Filtrar piezas con caries activa"
              >
                <span className="size-2 rounded-full bg-red-500" />
                <span>{conteoCaries} Caries</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroTipo(filtroTipo === 'obturacion' ? null : 'obturacion')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                  filtroTipo === 'obturacion'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-500/40 shadow-xs'
                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                }`}
                title="Filtrar piezas con obturación de resina"
              >
                <span className="size-2 rounded-full bg-blue-500" />
                <span>{conteoObturadas} Obturadas</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroTipo(filtroTipo === 'ausente' ? null : 'ausente')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                  filtroTipo === 'ausente'
                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 ring-2 ring-zinc-500/40 shadow-xs'
                    : 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/30 hover:bg-zinc-500/20'
                }`}
                title="Filtrar piezas ausentes o perdidas"
              >
                <span>✕</span>
                <span>{conteoAusentes} Ausentes</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroTipo(filtroTipo === 'endodoncia' ? null : 'endodoncia')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                  filtroTipo === 'endodoncia'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-500/40 shadow-xs'
                    : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/20'
                }`}
                title="Filtrar piezas con endodoncia"
              >
                <span className="size-2 rounded-full bg-purple-500" />
                <span>{conteoEndodoncias} Endodoncia</span>
              </button>

              {conteoFracturas > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo(filtroTipo === 'fractura' ? null : 'fractura')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                    filtroTipo === 'fractura'
                      ? 'bg-orange-600 text-white ring-2 ring-orange-500/40 shadow-xs'
                      : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20'
                  }`}
                  title="Filtrar piezas con fracturas"
                >
                  <span className="size-2 rounded-full bg-orange-500" />
                  <span>{conteoFracturas} Fracturas</span>
                </button>
              )}

              {conteoCoronas > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo(filtroTipo === 'corona' ? null : 'corona')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                    filtroTipo === 'corona'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-500/40 shadow-xs'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>{conteoCoronas} Coronas</span>
                </button>
              )}

              <Badge variant="outline" className="text-[11px] font-semibold text-teal-800 dark:text-teal-200 border-teal-500/30 bg-teal-500/5">
                {piezasConHallazgos.length} piezas intervenidas
              </Badge>

              {filtroTipo && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
                >
                  Ver todas
                </button>
              )}
            </div>

            {/* Diagnóstico registrado */}
            <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-lg border border-border/60 text-xs">
              <Stethoscope className="size-3.5 text-teal-600 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Diagnóstico:</span>
              <span className="font-semibold text-foreground truncate max-w-[280px]" title={primerOdontograma.diagnostico_principal || ''}>
                {primerOdontograma.diagnostico_principal || 'Diagnóstico Odontológico Registrado'}
              </span>
            </div>
          </div>
        </div>

        {/* ── CUERPO CON SCROLL DEL MODAL ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* LEYENDA CLÍNICA DE COLORES */}
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 py-2 px-3.5 bg-muted/30 rounded-xl border border-border/50 text-[11px]">
            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mr-1">
              Leyenda Clínica:
            </span>
            {HERRAMIENTAS.map((h) => (
              <div key={h.id} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full border border-black/20 shadow-2xs"
                  style={{ backgroundColor: h.colorHex }}
                />
                <span className="font-medium text-muted-foreground text-[11px]">{h.label}</span>
              </div>
            ))}
          </div>

          {/* LIENZO ODONTOGRAMA EMBEBIDO LIMPIO (SIN CABECERA REPETIDA NI DETALLES EXTRA) */}
          <div className="rounded-xl border border-teal-500/25 bg-card overflow-hidden shadow-xs">
            <OdontogramaWidget
              initialData={primerOdontograma.odontograma as OdontogramaData}
              readOnly={true}
              hideHeader={true}
              hideDetails={true}
              denticionOverride={modalDenticion}
            />
          </div>

          {/* ── PANEL INFERIOR: DETALLE DE PIEZA + LISTA ESTRUCTURADA ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Inspector de Pieza Seleccionada */}
            <div className="p-3.5 rounded-xl bg-muted/25 border border-border/60 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <FileText className="size-3.5 text-teal-600" />
                  <span>Detalle de Pieza</span>
                </span>
                {piezaActual && (
                  <Badge className="bg-teal-600 text-white font-mono text-[10px]">
                    #{piezaActual.numero}
                  </Badge>
                )}
              </div>

              {piezaActual ? (
                <div className="space-y-2">
                  <div>
                    <h5 className="font-bold text-foreground text-sm">
                      {piezaActual.nombre || NOMBRES_DIENTES[piezaActual.numero] || `Pieza #${piezaActual.numero}`}
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Condición general:{' '}
                      <span className="font-bold text-teal-700 dark:text-teal-300 capitalize">
                        {piezaActual.condicionGeneral || 'Sano'}
                      </span>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-background border border-border/60 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Estado por caras anatómicas:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                      {Object.entries(piezaActual.caras || {}).map(([cara, val]) => (
                        <div key={cara} className="flex items-center justify-between">
                          <span className="capitalize text-muted-foreground">{cara}:</span>
                          <span
                            className={`font-bold capitalize ${
                              val === 'caries'
                                ? 'text-red-600 dark:text-red-400'
                                : val === 'obturacion'
                                ? 'text-blue-600 dark:text-blue-400'
                                : val === 'sellante'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : val === 'fractura'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-foreground'
                            }`}
                          >
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  <Smile className="size-7 mx-auto text-muted-foreground/30 mb-1.5" />
                  <p className="font-semibold text-xs text-foreground">Haz clic en cualquier pieza dental</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Podrás inspeccionar sus caras patológicas y condición basal
                  </p>
                </div>
              )}
            </div>

            {/* Listado de Piezas Intervenidas y Tratamientos Basales */}
            <div className="lg:col-span-2 p-3.5 rounded-xl bg-muted/25 border border-border/60 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3.5 text-teal-600" />
                  <span>
                    Catálogo de Piezas con Hallazgos en 1ra Consulta
                    {filtroTipo ? ` (Filtrado por ${filtroTipo})` : ''}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  {piezasFiltradas.length} piezas encontradas
                </span>
              </div>

              {piezasFiltradas.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {piezasFiltradas.map((p) => {
                    const carasCaries = Object.entries(p.caras || {})
                      .filter(([, v]) => v === 'caries')
                      .map(([k]) => k);
                    const carasObturadas = Object.entries(p.caras || {})
                      .filter(([, v]) => v === 'obturacion')
                      .map(([k]) => k);
                    const carasFracturadas = Object.entries(p.caras || {})
                      .filter(([, v]) => v === 'fractura')
                      .map(([k]) => k);
                    const carasSellantes = Object.entries(p.caras || {})
                      .filter(([, v]) => v === 'sellante')
                      .map(([k]) => k);

                    const isSelected = piezaSeleccionada === p.numero;

                    return (
                      <div
                        key={p.numero}
                        onClick={() => setPiezaSeleccionada(p.numero)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-teal-500/15 border-teal-500 shadow-2xs'
                            : 'bg-background hover:bg-muted/60 border-border/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono font-bold text-[11px] bg-muted/50">
                            #{p.numero}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {p.nombre || NOMBRES_DIENTES[p.numero] || `Pieza ${p.numero}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
                          {carasCaries.length > 0 && (
                            <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 text-[10px]">
                              Caries: {carasCaries.join(', ')}
                            </Badge>
                          )}
                          {carasObturadas.length > 0 && (
                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px]">
                              Resina: {carasObturadas.join(', ')}
                            </Badge>
                          )}
                          {carasFracturadas.length > 0 && (
                            <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-[10px]">
                              Fractura: {carasFracturadas.join(', ')}
                            </Badge>
                          )}
                          {carasSellantes.length > 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                              Sellante: {carasSellantes.join(', ')}
                            </Badge>
                          )}
                          {p.condicionGeneral && p.condicionGeneral !== 'sano' && (
                            <Badge className="bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 text-[10px] capitalize">
                              {p.condicionGeneral}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <CheckCircle2 className="size-6 mx-auto text-emerald-500 mb-1" />
                  <span>No hay piezas que coincidan con el filtro actual.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PIE DE MODAL FIJO (STICKY FOOTER SIEMPRE VISIBLE) ────────────── */}
        <div className="p-3.5 sm:p-4 bg-muted/40 backdrop-blur-md border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-4 text-teal-600 shrink-0 hidden sm:block" />
            <span className="text-[11.5px] leading-tight">
              Al cargar este odontograma, se clonará el mapa basal en la consulta actual para actualizar tratamientos ejecutados.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs cursor-pointer"
            >
              Cerrar Visor
            </Button>

            {!readOnly && onCargarEnConsultaActual && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onCargarEnConsultaActual();
                  onOpenChange(false);
                }}
                className="h-9 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                <span>Cargar en Consulta Actual</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OdontogramaHistorialModal;
