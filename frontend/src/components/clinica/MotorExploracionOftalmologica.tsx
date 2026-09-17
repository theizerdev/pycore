import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// TIPOS DE DATOS DEL MOTOR OFTALMOLÓGICO A.12
// ==========================================

export type VisualizacionTipo = 'conc' | 'lim' | 'nula';
export type ExploracionTipo = 'si' | 'no';
export type OjoTipo = 'OD' | 'OI' | 'AO';

export interface HallazgoOftalmico {
  id?: string;
  r: string; // ID de región
  o: 'OD' | 'OI';
  h: string; // Nombre del hallazgo
  nota?: string; // Nota / Detalle específico del hallazgo
}

export interface EstadoOjoRegion {
  e: ExploracionTipo;
  v: VisualizacionTipo;
  m: string; // Motivo cuando v !== 'conc'
  c: string; // Causa de opacidad de medios
}

export interface RegionState {
  link: boolean;
  OD: EstadoOjoRegion;
  OI: EstadoOjoRegion;
  nota?: string; // NOTA ESPECÍFICA DE LA REGIÓN
}

export interface ModuloCoreState {
  expl: ExploracionTipo;
  vis: 'completa' | 'parcial';
  regs: Record<string, RegionState>;
}

export interface ModuloOpcionalState {
  expl: ExploracionTipo;
  met: string;
  link: boolean;
  OD: EstadoOjoRegion;
  OI: EstadoOjoRegion;
  nota?: string; // Nota de la región opcional
}

export interface ExploracionOftalmologicaData {
  mod: Record<string, ModuloCoreState>;
  opc: Record<string, ModuloOpcionalState>;
  hall: HallazgoOftalmico[];
  notas_regiones?: Record<string, string>; // Mapa auxiliar de notas por región
  nota_redactada?: string;
}

interface MotorExploracionOftalmologicaProps {
  initialData?: ExploracionOftalmologicaData;
  onChange?: (data: ExploracionOftalmologicaData) => void;
  onInsertarEnEvaluacion?: (textoNarrativa: string) => void;
  readOnly?: boolean;
}

// ==========================================
// CATÁLOGO OFICIAL PUPILA INC. ANEXO A.12 v1.7
// ==========================================

interface RegDef {
  id: string;
  n: string; // Nombre
  bil: string; // Redacción bilateral normal
  uni: string; // Redacción unilateral normal con {L}
  h: string[]; // Lista de hallazgos posibles
}

interface ModDef {
  id: string;
  n: string;
  sub: string;
  regs: RegDef[];
}

interface OpcDef {
  id: string;
  n: string;
  sub: string;
  met: Array<[string, string, string, string]>; // [id, nombre, bil, uni]
  h: string[];
}

const MOTIVOS = [
  'opacidad de medios',
  'midriasis insuficiente',
  'falta de cooperación del paciente',
  'dolor y blefaroespasmo',
  'condición que contraindica la maniobra',
  'otro',
];

const CAUSAS = [
  'hipema',
  'hipopión',
  'edema corneal',
  'leucoma',
  'queratopatía en banda',
  'catarata densa',
  'opacidad de cápsula posterior',
  'fibrina en área pupilar',
  'seclusión pupilar',
  'hemorragia vítrea',
  'membrana ciclítica',
  'otra causa',
];

const MODULOS_CORE: ModDef[] = [
  {
    id: 'ant',
    n: 'Segmento anterior y anexos',
    sub: 'Núcleo · 11 regiones',
    regs: [
      {
        id: 'orbita',
        n: 'Órbita y anexos',
        bil: 'Órbitas simétricas en ambos lados, sin proptosis ni enoftalmos, con retropulsión libre y reborde orbitario íntegro',
        uni: 'Órbita del lado {L} sin proptosis ni enoftalmos, con retropulsión libre y reborde orbitario íntegro',
        h: ['proptosis', 'enoftalmos', 'masa orbitaria', 'enfisema subcutáneo'],
      },
      {
        id: 'parpados',
        n: 'Párpados',
        bil: 'Párpados de ambos ojos con posición, hendidura y cierre palpebral conservados, sin lesiones en el borde libre ni alteración de las pestañas',
        uni: 'Párpados del ojo {L} con posición, hendidura y cierre palpebral conservados, sin lesiones en el borde libre ni alteración de las pestañas',
        h: ['chalazión', 'orzuelo', 'ptosis', 'blefaritis', 'ectropión', 'entropión', 'triquiasis', 'laceración palpebral'],
      },
      {
        id: 'lagrimal',
        n: 'Aparato lagrimal',
        bil: 'Puntos lagrimales permeables y bien posicionados en ambos ojos, sin epífora ni reflujo a la presión sobre el saco lagrimal',
        uni: 'Punto lagrimal del ojo {L} permeable y bien posicionado, sin epífora ni reflujo a la presión sobre el saco lagrimal',
        h: ['epífora', 'reflujo mucopurulento', 'dacriocistitis', 'obstrucción de vía lagrimal', 'punto lagrimal estenótico'],
      },
      {
        id: 'pelicula',
        n: 'Película lagrimal',
        bil: 'Película lagrimal de ambos ojos íntegra, con menisco lagrimal de altura conservada',
        uni: 'Película lagrimal del ojo {L} íntegra, con menisco lagrimal de altura conservada',
        h: ['menisco disminuido', 'detritus en película', 'ruptura precoz', 'exceso de mucina'],
      },
      {
        id: 'conjuntiva',
        n: 'Conjuntiva',
        bil: 'Conjuntiva bulbar y tarsal de ambos ojos de coloración normal, sin hiperemia, papilas, folículos ni secreción',
        uni: 'Conjuntiva bulbar y tarsal del ojo {L} de coloración normal, sin hiperemia, papilas, folículos ni secreción',
        h: ['hiperemia', 'papilas', 'folículos', 'quemosis', 'hemorragia subconjuntival', 'pinguécula', 'pterigión', 'secreción purulenta', 'laceración conjuntival'],
      },
      {
        id: 'esclera',
        n: 'Esclera',
        bil: 'Esclera de ambos ojos de coloración e integridad normales, sin adelgazamiento ni datos de inflamación',
        uni: 'Esclera del ojo {L} de coloración e integridad normales, sin adelgazamiento ni datos de inflamación',
        h: ['epiescleritis', 'escleritis', 'adelgazamiento escleral', 'ictericia escleral', 'estafiloma'],
      },
      {
        id: 'cornea',
        n: 'Córnea',
        bil: 'Córnea de ambos ojos transparente, de superficie regular y espesor conservado, sin tinción con fluoresceína',
        uni: 'Córnea del ojo {L} transparente, de superficie regular y espesor conservado, sin tinción con fluoresceína',
        h: ['edema corneal', 'infiltrado estromal', 'úlcera corneal', 'leucoma', 'queratopatía en banda', 'distrofia endotelial', 'precipitados queráticos', 'erosión epitelial', 'cuerpo extraño corneal', 'adelgazamiento', 'neovascularización', 'queratocono'],
      },
      {
        id: 'camara',
        n: 'Cámara anterior',
        bil: 'Cámara anterior de ambos ojos formada, de profundidad normal, sin células ni flare',
        uni: 'Cámara anterior del ojo {L} formada, de profundidad normal, sin células ni flare',
        h: ['células 1+', 'células 2+', 'células 3+', 'flare', 'hipopión', 'hipema', 'fibrina', 'cámara estrecha', 'cámara plana', 'cuerpo extraño'],
      },
      {
        id: 'iris',
        n: 'Iris',
        bil: 'Iris de ambos ojos de arquitectura y coloración conservadas, sin defectos de transiluminación ni sinequias',
        uni: 'Iris del ojo {L} de arquitectura y coloración conservadas, sin defectos de transiluminación ni sinequias',
        h: ['sinequias posteriores', 'sinequias anteriores', 'rubeosis iridis', 'atrofia sectorial', 'defectos de transiluminación', 'nódulos de Koeppe', 'iridodiálisis', 'iridotomía previa', 'coloboma'],
      },
      {
        id: 'pupila',
        n: 'Pupila',
        bil: 'Pupilas de ambos ojos centrales, redondas, isocóricas y reactivas a la luz, sin defecto pupilar aferente relativo',
        uni: 'Pupila del ojo {L} central, redonda y reactiva a la luz, sin defecto pupilar aferente relativo',
        h: ['midriasis arreactiva', 'miosis', 'anisocoria', 'discoria', 'defecto pupilar aferente relativo', 'seclusión pupilar', 'pupila peaked'],
      },
      {
        id: 'cristalino',
        n: 'Cristalino',
        bil: 'Cristalino de ambos ojos transparente y en posición central',
        uni: 'Cristalino del ojo {L} transparente y en posición central',
        h: ['catarata nuclear', 'catarata cortical', 'catarata subcapsular posterior', 'catarata densa', 'catarata blanca', 'pseudofaquia', 'afaquia', 'facodonesis', 'subluxación', 'opacidad de cápsula posterior'],
      },
    ],
  },
  {
    id: 'mot',
    n: 'Posición, motilidad y presión',
    sub: 'Núcleo · 3 regiones',
    regs: [
      {
        id: 'posicion',
        n: 'Posición de los ojos',
        bil: 'Posición de los ojos en ortotropia en posición primaria de la mirada, sin desviación manifiesta ni latente al cover test',
        uni: '',
        h: ['endotropia', 'exotropia', 'hipertropia', 'hipotropia', 'endoforia', 'exoforia', 'desviación vertical disociada'],
      },
      {
        id: 'motilidad',
        n: 'Motilidad ocular',
        bil: 'Movimientos oculares completos y simétricos en las nueve posiciones diagnósticas de la mirada, sin limitación ni dolor',
        uni: 'Movimientos oculares del ojo {L} completos en las nueve posiciones diagnósticas de la mirada, sin limitación ni dolor',
        h: ['limitación de abducción', 'limitación de aducción', 'limitación de elevación', 'limitación de depresión', 'hiperfunción de oblicuo inferior', 'dolor a la versión', 'nistagmo'],
      },
      {
        id: 'tono',
        n: 'Tonometría',
        bil: 'Presión intraocular dentro de parámetros normales en ambos ojos',
        uni: 'Presión intraocular del ojo {L} dentro de parámetros normales',
        h: ['presión elevada', 'presión baja', 'asimetría entre ojos'],
      },
    ],
  },
  {
    id: 'post',
    n: 'Segmento posterior — polo posterior',
    sub: 'Núcleo · 5 regiones',
    regs: [
      {
        id: 'vitreo',
        n: 'Vítreo',
        bil: 'Vítreo de ambos ojos transparente, sin células, hemorragia ni desprendimiento posterior',
        uni: 'Vítreo del ojo {L} transparente, sin células, hemorragia ni desprendimiento posterior',
        h: ['células en vítreo', 'hemorragia vítrea', 'desprendimiento posterior de vítreo', 'sínquisis', 'tracción vitreomacular', 'membrana ciclítica'],
      },
      {
        id: 'papila',
        n: 'Papila',
        bil: 'Papila de ambos ojos de bordes definidos, buena coloración y anillo neurorretiniano conservado, con excavación fisiológica y emergencia vascular central',
        uni: 'Papila del ojo {L} de bordes definidos, buena coloración y anillo neurorretiniano conservado, con excavación fisiológica y emergencia vascular central',
        h: ['excavación aumentada', 'papiledema', 'palidez papilar', 'borramiento de bordes', 'hemorragia en astilla', 'muesca del anillo', 'drusas de papila', 'atrofia óptica'],
      },
      {
        id: 'macula',
        n: 'Mácula',
        bil: 'Mácula de ambos ojos de aspecto normal, con reflejo foveolar presente, sin edema, exudados ni alteración pigmentaria',
        uni: 'Mácula del ojo {L} de aspecto normal, con reflejo foveolar presente, sin edema, exudados ni alteración pigmentaria',
        h: ['edema macular', 'drusas', 'alteración pigmentaria', 'membrana epirretiniana', 'agujero macular', 'exudados duros', 'hemorragia macular', 'atrofia geográfica', 'neovascularización coroidea'],
      },
      {
        id: 'vasos',
        n: 'Vasos retinianos',
        bil: 'Vasos retinianos de ambos ojos de calibre, trayecto y relación arteriovenosa normales, sin cruces patológicos ni envainamiento',
        uni: 'Vasos retinianos del ojo {L} de calibre, trayecto y relación arteriovenosa normales, sin cruces patológicos ni envainamiento',
        h: ['cruces arteriovenosos patológicos', 'envainamiento vascular', 'estrechamiento arteriolar', 'tortuosidad', 'oclusión de rama venosa', 'oclusión de arteria central', 'neovascularización'],
      },
      {
        id: 'retinapost',
        n: 'Retina posterior',
        bil: 'Retina posterior de ambos ojos aplicada, sin hemorragias, exudados ni lesiones',
        uni: 'Retina posterior del ojo {L} aplicada, sin hemorragias, exudados ni lesiones',
        h: ['hemorragias en llama', 'hemorragias puntiformes', 'exudados algodonosos', 'exudados duros', 'desprendimiento de retina', 'cicatriz coriorretiniana', 'microaneurismas'],
      },
    ],
  },
];

const MODULOS_OPCIONALES: OpcDef[] = [
  {
    id: 'perif',
    n: 'Retina periférica',
    sub: 'Opcional · método declarado',
    met: [
      ['ind_sin', 'Oftalmoscopía indirecta sin indentación', 'Retina periférica de ambos ojos aplicada, sin lesiones evidentes en la periferia accesible mediante oftalmoscopía indirecta sin indentación escleral', 'Retina periférica del ojo {L} aplicada, sin lesiones evidentes en la periferia accesible mediante oftalmoscopía indirecta sin indentación escleral'],
      ['ind_con', 'Oftalmoscopía indirecta con indentación', 'Retina periférica de ambos ojos aplicada en los cuatro cuadrantes hasta ora serrata, explorada con indentación escleral, sin desgarros, agujeros ni degeneraciones periféricas', 'Retina periférica del ojo {L} aplicada en los cuatro cuadrantes hasta ora serrata, explorada con indentación escleral, sin desgarros, agujeros ni degeneraciones periféricas'],
      ['tres', 'Lente de tres espejos', 'Retina periférica de ambos ojos aplicada en los cuatro cuadrantes, explorada con lente de tres espejos, sin desgarros, agujeros ni degeneraciones periféricas', 'Retina periférica del ojo {L} aplicada en los cuatro cuadrantes, explorada con lente de tres espejos, sin desgarros, agujeros ni degeneraciones periféricas'],
    ],
    h: ['desgarro retiniano', 'agujero retiniano', 'degeneración en empalizada', 'degeneración en baba de caracol', 'diálisis retiniana', 'blanco con presión', 'desprendimiento periférico'],
  },
  {
    id: 'gonio',
    n: 'Gonioscopía',
    sub: 'Opcional · método declarado',
    met: [
      ['est', 'Gonioscopía estática', 'Ángulo camerular de ambos ojos abierto en los cuatro cuadrantes, con estructuras identificables hasta banda ciliar por gonioscopía estática, sin sinequias anteriores periféricas ni pigmentación anómala', 'Ángulo camerular del ojo {L} abierto en los cuatro cuadrantes, con estructuras identificables hasta banda ciliar por gonioscopía estática, sin sinequias anteriores periféricas ni pigmentación anómala'],
      ['din', 'Gonioscopía dinámica con indentación', 'Ángulo camerular de ambos ojos abierto en los cuatro cuadrantes, con estructuras identificables hasta banda ciliar y apertura confirmada por indentación dinámica, sin sinequias anteriores periféricas ni pigmentación anómala', 'Ángulo camerular del ojo {L} abierto en los cuatro cuadrantes, con estructuras identificables hasta banda ciliar y apertura confirmada por indentación dinámica, sin sinequias anteriores periféricas ni pigmentación anómala'],
    ],
    h: ['ángulo estrecho', 'ángulo ocluible', 'sinequias anteriores periféricas', 'pigmentación densa', 'receso angular', 'neovasos en ángulo'],
  },
  {
    id: 'campos',
    n: 'Campos visuales por confrontación',
    sub: 'Opcional · método declarado',
    met: [
      ['conf', 'Confrontación', 'Campos visuales conservados en los cuatro cuadrantes de ambos ojos por prueba de confrontación', 'Campos visuales del ojo {L} conservados en los cuatro cuadrantes por prueba de confrontación'],
    ],
    h: ['defecto temporal', 'defecto nasal', 'defecto altitudinal', 'hemianopsia', 'cuadrantanopsia'],
  },
  {
    id: 'croma',
    n: 'Visión cromática',
    sub: 'Opcional · método declarado',
    met: [
      ['ishi', 'Láminas pseudoisocromáticas', 'Visión cromática conservada en ambos ojos mediante láminas pseudoisocromáticas', 'Visión cromática del ojo {L} conservada mediante láminas pseudoisocromáticas'],
    ],
    h: ['discromatopsia rojo-verde', 'discromatopsia azul-amarillo', 'desaturación al rojo'],
  },
];

// Inicializador del estado base normal
const createInitialState = (): ExploracionOftalmologicaData => {
  const mod: Record<string, ModuloCoreState> = {};
  MODULOS_CORE.forEach((m) => {
    const regs: Record<string, RegionState> = {};
    m.regs.forEach((r) => {
      regs[r.id] = {
        link: true,
        OD: { e: 'si', v: 'conc', m: MOTIVOS[0], c: CAUSAS[0] },
        OI: { e: 'si', v: 'conc', m: MOTIVOS[0], c: CAUSAS[0] },
        nota: '',
      };
    });
    mod[m.id] = { expl: 'si', vis: 'completa', regs };
  });

  const opc: Record<string, ModuloOpcionalState> = {};
  MODULOS_OPCIONALES.forEach((o) => {
    opc[o.id] = {
      expl: 'no',
      met: o.met[0][0],
      link: true,
      OD: { e: 'si', v: 'conc', m: MOTIVOS[0], c: CAUSAS[0] },
      OI: { e: 'si', v: 'conc', m: MOTIVOS[0], c: CAUSAS[0] },
      nota: '',
    };
  });

  return { mod, opc, hall: [], notas_regiones: {} };
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export const MotorExploracionOftalmologica: React.FC<MotorExploracionOftalmologicaProps> = ({
  initialData,
  onChange,
  onInsertarEnEvaluacion,
  readOnly = false,
}) => {
  const [state, setState] = useState<ExploracionOftalmologicaData>(() => {
    if (initialData?.mod && Object.keys(initialData.mod).length > 0) {
      return initialData;
    }
    return createInitialState();
  });

  // Modal para agregar/editar hallazgo
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dlgRegionId, setDlgRegionId] = useState<string>('');
  const [dlgHallazgo, setDlgHallazgo] = useState<string>('');
  const [dlgOjo, setDlgOjo] = useState<'OD' | 'OI' | 'AO'>('OD');
  const [dlgNotaHallazgo, setDlgNotaHallazgo] = useState<string>('');
  const [dlgAvisoWarning, setDlgAvisoWarning] = useState<string>('');
  const [dlgAvailableHallazgos, setDlgAvailableHallazgos] = useState<string[]>([]);

  // Región activa para edición de nota
  const [activeNoteRegion, setActiveNoteRegion] = useState<string | null>(null);

  // Sincronizar hacia afuera
  const emitChange = (newState: ExploracionOftalmologicaData) => {
    setState(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  // Helper para buscar definición de región
  const findRegDef = (rid: string) => {
    for (const m of MODULOS_CORE) {
      for (const r of m.regs) {
        if (r.id === rid) return { m, r };
      }
    }
    for (const o of MODULOS_OPCIONALES) {
      if (o.id === rid) return { o };
    }
    return null;
  };

  // Presets clínicos rápidos
  const applyPreset = (presetKey: 'normal' | 'hipema' | 'vitrea' | 'catarata' | 'reset') => {
    if (readOnly) return;
    const base = createInitialState();

    if (presetKey === 'hipema') {
      base.mod.ant.vis = 'parcial';
      base.hall = [
        { r: 'camara', o: 'OD', h: 'hipema', nota: 'Nivel hemático de 2.5 mm en cámara anterior' },
        { r: 'cornea', o: 'OD', h: 'edema corneal', nota: 'Edema estromal difuso' },
      ];
      ['iris', 'pupila', 'cristalino'].forEach((k) => {
        base.mod.ant.regs[k].OD = { e: 'si', v: 'nula', m: 'opacidad de medios', c: 'hipema' };
        base.mod.ant.regs[k].link = false;
      });
      base.mod.post.vis = 'parcial';
      ['vitreo', 'papila', 'macula', 'vasos', 'retinapost'].forEach((k) => {
        base.mod.post.regs[k].OD = { e: 'si', v: 'nula', m: 'opacidad de medios', c: 'hipema' };
        base.mod.post.regs[k].link = false;
      });
      toast.success('Preset: Trauma con hipema aplicado');
    } else if (presetKey === 'vitrea') {
      base.mod.post.vis = 'parcial';
      base.hall = [{ r: 'vitreo', o: 'OD', h: 'hemorragia vítrea', nota: 'Hemorragia vítrea densa grado II' }];
      ['papila', 'macula', 'vasos', 'retinapost'].forEach((k) => {
        base.mod.post.regs[k].OD = { e: 'si', v: 'lim', m: 'opacidad de medios', c: 'hemorragia vítrea' };
        base.mod.post.regs[k].link = false;
      });
      base.opc.perif.expl = 'si';
      base.opc.perif.met = 'ind_con';
      base.opc.perif.link = false;
      base.opc.perif.OD = { e: 'si', v: 'nula', m: 'opacidad de medios', c: 'hemorragia vítrea' };
      toast.success('Preset: Hemorragia vítrea grado II aplicado');
    } else if (presetKey === 'catarata') {
      base.hall = [{ r: 'cristalino', o: 'AO' as any, h: 'catarata densa', nota: 'Catarata corticonuclear densa bilateral' }];
      base.mod.post.vis = 'parcial';
      ['papila', 'macula', 'vasos', 'retinapost'].forEach((k) => {
        base.mod.post.regs[k].OD = { e: 'si', v: 'lim', m: 'opacidad de medios', c: 'catarata densa' };
        base.mod.post.regs[k].OI = { e: 'si', v: 'lim', m: 'opacidad de medios', c: 'catarata densa' };
      });
      toast.success('Preset: Catarata densa bilateral aplicado');
    } else {
      toast.success(presetKey === 'normal' ? 'Exploración normal cargada' : 'Exploración reiniciada');
    }

    emitChange(base);
  };

  // Diálogo para agregar hallazgo con validación de congruencia
  const openAddHallazgo = (rid: string, listaHallazgos: string[]) => {
    if (readOnly) return;
    setDlgRegionId(rid);
    setDlgAvailableHallazgos(listaHallazgos);
    setDlgHallazgo(listaHallazgos[0] || '');
    setDlgOjo('OD');
    setDlgNotaHallazgo('');

    // Verificar advertencia de congruencia
    checkCongruencia(rid, 'OD');
    setDialogOpen(true);
  };

  const checkCongruencia = (rid: string, ojo: 'OD' | 'OI' | 'AO') => {
    const ojos: Array<'OD' | 'OI'> = ojo === 'AO' ? ['OD', 'OI'] : [ojo];
    const info = findRegDef(rid);
    let alertMsg = '';

    for (const oj of ojos) {
      let estado: string = 'conc';
      if (info?.r) {
        const m = state.mod[info.m.id];
        if (m.expl === 'no') estado = 'noexp';
        else if (m.vis === 'completa') estado = 'conc';
        else estado = m.regs[rid][oj].e === 'no' ? 'noexp' : m.regs[rid][oj].v;
      } else if (info?.o) {
        const o = state.opc[rid];
        if (o.expl === 'no') estado = 'noexp';
        else estado = o[oj].e === 'no' ? 'noexp' : o[oj].v;
      }

      if (estado === 'noexp' || estado === 'nula') {
        alertMsg = `Esta región está declarada como ${
          estado === 'nula' ? 'visualización nula' : 'no explorada'
        } en ${oj}. Al registrar un hallazgo, el sistema cambiará el estado a limitada para mantener congruencia clínica.`;
        break;
      }
    }

    setDlgAvisoWarning(alertMsg);
  };

  const handleConfirmAddHallazgo = () => {
    if (!dlgHallazgo) return;
    const ojos: Array<'OD' | 'OI'> = dlgOjo === 'AO' ? ['OD', 'OI'] : [dlgOjo];
    const newHall = [...state.hall];

    ojos.forEach((oj) => {
      const exists = newHall.some((x) => x.r === dlgRegionId && x.o === oj && x.h === dlgHallazgo);
      if (!exists) {
        newHall.push({
          r: dlgRegionId,
          o: oj,
          h: dlgHallazgo,
          nota: dlgNotaHallazgo.trim() || undefined,
        });
      }
    });

    // Auto-ajustar congruencia si estaba noexp o nula
    const nextMod = { ...state.mod };
    const nextOpc = { ...state.opc };
    const info = findRegDef(dlgRegionId);

    ojos.forEach((oj) => {
      if (info?.r) {
        const m = nextMod[info.m.id];
        m.expl = 'si';
        if (m.vis === 'completa') m.vis = 'parcial';
        m.regs[dlgRegionId][oj].e = 'si';
        m.regs[dlgRegionId][oj].v = 'lim';
        m.regs[dlgRegionId].link = false;
      } else if (info?.o) {
        nextOpc[dlgRegionId].expl = 'si';
        nextOpc[dlgRegionId][oj].e = 'si';
        nextOpc[dlgRegionId][oj].v = 'lim';
        nextOpc[dlgRegionId].link = false;
      }
    });

    const next = { ...state, mod: nextMod, opc: nextOpc, hall: newHall };
    emitChange(next);
    setDialogOpen(false);
    toast.success('Hallazgo agregado a la exploración');
  };

  const removeHallazgo = (index: number) => {
    if (readOnly) return;
    const newHall = state.hall.filter((_, idx) => idx !== index);
    emitChange({ ...state, hall: newHall });
  };

  const updateHallazgoNota = (index: number, notaText: string) => {
    if (readOnly) return;
    const newHall = state.hall.map((item, idx) =>
      idx === index ? { ...item, nota: notaText } : item
    );
    emitChange({ ...state, hall: newHall });
  };

  const updateRegionNota = (rid: string, modId: string, isOpcional: boolean, notaText: string) => {
    if (readOnly) return;
    if (isOpcional) {
      const nextOpc = { ...state.opc };
      if (nextOpc[rid]) {
        nextOpc[rid].nota = notaText;
      }
      emitChange({ ...state, opc: nextOpc });
    } else {
      const nextMod = { ...state.mod };
      if (nextMod[modId]?.regs[rid]) {
        nextMod[modId].regs[rid].nota = notaText;
      }
      emitChange({ ...state, mod: nextMod });
    }
  };

  // ==========================================
  // MOTOR DE REDACCIÓN CLÍNICA (TEXTO NARRATIVO)
  // ==========================================

  const narrativaClinica = useMemo(() => {
    const motivoTxt = (m: string, c: string) =>
      m === 'opacidad de medios' ? `opacidad de medios por ${c}` : m;

    const textoOjo = (
      nombre: string,
      uni: string,
      estado: EstadoOjoRegion,
      halls: HallazgoOftalmico[],
      ojo: 'OD' | 'OI',
      notaRegion?: string
    ) => {
      const lado = ojo === 'OD' ? 'derecho' : 'izquierdo';
      if (estado.e === 'no') return null;

      // Formatear hallazgos con sus notas individuales si las tienen
      const hallTextos = halls.map((h) =>
        h.nota ? `${h.h} (${h.nota})` : h.h
      );

      const notaRegStr = notaRegion?.trim() ? ` [Nota: ${notaRegion.trim()}]` : '';

      if (estado.v === 'nula') {
        return `${nombre} del ojo ${lado} no valorable por ${motivoTxt(estado.m, estado.c)}.${notaRegStr}`;
      }
      if (estado.v === 'lim') {
        const ex = hallTextos.length ? ` Se identifica ${hallTextos.join(', ')}.` : '';
        return `${nombre} del ojo ${lado} parcialmente valorable por ${motivoTxt(estado.m, estado.c)}.${ex}${notaRegStr}`;
      }
      if (hallTextos.length) {
        const l = hallTextos;
        const listado = l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0];
        return `${nombre} del ojo ${lado}: ${listado}.${notaRegStr}`;
      }
      return uni ? `${uni.replace('{L}', lado)}.${notaRegStr}` : null;
    };

    const redactaRegion = (
      nombre: string,
      bil: string,
      uni: string,
      est: RegionState | { OD: EstadoOjoRegion; OI: EstadoOjoRegion; nota?: string },
      halls: HallazgoOftalmico[]
    ) => {
      const hOD = halls.filter((x) => x.o === 'OD');
      const hOI = halls.filter((x) => x.o === 'OI');
      const igual =
        est.OD.v === est.OI.v &&
        (est.OD.m || '') === (est.OI.m || '') &&
        (est.OD.c || '') === (est.OI.c || '');

      const notaRegStr = est.nota?.trim() ? ` [Nota: ${est.nota.trim()}]` : '';

      if (igual && !hOD.length && !hOI.length) {
        if (est.OD.e === 'no') return [];
        if (est.OD.v === 'conc') return [`${bil}.${notaRegStr}`];
        if (!uni) {
          return [
            `${nombre}${
              est.OD.v === 'nula' ? ' no valorable' : ' parcialmente valorable'
            } por ${motivoTxt(est.OD.m, est.OD.c)}.${notaRegStr}`,
          ];
        }
        return [
          `${nombre} de ambos ojos${
            est.OD.v === 'nula' ? ' no valorable' : ' parcialmente valorable'
          } por ${motivoTxt(est.OD.m, est.OD.c)}.${notaRegStr}`,
        ];
      }

      if (!uni) {
        const t: string[] = [];
        if (halls.length) {
          const formatted = halls.map(
            (x) => `${x.h}${x.nota ? ` (${x.nota})` : ''} en ${x.o}`
          );
          t.push(`${nombre}: ${formatted.join(', ')}.${notaRegStr}`);
        }
        return t;
      }

      const out: string[] = [];
      const a1 = textoOjo(nombre, uni, est.OD, hOD, 'OD', est.nota);
      if (a1) out.push(a1);
      const a2 = textoOjo(nombre, uni, est.OI, hOI, 'OI', est.nota);
      if (a2) out.push(a2);
      return out;
    };

    const bloques: Array<{ titulo: string; cuerpo: string; palabras: number }> = [];

    // Módulos Core
    MODULOS_CORE.forEach((m) => {
      const s = state.mod[m.id];
      if (s?.expl === 'no') return;

      const outParts: string[] = [];
      m.regs.forEach((r) => {
        const regState =
          s.vis === 'completa'
            ? {
                OD: { e: 'si' as const, v: 'conc' as const, m: '', c: '' },
                OI: { e: 'si' as const, v: 'conc' as const, m: '', c: '' },
                nota: s.regs[r.id]?.nota,
              }
            : s.regs[r.id];

        const halls = state.hall.filter((x) => x.r === r.id);
        const lineas = redactaRegion(r.n, r.bil, r.uni, regState, halls);
        outParts.push(...lineas);
      });

      if (outParts.length) {
        const texto = outParts.join(' ');
        bloques.push({
          titulo: m.n,
          cuerpo: texto,
          palabras: texto.split(/\s+/).filter(Boolean).length,
        });
      }
    });

    // Módulos Opcionales
    MODULOS_OPCIONALES.forEach((o) => {
      const s = state.opc[o.id];
      if (s?.expl === 'no') return;

      const met = o.met.find((x) => x[0] === s.met) || o.met[0];
      const halls = state.hall.filter((x) => x.r === o.id);
      const lineas = redactaRegion(
        o.n,
        met[2],
        met[3],
        { OD: s.OD, OI: s.OI, nota: s.nota },
        halls
      );

      if (lineas.length) {
        const texto = lineas.join(' ');
        bloques.push({
          titulo: `${o.n} (${met[1]})`,
          cuerpo: texto,
          palabras: texto.split(/\s+/).filter(Boolean).length,
        });
      }
    });

    return bloques;
  }, [state]);

  const textoCompletoNota = useMemo(() => {
    if (!narrativaClinica.length) return '';
    return narrativaClinica
      .map((b) => `${b.titulo.toUpperCase()}:\n${b.cuerpo}`)
      .join('\n\n');
  }, [narrativaClinica]);

  const handleCopiarNota = () => {
    if (!textoCompletoNota) {
      toast.info('No hay texto de exploración para copiar');
      return;
    }
    navigator.clipboard.writeText(textoCompletoNota);
    toast.success('Nota clínica oftalmológica copiada al portapapeles');
  };

  const handleInsertarEvaluacion = () => {
    if (!textoCompletoNota) {
      toast.info('No hay texto de exploración para insertar');
      return;
    }
    if (onInsertarEnEvaluacion) {
      onInsertarEnEvaluacion(textoCompletoNota);
      toast.success('Exploración oftalmológica transferida a la evaluación clínica');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── BARRA SUPERIOR DE ESCENARIOS RÁPIDOS ── */}
      <Card className="border-border/80 shadow-xs bg-muted/20">
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs gap-1 py-1">
              <Eye className="size-3.5" />
              <span>Pupila Inc. A.12</span>
            </Badge>
            <span className="text-xs font-semibold text-foreground">
              Exploración Oftalmológica (23 regiones)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Escenarios:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('normal')}
              disabled={readOnly}
              className="h-7 text-xs px-2.5 cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-600"
            >
              Exploración Normal
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('hipema')}
              disabled={readOnly}
              className="h-7 text-xs px-2.5 cursor-pointer hover:bg-rose-500/10 hover:text-rose-600"
            >
              Trauma con Hipema
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('vitrea')}
              disabled={readOnly}
              className="h-7 text-xs px-2.5 cursor-pointer hover:bg-amber-500/10 hover:text-amber-600"
            >
              Hemorragia Vítrea II
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('catarata')}
              disabled={readOnly}
              className="h-7 text-xs px-2.5 cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-600"
            >
              Catarata Densa
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyPreset('reset')}
              disabled={readOnly}
              className="h-7 text-xs px-2 text-muted-foreground cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── MÓDULOS DE EXPLORACIÓN ── */}
      <div className="space-y-4">
        {MODULOS_CORE.map((mod) => {
          const modState = state.mod[mod.id];
          if (!modState) return null;

          return (
            <Card key={mod.id} className="border-border/80 shadow-xs overflow-hidden">
              {/* Cabecera del Módulo */}
              <div className="p-3.5 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="size-3.5 text-sky-500" />
                    <span>{mod.n}</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{mod.sub}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Explorado:</span>
                    <div className="flex gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          const next = { ...state };
                          next.mod[mod.id].expl = 'si';
                          emitChange(next);
                        }}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          modState.expl === 'si'
                            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          const next = { ...state };
                          next.mod[mod.id].expl = 'no';
                          emitChange(next);
                        }}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          modState.expl === 'no'
                            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {modState.expl === 'si' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Excepciones:</span>
                      <div className="flex gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            const next = { ...state };
                            next.mod[mod.id].vis = 'completa';
                            emitChange(next);
                          }}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            modState.vis === 'completa'
                              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Ninguna
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            const next = { ...state };
                            next.mod[mod.id].vis = 'parcial';
                            emitChange(next);
                          }}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            modState.vis === 'parcial'
                              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Por región
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Regiones del Módulo */}
              {modState.expl === 'si' && (
                <div className="p-3.5 divide-y divide-border/60">
                  {mod.regs.map((reg) => {
                    const regState = modState.regs[reg.id];
                    if (!regState) return null;

                    const regionHalls = state.hall.filter((h) => h.r === reg.id);
                    const hasNote = Boolean(regState.nota?.trim());
                    const isEditingNote = activeNoteRegion === reg.id;

                    return (
                      <div key={reg.id} className="py-2.5 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Nombre de la región y botón de nota */}
                          <div className="flex items-center gap-2 md:w-52 shrink-0">
                            <span className="text-xs font-semibold text-foreground">
                              {reg.n}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={readOnly}
                              onClick={() =>
                                setActiveNoteRegion(isEditingNote ? null : reg.id)
                              }
                              className={`size-6 rounded cursor-pointer ${
                                hasNote
                                  ? 'text-sky-600 bg-sky-50 dark:bg-sky-950/40'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title={hasNote ? 'Editar nota de región' : 'Añadir nota a esta región'}
                            >
                              <MessageSquare className="size-3" />
                            </Button>
                          </div>

                          {/* Controles por región si vis === 'parcial' */}
                          {modState.vis === 'parcial' ? (
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                              {/* Botón de Enlace Ocular 🔒 */}
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={readOnly}
                                onClick={() => {
                                  const next = { ...state };
                                  const r = next.mod[mod.id].regs[reg.id];
                                  r.link = !r.link;
                                  if (r.link) {
                                    r.OI = { ...r.OD };
                                  }
                                  emitChange(next);
                                }}
                                className={`size-7 cursor-pointer ${
                                  regState.link ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'
                                }`}
                                title={
                                  regState.link
                                    ? 'Ojos enlazados (AO) — al cambiar uno cambia el otro'
                                    : 'Ojos independientes (OD y OI)'
                                }
                              >
                                {regState.link ? (
                                  <Lock className="size-3" />
                                ) : (
                                  <Unlock className="size-3" />
                                )}
                              </Button>

                              {/* Ojo Derecho / Ambos Ojos */}
                              {(regState.link ? (['OD'] as const) : (['OD', 'OI'] as const)).map(
                                (oj) => {
                                  const ojoState = regState[oj];
                                  const labelTag = regState.link ? 'AO' : oj;

                                  return (
                                    <div
                                      key={oj}
                                      className="flex items-center gap-1.5 p-1 px-2 rounded-md border border-border/70 bg-card/60 text-xs"
                                    >
                                      <span className="font-bold text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                                        {labelTag}
                                      </span>

                                      <Select
                                        value={ojoState.v}
                                        onValueChange={(val: any) => {
                                          const next = { ...state };
                                          const r = next.mod[mod.id].regs[reg.id];
                                          r[oj].v = val;
                                          if (r.link) r.OI.v = val;
                                          emitChange(next);
                                        }}
                                        disabled={readOnly}
                                      >
                                        <SelectTrigger className="h-6 text-[11px] w-28">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="conc" className="text-xs">
                                            Concluyente
                                          </SelectItem>
                                          <SelectItem value="lim" className="text-xs">
                                            Limitada
                                          </SelectItem>
                                          <SelectItem value="nula" className="text-xs">
                                            Nula
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>

                                      {ojoState.v !== 'conc' && (
                                        <Select
                                          value={ojoState.m}
                                          onValueChange={(val) => {
                                            const next = { ...state };
                                            const r = next.mod[mod.id].regs[reg.id];
                                            r[oj].m = val;
                                            if (r.link) r.OI.m = val;
                                            emitChange(next);
                                          }}
                                          disabled={readOnly}
                                        >
                                          <SelectTrigger className="h-6 text-[11px] w-36">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {MOTIVOS.map((m) => (
                                              <SelectItem key={m} value={m} className="text-xs">
                                                {m}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}

                                      {ojoState.v !== 'conc' &&
                                        ojoState.m === 'opacidad de medios' && (
                                          <Select
                                            value={ojoState.c}
                                            onValueChange={(val) => {
                                              const next = { ...state };
                                              const r = next.mod[mod.id].regs[reg.id];
                                              r[oj].c = val;
                                              if (r.link) r.OI.c = val;
                                              emitChange(next);
                                            }}
                                            disabled={readOnly}
                                          >
                                            <SelectTrigger className="h-6 text-[11px] w-32 border-amber-500/40 text-amber-700 dark:text-amber-400">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {CAUSAS.map((c) => (
                                                <SelectItem key={c} value={c} className="text-xs">
                                                  {c}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground italic flex-1">
                              AO · explorada · visualización concluyente
                            </div>
                          )}

                          {/* Botón + Hallazgo */}
                          <div className="shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={readOnly}
                              onClick={() => openAddHallazgo(reg.id, reg.h)}
                              className="h-6 text-[11px] px-2 gap-1 cursor-pointer hover:border-primary"
                            >
                              <Plus className="size-3" />
                              <span>Hallazgo</span>
                            </Button>
                          </div>
                        </div>

                        {/* Campo de Nota por Región si está activa */}
                        {(isEditingNote || hasNote) && (
                          <div className="pl-4 pr-1 py-1 bg-sky-500/5 rounded-md border border-sky-500/20 space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-sky-700 dark:text-sky-300 font-semibold">
                              <span>Nota particular para {reg.n}:</span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => setActiveNoteRegion(null)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Cerrar
                                </button>
                              )}
                            </div>
                            <Input
                              type="text"
                              value={regState.nota || ''}
                              onChange={(e) =>
                                updateRegionNota(reg.id, mod.id, false, e.target.value)
                              }
                              placeholder={`Observaciones específicas en ${reg.n} (ej: lesión en borde palpebral, grosor, color)...`}
                              disabled={readOnly}
                              className="h-7 text-xs bg-background"
                            />
                          </div>
                        )}

                        {/* Lista de hallazgos registrados para esta región */}
                        {regionHalls.length > 0 && (
                          <div className="pl-4 space-y-1.5 pt-1">
                            {regionHalls.map((h, hIdx) => {
                              const globalIndex = state.hall.indexOf(h);
                              return (
                                <div
                                  key={`${h.r}_${h.o}_${h.h}_${hIdx}`}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 px-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs"
                                >
                                  <div className="flex items-center gap-2 flex-wrap flex-1">
                                    <Badge variant="outline" className="text-[10px] font-bold bg-background">
                                      {h.o}
                                    </Badge>
                                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                                      {h.h}
                                    </span>

                                    {/* Nota editable directa del hallazgo */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                      <span className="text-[10px] text-muted-foreground">Nota:</span>
                                      <Input
                                        type="text"
                                        value={h.nota || ''}
                                        onChange={(e) =>
                                          updateHallazgoNota(globalIndex, e.target.value)
                                        }
                                        placeholder="Detalle (ej: nivel en mm, cuadrante, severidad)..."
                                        disabled={readOnly}
                                        className="h-6 text-[11px] bg-background flex-1"
                                      />
                                    </div>
                                  </div>

                                  {!readOnly && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeHallazgo(globalIndex)}
                                      className="size-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                                      title="Quitar hallazgo"
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {/* ── MÓDULOS OPCIONALES CON MÉTODO DECLARADO ── */}
        <div className="pt-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Módulos Opcionales con Método Declarado (Retina Periférica, Gonioscopía, Campos, Visión Cromática)
          </div>

          <div className="space-y-3">
            {MODULOS_OPCIONALES.map((opc) => {
              const opcState = state.opc[opc.id];
              if (!opcState) return null;

              const opcHalls = state.hall.filter((h) => h.r === opc.id);
              const hasNote = Boolean(opcState.nota?.trim());

              return (
                <Card key={opc.id} className="border-border/80 shadow-xs">
                  <div className="p-3.5 bg-muted/20 border-b border-border/60 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Eye className="size-3.5 text-teal-500" />
                        <span>{opc.n}</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">{opc.sub}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Explorado:</span>
                      <div className="flex gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            const next = { ...state };
                            next.opc[opc.id].expl = 'si';
                            emitChange(next);
                          }}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            opcState.expl === 'si'
                              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            const next = { ...state };
                            next.opc[opc.id].expl = 'no';
                            emitChange(next);
                          }}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            opcState.expl === 'no'
                              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>

                  {opcState.expl === 'si' && (
                    <CardContent className="p-3.5 space-y-3">
                      {/* Selector de Método Declarado */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Método Declarado
                          </Label>
                          <Select
                            value={opcState.met}
                            onValueChange={(val) => {
                              const next = { ...state };
                              next.opc[opc.id].met = val;
                              emitChange(next);
                            }}
                            disabled={readOnly}
                          >
                            <SelectTrigger className="h-7 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {opc.met.map((m) => (
                                <SelectItem key={m[0]} value={m[0]} className="text-xs">
                                  {m[1]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 sm:w-auto">
                          <Label className="text-[11px] font-semibold text-muted-foreground block">
                            Hallazgos
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={readOnly}
                            onClick={() => openAddHallazgo(opc.id, opc.h)}
                            className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>+ Hallazgo</span>
                          </Button>
                        </div>
                      </div>

                      {/* Nota de la región opcional */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Notas / Observaciones particulares
                        </Label>
                        <Input
                          type="text"
                          value={opcState.nota || ''}
                          onChange={(e) =>
                            updateRegionNota(opc.id, '', true, e.target.value)
                          }
                          placeholder={`Detalles de ${opc.n.toLowerCase()}...`}
                          disabled={readOnly}
                          className="h-7 text-xs bg-background"
                        />
                      </div>

                      {/* Hallazgos opcionales */}
                      {opcHalls.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {opcHalls.map((h, hIdx) => {
                            const globalIndex = state.hall.indexOf(h);
                            return (
                              <div
                                key={`${h.r}_${h.o}_${h.h}_${hIdx}`}
                                className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs"
                              >
                                <div className="flex items-center gap-2 flex-wrap flex-1">
                                  <Badge variant="outline" className="text-[10px] font-bold bg-background">
                                    {h.o}
                                  </Badge>
                                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                                    {h.h}
                                  </span>
                                  <Input
                                    type="text"
                                    value={h.nota || ''}
                                    onChange={(e) =>
                                      updateHallazgoNota(globalIndex, e.target.value)
                                    }
                                    placeholder="Nota del hallazgo..."
                                    disabled={readOnly}
                                    className="h-6 text-[11px] bg-background flex-1"
                                  />
                                </div>
                                {!readOnly && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeHallazgo(globalIndex)}
                                    className="size-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── NOTA NARRATIVA CLÍNICA AUTOMÁTICA ── */}
      <Card className="border-sky-500/40 shadow-sm bg-card border-l-4 border-l-sky-500">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="size-4 text-sky-500" />
                <span>Nota que se imprime en el expediente médico</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Redacción semiológica automática que integra hallazgos, estado de visualización y notas clínicas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopiarNota}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Copy className="size-3.5 text-primary" />
                <span>Copiar Nota</span>
              </Button>
              {onInsertarEnEvaluacion && !readOnly && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleInsertarEvaluacion}
                  className="h-8 text-xs gap-1.5 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <Sparkles className="size-3.5" />
                  <span>Sincronizar con Evaluación</span>
                </Button>
              )}
            </div>
          </div>

          {narrativaClinica.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-3 text-center">
              — No se declaró exploración de ningún módulo. Active módulos arriba para generar la nota automática.
            </p>
          ) : (
            <div className="space-y-3">
              {narrativaClinica.map((bloque, bIdx) => (
                <div
                  key={bIdx}
                  className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {bloque.titulo}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {bloque.palabras} palabras
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {bloque.cuerpo}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL AGREGAR HALLAZGO ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="size-4 text-sky-500" />
              <span>Agregar Hallazgo Oftalmológico</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {dlgAvisoWarning && (
              <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 leading-relaxed text-[11px] flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{dlgAvisoWarning}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hallazgo Clínico</Label>
              <Select
                value={dlgHallazgo}
                onValueChange={(val) => setDlgHallazgo(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccione hallazgo..." />
                </SelectTrigger>
                <SelectContent>
                  {dlgAvailableHallazgos.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ojo Afectado</Label>
              <Select
                value={dlgOjo}
                onValueChange={(val: any) => {
                  setDlgOjo(val);
                  checkCongruencia(dlgRegionId, val);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OD" className="text-xs">
                    Ojo Derecho (OD)
                  </SelectItem>
                  <SelectItem value="OI" className="text-xs">
                    Ojo Izquierdo (OI)
                  </SelectItem>
                  <SelectItem value="AO" className="text-xs">
                    Ambos Ojos (AO)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Nota / Detalle específico de este hallazgo (Opcional)
              </Label>
              <Input
                type="text"
                value={dlgNotaHallazgo}
                onChange={(e) => setDlgNotaHallazgo(e.target.value)}
                placeholder="Ej: Nivel de 2 mm en cámara anterior, cuadrante temporal..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmAddHallazgo}
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              Agregar Hallazgo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MotorExploracionOftalmologica;
