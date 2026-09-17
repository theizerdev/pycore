import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  consultasApi,
  type ConsultaMedica,
  type EstudioSolicitado,
  type MedicamentoPrescrito,
  type ReposoMedico,
} from '../../api/consultas';
import { especialidadesApi } from '../../api/especialidades';
import type { PlantillaEfectiva, SeccionClinica, CampoClinico } from '../../types';
import OdontogramaWidget, { type OdontogramaData } from '../../components/clinica/OdontogramaWidget';
import SignosVitalesWidget from '../../components/clinica/SignosVitalesWidget';
import PrescripcionRecetaWidget from '../../components/clinica/PrescripcionRecetaWidget';
import EstudiosSolicitadosWidget from '../../components/clinica/EstudiosSolicitadosWidget';
import { EstudiosArchivosTab } from '../../components/clinica/EstudiosArchivosTab';
import { PatientRecordDrawer } from './PatientRecordDrawer';
import { toast } from 'sonner';
import { cn, getInitials } from '../../lib/utils';

// UI Components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DocumentosImpresionModal, { type TipoDocumentoClinico } from '../../components/clinica/DocumentosImpresionModal';
import CalculadorasClinicasModal from '../../components/clinica/CalculadorasClinicasModal';

// Icons
import {
  HeartPulse,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  Pill,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Save,
  Printer,
  Calendar,
  Sparkles,
  Info,
  FileCheck,
  FileText,
  ChevronLeft,
  ChevronDown,
  BedDouble,
  FileCheck2,
  Image as ImageIcon,
  ChevronRight,
  History,
  ChevronUp,
  FolderOpen,
  Calculator,
  Search,
  BookmarkPlus,
  Layers,
} from 'lucide-react';

interface ConsultaAtencionPageProps {
  readOnly?: boolean;
}

// CIE-10 Catálogo Ampliado por Especialidades
export interface Cie10CatalogoItem {
  codigo: string;
  descripcion: string;
  especialidad: string;
}

const CIE10_CATALOGO_ESPECIALIDADES: Cie10CatalogoItem[] = [
  // Medicina General y Medicina Interna
  { codigo: 'Z00.0', descripcion: 'Examen médico general de rutina y chequeo preventivo', especialidad: 'General' },
  { codigo: 'J00', descripcion: 'Rinofaringitis aguda (Resfriado común)', especialidad: 'General' },
  { codigo: 'J02.9', descripcion: 'Faringitis aguda, no especificada', especialidad: 'General' },
  { codigo: 'J06.9', descripcion: 'Infección aguda de las vías respiratorias superiores', especialidad: 'General' },
  { codigo: 'K29.7', descripcion: 'Gastritis, no especificada', especialidad: 'General' },
  { codigo: 'N39.0', descripcion: 'Infección del tracto urinario, sitio no especificado', especialidad: 'General' },
  { codigo: 'R51', descripcion: 'Cefalea / Cefalea tensional', especialidad: 'General' },
  { codigo: 'R10.4', descripcion: 'Otros dolores abdominales y los no especificados', especialidad: 'General' },
  { codigo: 'E11.9', descripcion: 'Diabetes mellitus tipo 2 sin mención de complicación', especialidad: 'Medicina Interna' },
  { codigo: 'E66.9', descripcion: 'Obesidad, no especificada', especialidad: 'Medicina Interna' },
  { codigo: 'E78.5', descripcion: 'Hiperlipidemia no especificada (Dislipidemia)', especialidad: 'Medicina Interna' },

  // Cardiología
  { codigo: 'I10', descripcion: 'Hipertensión esencial (primaria)', especialidad: 'Cardiología' },
  { codigo: 'I11.9', descripcion: 'Enfermedad cardíaca hipertensiva sin insuficiencia', especialidad: 'Cardiología' },
  { codigo: 'I20.9', descripcion: 'Angina de pecho, no especificada', especialidad: 'Cardiología' },
  { codigo: 'I25.1', descripcion: 'Enfermedad cardíaca aterosclerótica', especialidad: 'Cardiología' },
  { codigo: 'I48.0', descripcion: 'Fibrilación auricular paroxística', especialidad: 'Cardiología' },
  { codigo: 'I50.9', descripcion: 'Insuficiencia cardíaca, no especificada', especialidad: 'Cardiología' },
  { codigo: 'R00.0', descripcion: 'Taquicardia, no especificada', especialidad: 'Cardiología' },
  { codigo: 'R00.2', descripcion: 'Palpitaciones cardíacas', especialidad: 'Cardiología' },

  // Pediatría
  { codigo: 'Z00.1', descripcion: 'Control de salud y desarrollo de niño sano', especialidad: 'Pediatría' },
  { codigo: 'J20.9', descripcion: 'Bronquitis aguda, no especificada', especialidad: 'Pediatría' },
  { codigo: 'A09', descripcion: 'Gastroenteritis y diarrea de presunto origen infeccioso', especialidad: 'Pediatría' },
  { codigo: 'L01.0', descripcion: 'Impétigo contagioso infantil', especialidad: 'Pediatría' },
  { codigo: 'H66.9', descripcion: 'Otitis media, no especificada', especialidad: 'Pediatría' },
  { codigo: 'B34.9', descripcion: 'Infección viral, no especificada', especialidad: 'Pediatría' },
  { codigo: 'D50.9', descripcion: 'Anemia por deficiencia de hierro', especialidad: 'Pediatría' },

  // Ginecología y Obstetricia
  { codigo: 'Z34.0', descripcion: 'Supervisión de primer embarazo normal', especialidad: 'Ginecología' },
  { codigo: 'Z34.8', descripcion: 'Supervisión de otros embarazos normales', especialidad: 'Ginecología' },
  { codigo: 'N76.0', descripcion: 'Vaginitis aguda / Vaginosis bacteriana', especialidad: 'Ginecología' },
  { codigo: 'N92.0', descripcion: 'Menstruación excesiva y frecuente con ciclo regular (Menorragia)', especialidad: 'Ginecología' },
  { codigo: 'N94.6', descripcion: 'Dismenorrea, no especificada', especialidad: 'Ginecología' },
  { codigo: 'N80.9', descripcion: 'Endometriosis, no especificada', especialidad: 'Ginecología' },
  { codigo: 'O24.4', descripcion: 'Diabetes mellitus que se origina con el embarazo', especialidad: 'Ginecología' },
  { codigo: 'N95.1', descripcion: 'Síntomas menopáusicos y del climaterio', especialidad: 'Ginecología' },

  // Traumatología y Ortopedia
  { codigo: 'M54.5', descripcion: 'Lumbago no especificado / Lumbalgia mecánica', especialidad: 'Traumatología' },
  { codigo: 'M54.2', descripcion: 'Cervicalgia', especialidad: 'Traumatología' },
  { codigo: 'M25.5', descripcion: 'Dolor en articulación (Artralgia)', especialidad: 'Traumatología' },
  { codigo: 'S93.4', descripcion: 'Esguince y desgarro del tobillo', especialidad: 'Traumatología' },
  { codigo: 'S83.6', descripcion: 'Esguince y torcedura de la rodilla', especialidad: 'Traumatología' },
  { codigo: 'M17.9', descripcion: 'Gonartrosis, no especificada (Artrosis de rodilla)', especialidad: 'Traumatología' },
  { codigo: 'M75.1', descripcion: 'Síndrome del manguito rotador del hombro', especialidad: 'Traumatología' },

  // Dermatología
  { codigo: 'L20.9', descripcion: 'Dermatitis atópica, no especificada', especialidad: 'Dermatología' },
  { codigo: 'L30.9', descripcion: 'Dermatitis / Eccema no especificado', especialidad: 'Dermatología' },
  { codigo: 'L70.0', descripcion: 'Acné vulgar', especialidad: 'Dermatología' },
  { codigo: 'L50.0', descripcion: 'Urticaria alérgica', especialidad: 'Dermatología' },
  { codigo: 'B35.9', descripcion: 'Dermatofitosis / Tiña cutánea', especialidad: 'Dermatología' },
  { codigo: 'L40.0', descripcion: 'Psoriasis vulgar', especialidad: 'Dermatología' },

  // Odontología
  { codigo: 'K02.9', descripcion: 'Caries dental, no especificada', especialidad: 'Odontología' },
  { codigo: 'K05.0', descripcion: 'Gingivitis aguda', especialidad: 'Odontología' },
  { codigo: 'K05.3', descripcion: 'Periodontitis crónica', especialidad: 'Odontología' },
  { codigo: 'K04.0', descripcion: 'Pulpitis aguda reversible / irreversible', especialidad: 'Odontología' },
  { codigo: 'K04.7', descripcion: 'Absceso periapical sin fístula', especialidad: 'Odontología' },
  { codigo: 'K08.1', descripcion: 'Pérdida de piezas dentarias', especialidad: 'Odontología' },

  // Oftalmología
  { codigo: 'H10.9', descripcion: 'Conjuntivitis, no especificada', especialidad: 'Oftalmología' },
  { codigo: 'H52.1', descripcion: 'Miopía', especialidad: 'Oftalmología' },
  { codigo: 'H52.2', descripcion: 'Astigmatismo', especialidad: 'Oftalmología' },
  { codigo: 'H52.4', descripcion: 'Presbicia', especialidad: 'Oftalmología' },
  { codigo: 'H25.9', descripcion: 'Catarata senil, no especificada', especialidad: 'Oftalmología' },
  { codigo: 'H40.9', descripcion: 'Glaucoma, no especificado', especialidad: 'Oftalmología' },
];

// Frases Clínicas Rápidas / Macros para Evaluación
const SNIPPETS_EXAMEN_FISICO = [
  {
    titulo: 'Cardiopulmonar Normal',
    categoria: 'Cardio / Resp',
    texto: 'Tórax simétrico, normoexpansible. Ruidos cardíacos rítmicos, regulares, sin soplos audibles. Murmullo vesicular conservado en ambos campos pulmonares sin ruidos sobreagregados.',
  },
  {
    titulo: 'Abdomen Normal',
    categoria: 'Gastro',
    texto: 'Abdomen blando, depresible, no doloroso a la palpación superficial ni profunda. RHA presentes normoactivos, sin visceromegalias palpables ni signos de irritación peritoneal.',
  },
  {
    titulo: 'Neurológico Normal',
    categoria: 'Neurología',
    texto: 'Paciente consciente, orientado en tiempo, espacio y persona (Glasgow 15/15). Pupilas isocóricas normorreactivas a la luz. Fuerza muscular 5/5 simétrica. Sin signos meníngeos ni focalidad.',
  },
  {
    titulo: 'ORL / Faringe Normal',
    categoria: 'ORL',
    texto: 'Faringe rosada y húmeda sin congestión ni exudados, amígdalas eutróficas. Membranas timpánicas íntegras bilateralmente con reflejo luminoso presente. Fosas nasales permeables.',
  },
  {
    titulo: 'Extremidades Normales',
    categoria: 'Osteomuscular',
    texto: 'Extremidades simétricas, tróficas, sin deformidades óseas ni edemas periféricos. Pulsos periféricos distales presentes y simétricos. Arcos de movilidad articular conservados.',
  },
  {
    titulo: 'Control Niño Sano',
    categoria: 'Pediatría',
    texto: 'Paciente activo, reactivo y colaborador. Normohidratado y normocoloreado. Fontanela anterior normotensa. Buena ganancia ponderoestatural acorde a curvas de crecimiento OMS.',
  },
  {
    titulo: 'Control Obstétrico',
    categoria: 'Obstetricia',
    texto: 'Feto único intrauterino en situación longitudinal cefálica. FCF audible rítmica regular (140-150 lpm). Altura uterina acorde a edad gestacional. Dinámica uterina negativa. Sin pérdidas vaginales.',
  },
  {
    titulo: 'Examen Odontológico',
    categoria: 'Odontología',
    texto: 'Encías rosadas, firmes, sin sangrado espontáneo. Piezas dentarias con oclusión armónica. Sin signos de caries activas en revisión visual ni lesiones en mucosas.',
  },
];

// Helpers para formato de paciente
const calculateAge = (
  birthDateStr?: string | null,
  fallbackAge?: number | null
): string => {
  if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge > 0) {
    return `${fallbackAge} años`;
  }
  if (birthDateStr) {
    try {
      const birth = new Date(birthDateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0 && !isNaN(age)) {
        return `${age} años`;
      }
    } catch {
      // ignore
    }
  }
  return 'No especificada';
};

const formatGender = (gender?: string | null): string => {
  if (!gender) return 'No especificado';
  const g = gender.trim().toUpperCase();
  if (g === 'M' || g === 'MASCULINO') return 'Masculino';
  if (g === 'F' || g === 'FEMENINO') return 'Femenino';
  return gender;
};

// Formatea cualquier valor de respuesta de preconsulta
const formatRespuestaValue = (val: any): { text: string; isBoolean?: boolean; isPositive?: boolean } => {
  if (val === null || val === undefined || val === '') {
    return { text: 'Sin respuesta' };
  }
  if (typeof val === 'boolean') {
    return { text: val ? 'Sí' : 'No', isBoolean: true, isPositive: val };
  }
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'si' || lower === 'sí' || lower === 'true') {
      return { text: 'Sí', isBoolean: true, isPositive: true };
    }
    if (lower === 'no' || lower === 'false') {
      return { text: 'No', isBoolean: true, isPositive: false };
    }
    return { text: val };
  }
  if (Array.isArray(val)) {
    return { text: val.join(', ') };
  }
  return { text: String(val) };
};

// Componente para renderizar campos dinámicos de una sección clínica
interface SeccionCamposRenderProps {
  seccion: SeccionClinica;
  datosPlantilla: Record<string, any>;
  setDatosPlantilla: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  readOnly?: boolean;
}

const SeccionCamposRender: React.FC<SeccionCamposRenderProps> = ({
  seccion,
  datosPlantilla,
  setDatosPlantilla,
  readOnly = false,
}) => {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="p-5 space-y-4">
        <div className="border-b border-border/60 pb-2.5">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            <span>{seccion.titulo}</span>
          </h4>
          {seccion.descripcion && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {seccion.descripcion}
            </p>
          )}
        </div>

        {(!seccion.campos || seccion.campos.length === 0) ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
            Esta sección no tiene campos de examen configurados aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {seccion.campos.map((campo: CampoClinico) => {
              const gridSpan =
                campo.grid_cols === 12
                  ? 'md:col-span-12'
                  : campo.grid_cols === 4
                    ? 'md:col-span-4'
                    : campo.grid_cols === 3
                      ? 'md:col-span-3'
                      : 'md:col-span-6';

              const valor = datosPlantilla[campo.key] ?? '';

              return (
                <div key={campo.key} className={cn('space-y-1.5', gridSpan)}>
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>
                      {campo.label}
                      {campo.requerido && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </span>
                    {campo.unidad && (
                      <span className="text-[11px] text-muted-foreground font-normal">
                        ({campo.unidad})
                      </span>
                    )}
                  </Label>

                  {/* RENDERIZADO POR TIPO DE CAMPO */}
                  {campo.tipo === 'textarea' ? (
                    <Textarea
                      value={valor}
                      onChange={(e) =>
                        setDatosPlantilla((prev) => ({
                          ...prev,
                          [campo.key]: e.target.value,
                        }))
                      }
                      placeholder={campo.placeholder || ''}
                      disabled={readOnly}
                      rows={3}
                    />
                  ) : campo.tipo === 'select' ? (
                    <Select
                      value={String(valor)}
                      onValueChange={(val) =>
                        setDatosPlantilla((prev) => ({
                          ...prev,
                          [campo.key]: val,
                        }))
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccione una opción..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(campo.opciones || []).map((opc) => (
                          <SelectItem key={opc} value={opc}>
                            {opc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : campo.tipo === 'boolean' ? (
                    <div className="flex items-center gap-3 pt-2">
                      <Switch
                        checked={Boolean(valor)}
                        onCheckedChange={(checked) =>
                          setDatosPlantilla((prev) => ({
                            ...prev,
                            [campo.key]: checked,
                          }))
                        }
                        disabled={readOnly}
                      />
                      <span className="text-xs text-muted-foreground">
                        {Boolean(valor) ? 'Presente / Positivo' : 'Ausente / Negativo'}
                      </span>
                    </div>
                  ) : campo.tipo === 'number' ? (
                    <Input
                      type="number"
                      min={campo.min_val ?? undefined}
                      max={campo.max_val ?? undefined}
                      value={valor}
                      onChange={(e) =>
                        setDatosPlantilla((prev) => ({
                          ...prev,
                          [campo.key]: e.target.value,
                        }))
                      }
                      placeholder={campo.placeholder || ''}
                      disabled={readOnly}
                      className="h-10 font-mono"
                    />
                  ) : campo.tipo === 'date' ? (
                    <Input
                      type="date"
                      value={valor}
                      onChange={(e) =>
                        setDatosPlantilla((prev) => ({
                          ...prev,
                          [campo.key]: e.target.value,
                        }))
                      }
                      disabled={readOnly}
                      className="h-10"
                    />
                  ) : campo.tipo === 'scale_1_10' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Leve (1)</span>
                        <span className="font-bold text-foreground">Valor: {valor || '-'}</span>
                        <span>Severo (10)</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              setDatosPlantilla((prev) => ({
                                ...prev,
                                [campo.key]: num,
                              }))
                            }
                            className={cn(
                              'flex-1 h-8 text-xs font-semibold rounded border transition-colors cursor-pointer',
                              Number(valor) === num
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="text"
                      value={valor}
                      onChange={(e) =>
                        setDatosPlantilla((prev) => ({
                          ...prev,
                          [campo.key]: e.target.value,
                        }))
                      }
                      placeholder={campo.placeholder || ''}
                      disabled={readOnly}
                      className="h-10"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ConsultaAtencionPage: React.FC<ConsultaAtencionPageProps> = ({
  readOnly: propReadOnly = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isDetailRoute = location.pathname.includes('/detalle');
  const readOnly = propReadOnly || isDetailRoute;

  const [consulta, setConsulta] = useState<ConsultaMedica | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number | string>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [impresionModalOpen, setImpresionModalOpen] = useState<boolean>(false);
  const [documentoInicialImpresion, setDocumentoInicialImpresion] = useState<TipoDocumentoClinico>('informe');

  const handleAbrirImpresion = (tipo: TipoDocumentoClinico = 'informe') => {
    setDocumentoInicialImpresion(tipo);
    setImpresionModalOpen(true);
  };

  // ── ESTADOS DE LA CONSULTA MÉDICA ──
  const [motivoConsulta, setMotivoConsulta] = useState<string>('');
  const [enfermedadActual, setEnfermedadActual] = useState<string>('');
  const [observacionesAdicionales, setObservacionesAdicionales] = useState<string>('');
  const [referidoPara, setReferidoPara] = useState<string>('');

  // Signos Vitales
  const [signosVitales, setSignosVitales] = useState<Record<string, any>>({
    peso: '',
    talla: '',
    temperatura: '',
    presion_sistolica: '',
    presion_diastolica: '',
    frecuencia_cardiaca: '',
    frecuencia_respiratoria: '',
    saturacion_oxigeno: '',
    glucosa_capilar: '',
    observaciones_triaje: '',
  });

  // Plantilla de la especialidad
  const [plantillaEfectiva, setPlantillaEfectiva] = useState<PlantillaEfectiva | null>(null);
  const [loadingPlantilla, setLoadingPlantilla] = useState<boolean>(false);
  const [datosPlantilla, setDatosPlantilla] = useState<Record<string, any>>({});

  // Carrito de Estudios
  const [estudios, setEstudios] = useState<EstudioSolicitado[]>([]);

  // Historial Clínico Completo y Consulta Previa
  const [drawerHistorialOpen, setDrawerHistorialOpen] = useState<boolean>(false);
  const [resumenPrevioAbierto, setResumenPrevioAbierto] = useState<boolean>(true);
  const [fechaProximoControl, setFechaProximoControl] = useState<string>('');

  // Carrito de Medicamentos (Receta)
  const [medicamentos, setMedicamentos] = useState<MedicamentoPrescrito[]>([]);

  // Reposo Médico
  const [reposo, setReposo] = useState<ReposoMedico>({
    requiere_reposo: false,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    dias_reposo: 1,
    motivo_diagnostico: '',
    observaciones: '',
  });

  // Diagnósticos y Plan
  const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState<string>('');
  const [diagnosticosSecundarios, setDiagnosticosSecundarios] = useState<string[]>([]);
  const [nuevoDiagSecundario, setNuevoDiagSecundario] = useState<string>('');
  const [planTratamiento, setPlanTratamiento] = useState<string>('');
  const [indicacionesGenerales, setIndicacionesGenerales] = useState<string>('');

  // ── HERRAMIENTAS CLÍNICAS Y ASISTENTE DIAGNÓSTICO ──
  const [calculadorasModalOpen, setCalculadorasModalOpen] = useState<boolean>(false);
  const [cieFiltroCategoria, setCieFiltroCategoria] = useState<string>('especialidad');
  const [cieBusqueda, setCieBusqueda] = useState<string>('');

  const handleInsertarCalculoEnEvaluacion = (texto: string) => {
    setEnfermedadActual((prev) =>
      prev ? `${prev}\n\n[Cálculo Clínico]: ${texto}` : `[Cálculo Clínico]: ${texto}`
    );
    setDatosPlantilla((prev) => ({
      ...prev,
      enfermedad_actual: prev.enfermedad_actual
        ? `${prev.enfermedad_actual}\n\n[Cálculo Clínico]: ${texto}`
        : `[Cálculo Clínico]: ${texto}`,
    }));
    toast.success('Cálculo clínico insertado en la anamnesis');
  };

  const handleInsertarSnippetEnEvaluacion = (snippet: { titulo: string; texto: string }) => {
    setEnfermedadActual((prev) =>
      prev ? `${prev}\n\n[${snippet.titulo}]: ${snippet.texto}` : `[${snippet.titulo}]: ${snippet.texto}`
    );
    setDatosPlantilla((prev) => ({
      ...prev,
      enfermedad_actual: prev.enfermedad_actual
        ? `${prev.enfermedad_actual}\n\n[${snippet.titulo}]: ${snippet.texto}`
        : `[${snippet.titulo}]: ${snippet.texto}`,
    }));
    toast.success(`Macro "${snippet.titulo}" insertado en evaluación`);
  };

  // ── CARGAR DETALLE DE LA CONSULTA DESDE API ──
  const fetchConsulta = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await consultasApi.getConsultaById(Number(id));
      setConsulta(data);

      setMotivoConsulta(data.motivo_consulta || '');
      setEnfermedadActual(data.enfermedad_actual || data.datos_plantilla?.enfermedad_actual || '');
      setObservacionesAdicionales(data.observaciones_adicionales || data.datos_plantilla?.observaciones_adicionales || '');
      setReferidoPara(data.referido_para || data.datos_plantilla?.referido_para || '');
      setFechaProximoControl(data.datos_plantilla?.fecha_proximo_control || '');

      setSignosVitales({
        peso: data.signos_vitales?.peso || '',
        talla: data.signos_vitales?.talla || '',
        temperatura: data.signos_vitales?.temperatura || '',
        presion_sistolica: data.signos_vitales?.presion_sistolica || '',
        presion_diastolica: data.signos_vitales?.presion_diastolica || '',
        frecuencia_cardiaca: data.signos_vitales?.frecuencia_cardiaca || '',
        frecuencia_respiratoria: data.signos_vitales?.frecuencia_respiratoria || '',
        saturacion_oxigeno: data.signos_vitales?.saturacion_oxigeno || '',
        glucosa_capilar: data.signos_vitales?.glucosa_capilar || '',
        observaciones_triaje: data.signos_vitales?.observaciones_triaje || '',
      });

      setDatosPlantilla(data.datos_plantilla || {});
      setEstudios(data.estudios_solicitados || []);
      setMedicamentos(data.receta_medica || []);

      if (data.reposo_medico) {
        setReposo({
          requiere_reposo: Boolean(data.reposo_medico.requiere_reposo),
          fecha_inicio:
            data.reposo_medico.fecha_inicio || new Date().toISOString().split('T')[0],
          fecha_fin:
            data.reposo_medico.fecha_fin || new Date().toISOString().split('T')[0],
          dias_reposo: Number(data.reposo_medico.dias_reposo) || 1,
          motivo_diagnostico: data.reposo_medico.motivo_diagnostico || '',
          observaciones: data.reposo_medico.observaciones || '',
        });
      }

      setDiagnosticoPrincipal(data.diagnostico_principal || '');
      setDiagnosticosSecundarios(
        Array.isArray(data.diagnosticos_secundarios)
          ? data.diagnosticos_secundarios.map((d) => (typeof d === 'string' ? d : d?.nombre || String(d)))
          : []
      );
      setPlanTratamiento(data.plan_tratamiento || '');
      setIndicacionesGenerales(data.indicaciones_generales || '');

      // Cargar plantilla dinámica de la especialidad
      if (data.especialidad_id) {
        setLoadingPlantilla(true);
        especialidadesApi
          .getPlantillaEfectiva(data.especialidad_id)
          .then((res) => {
            setPlantillaEfectiva(res);
          })
          .catch((err) => {
            console.error('Error al cargar plantilla efectiva:', err);
          })
          .finally(() => {
            setLoadingPlantilla(false);
          });
      }
    } catch (error: any) {
      console.error('Error cargando consulta médica:', error);
      toast.error(error.response?.data?.detail || 'No se pudo cargar la consulta médica');
      navigate('/clinica/consultas/en-consulta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsulta();
  }, [id]);



  // ── CÁLCULO DE DÍAS DE REPOSO ──
  useEffect(() => {
    if (reposo.fecha_inicio && reposo.fecha_fin) {
      const d1 = new Date(reposo.fecha_inicio);
      const d2 = new Date(reposo.fecha_fin);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const finalDays = diffDays > 0 ? diffDays : 1;
      setReposo((prev) => (prev.dias_reposo !== finalDays ? { ...prev, dias_reposo: finalDays } : prev));
    }
  }, [reposo.fecha_inicio, reposo.fecha_fin]);

  // ── DIAGNÓSTICOS SECUNDARIOS ──
  const handleAgregarDiagSecundario = () => {
    if (!nuevoDiagSecundario.trim()) return;
    if (!diagnosticosSecundarios.includes(nuevoDiagSecundario.trim())) {
      setDiagnosticosSecundarios((prev) => [...prev, nuevoDiagSecundario.trim()]);
    }
    setNuevoDiagSecundario('');
  };

  const handleAgregarDiagSecundarioConTexto = (texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;
    if (!diagnosticosSecundarios.includes(limpio)) {
      setDiagnosticosSecundarios((prev) => [...prev, limpio]);
      toast.success(`Añadido a diagnósticos secundarios`);
    } else {
      toast.info('Este diagnóstico ya está en la lista secundaria');
    }
  };

  const handleEliminarDiagSecundario = (index: number) => {
    setDiagnosticosSecundarios((prev) => prev.filter((_, i) => i !== index));
  };

  // ── CONSTRUIR PAYLOAD DE CONSULTA ──
  const buildPayload = (isFinalizing = false) => {
    return {
      motivo_consulta: motivoConsulta,
      enfermedad_actual: enfermedadActual,
      observaciones_adicionales: observacionesAdicionales,
      referido_para: referidoPara,
      signos_vitales: signosVitales,
      datos_plantilla: {
        ...datosPlantilla,
        enfermedad_actual: enfermedadActual,
        observaciones_adicionales: observacionesAdicionales,
        referido_para: referidoPara,
        fecha_proximo_control: fechaProximoControl,
      },
      estudios_solicitados: estudios,
      receta_medica: medicamentos,
      reposo_medico: reposo.requiere_reposo ? reposo : { requiere_reposo: false },
      diagnostico_principal: diagnosticoPrincipal,
      diagnosticos_secundarios: diagnosticosSecundarios,
      plan_tratamiento: planTratamiento,
      indicaciones_generales: indicacionesGenerales,
      estado: (isFinalizing ? 'finalizada' : 'en_curso') as 'finalizada' | 'en_curso',
    };
  };

  // ── GUARDAR BORRADOR ──
  const handleGuardarBorrador = async () => {
    if (!consulta) return;
    try {
      setSaving(true);
      const payload = buildPayload(false);
      await consultasApi.updateConsulta(consulta.id, payload);
      toast.success('Borrador de la atención médica guardado exitosamente');
    } catch (error: any) {
      console.error('Error al guardar borrador:', error);
      toast.error(error?.response?.data?.detail || 'No se pudo guardar el borrador');
    } finally {
      setSaving(false);
    }
  };

  // ── GUARDAR Y FINALIZAR CONSULTA ──
  const handleGuardarYFinalizar = async () => {
    if (!consulta) return;
    if (!diagnosticoPrincipal.trim()) {
      const diagStep = pasosHabilitados.includes(6) ? 6 : stepsList[stepsList.length - 1]?.num || 1;
      setCurrentStep(diagStep);
      toast.error('Por favor indique el Diagnóstico Principal antes de finalizar la consulta');
      return;
    }

    try {
      setFinalizing(true);
      const payload = buildPayload(true);
      await consultasApi.updateConsulta(consulta.id, payload);
      await consultasApi.cambiarEstado(consulta.id, 'finalizada');
      toast.success('🎉 ¡Consulta Médica finalizada y registrada exitosamente!');
      navigate('/clinica/consultas/atendidas');
    } catch (error: any) {
      console.error('Error al finalizar consulta:', error);
      toast.error(error?.response?.data?.detail || 'Error al registrar la finalización de la consulta');
    } finally {
      setFinalizing(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const hasInitializedStepRef = useRef(false);

  // Pasos habilitados configurados para la especialidad
  const pasosHabilitados: number[] = useMemo(() => {
    const raw =
      consulta?.especialidad?.pasos_activos ||
      plantillaEfectiva?.pasos_activos;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }
    return [1, 2, 3, 4, 5, 6];
  }, [consulta?.especialidad?.pasos_activos, plantillaEfectiva?.pasos_activos]);

  const pasoInicialConfigurado = useMemo(() => {
    return (
      consulta?.especialidad?.paso_inicial ||
      plantillaEfectiva?.paso_inicial ||
      pasosHabilitados[0] ||
      1
    );
  }, [consulta?.especialidad?.paso_inicial, plantillaEfectiva?.paso_inicial, pasosHabilitados]);

  // Secciones clínicas configuradas como paso autónomo en el wizard
  const seccionesAutonomas: SeccionClinica[] = useMemo(() => {
    return (plantillaEfectiva?.consulta_secciones || []).filter(
      (sec) => Boolean(sec.es_paso_independiente)
    );
  }, [plantillaEfectiva?.consulta_secciones]);

  const stepsList = useMemo(() => {
    const list: Array<{
      num: number | string;
      label: string;
      icon: any;
      isSeccionAutonoma?: boolean;
      seccion?: SeccionClinica;
    }> = [];

    // Paso 1: Preconsulta y Motivo
    if (pasosHabilitados.includes(1)) {
      list.push({ num: 1, label: 'Preconsulta y Motivo', icon: ClipboardList });
    }
    // Paso 2: Signos Vitales
    if (pasosHabilitados.includes(2)) {
      list.push({ num: 2, label: 'Signos Vitales', icon: HeartPulse });
    }
    // Paso 3: Evaluación y Anamnesis
    if (pasosHabilitados.includes(3)) {
      list.push({ num: 3, label: 'Evaluación y Hallazgos', icon: Stethoscope });
    }

    // Pasos Autónomos Dinámicos de la Especialidad
    seccionesAutonomas.forEach((sec) => {
      list.push({
        num: `sec_${sec.id}`,
        label: sec.titulo,
        icon: Stethoscope,
        isSeccionAutonoma: true,
        seccion: sec,
      });
    });

    // Paso 4: Estudios Médicos
    if (pasosHabilitados.includes(4)) {
      list.push({ num: 4, label: 'Estudios Médicos', icon: FlaskConical });
    }
    // Paso 5: Receta y Reposo
    if (pasosHabilitados.includes(5)) {
      list.push({ num: 5, label: 'Receta y Reposo', icon: Pill });
    }
    // Paso 6: Diagnóstico y Cierre
    if (pasosHabilitados.includes(6)) {
      list.push({ num: 6, label: 'Diagnóstico y Cierre', icon: CheckCircle2 });
    }

    return list;
  }, [pasosHabilitados, seccionesAutonomas]);

  // Inicializar paso al configurado por la especialidad al cargar la consulta
  useEffect(() => {
    if (!hasInitializedStepRef.current && (consulta || plantillaEfectiva)) {
      if (pasosHabilitados.includes(pasoInicialConfigurado)) {
        setCurrentStep(pasoInicialConfigurado);
      } else if (stepsList[0]) {
        setCurrentStep(stepsList[0].num);
      }
      hasInitializedStepRef.current = true;
    }
  }, [consulta, plantillaEfectiva, pasoInicialConfigurado, pasosHabilitados, stepsList]);

  // Asegurar que currentStep sea siempre uno de los pasos activos
  useEffect(() => {
    if (stepsList.length > 0 && !stepsList.some((s) => String(s.num) === String(currentStep))) {
      setCurrentStep(stepsList[0].num);
    }
  }, [stepsList, currentStep]);

  const currentStepIndex = useMemo(() => {
    const idx = stepsList.findIndex((s) => String(s.num) === String(currentStep));
    return idx >= 0 ? idx : 0;
  }, [stepsList, currentStep]);

  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex >= stepsList.length - 1;
  const prevStep = !isFirstStep ? stepsList[currentStepIndex - 1]?.num : null;
  const nextStep = !isLastStep ? stepsList[currentStepIndex + 1]?.num : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">
          Cargando entorno de atención clínica...
        </p>
      </div>
    );
  }

  if (!consulta) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Consulta no encontrada</h3>
        <Button onClick={() => navigate('/clinica/consultas/en-consulta')}>
          Volver al listado de consultas
        </Button>
      </div>
    );
  }

  const preconsultaRespuestas = consulta.preconsulta?.respuestas || {};
  const hasPreconsulta = Boolean(consulta.preconsulta);
  const isPreconsultaCompletada = consulta.preconsulta?.estado === 'completada';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ── BOTÓN DE RETORNO Y HEADER DEL PACIENTE ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(
                consulta.estado === 'finalizada'
                  ? '/clinica/consultas/atendidas'
                  : '/clinica/consultas/en-consulta'
              )
            }
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>
              Volver a{' '}
              {consulta.estado === 'finalizada' ? 'Consultas Atendidas' : 'Consultas en Curso'}
            </span>
          </Button>

          <div className="flex items-center gap-2">
            {readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 font-semibold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Documentos</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem
                    onClick={() => handleAbrirImpresion('informe')}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <FileText className="h-4 w-4 text-sky-500" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs">Informe Médico</span>
                      <span className="text-[10px] text-muted-foreground">Ficha clínica y diagnósticos</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAbrirImpresion('receta')}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <Pill className="h-4 w-4 text-emerald-500" />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">Receta Médica (Rx)</span>
                        <span className="text-[10px] text-muted-foreground">Prescripción de fármacos</span>
                      </div>
                      {medicamentos.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {medicamentos.length}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAbrirImpresion('estudios')}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <FlaskConical className="h-4 w-4 text-violet-500" />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">Orden de Estudios</span>
                        <span className="text-[10px] text-muted-foreground">Exámenes y laboratorio</span>
                      </div>
                      {estudios.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {estudios.length}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAbrirImpresion('reposo')}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <BedDouble className="h-4 w-4 text-amber-500" />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">Reposo Médico</span>
                        <span className="text-[10px] text-muted-foreground">Incapacidad temporal</span>
                      </div>
                      {reposo.requiere_reposo && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {reposo.dias_reposo}d
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => handleAbrirImpresion('constancia')}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <FileCheck2 className="h-4 w-4 text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs">Constancia de Asistencia</span>
                      <span className="text-[10px] text-muted-foreground">Justificante de consulta</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalculadorasModalOpen(true)}
              className="gap-1.5 h-9 font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
            >
              <Calculator className="h-4 w-4 text-teal-500" />
              <span className="hidden sm:inline">Calculadoras Clínicas</span>
              <span className="sm:hidden">Calc</span>
            </Button>

            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGuardarBorrador}
                disabled={saving || finalizing}
                className="gap-1.5 h-9"
              >
                <Save className="h-4 w-4 text-muted-foreground" />
                <span>{saving ? 'Guardando...' : 'Guardar Borrador'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tarjeta de Resumen del Paciente */}
        <Card className="border-border/80 shadow-xs overflow-hidden bg-card">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl ring-1 ring-primary/20 shadow-xs">
                  {consulta.paciente
                    ? getInitials(`${consulta.paciente.nombres} ${consulta.paciente.apellidos}`)
                    : 'PA'}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {consulta.paciente
                        ? `${consulta.paciente.nombres} ${consulta.paciente.apellidos}`
                        : 'Paciente'}
                    </h2>

                    {consulta.codigo && (
                      <Badge variant="outline" className="text-xs font-mono bg-muted/50">
                        {consulta.codigo}
                      </Badge>
                    )}

                    {consulta.es_subsecuente ? (
                      <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-semibold gap-1">
                        <History className="h-3 w-3 text-sky-600" />
                        Consulta de Control (Visita #{(consulta.total_consultas_previas || 0) + 1})
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        Primera Consulta
                      </Badge>
                    )}

                    {consulta.estado === 'finalizada' && (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
                        Atención Finalizada
                      </Badge>
                    )}
                    {consulta.estado === 'en_curso' && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 animate-pulse font-semibold">
                        En Consulta Activa
                      </Badge>
                    )}
                    {consulta.estado === 'en_espera' && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold">
                        En Sala de Espera
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <strong className="text-foreground/80">Edad:</strong>{' '}
                      <span className="font-semibold text-foreground">
                        {calculateAge(consulta.paciente?.fecha_nacimiento, consulta.paciente?.edad)}
                      </span>
                    </span>
                    <span>
                      <strong className="text-foreground/80">Género:</strong>{' '}
                      <span className="font-semibold text-foreground">
                        {formatGender(consulta.paciente?.genero)}
                      </span>
                    </span>
                    <span>
                      <strong className="text-foreground/80">Documento:</strong>{' '}
                      <span className="font-semibold text-foreground font-mono">
                        {consulta.paciente?.tipo_documento || 'V'}-
                        {consulta.paciente?.documento_identidad || consulta.paciente?.numero_documento || 'No registrado'}
                      </span>
                    </span>
                    <span>
                      <strong className="text-foreground/80">Teléfono:</strong>{' '}
                      <span className="font-semibold text-foreground">
                        {consulta.paciente?.telefono || 'No registrado'}
                      </span>
                    </span>
                    {consulta.paciente?.grupo_sanguineo && (
                      <Badge variant="outline" className="text-[11px] font-bold text-rose-600 border-rose-300 bg-rose-50/50 dark:bg-rose-950/30">
                        Grupo: {consulta.paciente.grupo_sanguineo}
                      </Badge>
                    )}
                  </div>

                  {/* Alerta de Alergias del Paciente */}
                  {consulta.paciente?.alergias && (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Alergias Conocidas del Paciente: {consulta.paciente.alergias}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {consulta.especialidad?.nombre || 'Consulta General'}
                    </span>
                    <span>
                      Dr(a). {consulta.medico?.nombres} {consulta.medico?.apellidos}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(consulta.fecha_consulta).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones y Estado de Preconsulta */}
              <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerHistorialOpen(true)}
                  className="gap-1.5 h-8 font-semibold text-xs border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
                  title="Abrir expediente clínico completo del paciente sin perder el progreso de esta consulta"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Ver Expediente Completo</span>
                </Button>

                {hasPreconsulta ? (
                  isPreconsultaCompletada ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1.5 px-3 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Preconsulta Digital Lista</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-700 border-amber-500/40 py-1.5 px-3 font-semibold">
                      Preconsulta Pendiente
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-muted-foreground py-1.5 px-3">
                    Sin Preconsulta Previa
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── CARD RESUMEN DE LA CONSULTA PREVIA (SI ES CONSULTA SUBSECUENTE) ── */}
        {consulta.consulta_previa && (
          <Card className="border-sky-500/30 bg-sky-500/[0.03] overflow-hidden shadow-xs">
            <div
              className="px-4 py-3 bg-sky-500/10 border-b border-sky-500/20 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setResumenPrevioAbierto((prev) => !prev)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400">
                  <History className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wide">
                  Resumen de la Consulta Previa —{' '}
                  {new Date(consulta.consulta_previa.fecha_consulta).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {consulta.consulta_previa.medico_nombre && (
                  <Badge variant="outline" className="text-[10.5px] bg-background/80 text-sky-800 dark:text-sky-300 border-sky-400/40 font-medium">
                    Atendido por: {consulta.consulta_previa.medico_nombre}
                  </Badge>
                )}
                {consulta.consulta_previa.especialidad_nombre && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {consulta.consulta_previa.especialidad_nombre}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerHistorialOpen(true);
                  }}
                  className="h-6 text-[11px] px-2 text-sky-700 dark:text-sky-300 hover:text-sky-900 hover:bg-sky-500/20 gap-1 font-semibold cursor-pointer"
                >
                  <span>Historial Completo</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
                {resumenPrevioAbierto ? (
                  <ChevronUp className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                )}
              </div>
            </div>

            {resumenPrevioAbierto && (
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-sky-500/15">
                    <span className="font-bold text-muted-foreground block text-[10.5px] uppercase tracking-wider">
                      Motivo Anterior:
                    </span>
                    <p className="font-medium text-foreground mt-1 line-clamp-3">
                      {consulta.consulta_previa.motivo_consulta || 'Sin motivo registrado'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-sky-500/15">
                    <span className="font-bold text-muted-foreground block text-[10.5px] uppercase tracking-wider">
                      Diagnóstico Previo:
                    </span>
                    <p className="font-bold text-sky-700 dark:text-sky-300 mt-1 line-clamp-3">
                      {consulta.consulta_previa.diagnostico_principal || 'No registrado'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-sky-500/15">
                    <span className="font-bold text-muted-foreground block text-[10.5px] uppercase tracking-wider">
                      Constantes Vitales Previas:
                    </span>
                    <p className="font-medium text-foreground mt-1">
                      {consulta.consulta_previa.signos_vitales?.peso ? `Peso: ${consulta.consulta_previa.signos_vitales.peso} kg · ` : ''}
                      {consulta.consulta_previa.signos_vitales?.presion_sistolica
                        ? `PA: ${consulta.consulta_previa.signos_vitales.presion_sistolica}/${consulta.consulta_previa.signos_vitales.presion_diastolica} mmHg · `
                        : ''}
                      {consulta.consulta_previa.signos_vitales?.frecuencia_cardiaca
                        ? `FC: ${consulta.consulta_previa.signos_vitales.frecuencia_cardiaca} lpm`
                        : 'Sin signos registrados'}
                    </p>
                  </div>
                </div>

                {consulta.consulta_previa.plan_tratamiento && (
                  <div className="p-2.5 rounded-xl bg-background/80 border border-sky-500/15">
                    <span className="font-bold text-muted-foreground block text-[10.5px] uppercase tracking-wider">
                      Plan de Tratamiento y Conducta en Visita Anterior:
                    </span>
                    <p className="text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {consulta.consulta_previa.plan_tratamiento}
                    </p>
                  </div>
                )}

                {consulta.consulta_previa.receta_medica && consulta.consulta_previa.receta_medica.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Fármacos indicados previamente:
                    </span>
                    {consulta.consulta_previa.receta_medica.map((m, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[10px] bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/20 font-medium"
                      >
                        {m.medicamento} ({m.dosis})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {/* ── BARRA DE PROGRESO DE LOS PASOS CONFIGURADOS ── */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between overflow-x-auto gap-2">
            {stepsList.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStepIndex > idx;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0',
                    isActive &&
                    'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/30 font-bold',
                    isPast && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20',
                    !isActive && !isPast && 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      isActive && 'bg-white/20 text-primary-foreground',
                      isPast && 'bg-emerald-500 text-white',
                      !isActive && !isPast && 'bg-muted-foreground/20 text-muted-foreground'
                    )}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── CONTENIDO PRINCIPAL POR PASO ── */}
      <div className="space-y-6">
        {/* ======================================================== */}
        {/* ── PASO 1: PRECONSULTA Y MOTIVO DE CONSULTA ─────────── */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Información de Preconsulta Digital */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ficha de Preconsulta Digital
                  </h4>
                  {hasPreconsulta && isPreconsultaCompletada ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
                      Completada por Paciente
                    </Badge>
                  ) : hasPreconsulta ? (
                    <Badge variant="outline" className="text-amber-700 border-amber-500/40 font-semibold">
                      Enlace Enviado (Pendiente)
                    </Badge>
                  ) : null}
                </div>

                {hasPreconsulta && isPreconsultaCompletada ? (
                  <div className="space-y-4">
                    {/* ALERTA DE ALERGIAS SI EXISTEN */}
                    {(preconsultaRespuestas.alergias ||
                      preconsultaRespuestas.alergias_medicamentos ||
                      consulta.paciente?.alergias) && (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3 shadow-xs">
                          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <strong className="block font-bold uppercase tracking-wide text-[11px]">
                              ⚠️ Alerta Médica - Alergias Reportadas
                            </strong>
                            <p className="mt-0.5 font-semibold text-xs text-rose-800 dark:text-rose-300">
                              {preconsultaRespuestas.alergias ||
                                preconsultaRespuestas.alergias_medicamentos ||
                                consulta.paciente?.alergias}
                            </p>
                          </div>
                        </div>
                      )}

                    {/* SECCIONES DINÁMICAS DE LA PLANTILLA DE PRECONSULTA */}
                    {plantillaEfectiva?.preconsulta_secciones &&
                      plantillaEfectiva.preconsulta_secciones.length > 0 ? (
                      plantillaEfectiva.preconsulta_secciones.map((sec, secIdx) => (
                        <Card key={sec.id || secIdx} className="border-border/80 bg-card shadow-xs overflow-hidden">
                          <div className="p-3.5 px-4 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-black">
                                  {secIdx + 1}
                                </span>
                                {sec.titulo}
                              </h5>
                              {sec.descripcion && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 ml-7">
                                  {sec.descripcion}
                                </p>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-12 gap-3">
                              {sec.campos.map((campo) => {
                                const rawVal = preconsultaRespuestas[campo.key];
                                const hasValue =
                                  rawVal !== undefined && rawVal !== null && rawVal !== '';
                                const formatted = formatRespuestaValue(rawVal);
                                const colSpan =
                                  campo.grid_cols === 6
                                    ? 'col-span-12 sm:col-span-6'
                                    : campo.grid_cols === 4
                                      ? 'col-span-12 sm:col-span-4'
                                      : 'col-span-12';

                                return (
                                  <div
                                    key={campo.key}
                                    className={cn(
                                      colSpan,
                                      'p-2.5 rounded-xl bg-muted/20 border border-border/40 space-y-1'
                                    )}
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                      <span>{campo.label}</span>
                                      {campo.unidad && (
                                        <span className="text-[10px] text-muted-foreground/70 font-normal">
                                          ({campo.unidad})
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      {!hasValue ? (
                                        <span className="text-xs text-muted-foreground/60 italic">
                                          No reportado
                                        </span>
                                      ) : campo.key === 'escala_dolor' || campo.tipo === 'range' ? (
                                        <Badge
                                          className={cn(
                                            'text-xs font-bold px-2.5 py-0.5',
                                            Number(rawVal) >= 7
                                              ? 'bg-red-500 text-white'
                                              : Number(rawVal) >= 4
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-emerald-500 text-white'
                                          )}
                                        >
                                          Nivel {rawVal} / 10
                                        </Badge>
                                      ) : formatted.isBoolean ? (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            'text-xs font-bold px-2.5 py-0.5',
                                            formatted.isPositive
                                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                              : 'bg-muted text-muted-foreground border-border'
                                          )}
                                        >
                                          {formatted.text}
                                        </Badge>
                                      ) : Array.isArray(rawVal) ? (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {rawVal.map((item, i) => (
                                            <Badge
                                              key={i}
                                              variant="outline"
                                              className="text-[11px] bg-primary/5 text-primary border-primary/20"
                                            >
                                              {item}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs font-medium text-foreground whitespace-pre-wrap">
                                          {formatted.text}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : null}

                    {/* DATOS GENERALES / BASE REPORTADOS POR EL PACIENTE */}
                    {(() => {
                      const templateKeys = new Set(
                        (plantillaEfectiva?.preconsulta_secciones || []).flatMap((s) =>
                          s.campos.map((c) => c.key)
                        )
                      );
                      const baseEntries = Object.entries(preconsultaRespuestas).filter(
                        ([k]) => !templateKeys.has(k)
                      );

                      if (baseEntries.length === 0 && (plantillaEfectiva?.preconsulta_secciones || []).length > 0) {
                        return null;
                      }

                      return (
                        <Card className="border-border/80 bg-card shadow-xs">
                          <div className="p-3.5 px-4 bg-muted/40 border-b border-border/60">
                            <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-primary" />
                              Respuestas Generales del Paciente
                            </h5>
                          </div>
                          <CardContent className="p-4 space-y-3">
                            {/* Motivo del paciente */}
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Motivo reportado por el paciente:
                                </span>
                                {preconsultaRespuestas.motivo_consulta &&
                                  !motivoConsulta &&
                                  !readOnly && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setMotivoConsulta(preconsultaRespuestas.motivo_consulta)
                                      }
                                      className="h-6 text-[11px] text-primary hover:text-primary gap-1 p-1"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      Copiar a registro médico
                                    </Button>
                                  )}
                              </div>
                              <p className="text-sm font-semibold text-foreground mt-0.5 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                                {preconsultaRespuestas.motivo_consulta ||
                                  consulta.motivo_consulta ||
                                  'No especificado'}
                              </p>
                            </div>

                            {/* Escala de Dolor y Evolución */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Escala del Dolor (1-10):
                                </span>
                                <div className="mt-1">
                                  {preconsultaRespuestas.escala_dolor !== undefined ? (
                                    <Badge
                                      className={cn(
                                        'text-xs font-bold px-3 py-1',
                                        Number(preconsultaRespuestas.escala_dolor) >= 7
                                          ? 'bg-red-500 text-white'
                                          : Number(preconsultaRespuestas.escala_dolor) >= 4
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-emerald-500 text-white'
                                      )}
                                    >
                                      Nivel {preconsultaRespuestas.escala_dolor} / 10
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
                                      No reportado
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Tiempo de Evolución:
                                </span>
                                <p className="text-xs font-medium text-foreground mt-1">
                                  {preconsultaRespuestas.tiempo_evolucion || 'No especificado'}
                                </p>
                              </div>
                            </div>

                            {/* Síntomas principales */}
                            {preconsultaRespuestas.sintomas_principales && (
                              <div className="pt-2 border-t border-border/40">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Síntomas reportados:
                                </span>
                                <p className="text-xs text-foreground/90 whitespace-pre-wrap mt-1 bg-muted/40 p-3 rounded-xl border border-border/60">
                                  {preconsultaRespuestas.sintomas_principales}
                                </p>
                              </div>
                            )}

                            {/* Medicamentos y Antecedentes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Medicamentos Actuales:
                                </span>
                                <p className="text-xs text-foreground mt-0.5">
                                  {preconsultaRespuestas.medicamentos_actuales || 'Ninguno reportado'}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Antecedentes / Crónicos:
                                </span>
                                <p className="text-xs text-foreground mt-0.5">
                                  {preconsultaRespuestas.enfermedades_previas ||
                                    preconsultaRespuestas.antecedentes ||
                                    'Sin antecedentes declarados'}
                                </p>
                              </div>
                            </div>

                            {/* Otros campos no estándar */}
                            {baseEntries
                              .filter(
                                ([k]) =>
                                  ![
                                    'motivo_consulta',
                                    'escala_dolor',
                                    'tiempo_evolucion',
                                    'sintomas_principales',
                                    'alergias',
                                    'medicamentos_actuales',
                                    'enfermedades_previas',
                                    'antecedentes',
                                  ].includes(k)
                              )
                              .map(([k, v]) => (
                                <div key={k} className="pt-2 border-t border-border/40">
                                  <span className="text-xs font-semibold text-muted-foreground capitalize">
                                    {k.replace(/_/g, ' ')}:
                                  </span>
                                  <p className="text-xs text-foreground mt-0.5">
                                    {formatRespuestaValue(v).text}
                                  </p>
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-border/70 p-8 text-center bg-muted/10">
                    <CardContent className="space-y-2 p-0">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-semibold text-foreground">
                        Sin respuestas de preconsulta previa
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        El paciente no completó el enlace de WhatsApp antes de ingresar. Puede
                        interrogarlo directamente e ingresar los datos a continuación.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Columna Derecha: Motivo de Consulta Principal */}
              <div className="lg:col-span-6 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Registro Médico de la Consulta
                </h4>

                <Card className="border-border/80 bg-card shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="motivo_consulta" className="text-sm font-bold flex items-center justify-between">
                        <span>
                          Motivo Principal de Consulta <span className="text-destructive">*</span>
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Razón de visita del paciente
                        </span>
                      </Label>
                      <Textarea
                        id="motivo_consulta"
                        value={motivoConsulta}
                        onChange={(e) => setMotivoConsulta(e.target.value)}
                        placeholder="Describa el motivo o molestia principal por el cual acude el paciente a la consulta (ej: Dolor abdominal difuso de 3 días de evolución, control rutinario, chequeo preventivo...)"
                        disabled={readOnly}
                        rows={4}
                        className="resize-y text-sm font-medium"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-primary" />
                        Flujo Clínico
                      </div>
                      <p>
                        En este primer paso valide las respuestas previas del paciente y registre el motivo de la consulta. En el <strong>Paso 2</strong> registrará las constantes vitales y en el <strong>Paso 3</strong> detallará la anamnesis próxima, evolución semiológica, datos de interconsulta/referencia y el examen físico especializado.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ── PASO 2: SIGNOS VITALES Y TRIAJE ──────────────────── */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />
                Paso 2: Signos Vitales y Parámetros Basales
              </h3>
              <p className="text-xs text-muted-foreground">
                Registro de constantes biológicas durante la consulta. El Índice de Masa Corporal (IMC) se calcula automáticamente.
              </p>
            </div>

            <SignosVitalesWidget
              signos={signosVitales}
              signosAnteriores={consulta.consulta_previa?.signos_vitales}
              onChange={(key, val) => {
                setSignosVitales((prev) => ({ ...prev, [key]: val }));
                setDatosPlantilla((prev) => ({ ...prev, [key]: val }));
              }}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* ── PASO 3: EVALUACIÓN Y PLANTILLA DE ESPECIALIDAD ───── */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {loadingPlantilla ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <div className="h-10 w-10 rounded-full border-3 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-semibold">
                  Cargando protocolo y campos clínicos de {consulta.especialidad?.nombre}...
                </p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* ── ENFERMEDAD ACTUAL / ANAMNESIS PRÓXIMA ── */}
                <Card className="border-border/80 shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="border-b border-border/60 pb-2.5">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        Enfermedad Actual / Anamnesis Próxima (Evolución y Semiología)
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Registro cronológico, evolución del cuadro clínico, semiología y síntomas referidos por el paciente.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Textarea
                        id="enfermedad_actual"
                        value={enfermedadActual}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEnfermedadActual(val);
                          setDatosPlantilla((prev) => ({ ...prev, enfermedad_actual: val }));
                        }}
                        placeholder="Paciente refiere cuadro clínico de X días de evolución caracterizado por... cronología, localización, intensidad, factores desencadenantes y evolución sintomática..."
                        disabled={readOnly}
                        rows={4}
                        className="resize-y w-full"
                      />

                      {/* ── FRASES RÁPIDAS / MACROS CLÍNICOS ── */}
                      {!readOnly && (
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span>Macros Clínicos y Frases Rápidas (1 Clic para insertar):</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCalculadorasModalOpen(true)}
                              className="h-6 text-[11px] px-2 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 gap-1 cursor-pointer"
                            >
                              <Calculator className="h-3 w-3" />
                              <span>Abrir Calculadora Clínica</span>
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/60">
                            {SNIPPETS_EXAMEN_FISICO.map((snip, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleInsertarSnippetEnEvaluacion(snip)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/40 transition-all text-left font-medium cursor-pointer shadow-2xs"
                                title={snip.texto}
                              >
                                + {snip.titulo}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* WIDGET INTERACTIVO DE ODONTOGRAMA SI APLICA */}
                {(plantillaEfectiva?.widgets_activos || []).includes('odontograma') && (
                  <Card className="border-border/80 shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-sky-500" />
                          <h4 className="text-base font-bold text-foreground">
                            Odontograma Dental Clínico Interactivo
                          </h4>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Registro Odontológico
                        </Badge>
                      </div>
                      <OdontogramaWidget
                        initialData={datosPlantilla.odontograma as OdontogramaData}
                        onChange={(odontoData) => {
                          if (!readOnly) {
                            setDatosPlantilla((prev) => ({
                              ...prev,
                              odontograma: odontoData,
                            }));
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* SECCIONES DINÁMICAS DE LA EVALUACIÓN / ESPECIALIDAD (EXCLUYENDO PASOS AUTÓNOMOS Y DUPLICADOS DE SIGNOS VITALES) */}
                {(() => {
                  const seccionesFiltradas = (plantillaEfectiva?.consulta_secciones || []).filter(
                    (seccion: SeccionClinica) => {
                      if (seccion.es_paso_independiente) return false;
                      const id = (seccion.id || '').toLowerCase();
                      const tit = (seccion.titulo || '').toLowerCase();
                      return !(
                        id.includes('signos') ||
                        id.includes('vitales') ||
                        tit.includes('signos vitales') ||
                        tit.includes('parámetros basales') ||
                        tit.includes('constantes biológicas')
                      );
                    }
                  );

                  if (seccionesFiltradas.length === 0) {
                    return (
                      <Card className="border-border/80 shadow-xs">
                        <CardContent className="p-5 space-y-4">
                          <div className="border-b border-border/60 pb-2">
                            <h4 className="text-sm font-bold text-foreground">
                              Examen Físico Segmentario y Hallazgos Clínicos
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Registro semiológico general de la consulta médica
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">
                                Examen Físico / Hallazgos Relevantes
                              </Label>
                              <Textarea
                                value={datosPlantilla.examen_fisico_general || ''}
                                onChange={(e) =>
                                  setDatosPlantilla((prev) => ({
                                    ...prev,
                                    examen_fisico_general: e.target.value,
                                  }))
                                }
                                placeholder="Describa los hallazgos a la inspección, palpación, percusión y auscultación..."
                                disabled={readOnly}
                                rows={4}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">
                                Observaciones Clínicas Adicionales
                              </Label>
                              <Textarea
                                value={datosPlantilla.observaciones_clinicas || ''}
                                onChange={(e) =>
                                  setDatosPlantilla((prev) => ({
                                    ...prev,
                                    observaciones_clinicas: e.target.value,
                                  }))
                                }
                                placeholder="Notas u observaciones pertinentes del examen clínico..."
                                disabled={readOnly}
                                rows={3}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return seccionesFiltradas.map((seccion: SeccionClinica) => (
                    <SeccionCamposRender
                      key={seccion.id}
                      seccion={seccion}
                      datosPlantilla={datosPlantilla}
                      setDatosPlantilla={setDatosPlantilla}
                      readOnly={readOnly}
                    />
                  ));
                })()}

                {/* ── REFERIDO PARA Y OBSERVACIONES ADICIONALES (DESPUÉS DE LA EVALUACIÓN - OCUPACIÓN 12) ── */}
                <Card className="border-border/80 shadow-xs">
                  <CardContent className="p-5 space-y-5">
                    <div className="border-b border-border/60 pb-2.5">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        Referencia y Observaciones Adicionales
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Indique si el paciente es referido a otra especialidad o interconsulta, y registre observaciones adicionales.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Referido Para / Interconsulta (12 cols) */}
                      <div className="space-y-1.5 w-full">
                        <Label htmlFor="referido_para" className="text-xs font-semibold">
                          Referido para (Interconsulta, Especialidad o Derivación)
                        </Label>
                        <Textarea
                          id="referido_para"
                          value={referidoPara}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReferidoPara(val);
                            setDatosPlantilla((prev) => ({ ...prev, referido_para: val }));
                          }}
                          placeholder="Ej: Se refiere al paciente para valoración por Cardiología y evaluación prequirúrgica por Medicina Interna..."
                          disabled={readOnly}
                          rows={3}
                          className="resize-y w-full"
                        />
                      </div>

                      {/* Observaciones Adicionales (12 cols) */}
                      <div className="space-y-1.5 w-full">
                        <Label htmlFor="observaciones_adicionales" className="text-xs font-semibold">
                          Observaciones Adicionales
                        </Label>
                        <Textarea
                          id="observaciones_adicionales"
                          value={observacionesAdicionales}
                          onChange={(e) => {
                            const val = e.target.value;
                            setObservacionesAdicionales(val);
                            setDatosPlantilla((prev) => ({ ...prev, observaciones_adicionales: val }));
                          }}
                          placeholder="Ej: Trae estudios previos de laboratorio, paciente asiste acompañado por familiar, se explican pautas de alarma..."
                          disabled={readOnly}
                          rows={3}
                          className="resize-y w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ── PASOS AUTÓNOMOS DE LA ESPECIALIDAD (DINÁMICOS) ────── */}
        {/* ======================================================== */}
        {seccionesAutonomas.map((sec) => {
          if (currentStep !== `sec_${sec.id}`) return null;
          return (
            <div key={sec.id} className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <span>{sec.titulo}</span>
                    <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary">
                      Paso Autónomo: {consulta?.especialidad?.nombre || 'Especialidad'}
                    </Badge>
                  </h3>
                  {sec.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5">{sec.descripcion}</p>
                  )}
                </div>
              </div>

              <SeccionCamposRender
                seccion={sec}
                datosPlantilla={datosPlantilla}
                setDatosPlantilla={setDatosPlantilla}
                readOnly={readOnly}
              />
            </div>
          );
        })}

        {/* ======================================================== */}
        {/* ── PASO 4: ESTUDIOS Y EXÁMENES (VISOR + SOLICITUD) ──── */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <Tabs defaultValue="adjuntos" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    Paso 4: Estudios Médicos, Laboratorio e Imagenología
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Consulte exámenes adjuntos en el visor clínico inteligente o gestione nuevas órdenes de laboratorio e imagen.
                  </p>
                </div>

                <TabsList className="bg-muted/60 p-1">
                  <TabsTrigger value="adjuntos" className="text-xs gap-1.5 cursor-pointer">
                    <ImageIcon className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Visor de Estudios & Lab</span>
                  </TabsTrigger>
                  <TabsTrigger value="solicitados" className="text-xs gap-1.5 cursor-pointer">
                    <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Órdenes a Solicitar ({estudios.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="adjuntos" className="mt-4">
                {consulta.paciente_id ? (
                  <EstudiosArchivosTab
                    pacienteId={consulta.paciente_id}
                    consultaId={consulta.id}
                    medicoId={consulta.medico_id || undefined}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Paciente no seleccionado</p>
                )}
              </TabsContent>

              <TabsContent value="solicitados" className="mt-4 space-y-4">
                <EstudiosSolicitadosWidget
                  estudios={estudios}
                  onAdd={(est) => setEstudios((prev) => [...prev, est])}
                  onAddBatch={(batch) => setEstudios((prev) => [...prev, ...batch])}
                  onRemove={(idx) => setEstudios((prev) => prev.filter((_, i) => i !== idx))}
                  readOnly={readOnly}
                  especialidadNombre={consulta.especialidad?.nombre}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ======================================================== */}
        {/* ── PASO 5: PRESCRIPCIÓN MÉDICA Y REPOSO ─────────────── */}
        {/* ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6">
            {/* SECCIÓN 1: CARRITO DE MEDICAMENTOS */}
            <div className="space-y-4">
              <PrescripcionRecetaWidget
                medicamentos={medicamentos}
                recetaAnterior={consulta.consulta_previa?.receta_medica}
                onImportarRecetaAnterior={(meds) => {
                  setMedicamentos((prev) => [...prev, ...meds]);
                  toast.success(`${meds.length} medicamento(s) importados de la consulta previa`);
                }}
                onAdd={(med) => setMedicamentos((prev) => [...prev, med])}
                onAddBatch={(batch) => setMedicamentos((prev) => [...prev, ...batch])}
                onRemove={(idx) => setMedicamentos((prev) => prev.filter((_, i) => i !== idx))}
                readOnly={readOnly}
                especialidadNombre={consulta.especialidad?.nombre}
              />
            </div>

            {/* SECCIÓN 2: REPOSO MÉDICO (LICENCIA) */}
            <div className="pt-4 border-t border-border/70 space-y-4">
              <Card className="border-border/80 bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-primary" />
                    <div>
                      <div className="text-sm font-bold text-foreground">
                        Emisión de Reposo Médico / Licencia Laboral
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Indique si el paciente requiere descanso médico domiciliario o incapacidad temporal.
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={reposo.requiere_reposo}
                    onCheckedChange={(checked) =>
                      setReposo((prev) => ({ ...prev, requiere_reposo: checked }))
                    }
                    disabled={readOnly}
                  />
                </CardContent>
              </Card>

              {reposo.requiere_reposo && (
                <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Fecha Inicio</Label>
                        <Input
                          type="date"
                          value={reposo.fecha_inicio}
                          onChange={(e) =>
                            setReposo((prev) => ({ ...prev, fecha_inicio: e.target.value }))
                          }
                          disabled={readOnly}
                          className="h-10 bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Fecha Fin</Label>
                        <Input
                          type="date"
                          value={reposo.fecha_fin}
                          onChange={(e) =>
                            setReposo((prev) => ({ ...prev, fecha_fin: e.target.value }))
                          }
                          disabled={readOnly}
                          className="h-10 bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Días Totales Calculados</Label>
                        <div className="h-10 flex items-center px-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-sm">
                          {reposo.dias_reposo} {reposo.dias_reposo === 1 ? 'Día' : 'Días de Reposo'}
                        </div>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs font-semibold">Motivo / Diagnóstico del Reposo</Label>
                        <Input
                          value={reposo.motivo_diagnostico || ''}
                          onChange={(e) =>
                            setReposo((prev) => ({
                              ...prev,
                              motivo_diagnostico: e.target.value,
                            }))
                          }
                          placeholder="Ej: Cuadro infeccioso agudo que amerita aislamiento y reposo físico absoluto..."
                          disabled={readOnly}
                          className="h-10 bg-background"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs font-semibold">Observaciones y Recomendaciones</Label>
                        <Input
                          value={reposo.observaciones || ''}
                          onChange={(e) =>
                            setReposo((prev) => ({
                              ...prev,
                              observaciones: e.target.value,
                            }))
                          }
                          placeholder="Ej: Reposo en cama, hidratación abundante, control en 72 horas..."
                          disabled={readOnly}
                          className="h-10 bg-background"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ── PASO 6: DIAGNÓSTICO CIE-10, RESUMEN Y CIERRE ─────── */}
        {/* ======================================================== */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                {/* Diagnóstico Principal */}
                <Card className="border-border/80">
                  <CardContent className="p-5 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>
                          Diagnóstico Principal (CIE-10 / Juicio Clínico){' '}
                          <span className="text-destructive">*</span>
                        </span>
                      </Label>
                      <Input
                        value={diagnosticoPrincipal}
                        onChange={(e) => setDiagnosticoPrincipal(e.target.value)}
                        placeholder="Ej: J00 Rinofaringitis aguda (Resfriado común)"
                        disabled={readOnly}
                        className="h-10 text-sm font-semibold"
                      />

                      {/* ── CATÁLOGO INTELIGENTE DE CIE-10 POR ESPECIALIDAD ── */}
                      {!readOnly && (
                        <div className="pt-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Sparkles className="size-3.5 text-amber-500" />
                              <span>Catálogo Clínico CIE-10 por Especialidad:</span>
                            </span>
                            {consulta.especialidad?.nombre && (
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                {consulta.especialidad.nombre}
                              </Badge>
                            )}
                          </div>

                          {/* Buscador y Categorías de Filtro */}
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Filtrar por código CIE-10 o nombre (ej: Hipertensión, J00, Caries)..."
                                value={cieBusqueda}
                                onChange={(e) => setCieBusqueda(e.target.value)}
                                className="h-8 pl-8 text-xs bg-background"
                              />
                              {cieBusqueda && (
                                <button
                                  type="button"
                                  onClick={() => setCieBusqueda('')}
                                  className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  &times;
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {[
                                { id: 'especialidad', label: `⭐ Sugeridos` },
                                { id: 'todos', label: 'Todos' },
                                { id: 'General', label: 'General' },
                                { id: 'Cardiología', label: 'Cardio' },
                                { id: 'Pediatría', label: 'Pediatría' },
                                { id: 'Ginecología', label: 'Gineco / Obst' },
                                { id: 'Traumatología', label: 'Trauma' },
                                { id: 'Dermatología', label: 'Dermato' },
                                { id: 'Odontología', label: 'Odonto' },
                                { id: 'Oftalmología', label: 'Oftalmo' },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setCieFiltroCategoria(cat.id)}
                                  className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer border ${
                                    cieFiltroCategoria === cat.id
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-background hover:bg-muted text-muted-foreground border-border/70'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Lista Filtrada de Códigos CIE-10 */}
                          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl border border-border/80 bg-muted/20">
                            {(() => {
                              const espNombre = (consulta.especialidad?.nombre || '').toLowerCase();
                              let lista = CIE10_CATALOGO_ESPECIALIDADES;

                              if (cieFiltroCategoria === 'especialidad') {
                                const filtrados = lista.filter(
                                  (item) =>
                                    item.especialidad.toLowerCase().includes(espNombre) ||
                                    espNombre.includes(item.especialidad.toLowerCase().split(' ')[0])
                                );
                                lista = filtrados.length > 0 ? filtrados : lista.filter((i) => i.especialidad === 'General');
                              } else if (cieFiltroCategoria !== 'todos') {
                                lista = lista.filter((item) => item.especialidad === cieFiltroCategoria);
                              }

                              if (cieBusqueda.trim()) {
                                const q = cieBusqueda.toLowerCase().trim();
                                lista = CIE10_CATALOGO_ESPECIALIDADES.filter(
                                  (item) =>
                                    item.codigo.toLowerCase().includes(q) ||
                                    item.descripcion.toLowerCase().includes(q)
                                );
                              }

                              if (lista.length === 0) {
                                return (
                                  <div className="p-4 text-center text-xs text-muted-foreground">
                                    No se encontraron diagnósticos CIE-10 para esta búsqueda.
                                  </div>
                                );
                              }

                              return lista.map((cie) => (
                                <div
                                  key={cie.codigo}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/60 hover:border-primary/40 transition-colors shadow-2xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs text-primary shrink-0">
                                        {cie.codigo}
                                      </span>
                                      <span className="text-xs text-foreground font-medium truncate">
                                        {cie.descripcion}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                      {cie.especialidad}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDiagnosticoPrincipal(`${cie.codigo} - ${cie.descripcion}`)
                                      }
                                      className="text-[10.5px] px-2 py-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold transition-colors cursor-pointer"
                                      title="Establecer como Diagnóstico Principal"
                                    >
                                      Principal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAgregarDiagSecundarioConTexto(
                                          `${cie.codigo} - ${cie.descripcion}`
                                        )
                                      }
                                      className="text-[10.5px] px-1.5 py-1 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                                      title="Añadir a Diagnósticos Secundarios"
                                    >
                                      + Secundario
                                    </button>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Diagnósticos Secundarios */}
                <Card className="border-border/80">
                  <CardContent className="p-5 space-y-3">
                    <Label className="text-xs font-semibold">
                      Diagnósticos Secundarios / Comorbilidades
                    </Label>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <Input
                          value={nuevoDiagSecundario}
                          onChange={(e) => setNuevoDiagSecundario(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarDiagSecundario();
                            }
                          }}
                          placeholder="Añadir diagnóstico secundario..."
                          className="h-10"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAgregarDiagSecundario}
                          className="h-10 shrink-0 font-semibold"
                        >
                          Añadir
                        </Button>
                      </div>
                    )}

                    {diagnosticosSecundarios.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {diagnosticosSecundarios.map((diag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs py-1.5 px-3 gap-2 bg-muted"
                          >
                            <span>{diag}</span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleEliminarDiagSecundario(idx)}
                                className="text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                &times;
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-6 space-y-4">
                {/* Plan de Tratamiento */}
                <Card className="border-border/80">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Plan de Tratamiento Integral y Conducta Médica
                      </Label>
                      <Textarea
                        value={planTratamiento}
                        onChange={(e) => setPlanTratamiento(e.target.value)}
                        placeholder="Medidas generales, control de síntomas, signos de alarma por los que debe acudir a urgencias..."
                        disabled={readOnly}
                        rows={4}
                      />
                    </div>

                    {/* Indicaciones Generales */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Indicaciones Generales y Recomendaciones Higiénico-Dietéticas
                      </Label>
                      <Textarea
                        value={indicacionesGenerales}
                        onChange={(e) => setIndicacionesGenerales(e.target.value)}
                        placeholder="Dieta blanda fraccionada, abundante ingesta de líquidos (2L/día), evitar exposición a cambios bruscos de temperatura..."
                        disabled={readOnly}
                        rows={4}
                      />
                    </div>

                    {/* Próximo Control / Cita de Seguimiento */}
                    <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>Próxima Consulta de Control / Seguimiento</span>
                        </Label>
                        {fechaProximoControl && (
                          <button
                            type="button"
                            onClick={() => {
                              setFechaProximoControl('');
                              setDatosPlantilla((prev) => ({ ...prev, fecha_proximo_control: '' }));
                            }}
                            className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            Limpiar fecha
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                        <Input
                          type="date"
                          value={fechaProximoControl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFechaProximoControl(val);
                            setDatosPlantilla((prev) => ({ ...prev, fecha_proximo_control: val }));
                          }}
                          disabled={readOnly}
                          className="h-9 w-full sm:w-48 bg-background font-mono text-xs"
                        />

                        {/* Botones sugeridos de control rápido */}
                        {!readOnly && (
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'En 7 días', dias: 7 },
                              { label: 'En 15 días', dias: 15 },
                              { label: 'En 1 mes', dias: 30 },
                              { label: 'En 3 meses', dias: 90 },
                              { label: 'En 6 meses', dias: 180 },
                            ].map((sug) => (
                              <button
                                key={sug.label}
                                type="button"
                                onClick={() => {
                                  const target = new Date();
                                  target.setDate(target.getDate() + sug.dias);
                                  const isoDate = target.toISOString().split('T')[0];
                                  setFechaProximoControl(isoDate);
                                  setDatosPlantilla((prev) => ({
                                    ...prev,
                                    fecha_proximo_control: isoDate,
                                    proximo_control_sugerido: sug.label,
                                  }));
                                }}
                                className="text-[11px] px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/15 text-primary font-medium transition-colors cursor-pointer"
                              >
                                {sug.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── RESUMEN CONSOLIDADO DE LA ATENCIÓN MÉDICA ── */}
            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Resumen Consolidado de la Consulta
                  </h4>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Imprimir Documentos</span>
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() => handleAbrirImpresion('informe')}
                        className="cursor-pointer gap-2 py-2"
                      >
                        <FileText className="h-4 w-4 text-sky-500" />
                        <span>Informe Médico</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleAbrirImpresion('receta')}
                        className="cursor-pointer gap-2 py-2"
                      >
                        <Pill className="h-4 w-4 text-emerald-500" />
                        <div className="flex items-center justify-between w-full">
                          <span>Receta Médica (Rx)</span>
                          {medicamentos.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {medicamentos.length}
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleAbrirImpresion('estudios')}
                        className="cursor-pointer gap-2 py-2"
                      >
                        <FlaskConical className="h-4 w-4 text-violet-500" />
                        <div className="flex items-center justify-between w-full">
                          <span>Orden de Estudios</span>
                          {estudios.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {estudios.length}
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleAbrirImpresion('reposo')}
                        className="cursor-pointer gap-2 py-2"
                      >
                        <BedDouble className="h-4 w-4 text-amber-500" />
                        <div className="flex items-center justify-between w-full">
                          <span>Reposo Médico</span>
                          {reposo.requiere_reposo && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              {reposo.dias_reposo}d
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleAbrirImpresion('constancia')}
                        className="cursor-pointer gap-2 py-2"
                      >
                        <FileCheck2 className="h-4 w-4 text-indigo-500" />
                        <span>Constancia de Asistencia</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4 text-xs">
                  {/* Fila 1: Paciente y Vitals */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-3 border-b border-border/60">
                    <div>
                      <span className="text-muted-foreground">Paciente:</span>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        {consulta.paciente?.nombres} {consulta.paciente?.apellidos}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Diagnóstico Principal:</span>
                      <p className="font-bold text-sm text-primary mt-0.5">
                        {diagnosticoPrincipal || 'Pendiente de registrar'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Constantes Vitales:</span>
                      <p className="font-medium text-foreground mt-0.5">
                        PA: {signosVitales.presion_sistolica || '-'}/
                        {signosVitales.presion_diastolica || '-'} mmHg | FC:{' '}
                        {signosVitales.frecuencia_cardiaca || '-'} lpm | Temp:{' '}
                        {signosVitales.temperatura || '-'} °C
                      </p>
                    </div>
                  </div>

                  {/* Fila intermedia: Referido para si aplica */}
                  {referidoPara && (
                    <div className="pb-3 border-b border-border/60 flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold">Referido para / Interconsulta:</span>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                        {referidoPara}
                      </Badge>
                    </div>
                  )}

                  {/* Fila 2: Medicamentos prescritos y Estudios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <span className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                        <Pill className="h-4 w-4 text-primary" />
                        Medicamentos Prescritos ({medicamentos.length}):
                      </span>
                      {medicamentos.length > 0 ? (
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                          {medicamentos.map((m, i) => (
                            <li key={i} className="text-foreground/90 font-medium">
                              {m.medicamento} ({m.presentacion || 'Std'}) — {m.dosis} cada{' '}
                              {m.frecuencia} por {m.duracion}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground italic mt-1">Sin medicamentos</p>
                      )}
                    </div>

                    <div>
                      <span className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        Estudios Solicitados ({estudios.length}):
                      </span>
                      {estudios.length > 0 ? (
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                          {estudios.map((e, i) => (
                            <li key={i} className="text-foreground/90 font-medium">
                              {e.nombre} ({e.categoria}) {e.urgente ? '— [URGENTE]' : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground italic mt-1">Sin estudios ordenados</p>
                      )}
                    </div>
                  </div>

                  {/* Próximo control programado */}
                  {fechaProximoControl && (
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-sky-600" />
                        Próxima Cita / Control Sugerido:
                      </span>
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs font-bold gap-1 py-1 px-2.5">
                        {new Date(fechaProximoControl + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Badge>
                    </div>
                  )}

                  {/* Reposo médico si aplica */}
                  {reposo.requiere_reposo && (
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold">
                      <span>
                        ⚠️ Reposo Médico otorgado por {reposo.dias_reposo} día(s) (Desde:{' '}
                        {reposo.fecha_inicio} Hasta: {reposo.fecha_fin})
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── BARRA INFERIOR FLOTANTE DE NAVEGACIÓN Y GUARDADO ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border/80 py-3.5 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isFirstStep && prevStep !== null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(prevStep)}
                className="gap-1.5 h-10 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Paso Anterior</span>
              </Button>
            )}
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline ml-2">
              Paso {currentStepIndex + 1} de {stepsList.length} — {stepsList[currentStepIndex]?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!readOnly && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGuardarBorrador}
                disabled={saving || finalizing}
                className="gap-1.5 h-10 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Borrador'}</span>
              </Button>
            )}

            {!isLastStep && nextStep !== null ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentStep(nextStep)}
                className="gap-1.5 h-10 px-5 font-semibold cursor-pointer"
              >
                <span>Siguiente Paso</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : !readOnly ? (
              <Button
                type="button"
                size="sm"
                onClick={handleGuardarYFinalizar}
                disabled={saving || finalizing}
                className="gap-2 h-10 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{finalizing ? 'Finalizando...' : 'Guardar y Finalizar Consulta'}</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/clinica/consultas/atendidas')}
                className="h-10 px-6 font-semibold cursor-pointer"
              >
                Volver a Consultas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL DE IMPRESIÓN DE DOCUMENTOS CLÍNICOS ── */}
      <DocumentosImpresionModal
        open={impresionModalOpen}
        onOpenChange={setImpresionModalOpen}
        consulta={consulta}
        initialDocumento={documentoInicialImpresion}
      />

      {/* ── EXPEDIENTE CLÍNICO LONGITUDINAL DEL PACIENTE (DRAWER) ── */}
      <PatientRecordDrawer
        open={drawerHistorialOpen}
        onOpenChange={setDrawerHistorialOpen}
        paciente={consulta.paciente as any}
      />

      {/* ── MODAL DE CALCULADORAS Y UTILIDADES CLÍNICAS POR ESPECIALIDAD ── */}
      <CalculadorasClinicasModal
        open={calculadorasModalOpen}
        onOpenChange={setCalculadorasModalOpen}
        signosVitales={signosVitales}
        especialidadNombre={consulta.especialidad?.nombre}
        onInsertarEnEvaluacion={handleInsertarCalculoEnEvaluacion}
      />
    </div>
  );
};

export default ConsultaAtencionPage;
