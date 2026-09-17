import React, { useState, useMemo } from 'react';
import type { EstudioSolicitado } from '../../api/consultas';
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

// Kits de Estudios por Especialidad
interface KitEstudio {
  id: string;
  nombre: string;
  especialidadTag: string;
  icono: any;
  color: string;
  estudios: { nombre: string; categoria: string; justificacion?: string }[];
}

const KITS_ESPECIALIDADES: KitEstudio[] = [
  {
    id: 'cardio',
    nombre: 'Perfil Cardiovascular Integral',
    especialidadTag: 'Cardiología',
    icono: Heart,
    color: 'border-red-200 bg-red-50/50 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400',
    estudios: [
      { nombre: 'Hemograma Completo y Plaquetas', categoria: 'Laboratorio', justificacion: 'Descarte de anemia y respuesta hematológica' },
      { nombre: 'Perfil Lipídico (Colesterol, Triglicéridos, HDL, LDL)', categoria: 'Laboratorio', justificacion: 'Estratificación de riesgo aterogénico' },
      { nombre: 'Glicemia en Ayunas', categoria: 'Laboratorio', justificacion: 'Descarte de diabetes / síndrome metabólico' },
      { nombre: 'Urea y Creatinina Sérica', categoria: 'Laboratorio', justificacion: 'Evaluación de función renal basal' },
      { nombre: 'Electrocardiograma (ECG 12 derivaciones)', categoria: 'Cardiología / ECG', justificacion: 'Evaluación del ritmo cardíaco y morfología' },
      { nombre: 'Ecocardiograma Transtorácico Doppler', categoria: 'Cardiología / ECG', justificacion: 'Función ventricular y aparato valvular' },
      { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X', justificacion: 'Índice cardiotorácico y parénquima pulmonar' },
    ],
  },
  {
    id: 'prenatal',
    nombre: 'Perfil Prenatal / Obstétrico',
    especialidadTag: 'Ginecología / Obstetricia',
    icono: Baby,
    color: 'border-rose-200 bg-rose-50/50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400',
    estudios: [
      { nombre: 'Hematología Completa', categoria: 'Laboratorio', justificacion: 'Control prenatal basal' },
      { nombre: 'Grupo Sanguíneo y Factor Rh', categoria: 'Laboratorio', justificacion: 'Prevención de isoinmunización Rh' },
      { nombre: 'Glicemia en Ayunas', categoria: 'Laboratorio', justificacion: 'Descarte de diabetes gestacional' },
      { nombre: 'Serología VDRL y VIH Rápida', categoria: 'Laboratorio', justificacion: 'Tamizaje infeccioso de transmisión vertical' },
      { nombre: 'Serología Toxoplasmosis (IgG e IgM)', categoria: 'Laboratorio', justificacion: 'Detección de infección aguda en gestación' },
      { nombre: 'Examen de Orina y Urocultivo', categoria: 'Laboratorio', justificacion: 'Descarte de bacteriuria asintomática' },
      { nombre: 'Ecografía Obstétrica de Control', categoria: 'Ecografía', justificacion: 'Biometría y bienestar fetal' },
    ],
  },
  {
    id: 'pediatria',
    nombre: 'Control Pediátrico & Puericultura',
    especialidadTag: 'Pediatría',
    icono: Sparkles,
    color: 'border-amber-200 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400',
    estudios: [
      { nombre: 'Hemograma Completo', categoria: 'Laboratorio', justificacion: 'Descarte de anemia ferropénica infantil' },
      { nombre: 'Coproparasitológico Simple y Seriado', categoria: 'Laboratorio', justificacion: 'Descarte de parasitosis intestinal' },
      { nombre: 'Examen General de Orina', categoria: 'Laboratorio', justificacion: 'Control pediátrico rutinario' },
      { nombre: 'Ferritina Sérica y Hierro Total', categoria: 'Laboratorio', justificacion: 'Reserva de hierro corporal' },
    ],
  },
  {
    id: 'metabolico',
    nombre: 'Perfil Metabólico & Diabetes',
    especialidadTag: 'Medicina Interna',
    icono: Activity,
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400',
    estudios: [
      { nombre: 'Glucosa en Ayunas', categoria: 'Laboratorio', justificacion: 'Control glucémico' },
      { nombre: 'Hemoglobina Glicosilada (HbA1c)', categoria: 'Laboratorio', justificacion: 'Monitoreo de control glicémico últimos 3 meses' },
      { nombre: 'Perfil Lipídico Completo', categoria: 'Laboratorio', justificacion: 'Control de dislipidemia mixta' },
      { nombre: 'Microalbuminuria en Orina', categoria: 'Laboratorio', justificacion: 'Detección temprana de nefropatía diabética' },
      { nombre: 'Creatinina sérica y Tasa de Filtración Glomerular', categoria: 'Laboratorio', justificacion: 'Estadificación de función renal' },
    ],
  },
  {
    id: 'preoperatorio',
    nombre: 'Perfil Preoperatorio Estándar',
    especialidadTag: 'Cirugía / General',
    icono: ShieldAlert,
    color: 'border-blue-200 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400',
    estudios: [
      { nombre: 'Hemograma Completo y Recuento Plaquetario', categoria: 'Laboratorio', justificacion: 'Valoración prequirúrgica' },
      { nombre: 'Tiempos de Coagulación (TP, TTP, INR)', categoria: 'Laboratorio', justificacion: 'Evaluación de hemostasia y riesgo hemorrágico' },
      { nombre: 'Glicemia, Urea y Creatinina', categoria: 'Laboratorio', justificacion: 'Química sanguínea preoperatoria' },
      { nombre: 'Grupo Sanguíneo y Factor Rh', categoria: 'Laboratorio', justificacion: 'Reserva de hemoderivados prequirúrgicos' },
      { nombre: 'Electrocardiograma con Valoración Cardiovascular', categoria: 'Cardiología / ECG', justificacion: 'Riesgo quirúrgico cardiovascular Goldman' },
      { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X', justificacion: 'Evaluación pleuropulmonar preanestésica' },
    ],
  },
  {
    id: 'odontologia',
    nombre: 'Perfil Odontológico & Maxilofacial',
    especialidadTag: 'Odontología',
    icono: Smile,
    color: 'border-cyan-200 bg-cyan-50/50 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-900/50 dark:text-cyan-400',
    estudios: [
      { nombre: 'Radiografía Panorámica Digital (Ortopantomografía)', categoria: 'Rayos X', justificacion: 'Planificación integral de arcadas dentarias' },
      { nombre: 'Radiografía Periapical Seriada', categoria: 'Rayos X', justificacion: 'Diagnóstico endodóntico / periodontal' },
      { nombre: 'Tomografía Cone Beam (CBCT) Maxilofacial', categoria: 'Tomografía', justificacion: 'Evaluación ósea para implantes o cirugías complejas' },
    ],
  },
];

const ESTUDIOS_RAPIDOS = [
  { nombre: 'Hemograma Completo', categoria: 'Laboratorio' },
  { nombre: 'Perfil Lipídico (Colesterol/Triglicéridos)', categoria: 'Laboratorio' },
  { nombre: 'Glucosa en Ayunas', categoria: 'Laboratorio' },
  { nombre: 'Urea y Creatinina', categoria: 'Laboratorio' },
  { nombre: 'Examen General de Orina', categoria: 'Laboratorio' },
  { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X' },
  { nombre: 'Ecografía Abdominal Completa', categoria: 'Ecografía' },
  { nombre: 'Electrocardiograma (ECG)', categoria: 'Cardiología / ECG' },
  { nombre: 'Proteína C Reactiva (PCR)', categoria: 'Laboratorio' },
  { nombre: 'Urocultivo con Antibiograma', categoria: 'Laboratorio' },
];

interface EstudiosSolicitadosWidgetProps {
  estudios: EstudioSolicitado[];
  onAdd: (estudio: EstudioSolicitado) => void;
  onAddBatch?: (estudios: EstudioSolicitado[]) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
  especialidadNombre?: string;
}

export const EstudiosSolicitadosWidget: React.FC<EstudiosSolicitadosWidgetProps> = ({
  estudios,
  onAdd,
  onAddBatch,
  onRemove,
  readOnly = false,
  especialidadNombre = '',
}) => {
  const [nuevoEstudio, setNuevoEstudio] = useState<EstudioSolicitado>({
    nombre: '',
    categoria: 'Laboratorio',
    justificacion_clinica: '',
    urgente: false,
    indicaciones_preparacion: '',
  });

  const [kitExpandido, setKitExpandido] = useState<string | null>(null);

  // Ordenar kits priorizando la especialidad de la consulta médica
  const kitsOrdenados = useMemo(() => {
    if (!especialidadNombre) return KITS_ESPECIALIDADES;
    const espLower = especialidadNombre.toLowerCase();
    return [...KITS_ESPECIALIDADES].sort((a, b) => {
      const matchA =
        a.especialidadTag.toLowerCase().includes(espLower) ||
        espLower.includes(a.especialidadTag.toLowerCase().split(' ')[0]);
      const matchB =
        b.especialidadTag.toLowerCase().includes(espLower) ||
        espLower.includes(b.especialidadTag.toLowerCase().split(' ')[0]);
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [especialidadNombre]);

  const handleAgregar = () => {
    if (!nuevoEstudio.nombre.trim()) return;
    onAdd({ ...nuevoEstudio });
    setNuevoEstudio({
      nombre: '',
      categoria: 'Laboratorio',
      justificacion_clinica: '',
      urgente: false,
      indicaciones_preparacion: '',
    });
  };

  const handleSugerenciaRapida = (sug: { nombre: string; categoria: string }) => {
    // Evitar duplicar exactamente el mismo estudio si ya está
    if (estudios.some((e) => e.nombre.toLowerCase() === sug.nombre.toLowerCase())) {
      toast.info(`"${sug.nombre}" ya está en la lista`);
      return;
    }
    onAdd({
      nombre: sug.nombre,
      categoria: sug.categoria,
      justificacion_clinica: 'Evaluación y control médico en consulta',
      urgente: false,
      indicaciones_preparacion: '',
    });
    toast.success(`Estudio "${sug.nombre}" añadido`);
  };

  const handleAplicarKit = (kit: KitEstudio) => {
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
      toast.info(`Todos los estudios de este perfil ya fueron agregados`);
      return;
    }

    if (onAddBatch) {
      onAddBatch(nuevos);
    } else {
      nuevos.forEach((e) => onAdd(e));
    }
    toast.success(`Se agregaron ${nuevos.length} estudios del ${kit.nombre}`);
  };

  return (
    <div className="space-y-6">
      {/* ── KITS Y PERFILES POR ESPECIALIDAD (1-CLICK) ── */}
      {!readOnly && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layers className="size-4 text-primary" />
              <span>Perfiles y Kits Diagnósticos por Especialidad (1 Clic)</span>
            </div>
            {especialidadNombre && (
              <Badge variant="secondary" className="text-[11px] font-medium">
                Especialidad: {especialidadNombre}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kitsOrdenados.map((kit) => {
              const Icon = kit.icono;
              const isExpanded = kitExpandido === kit.id;
              const yaEnLista = kit.estudios.filter((s) =>
                estudios.some((e) => e.nombre.toLowerCase() === s.nombre.toLowerCase())
              ).length;

              return (
                <div
                  key={kit.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${kit.color}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span>{kit.nombre}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background/80 shrink-0">
                        {kit.estudios.length} estudios
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {kit.estudios.map((e) => e.nombre).join(', ')}
                    </p>

                    {isExpanded && (
                      <ul className="mt-2 pt-2 border-t border-border/50 space-y-1 text-[11px]">
                        {kit.estudios.map((e, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-foreground">
                            <span className="size-1.5 rounded-full bg-primary" />
                            <span>{e.nombre}</span>
                            <span className="text-[9.5px] text-muted-foreground">({e.categoria})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setKitExpandido(isExpanded ? null : kit.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAplicarKit(kit)}
                      className="h-7 text-xs px-2.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                    >
                      <Plus className="size-3.5 mr-1" />
                      {yaEnLista > 0 ? `Agregar (${kit.estudios.length - yaEnLista} restantes)` : 'Añadir Perfil'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sugerencias Rápidas Individuales */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Estudios Individuales Frecuentes:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ESTUDIOS_RAPIDOS.map((sug, i) => {
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
                >
                  {agregado ? '✓ ' : '+ '}
                  {sug.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulario de Solicitud de Estudio Manual */}
      {!readOnly && (
        <div className="p-5 rounded-xl border border-sky-200/70 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-950/20 space-y-4">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-semibold text-sm">
            <FlaskConical className="size-4.5" />
            <span>Solicitar Nuevo Examen o Estudio Diagnóstico Específico</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Nombre del Estudio / Procedimiento *
              </Label>
              <Input
                placeholder="Ej. Resonancia Magnética de Columna Lumbar"
                value={nuevoEstudio.nombre}
                onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, nombre: e.target.value })}
                className="mt-1 h-9.5 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select
                value={nuevoEstudio.categoria}
                onValueChange={(val) => setNuevoEstudio({ ...nuevoEstudio, categoria: val })}
              >
                <SelectTrigger className="mt-1 h-9.5 text-sm">
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

            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={nuevoEstudio.urgente}
                onCheckedChange={(checked) => setNuevoEstudio({ ...nuevoEstudio, urgente: checked })}
                id="estudio-urgente"
              />
              <Label htmlFor="estudio-urgente" className="text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer">
                Marcar como Urgente
              </Label>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Justificación Clínica</Label>
              <Input
                placeholder="Ej. Paciente con lumbociatalgia refractaria a analgesia"
                value={nuevoEstudio.justificacion_clinica ?? ''}
                onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, justificacion_clinica: e.target.value })}
                className="mt-1 h-9.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Indicaciones de Preparación para el Paciente
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Ej. Ayuno estricto de 8 horas, traer estudios previos"
                  value={nuevoEstudio.indicaciones_preparacion ?? ''}
                  onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, indicaciones_preparacion: e.target.value })}
                  className="h-9.5 text-sm"
                />
                <Button
                  type="button"
                  onClick={handleAgregar}
                  disabled={!nuevoEstudio.nombre.trim()}
                  className="bg-sky-600 hover:bg-sky-700 text-white shrink-0 px-4 h-9.5 cursor-pointer"
                >
                  <Plus className="size-4 mr-1" />
                  Solicitar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Estudios Solicitados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Estudios Solicitados ({estudios.length})</span>
            {estudios.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {estudios.filter((e) => e.urgente).length > 0 && (
                  <span className="text-rose-600 font-semibold mr-1">
                    {estudios.filter((e) => e.urgente).length} urgente(s) ·
                  </span>
                )}
                {estudios.length} total
              </Badge>
            )}
          </h4>
        </div>

        {estudios.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
            No se han solicitado estudios auxiliares en esta atención.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {estudios.map((est, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                      <FlaskConical className="size-4 text-sky-600 shrink-0" />
                      <span>{est.nombre}</span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-muted-foreground hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Eliminar estudio"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      {est.categoria}
                    </Badge>
                    {est.urgente && (
                      <Badge variant="destructive" className="text-xs font-semibold gap-1">
                        <AlertCircle className="size-3" />
                        URGENTE
                      </Badge>
                    )}
                  </div>

                  {est.justificacion_clinica && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium text-foreground">Justificación:</span>{' '}
                      {est.justificacion_clinica}
                    </p>
                  )}

                  {est.indicaciones_preparacion && (
                    <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg mt-2 font-medium">
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
