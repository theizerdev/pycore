import React, { useState, useMemo } from 'react';
import type { EstudioSolicitado } from '../../api/consultas';
import type { EstudiosEspecialidadConfig, KitEstudioConfig, EstudioFrecuenteConfig } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  FlaskConical,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  Layers,
  Heart,
  Baby,
  Activity,
  Stethoscope,
  Smile,
  ShieldAlert,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from 'lucide-react';

const CATEGORIAS_ESTUDIOS = [
  'Laboratorio',
  'Rayos X',
  'Ecografía',
  'Tomografía',
  'Resonancia Magnética',
  'Endoscopía',
  'Anatomía Patológica',
  'Cardiología / ECG',
  'Otro',
];

// Catálogo por defecto para especialidades estándar (fallback en frontend)
const CATALOGO_DEFAULT_POR_ESPECIALIDAD: Record<string, { kits: KitEstudioConfig[]; frecuentes: EstudioFrecuenteConfig[] }> = {
  ginecologia: {
    kits: [
      {
        id: 'prenatal',
        nombre: 'Perfil Prenatal / Obstétrico',
        descripcion: 'Control obstétrico basal preventivo',
        color: 'border-rose-300/80 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        icono: 'Baby',
        estudios: [
          { nombre: 'Hematología Completa', categoria: 'Laboratorio', justificacion: 'Control prenatal basal y descarte de anemia' },
          { nombre: 'Grupo Sanguíneo y Factor Rh', categoria: 'Laboratorio', justificacion: 'Prevención de isoinmunización Rh' },
          { nombre: 'Glicemia en Ayunas', categoria: 'Laboratorio', justificacion: 'Descarte de diabetes gestacional' },
          { nombre: 'Serología VDRL y VIH Rápida', categoria: 'Laboratorio', justificacion: 'Tamizaje infeccioso vertical' },
          { nombre: 'Serología Toxoplasmosis (IgG e IgM)', categoria: 'Laboratorio', justificacion: 'Detección de infección aguda' },
          { nombre: 'Examen de Orina y Urocultivo', categoria: 'Laboratorio', justificacion: 'Descarte de bacteriuria asintomática' },
          { nombre: 'Ecografía Obstétrica de Control', categoria: 'Ecografía', justificacion: 'Biometría y bienestar fetal' },
        ],
      },
      {
        id: 'gineco_anual',
        nombre: 'Control Ginecológico Anual',
        descripcion: 'Pesquisa citológica y control pélvico/mamario',
        color: 'border-pink-300/80 bg-pink-500/10 text-pink-700 dark:text-pink-300',
        icono: 'Sparkles',
        estudios: [
          { nombre: 'Citología Cervicovaginal (PAP)', categoria: 'Laboratorio', justificacion: 'Pesquisa oncológica cervical' },
          { nombre: 'Colposcopia Diagnóstica', categoria: 'Otro', justificacion: 'Evaluación microscópica de cuello uterino' },
          { nombre: 'Ecografía Transvaginal o Pélvica', categoria: 'Ecografía', justificacion: 'Evaluación de miometrio y ovarios' },
          { nombre: 'Mamografía Digital Bilateral', categoria: 'Rayos X', justificacion: 'Pesquisa mamaria anual' },
        ],
      },
    ],
    frecuentes: [
      { nombre: 'Citología Cervical / PAP', categoria: 'Laboratorio' },
      { nombre: 'Ecografía Transvaginal', categoria: 'Ecografía' },
      { nombre: 'Mamografía Digital Bilateral', categoria: 'Rayos X' },
      { nombre: 'Beta-hCG Cuantitativa', categoria: 'Laboratorio' },
      { nombre: 'Examen de Orina y Urocultivo', categoria: 'Laboratorio' },
      { nombre: 'Ecografía Mamaria Bilateral', categoria: 'Ecografía' },
      { nombre: 'Cultivo de Secreción Vaginal', categoria: 'Laboratorio' },
    ],
  },
  cardiologia: {
    kits: [
      {
        id: 'cardio_integral',
        nombre: 'Perfil Cardiovascular Integral',
        descripcion: 'Estratificación de riesgo aterogénico e isquémico',
        color: 'border-red-300/80 bg-red-500/10 text-red-700 dark:text-red-300',
        icono: 'Heart',
        estudios: [
          { nombre: 'Hemograma Completo y Plaquetas', categoria: 'Laboratorio', justificacion: 'Serie hematológica basal' },
          { nombre: 'Perfil Lipídico (Colesterol/Triglicéridos)', categoria: 'Laboratorio', justificacion: 'Estratificación de riesgo' },
          { nombre: 'Glicemia en Ayunas', categoria: 'Laboratorio', justificacion: 'Descarte de síndrome metabólico' },
          { nombre: 'Urea y Creatinina Sérica', categoria: 'Laboratorio', justificacion: 'Función renal basal' },
          { nombre: 'Electrocardiograma (ECG 12 derivaciones)', categoria: 'Cardiología / ECG', justificacion: 'Ritmo y morfología cardíaca' },
          { nombre: 'Ecocardiograma Transtorácico Doppler', categoria: 'Cardiología / ECG', justificacion: 'Fracción de eyección y válvulas' },
          { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X', justificacion: 'Silueta cardiovascular' },
        ],
      },
    ],
    frecuentes: [
      { nombre: 'Electrocardiograma (ECG 12 derivaciones)', categoria: 'Cardiología / ECG' },
      { nombre: 'Ecocardiograma Transtorácico Doppler', categoria: 'Cardiología / ECG' },
      { nombre: 'Holter de Ritmo Cardíaco 24h', categoria: 'Cardiología / ECG' },
      { nombre: 'MAPA (Monitoreo Presión 24h)', categoria: 'Cardiología / ECG' },
      { nombre: 'Perfil Lipídico Completo', categoria: 'Laboratorio' },
      { nombre: 'Troponina I Cuantitativa', categoria: 'Laboratorio' },
      { nombre: 'Dímero D', categoria: 'Laboratorio' },
      { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X' },
    ],
  },
  pediatria: {
    kits: [
      {
        id: 'pediatria_control',
        nombre: 'Control Pediátrico & Puericultura',
        descripcion: 'Control rutinario de niño sano y desarrollo',
        color: 'border-amber-300/80 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        icono: 'Baby',
        estudios: [
          { nombre: 'Hemograma Completo Pediátrico', categoria: 'Laboratorio', justificacion: 'Descarte de anemia infantil' },
          { nombre: 'Coproparasitológico Seriado', categoria: 'Laboratorio', justificacion: 'Descarte de parasitosis intestinal' },
          { nombre: 'Examen General de Orina', categoria: 'Laboratorio', justificacion: 'Control urinario pediátrico' },
          { nombre: 'Ferritina Sérica y Hierro Total', categoria: 'Laboratorio', justificacion: 'Depósitos de hierro' },
        ],
      },
    ],
    frecuentes: [
      { nombre: 'Hemograma Completo Pediátrico', categoria: 'Laboratorio' },
      { nombre: 'Coproparasitológico Seriado', categoria: 'Laboratorio' },
      { nombre: 'Examen General de Orina', categoria: 'Laboratorio' },
      { nombre: 'Proteína C Reactiva (PCR)', categoria: 'Laboratorio' },
      { nombre: 'Ferritina Sérica', categoria: 'Laboratorio' },
      { nombre: 'Radiografía de Tórax Pediátrica', categoria: 'Rayos X' },
    ],
  },
  'medicina general': {
    kits: [
      {
        id: 'metabolico',
        nombre: 'Perfil Metabólico & Diabetes',
        descripcion: 'Control integral de glucemia y lípidos',
        color: 'border-emerald-300/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        icono: 'Activity',
        estudios: [
          { nombre: 'Glucosa en Ayunas', categoria: 'Laboratorio', justificacion: 'Control glucémico' },
          { nombre: 'Hemoglobina Glicosilada (HbA1c)', categoria: 'Laboratorio', justificacion: 'Monitoreo de 3 meses' },
          { nombre: 'Perfil Lipídico Completo', categoria: 'Laboratorio', justificacion: 'Dislipidemia' },
          { nombre: 'Microalbuminuria en Orina', categoria: 'Laboratorio', justificacion: 'Nefropatía' },
          { nombre: 'Creatinina sérica y TFG', categoria: 'Laboratorio', justificacion: 'Función renal' },
        ],
      },
    ],
    frecuentes: [
      { nombre: 'Hemograma Completo', categoria: 'Laboratorio' },
      { nombre: 'Glicemia en Ayunas', categoria: 'Laboratorio' },
      { nombre: 'Perfil Lipídico Completo', categoria: 'Laboratorio' },
      { nombre: 'Urea y Creatinina', categoria: 'Laboratorio' },
      { nombre: 'Examen General de Orina', categoria: 'Laboratorio' },
      { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X' },
      { nombre: 'Ecografía Abdominal Completa', categoria: 'Ecografía' },
      { nombre: 'Electrocardiograma (ECG)', categoria: 'Cardiología / ECG' },
    ],
  },
  odontologia: {
    kits: [
      {
        id: 'odonto_maxilo',
        nombre: 'Perfil Radiográfico Odontológico',
        descripcion: 'Estudio de arcadas dentarias y maxilares',
        color: 'border-cyan-300/80 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        icono: 'Smile',
        estudios: [
          { nombre: 'Radiografía Panorámica Digital (Ortopantomografía)', categoria: 'Rayos X', justificacion: 'Evaluación integral' },
          { nombre: 'Radiografía Periapical Seriada', categoria: 'Rayos X', justificacion: 'Diagnóstico periodontal' },
          { nombre: 'Tomografía Cone Beam (CBCT) Maxilofacial', categoria: 'Tomografía', justificacion: 'Planificación 3D' },
        ],
      },
    ],
    frecuentes: [
      { nombre: 'Radiografía Panorámica Digital', categoria: 'Rayos X' },
      { nombre: 'Radiografía Periapical', categoria: 'Rayos X' },
      { nombre: 'Telerradiografía Lateral de Cráneo', categoria: 'Rayos X' },
      { nombre: 'Tomografía Cone Beam (CBCT)', categoria: 'Tomografía' },
    ],
  },
};

interface EstudiosSolicitadosWidgetProps {
  estudios: EstudioSolicitado[];
  onAdd: (estudio: EstudioSolicitado) => void;
  onAddBatch?: (estudios: EstudioSolicitado[]) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
  especialidadNombre?: string;
  estudiosSugeridos?: EstudiosEspecialidadConfig | null;
}

export const EstudiosSolicitadosWidget: React.FC<EstudiosSolicitadosWidgetProps> = ({
  estudios,
  onAdd,
  onAddBatch,
  onRemove,
  readOnly = false,
  especialidadNombre = '',
  estudiosSugeridos,
}) => {
  const [nuevoEstudio, setNuevoEstudio] = useState<EstudioSolicitado>({
    nombre: '',
    categoria: 'Laboratorio',
    justificacion_clinica: '',
    urgente: false,
    indicaciones_preparacion: '',
  });

  const [kitExpandido, setKitExpandido] = useState<string | null>(null);
  const [mostrarFormManual, setMostrarFormManual] = useState<boolean>(false);
  const [filtroEspecialidadSeleccionada, setFiltroEspecialidadSeleccionada] = useState<string>('');

  // Normalizar nombre de especialidad para buscar en catálogo
  const normalizarNombreEsp = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Obtener la configuración dinámica de estudios de la especialidad actual
  const configEspecialidadActual = useMemo(() => {
    // 1. Si la plantilla efectiva ya trajo estudios configurados por el administrador
    if (estudiosSugeridos && (estudiosSugeridos.kits?.length || estudiosSugeridos.frecuentes?.length)) {
      return {
        kits: estudiosSugeridos.kits || [],
        frecuentes: estudiosSugeridos.frecuentes || [],
        esDinamicoDePlantilla: true,
      };
    }

    // 2. Si se seleccionó otra especialidad manualmente en el selector
    const targetNombre = filtroEspecialidadSeleccionada || especialidadNombre;
    const cleanName = normalizarNombreEsp(targetNombre);

    for (const [key, data] of Object.entries(CATALOGO_DEFAULT_POR_ESPECIALIDAD)) {
      if (cleanName.includes(key) || key.includes(cleanName.split(' ')[0])) {
        return {
          kits: data.kits,
          frecuentes: data.frecuentes,
          esDinamicoDePlantilla: false,
        };
      }
    }

    // 3. Fallback a medicina general
    return {
      kits: CATALOGO_DEFAULT_POR_ESPECIALIDAD['medicina general'].kits,
      frecuentes: CATALOGO_DEFAULT_POR_ESPECIALIDAD['medicina general'].frecuentes,
      esDinamicoDePlantilla: false,
    };
  }, [estudiosSugeridos, especialidadNombre, filtroEspecialidadSeleccionada]);

  const handleAgregarManual = () => {
    if (!nuevoEstudio.nombre.trim()) return;
    onAdd({ ...nuevoEstudio });
    setNuevoEstudio({
      nombre: '',
      categoria: 'Laboratorio',
      justificacion_clinica: '',
      urgente: false,
      indicaciones_preparacion: '',
    });
    setMostrarFormManual(false);
    toast.success(`Estudio "${nuevoEstudio.nombre}" solicitado`);
  };

  const handleSugerenciaRapida = (sug: { nombre: string; categoria: string; justificacion?: string }) => {
    if (estudios.some((e) => e.nombre.toLowerCase() === sug.nombre.toLowerCase())) {
      toast.info(`"${sug.nombre}" ya está en la orden`);
      return;
    }
    onAdd({
      nombre: sug.nombre,
      categoria: sug.categoria,
      justificacion_clinica: sug.justificacion || `Solicitud clínica de control en consulta`,
      urgente: false,
      indicaciones_preparacion: sug.categoria === 'Laboratorio' ? 'Ayuno mínimo de 8 horas' : '',
    });
    toast.success(`Estudio "${sug.nombre}" añadido`);
  };

  const handleAplicarKit = (kit: KitEstudioConfig) => {
    const nuevos: EstudioSolicitado[] = kit.estudios
      .filter((item) => !estudios.some((e) => e.nombre.toLowerCase() === item.nombre.toLowerCase()))
      .map((item) => ({
        nombre: item.nombre,
        categoria: item.categoria,
        justificacion_clinica: item.justificacion || `Solicitud por protocolo de ${kit.nombre}`,
        urgente: false,
        indicaciones_preparacion: item.categoria === 'Laboratorio' ? 'Ayuno mínimo de 8 horas' : '',
      }));

    if (nuevos.length === 0) {
      toast.info(`Todos los estudios del ${kit.nombre} ya están en la orden`);
      return;
    }

    if (onAddBatch) {
      onAddBatch(nuevos);
    } else {
      nuevos.forEach((e) => onAdd(e));
    }
    toast.success(`Se agregaron ${nuevos.length} estudios del ${kit.nombre}`);
  };

  const totalEstudiosSugeridos = configEspecialidadActual.frecuentes.length;
  const totalKits = configEspecialidadActual.kits.length;

  return (
    <div className="space-y-5">
      {/* ── RENGLÓN UNIFICADO Y DINÁMICO POR ESPECIALIDAD ── */}
      {!readOnly && (
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
          {/* Header del Renglón de Estudios */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Layers className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    Estudios y Perfiles Diagnósticos
                  </h4>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 font-semibold">
                    {especialidadNombre || 'Consulta General'}
                  </Badge>
                  {configEspecialidadActual.esDinamicoDePlantilla && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                      ✓ Plantilla Dinámica
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Kits agrupados y estudios frecuentes recomendados para esta especialidad (1 Clic para añadir).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={mostrarFormManual ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setMostrarFormManual(!mostrarFormManual)}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{mostrarFormManual ? 'Ocultar Formulario' : 'Estudio Personalizado'}</span>
              </Button>
            </div>
          </div>

          {/* Sub-renglón A: Kits y Perfiles de la Especialidad */}
          {totalKits > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>Perfiles y Kits Completos ({totalKits}):</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {configEspecialidadActual.kits.map((kit) => {
                  const isExpanded = kitExpandido === kit.id;
                  const yaEnLista = kit.estudios.filter((s) =>
                    estudios.some((e) => e.nombre.toLowerCase() === s.nombre.toLowerCase())
                  ).length;
                  const todosAgregados = yaEnLista === kit.estudios.length;

                  return (
                    <div
                      key={kit.id}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${kit.color || 'border-border/70 bg-muted/20'}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <strong className="text-foreground text-xs leading-tight">
                            {kit.nombre}
                          </strong>
                          <Badge variant="outline" className="text-[10px] bg-background/80 shrink-0 font-semibold">
                            {kit.estudios.length} estudios
                          </Badge>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {kit.descripcion || kit.estudios.map((e) => e.nombre).join(', ')}
                        </p>

                        {isExpanded && (
                          <ul className="mt-2 pt-2 border-t border-border/50 space-y-1 text-[11px] max-h-36 overflow-y-auto">
                            {kit.estudios.map((e, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-foreground">
                                <span className="size-1.5 rounded-full bg-primary shrink-0" />
                                <span className="truncate">{e.nombre}</span>
                                <span className="text-[9.5px] text-muted-foreground shrink-0">({e.categoria})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => setKitExpandido(isExpanded ? null : kit.id)}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                        >
                          {isExpanded ? 'Ocultar' : 'Ver detalle'}
                        </button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={todosAgregados}
                          onClick={() => handleAplicarKit(kit)}
                          className={`h-7 text-xs px-2.5 font-semibold cursor-pointer ${
                            todosAgregados
                              ? 'bg-muted text-muted-foreground opacity-60'
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs'
                          }`}
                        >
                          {todosAgregados ? (
                            <span className="flex items-center gap-1">
                              <Check className="size-3" /> Agregado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Plus className="size-3" />
                              {yaEnLista > 0 ? `+${kit.estudios.length - yaEnLista} rest.` : 'Añadir Perfil'}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-renglón B: Estudios Individuales Frecuentes de la Especialidad */}
          {totalEstudiosSugeridos > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Estudios Individuales Frecuentes ({especialidadNombre}):</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Clic para agregar a la orden</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {configEspecialidadActual.frecuentes.map((sug, i) => {
                  const agregado = estudios.some((e) => e.nombre.toLowerCase() === sug.nombre.toLowerCase());
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSugerenciaRapida(sug)}
                      disabled={agregado}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all shadow-2xs font-medium cursor-pointer ${
                        agregado
                          ? 'bg-muted text-muted-foreground border-border/50 opacity-60 cursor-default'
                          : 'border-border bg-background hover:border-primary hover:text-primary'
                      }`}
                      title={sug.categoria}
                    >
                      {agregado ? '✓ ' : '+ '}
                      {sug.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario de Solicitud de Estudio Manual (Colapsable) */}
      {!readOnly && mostrarFormManual && (
        <div className="p-4 rounded-xl border border-sky-200/70 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-950/20 space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-semibold text-xs">
              <FlaskConical className="size-4" />
              <span>Solicitar Examen Diagnóstico Manual o No Listado</span>
            </div>
            <button
              type="button"
              onClick={() => setMostrarFormManual(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Nombre del Estudio / Procedimiento *</Label>
              <Input
                placeholder="Ej. Resonancia Magnética de Columna Lumbar"
                value={nuevoEstudio.nombre}
                onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, nombre: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select
                value={nuevoEstudio.categoria}
                onValueChange={(val) => setNuevoEstudio({ ...nuevoEstudio, categoria: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ESTUDIOS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <Switch
                checked={nuevoEstudio.urgente}
                onCheckedChange={(checked) => setNuevoEstudio({ ...nuevoEstudio, urgente: checked })}
                id="estudio-urgente"
              />
              <Label htmlFor="estudio-urgente" className="text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer">
                Marcar Urgente
              </Label>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Justificación Clínica</Label>
              <Input
                placeholder="Ej. Sospecha de hernia discal / lumbociatalgia aguda"
                value={nuevoEstudio.justificacion_clinica ?? ''}
                onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, justificacion_clinica: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Indicaciones de Preparación</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej. Ayuno de 8 horas, traer estudios previos"
                  value={nuevoEstudio.indicaciones_preparacion ?? ''}
                  onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, indicaciones_preparacion: e.target.value })}
                  className="h-9 text-xs"
                />
                <Button
                  type="button"
                  onClick={handleAgregarManual}
                  disabled={!nuevoEstudio.nombre.trim()}
                  className="bg-sky-600 hover:bg-sky-700 text-white shrink-0 px-3.5 h-9 text-xs cursor-pointer"
                >
                  <Plus className="size-3.5 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA DE ÓRDENES Y ESTUDIOS SOLICITADOS EN ESTA ATENCIÓN ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Estudios Solicitados en la Consulta ({estudios.length})</span>
            {estudios.length > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {estudios.filter((e) => e.urgente).length > 0 && (
                  <span className="text-rose-600 mr-1">
                    {estudios.filter((e) => e.urgente).length} urgente(s) ·
                  </span>
                )}
                {estudios.length} total
              </Badge>
            )}
          </h4>
        </div>

        {estudios.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs space-y-1">
            <FlaskConical className="size-7 mx-auto opacity-40 text-primary" />
            <p className="font-semibold text-foreground">No se han ordenado estudios diagnósticos en esta atención.</p>
            <p>Haga clic en cualquiera de los kits o estudios frecuentes de la especialidad para agregarlos a la orden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {estudios.map((est, index) => (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <FlaskConical className="size-4 text-sky-600 shrink-0" />
                      <span>{est.nombre}</span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-muted-foreground hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Eliminar de la orden"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {est.categoria}
                    </Badge>
                    {est.urgente && (
                      <Badge variant="destructive" className="text-[11px] font-semibold gap-1">
                        <AlertCircle className="size-3" />
                        URGENTE
                      </Badge>
                    )}
                  </div>

                  {est.justificacion_clinica && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      <span className="font-medium text-foreground">Justificación:</span>{' '}
                      {est.justificacion_clinica}
                    </p>
                  )}

                  {est.indicaciones_preparacion && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg mt-2 font-medium">
                      Preparación: {est.indicaciones_preparacion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EstudiosSolicitadosWidget;
