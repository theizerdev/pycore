import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Smile,
  RotateCcw,
  Sparkles,
  Check,
  AlertTriangle,
  FileText,
  HelpCircle,
  Eye
} from 'lucide-react';

export type CondicionCara = 'sano' | 'caries' | 'obturacion' | 'sellante' | 'fractura';
export type CondicionDiente = 'sano' | 'ausente' | 'corona' | 'endodoncia' | 'implante' | 'extraccion_indicada';

export interface CarasDiente {
  vestibular: CondicionCara;
  lingual: CondicionCara;
  oclusal: CondicionCara;
  mesial: CondicionCara;
  distal: CondicionCara;
}

export interface EstadoPieza {
  numero: number;
  nombre: string;
  condicionGeneral: CondicionDiente;
  caras: CarasDiente;
  notas?: string;
}

export interface OdontogramaData {
  denticion: 'adulto' | 'infantil';
  piezas: Record<number, EstadoPieza>;
}

// Catálogo anatómico de nombres FDI
const NOMBRES_DIENTES: Record<number, string> = {
  // Adultos Cuadrante 1 (Superior Derecho)
  18: 'Tercer Molar Sup. Der.',
  17: 'Segundo Molar Sup. Der.',
  16: 'Primer Molar Sup. Der.',
  15: 'Segundo Premolar Sup. Der.',
  14: 'Primer Premolar Sup. Der.',
  13: 'Canino Sup. Der.',
  12: 'Incisivo Lateral Sup. Der.',
  11: 'Incisivo Central Sup. Der.',
  // Cuadrante 2 (Superior Izquierdo)
  21: 'Incisivo Central Sup. Izq.',
  22: 'Incisivo Lateral Sup. Izq.',
  23: 'Canino Sup. Izq.',
  24: 'Primer Premolar Sup. Izq.',
  25: 'Segundo Premolar Sup. Izq.',
  26: 'Primer Molar Sup. Izq.',
  27: 'Segundo Molar Sup. Izq.',
  28: 'Tercer Molar Sup. Izq.',
  // Cuadrante 4 (Inferior Derecho)
  48: 'Tercer Molar Inf. Der.',
  47: 'Segundo Molar Inf. Der.',
  46: 'Primer Molar Inf. Der.',
  45: 'Segundo Premolar Inf. Der.',
  44: 'Primer Premolar Inf. Der.',
  43: 'Canino Inf. Der.',
  42: 'Incisivo Lateral Inf. Der.',
  41: 'Incisivo Central Inf. Der.',
  // Cuadrante 3 (Inferior Izquierdo)
  31: 'Incisivo Central Inf. Izq.',
  32: 'Incisivo Lateral Inf. Izq.',
  33: 'Canino Inf. Izq.',
  34: 'Primer Premolar Inf. Izq.',
  35: 'Segundo Premolar Inf. Izq.',
  36: 'Primer Molar Inf. Izq.',
  37: 'Segundo Molar Inf. Izq.',
  38: 'Tercer Molar Inf. Izq.',
  // Pediátrico Cuadrante 5
  55: '2do Molar Temporal Sup. Der.',
  54: '1er Molar Temporal Sup. Der.',
  53: 'Canino Temporal Sup. Der.',
  52: 'Inc. Lateral Temporal Sup. Der.',
  51: 'Inc. Central Temporal Sup. Der.',
  // Cuadrante 6
  61: 'Inc. Central Temporal Sup. Izq.',
  62: 'Inc. Lateral Temporal Sup. Izq.',
  63: 'Canino Temporal Sup. Izq.',
  64: '1er Molar Temporal Sup. Izq.',
  65: '2do Molar Temporal Sup. Izq.',
  // Cuadrante 8
  85: '2do Molar Temporal Inf. Der.',
  84: '1er Molar Temporal Inf. Der.',
  83: 'Canino Temporal Inf. Der.',
  82: 'Inc. Lateral Temporal Inf. Der.',
  81: 'Inc. Central Temporal Inf. Der.',
  // Cuadrante 7
  71: 'Inc. Central Temporal Inf. Izq.',
  72: 'Inc. Lateral Temporal Inf. Izq.',
  73: 'Canino Temporal Inf. Izq.',
  74: '1er Molar Temporal Inf. Izq.',
  75: '2do Molar Temporal Inf. Izq.',
};

// Herramientas de diagnóstico con sus colores clínicos internacionales
interface HerramientaConfig {
  id: string;
  label: string;
  tipo: 'cara' | 'general';
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  descripcion: string;
  icono?: string;
}

const HERRAMIENTAS: HerramientaConfig[] = [
  {
    id: 'sano',
    label: 'Sano / Limpiar',
    tipo: 'cara',
    colorHex: '#ffffff',
    badgeBg: 'bg-muted/50 border-border text-foreground',
    badgeText: 'Neutro',
    descripcion: 'Limpia caras o restablece diente sano',
  },
  {
    id: 'caries',
    label: 'Caries Activa',
    tipo: 'cara',
    colorHex: '#ef4444',
    badgeBg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    badgeText: 'Rojo',
    descripcion: 'Patología cariosa / Requiere restauración',
  },
  {
    id: 'obturacion',
    label: 'Obturación (Resina)',
    tipo: 'cara',
    colorHex: '#3b82f6',
    badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    badgeText: 'Azul',
    descripcion: 'Tratamiento restaurador existente',
  },
  {
    id: 'sellante',
    label: 'Sellante Fosas',
    tipo: 'cara',
    colorHex: '#10b981',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    badgeText: 'Verde',
    descripcion: 'Sellado preventivo en surcos',
  },
  {
    id: 'fractura',
    label: 'Fractura Dental',
    tipo: 'cara',
    colorHex: '#ea580c',
    badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
    badgeText: 'Naranja',
    descripcion: 'Pérdida traumática de tejido dental',
  },
  {
    id: 'corona',
    label: 'Corona / Prótesis',
    tipo: 'general',
    colorHex: '#f59e0b',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    badgeText: 'Dorado',
    descripcion: 'Funda protésica o muñón',
  },
  {
    id: 'endodoncia',
    label: 'Endodoncia (Conducto)',
    tipo: 'general',
    colorHex: '#8b5cf6',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
    badgeText: 'Morado',
    descripcion: 'Tratamiento pulpar / Conductos obturados',
  },
  {
    id: 'implante',
    label: 'Implante Dental',
    tipo: 'general',
    colorHex: '#06b6d4',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    badgeText: 'Cyan',
    descripcion: 'Fijación de titanio osteointegrada',
  },
  {
    id: 'ausente',
    label: 'Ausente / Perdido',
    tipo: 'general',
    colorHex: '#1f2937',
    badgeBg: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-700 dark:text-zinc-300',
    badgeText: 'Negro ✕',
    descripcion: 'Diente no presente en arcada',
  },
  {
    id: 'extraccion_indicada',
    label: 'Extracción Indicada',
    tipo: 'general',
    colorHex: '#dc2626',
    badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
    badgeText: 'Rojo ✕',
    descripcion: 'Pieza no conservable / Exodoncia requerida',
  }
];

interface OdontogramaWidgetProps {
  initialData?: OdontogramaData;
  onChange?: (data: OdontogramaData) => void;
  readOnly?: boolean;
}

export const OdontogramaWidget: React.FC<OdontogramaWidgetProps> = ({
  initialData,
  onChange,
  readOnly = false,
}) => {
  const [denticion, setDenticion] = useState<'adulto' | 'infantil'>(
    initialData?.denticion || 'adulto'
  );
  const [herramientaActiva, setHerramientaActiva] = useState<string>('caries');
  const [piezas, setPiezas] = useState<Record<number, EstadoPieza>>(
    initialData?.piezas || {}
  );
  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number | null>(null);

  // Helper para obtener o inicializar estado de una pieza
  const getPiezaEstado = (num: number): EstadoPieza => {
    if (piezas[num]) return piezas[num];
    return {
      numero: num,
      nombre: NOMBRES_DIENTES[num] || `Pieza ${num}`,
      condicionGeneral: 'sano',
      caras: {
        vestibular: 'sano',
        lingual: 'sano',
        oclusal: 'sano',
        mesial: 'sano',
        distal: 'sano',
      },
    };
  };

  const updatePieza = (num: number, updater: (prev: EstadoPieza) => EstadoPieza) => {
    if (readOnly) return;
    const current = getPiezaEstado(num);
    const updated = updater(current);
    const nextPiezas = { ...piezas, [num]: updated };
    setPiezas(nextPiezas);
    onChange?.({ denticion, piezas: nextPiezas });
  };

  // Clic en una cara anatómica
  const handleCaraClick = (num: number, cara: keyof CarasDiente, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;

    const tool = HERRAMIENTAS.find((h) => h.id === herramientaActiva);
    if (!tool) return;

    if (tool.tipo === 'general') {
      // Si seleccionó una herramienta general (Corona, Ausente, Endodoncia), aplicarla a todo el diente
      handleGeneralClick(num, tool.id as CondicionDiente);
      return;
    }

    const nuevaCondicion = (tool.id === 'sano' ? 'sano' : tool.id) as CondicionCara;
    updatePieza(num, (prev) => ({
      ...prev,
      // Si tenía condición general como ausente, al pintar una cara vuelve a sano general
      condicionGeneral: prev.condicionGeneral === 'ausente' ? 'sano' : prev.condicionGeneral,
      caras: {
        ...prev.caras,
        [cara]: prev.caras[cara] === nuevaCondicion ? 'sano' : nuevaCondicion,
      },
    }));
    setPiezaSeleccionada(num);
  };

  // Clic en la condición general del diente
  const handleGeneralClick = (num: number, condicion: CondicionDiente) => {
    if (readOnly) return;
    updatePieza(num, (prev) => {
      const nextCond = prev.condicionGeneral === condicion ? 'sano' : condicion;
      return {
        ...prev,
        condicionGeneral: nextCond,
      };
    });
    setPiezaSeleccionada(num);
  };

  const resetOdontograma = () => {
    if (readOnly) return;
    setPiezas({});
    onChange?.({ denticion, piezas: {} });
    setPiezaSeleccionada(null);
  };

  const getColorCara = (cond: CondicionCara): string => {
    switch (cond) {
      case 'caries':
        return '#ef4444';
      case 'obturacion':
        return '#3b82f6';
      case 'sellante':
        return '#10b981';
      case 'fractura':
        return '#ea580c';
      default:
        return 'var(--card, #ffffff)';
    }
  };

  // Renderizador SVG de cada pieza dental con sus 5 caras anatómicas
  const renderDienteSVG = (num: number, esSuperior: boolean) => {
    const estado = getPiezaEstado(num);
    const { caras, condicionGeneral } = estado;

    // Colores de caras
    const colVestibular = getColorCara(caras.vestibular);
    const colLingual = getColorCara(caras.lingual);
    const colOclusal = getColorCara(caras.oclusal);
    const colMesial = getColorCara(caras.mesial);
    const colDistal = getColorCara(caras.distal);

    const isSelected = piezaSeleccionada === num;

    return (
      <TooltipProvider key={num}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={() => setPiezaSeleccionada(num)}
              className={`flex flex-col items-center p-1 rounded-lg transition-all duration-200 cursor-pointer select-none group
                ${isSelected ? 'bg-teal-500/15 ring-2 ring-teal-500 shadow-xs' : 'hover:bg-muted/40'}
                ${condicionGeneral === 'ausente' ? 'opacity-40' : 'opacity-100'}
              `}
            >
              {/* Etiqueta superior del número de pieza */}
              {esSuperior && (
                <span className="text-[11px] font-black tracking-tight mb-1 text-muted-foreground group-hover:text-primary transition-colors">
                  {num}
                </span>
              )}

              {/* Contenedor SVG anatómico de 5 caras */}
              <div className="relative size-10 sm:size-11">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full drop-shadow-xs overflow-visible"
                >
                  {/* Cara Superior: Vestibular en superiores, Lingual en inferiores */}
                  <polygon
                    points="0,0 100,0 75,25 25,25"
                    fill={esSuperior ? colVestibular : colLingual}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="stroke-border/80 hover:stroke-primary hover:brightness-95 transition-all cursor-pointer"
                    onClick={(e) =>
                      handleCaraClick(num, esSuperior ? 'vestibular' : 'lingual', e)
                    }
                  />

                  {/* Cara Inferior: Palatino/Lingual en superiores, Vestibular en inferiores */}
                  <polygon
                    points="25,75 75,75 100,100 0,100"
                    fill={esSuperior ? colLingual : colVestibular}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="stroke-border/80 hover:stroke-primary hover:brightness-95 transition-all cursor-pointer"
                    onClick={(e) =>
                      handleCaraClick(num, esSuperior ? 'lingual' : 'vestibular', e)
                    }
                  />

                  {/* Cara Izquierda: Mesial o Distal según cuadrante */}
                  <polygon
                    points="0,0 25,25 25,75 0,100"
                    fill={colMesial}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="stroke-border/80 hover:stroke-primary hover:brightness-95 transition-all cursor-pointer"
                    onClick={(e) => handleCaraClick(num, 'mesial', e)}
                  />

                  {/* Cara Derecha */}
                  <polygon
                    points="75,25 100,0 100,100 75,75"
                    fill={colDistal}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="stroke-border/80 hover:stroke-primary hover:brightness-95 transition-all cursor-pointer"
                    onClick={(e) => handleCaraClick(num, 'distal', e)}
                  />

                  {/* Cara Central: Oclusal / Incisal */}
                  <rect
                    x="25"
                    y="25"
                    width="50"
                    height="50"
                    fill={colOclusal}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="stroke-border/80 hover:stroke-primary hover:brightness-95 transition-all cursor-pointer"
                    onClick={(e) => handleCaraClick(num, 'oclusal', e)}
                  />

                  {/* OVERLAYS DE CONDICIONES GENERALES */}
                  {condicionGeneral === 'ausente' && (
                    <g className="stroke-zinc-800 dark:stroke-zinc-200" strokeWidth="6" strokeLinecap="round">
                      <line x1="10" y1="10" x2="90" y2="90" />
                      <line x1="90" y1="10" x2="10" y2="90" />
                    </g>
                  )}

                  {condicionGeneral === 'extraccion_indicada' && (
                    <g className="stroke-rose-600" strokeWidth="7" strokeLinecap="round">
                      <line x1="10" y1="10" x2="90" y2="90" />
                      <line x1="90" y1="10" x2="10" y2="90" />
                    </g>
                  )}

                  {condicionGeneral === 'corona' && (
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="5"
                      strokeDasharray="4 2"
                    />
                  )}

                  {condicionGeneral === 'endodoncia' && (
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="100"
                      stroke="#8b5cf6"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  )}

                  {condicionGeneral === 'implante' && (
                    <g className="stroke-cyan-500 fill-cyan-500">
                      <circle cx="50" cy="50" r="16" />
                      <line x1="50" y1="20" x2="50" y2="80" stroke="#0891b2" strokeWidth="4" />
                    </g>
                  )}
                </svg>
              </div>

              {/* Etiqueta inferior del número de pieza */}
              {!esSuperior && (
                <span className="text-[11px] font-black tracking-tight mt-1 text-muted-foreground group-hover:text-primary transition-colors">
                  {num}
                </span>
              )}

              {/* Mini indicador de estado general */}
              {condicionGeneral !== 'sano' && (
                <div className="mt-0.5">
                  <span
                    className={`inline-block size-1.5 rounded-full ${
                      condicionGeneral === 'ausente'
                        ? 'bg-zinc-600'
                        : condicionGeneral === 'corona'
                        ? 'bg-amber-500'
                        : condicionGeneral === 'endodoncia'
                        ? 'bg-purple-500'
                        : condicionGeneral === 'implante'
                        ? 'bg-cyan-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side={esSuperior ? 'top' : 'bottom'} className="text-xs p-2 max-w-xs">
            <p className="font-bold text-foreground">
              Pieza {num} - {NOMBRES_DIENTES[num] || 'Diente'}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Estado: <span className="capitalize font-semibold text-primary">{condicionGeneral}</span>
            </p>
            <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
              {Object.entries(caras).map(
                ([c, val]) =>
                  val !== 'sano' && (
                    <span key={c} className="bg-muted px-1.5 py-0.5 rounded capitalize">
                      {c}: <b className={val === 'caries' ? 'text-red-500' : 'text-blue-500'}>{val}</b>
                    </span>
                  )
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Cuadrantes para Dentición Adulto (FDI)
  const arcadaSuperiorAdultoDer = [18, 17, 16, 15, 14, 13, 12, 11];
  const arcadaSuperiorAdultoIzq = [21, 22, 23, 24, 25, 26, 27, 28];
  const arcadaInferiorAdultoDer = [48, 47, 46, 45, 44, 43, 42, 41];
  const arcadaInferiorAdultoIzq = [31, 32, 33, 34, 35, 36, 37, 38];

  // Cuadrantes para Dentición Infantil (FDI)
  const arcadaSuperiorPedDer = [55, 54, 53, 52, 51];
  const arcadaSuperiorPedIzq = [61, 62, 63, 64, 65];
  const arcadaInferiorPedDer = [85, 84, 83, 82, 81];
  const arcadaInferiorPedIzq = [71, 72, 73, 74, 75];

  // Cálculos de Resumen / Diagnósticos hallados
  const hallazgos = Object.values(piezas).filter((p) => {
    const tieneCaras = Object.values(p.caras).some((c) => c !== 'sano');
    return tieneCaras || p.condicionGeneral !== 'sano';
  });

  const conteoCaries = Object.values(piezas).reduce((acc, p) => {
    return acc + Object.values(p.caras).filter((c) => c === 'caries').length;
  }, 0);

  const conteoObturadas = Object.values(piezas).reduce((acc, p) => {
    return acc + Object.values(p.caras).filter((c) => c === 'obturacion').length;
  }, 0);

  const conteoAusentes = Object.values(piezas).filter((p) => p.condicionGeneral === 'ausente').length;
  const conteoEndodoncias = Object.values(piezas).filter((p) => p.condicionGeneral === 'endodoncia').length;
  const conteoCoronas = Object.values(piezas).filter((p) => p.condicionGeneral === 'corona').length;

  const piezaActual = piezaSeleccionada ? getPiezaEstado(piezaSeleccionada) : null;

  return (
    <Card className="border-teal-500/30 bg-card shadow-sm overflow-hidden">
      <CardHeader className="p-4 bg-teal-500/5 border-b border-teal-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Smile className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Odontograma Clínico Interactivo</span>
                <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 bg-teal-500/10">
                  FDI Internacional
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cartografía dental de 5 caras: Oclusal/Incisal, Vestibular, Lingual/Palatino, Mesial y Distal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Tabs
              value={denticion}
              onValueChange={(val: string) => setDenticion(val as 'adulto' | 'infantil')}
              className="h-8"
            >
              <TabsList className="h-8 p-0.5 bg-muted/60">
                <TabsTrigger value="adulto" className="text-xs px-2.5 h-7 cursor-pointer">
                  Adultos (32)
                </TabsTrigger>
                <TabsTrigger value="infantil" className="text-xs px-2.5 h-7 cursor-pointer">
                  Pediátrico (20)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetOdontograma}
                className="h-8 text-xs text-muted-foreground hover:text-rose-600 cursor-pointer"
                title="Restablecer odontograma completo"
              >
                <RotateCcw className="size-3.5 mr-1" />
                <span>Limpiar</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── BARRA DE HERRAMIENTAS CLÍNICAS (PALETA) ──────────────── */}
        {!readOnly && (
          <div className="mt-3 pt-3 border-t border-teal-500/15 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Herramienta:
            </span>
            {HERRAMIENTAS.map((h) => {
              const isActive = herramientaActiva === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHerramientaActiva(h.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary shadow-xs'
                      : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span
                    className="size-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: h.colorHex }}
                  />
                  <span>{h.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* ── LIENZO DEL ODONTOGRAMA (ARCADA SUPERIOR E INFERIOR) ──── */}
        <div className="p-4 bg-muted/20 rounded-xl border border-border/60 flex flex-col items-center justify-center overflow-x-auto min-w-[320px]">
          {/* LEYENDA ANATÓMICA DE ORIENTACIÓN */}
          <div className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-3 px-2">
            <span className="flex items-center gap-1 text-teal-700 dark:text-teal-300">
              <Eye className="size-3.5" /> DERECHA DEL PACIENTE
            </span>
            <Badge variant="secondary" className="text-[10px] font-semibold">
              ARCADA SUPERIOR (MAXILAR)
            </Badge>
            <span className="text-teal-700 dark:text-teal-300">IZQUIERDA DEL PACIENTE</span>
          </div>

          {/* ARCADA SUPERIOR */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 pb-3 border-b-2 border-dashed border-teal-500/30 w-full">
            {/* Cuadrante 1 / 5 (Derecho) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
              {(denticion === 'adulto' ? arcadaSuperiorAdultoDer : arcadaSuperiorPedDer).map(
                (num) => renderDienteSVG(num, true)
              )}
            </div>

            {/* Separador Línea Media Dental Superior */}
            <div className="h-16 w-0.5 bg-teal-500/50 mx-1 flex flex-col justify-center items-center">
              <span className="text-[9px] font-black text-teal-600 bg-card px-0.5 rounded shadow-xs">
                M
              </span>
            </div>

            {/* Cuadrante 2 / 6 (Izquierdo) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-start">
              {(denticion === 'adulto' ? arcadaSuperiorAdultoIzq : arcadaSuperiorPedIzq).map(
                (num) => renderDienteSVG(num, true)
              )}
            </div>
          </div>

          {/* ARCADA INFERIOR */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 pt-3 w-full">
            {/* Cuadrante 4 / 8 (Derecho) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
              {(denticion === 'adulto' ? arcadaInferiorAdultoDer : arcadaInferiorPedDer).map(
                (num) => renderDienteSVG(num, false)
              )}
            </div>

            {/* Separador Línea Media Dental Inferior */}
            <div className="h-16 w-0.5 bg-teal-500/50 mx-1 flex flex-col justify-center items-center">
              <span className="text-[9px] font-black text-teal-600 bg-card px-0.5 rounded shadow-xs">
                M
              </span>
            </div>

            {/* Cuadrante 3 / 7 (Izquierdo) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-start">
              {(denticion === 'adulto' ? arcadaInferiorAdultoIzq : arcadaInferiorPedIzq).map(
                (num) => renderDienteSVG(num, false)
              )}
            </div>
          </div>

          <div className="w-full flex items-center justify-center text-[11px] font-bold text-muted-foreground mt-3">
            <Badge variant="secondary" className="text-[10px] font-semibold">
              ARCADA INFERIOR (MANDIBULAR)
            </Badge>
          </div>
        </div>

        {/* ── PANEL INFERIOR: DETALLE DE PIEZA SELECCIONADA Y RESUMEN ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel de Pieza Seleccionada */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-3 bg-muted/30 border-b border-border/40">
              <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-teal-500" />
                  <span>Detalle de Pieza Dental</span>
                </span>
                {piezaActual && (
                  <Badge className="bg-teal-600 text-white font-mono text-[10px]">
                    Pieza #{piezaActual.numero}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-3">
              {piezaActual ? (
                <>
                  <div>
                    <h5 className="font-bold text-foreground text-sm">
                      {piezaActual.nombre}
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Condición general:{' '}
                      <span className="font-semibold text-primary capitalize">
                        {piezaActual.condicionGeneral}
                      </span>
                    </p>
                  </div>

                  {/* Diagnósticos por Caras */}
                  <div className="space-y-1 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Estado por caras anatómicas:
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                      {Object.entries(piezaActual.caras).map(([cara, val]) => (
                        <div key={cara} className="flex items-center justify-between">
                          <span className="capitalize text-muted-foreground">{cara}:</span>
                          <span
                            className={`font-semibold capitalize ${
                              val === 'caries'
                                ? 'text-red-500'
                                : val === 'obturacion'
                                ? 'text-blue-500'
                                : val === 'sellante'
                                ? 'text-emerald-500'
                                : val === 'fractura'
                                ? 'text-orange-500'
                                : 'text-foreground'
                            }`}
                          >
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Acciones rápidas para la pieza */}
                  {!readOnly && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneralClick(piezaActual.numero, 'endodoncia')}
                        className={`h-7 text-[11px] cursor-pointer ${
                          piezaActual.condicionGeneral === 'endodoncia'
                            ? 'bg-purple-500/10 border-purple-500 text-purple-600'
                            : ''
                        }`}
                      >
                        Endodoncia
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneralClick(piezaActual.numero, 'corona')}
                        className={`h-7 text-[11px] cursor-pointer ${
                          piezaActual.condicionGeneral === 'corona'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                            : ''
                        }`}
                      >
                        Corona
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneralClick(piezaActual.numero, 'implante')}
                        className={`h-7 text-[11px] cursor-pointer ${
                          piezaActual.condicionGeneral === 'implante'
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600'
                            : ''
                        }`}
                      >
                        Implante
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneralClick(piezaActual.numero, 'ausente')}
                        className={`h-7 text-[11px] cursor-pointer ${
                          piezaActual.condicionGeneral === 'ausente'
                            ? 'bg-zinc-500/10 border-zinc-500 text-zinc-700'
                            : ''
                        }`}
                      >
                        Ausente
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <HelpCircle className="size-8 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="font-medium text-xs">Selecciona un diente</p>
                  <p className="text-[11px] mt-0.5 text-muted-foreground/70">
                    Haz clic sobre cualquier cara para pintar o ver su estado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de Resumen Diagnóstico y Hallazgos */}
          <Card className="border-border/60 bg-card/60 lg:col-span-2">
            <CardHeader className="p-3 bg-muted/30 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-teal-500" />
                  <span>Resumen de Hallazgos y Plan Presupuestario</span>
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  {hallazgos.length} piezas intervenidas
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Badges contadores tipo KPI */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-xs text-red-600 dark:text-red-400 font-semibold block">
                    Caries
                  </span>
                  <span className="text-base font-black text-red-700 dark:text-red-300">
                    {conteoCaries}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block">
                    Obturadas
                  </span>
                  <span className="text-base font-black text-blue-700 dark:text-blue-300">
                    {conteoObturadas}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-center">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold block">
                    Ausentes
                  </span>
                  <span className="text-base font-black text-zinc-700 dark:text-zinc-300">
                    {conteoAusentes}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block">
                    Endodoncia
                  </span>
                  <span className="text-base font-black text-purple-700 dark:text-purple-300">
                    {conteoEndodoncias}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold block">
                    Coronas
                  </span>
                  <span className="text-base font-black text-amber-700 dark:text-amber-300">
                    {conteoCoronas}
                  </span>
                </div>
              </div>

              {/* Lista de tratamientos sugeridos por pieza */}
              {hallazgos.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {hallazgos.map((p) => {
                    const carasCaries = Object.entries(p.caras)
                      .filter(([, v]) => v === 'caries')
                      .map(([k]) => k);
                    const carasObturadas = Object.entries(p.caras)
                      .filter(([, v]) => v === 'obturacion')
                      .map(([k]) => k);

                    return (
                      <div
                        key={p.numero}
                        onClick={() => setPiezaSeleccionada(p.numero)}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/70 text-xs transition-colors cursor-pointer border border-border/40"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono font-bold">
                            #{p.numero}
                          </Badge>
                          <span className="font-medium text-foreground">{p.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          {carasCaries.length > 0 && (
                            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">
                              Caries en: {carasCaries.join(', ')}
                            </Badge>
                          )}
                          {carasObturadas.length > 0 && (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
                              Resina en: {carasObturadas.join(', ')}
                            </Badge>
                          )}
                          {p.condicionGeneral !== 'sano' && (
                            <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px] capitalize">
                              {p.condicionGeneral}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  <Check className="size-5 mx-auto text-emerald-500 mb-1" />
                  <span>Dentición sin anomalías registradas en este examen.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default OdontogramaWidget;
