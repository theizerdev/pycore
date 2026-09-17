import React, { useState, useMemo } from 'react';
import type { MedicamentoPrescrito } from '../../api/consultas';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
  Pill,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Layers,
  Heart,
  Baby,
  Smile,
  Activity,
  ShieldAlert,
} from 'lucide-react';

const VIAS_ADMINISTRACION = [
  'Oral',
  'Intravenosa (IV)',
  'Intramuscular (IM)',
  'Subcutánea',
  'Tópica / Cutánea',
  'Oftálmica',
  'Ótica',
  'Inhalatoria / Nebulizada',
  'Sublingual',
  'Rectal',
];

const FRECUENCIAS_COMUNES = [
  'Cada 6 horas (4 veces al día)',
  'Cada 8 horas (3 veces al día)',
  'Cada 12 horas (2 veces al día)',
  'Cada 24 horas (1 vez al día)',
  'En la noche antes de dormir',
  'En ayunas por la mañana',
  'SOS / Según dolor o síntoma',
];

const DURACIONES_SUGERIDAS = [
  '3 días',
  '5 días',
  '7 días',
  '10 días',
  '14 días',
  '30 días',
  'Tratamiento continuo',
];

interface KitTratamiento {
  id: string;
  nombre: string;
  especialidadTag: string;
  icono: any;
  color: string;
  medicamentos: MedicamentoPrescrito[];
}

const KITS_TRATAMIENTOS: KitTratamiento[] = [
  {
    id: 'analgesia',
    nombre: 'Kit Analgesia / Dolor Agudo',
    especialidadTag: 'General / Traumatología',
    icono: Activity,
    color: 'border-orange-200 bg-orange-50/50 text-orange-800 dark:bg-orange-950/20 dark:border-orange-900/50 dark:text-orange-300',
    medicamentos: [
      {
        medicamento: 'Ibuprofeno',
        presentacion: 'Tabletas 400 mg',
        dosis: '1 tableta',
        via_administracion: 'Oral',
        frecuencia: 'Cada 8 horas (3 veces al día)',
        duracion: '5 días',
        instrucciones: 'Tomar inmediatamente después de las comidas',
      },
      {
        medicamento: 'Paracetamol',
        presentacion: 'Comprimidos 500 mg',
        dosis: '1 comprimido',
        via_administracion: 'Oral',
        frecuencia: 'SOS / Según dolor o síntoma',
        duracion: '5 días',
        instrucciones: 'Tomar en caso de dolor persistente o fiebre > 38°C (máximo 3g al día)',
      },
      {
        medicamento: 'Omeprazol',
        presentacion: 'Cápsulas 20 mg',
        dosis: '1 cápsula',
        via_administracion: 'Oral',
        frecuencia: 'En ayunas por la mañana',
        duracion: '7 días',
        instrucciones: 'Tomar 30 minutos antes del desayuno como gastroprotector',
      },
    ],
  },
  {
    id: 'respiratorio',
    nombre: 'Kit Respiratorio / Antialérgico',
    especialidadTag: 'Medicina General / ORL',
    icono: Sparkles,
    color: 'border-sky-200 bg-sky-50/50 text-sky-800 dark:bg-sky-950/20 dark:border-sky-900/50 dark:text-sky-300',
    medicamentos: [
      {
        medicamento: 'Cetirizina',
        presentacion: 'Comprimidos 10 mg',
        dosis: '1 comprimido',
        via_administracion: 'Oral',
        frecuencia: 'En la noche antes de dormir',
        duracion: '7 días',
        instrucciones: 'Tomar por la noche con agua',
      },
      {
        medicamento: 'Solución Fisiológica Nasal 0.9%',
        presentacion: 'Spray / Gotas Nasales',
        dosis: '2 aplicaciones en cada fosa nasal',
        via_administracion: 'Inhalatoria / Nebulizada',
        frecuencia: 'Cada 8 horas (3 veces al día)',
        duracion: '7 días',
        instrucciones: 'Hacer lavados nasales antes de sonarse',
      },
      {
        medicamento: 'Acetilcisteína',
        presentacion: 'Sobres efervescentes 600 mg',
        dosis: '1 sobre',
        via_administracion: 'Oral',
        frecuencia: 'Cada 24 horas (1 vez al día)',
        duracion: '5 días',
        instrucciones: 'Disolver en medio vaso de agua por la mañana',
      },
    ],
  },
  {
    id: 'odontologico',
    nombre: 'Kit Odontológico Post-Extracción',
    especialidadTag: 'Odontología',
    icono: Smile,
    color: 'border-teal-200 bg-teal-50/50 text-teal-800 dark:bg-teal-950/20 dark:border-teal-900/50 dark:text-teal-300',
    medicamentos: [
      {
        medicamento: 'Amoxicilina + Ácido Clavulánico',
        presentacion: 'Comprimidos 875/125 mg',
        dosis: '1 comprimido',
        via_administracion: 'Oral',
        frecuencia: 'Cada 12 horas (2 veces al día)',
        duracion: '7 días',
        instrucciones: 'Tomar puntual al inicio de las comidas principales',
      },
      {
        medicamento: 'Ketorolaco',
        presentacion: 'Tabletas sublinguales 10 mg',
        dosis: '1 tableta',
        via_administracion: 'Sublingual',
        frecuencia: 'Cada 8 horas (3 veces al día)',
        duracion: '3 días',
        instrucciones: 'Colocar bajo la lengua en caso de dolor moderado a severo',
      },
      {
        medicamento: 'Clorhexidina 0.12%',
        presentacion: 'Solución Colutorio Bucal 200 ml',
        dosis: '15 ml de enjuague durante 60 segundos',
        via_administracion: 'Tópica / Cutánea',
        frecuencia: 'Cada 12 horas (2 veces al día)',
        duracion: '7 días',
        instrucciones: 'Enjuagar suavemente sin escupir con fuerza. No ingerir alimentos 30 min después',
      },
    ],
  },
  {
    id: 'gastro',
    nombre: 'Kit Gastroenteritis / Hidratación',
    especialidadTag: 'Medicina General / Gastroenterología',
    icono: ShieldAlert,
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300',
    medicamentos: [
      {
        medicamento: 'Sales de Rehidratación Oral (SRO)',
        presentacion: 'Sobres para 1 Litro',
        dosis: '1 sobre disuelto en 1L de agua',
        via_administracion: 'Oral',
        frecuencia: 'SOS / Según dolor o síntoma',
        duracion: '3 días',
        instrucciones: 'Tomar a sorbos pequeños después de cada deposición diarreica o vómito',
      },
      {
        medicamento: 'Probióticos Multicepa (Saccharomyces boulardii)',
        presentacion: 'Cápsulas 250 mg',
        dosis: '1 cápsula',
        via_administracion: 'Oral',
        frecuencia: 'Cada 12 horas (2 veces al día)',
        duracion: '5 días',
        instrucciones: 'Tomar con un vaso de agua lejos de antibióticos',
      },
      {
        medicamento: 'Hioscina Butilbromuro',
        presentacion: 'Grageas 10 mg',
        dosis: '1 gragea',
        via_administracion: 'Oral',
        frecuencia: 'Cada 8 horas (3 veces al día)',
        duracion: '3 días',
        instrucciones: 'Tomar únicamente si presenta dolor cólico abdominal intenso',
      },
    ],
  },
  {
    id: 'cardio',
    nombre: 'Kit Hipertensión Inicial / Cardioprotección',
    especialidadTag: 'Cardiología / Medicina Interna',
    icono: Heart,
    color: 'border-red-200 bg-red-50/50 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300',
    medicamentos: [
      {
        medicamento: 'Losartán Potásico',
        presentacion: 'Comprimidos 50 mg',
        dosis: '1 comprimido',
        via_administracion: 'Oral',
        frecuencia: 'Cada 24 horas (1 vez al día)',
        duracion: '30 días',
        instrucciones: 'Tomar siempre a la misma hora en la mañana. Control diario de presión arterial',
      },
      {
        medicamento: 'Ácido Acetilsalicílico (Aspirina Protect)',
        presentacion: 'Comprimidos con recubrimiento entérico 100 mg',
        dosis: '1 comprimido',
        via_administracion: 'Oral',
        frecuencia: 'Cada 24 horas (1 vez al día)',
        duracion: '30 días',
        instrucciones: 'Tomar con el almuerzo',
      },
    ],
  },
  {
    id: 'pediatrico',
    nombre: 'Kit Pediátrico Básico (Fiebre y Molestias)',
    especialidadTag: 'Pediatría',
    icono: Baby,
    color: 'border-amber-200 bg-amber-50/50 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-300',
    medicamentos: [
      {
        medicamento: 'Paracetamol Jarabe Pediátrico',
        presentacion: 'Suspensión 120 mg / 5 ml',
        dosis: 'Según peso (10 a 15 mg/kg por toma)',
        via_administracion: 'Oral',
        frecuencia: 'Cada 6 horas (4 veces al día)',
        duracion: '3 días',
        instrucciones: 'Administrar con jeringa dosificadora sólo si fiebre > 38°C o dolor',
      },
      {
        medicamento: 'Solución Fisiológica Nasal Pediátrica',
        presentacion: 'Gotas Nasales Frasco Gotero',
        dosis: '3 a 4 gotas en cada fosa nasal',
        via_administracion: 'Inhalatoria / Nebulizada',
        frecuencia: 'Cada 6 horas (4 veces al día)',
        duracion: '5 días',
        instrucciones: 'Instilar antes de las tomas de leche y antes de dormir',
      },
    ],
  },
];

interface PrescripcionRecetaWidgetProps {
  medicamentos: MedicamentoPrescrito[];
  recetaAnterior?: MedicamentoPrescrito[] | null;
  onAdd: (med: MedicamentoPrescrito) => void;
  onAddBatch?: (meds: MedicamentoPrescrito[]) => void;
  onRemove: (index: number) => void;
  onImportarRecetaAnterior?: (meds: MedicamentoPrescrito[]) => void;
  readOnly?: boolean;
  especialidadNombre?: string;
}

export const PrescripcionRecetaWidget: React.FC<PrescripcionRecetaWidgetProps> = ({
  medicamentos,
  recetaAnterior,
  onAdd,
  onAddBatch,
  onRemove,
  onImportarRecetaAnterior,
  readOnly = false,
  especialidadNombre = '',
}) => {
  const [nuevoMed, setNuevoMed] = useState<MedicamentoPrescrito>({
    medicamento: '',
    presentacion: '',
    dosis: '',
    via_administracion: 'Oral',
    frecuencia: 'Cada 8 horas (3 veces al día)',
    duracion: '7 días',
    instrucciones: '',
  });

  const [kitExpandido, setKitExpandido] = useState<string | null>(null);

  // Ordenar kits priorizando la especialidad de la consulta médica
  const kitsOrdenados = useMemo(() => {
    if (!especialidadNombre) return KITS_TRATAMIENTOS;
    const espLower = especialidadNombre.toLowerCase();
    return [...KITS_TRATAMIENTOS].sort((a, b) => {
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
    if (!nuevoMed.medicamento.trim()) return;
    onAdd({ ...nuevoMed });
    setNuevoMed({
      medicamento: '',
      presentacion: '',
      dosis: '',
      via_administracion: 'Oral',
      frecuencia: 'Cada 8 horas (3 veces al día)',
      duracion: '7 días',
      instrucciones: '',
    });
    toast.success(`Fármaco "${nuevoMed.medicamento}" agregado a la receta`);
  };

  const handleAplicarKit = (kit: KitTratamiento) => {
    const nuevos = kit.medicamentos.filter(
      (m) => !medicamentos.some((med) => med.medicamento.toLowerCase() === m.medicamento.toLowerCase())
    );

    if (nuevos.length === 0) {
      toast.info('Todos los fármacos de este kit ya están en la receta');
      return;
    }

    if (onAddBatch) {
      onAddBatch(nuevos);
    } else {
      nuevos.forEach((m) => onAdd(m));
    }
    toast.success(`Se agregaron ${nuevos.length} fármacos del ${kit.nombre}`);
  };

  return (
    <div className="space-y-6">
      {/* Opción de Clonar / Importar Tratamiento Anterior */}
      {!readOnly && recetaAnterior && recetaAnterior.length > 0 && onImportarRecetaAnterior && (
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-xs sm:text-sm">
              <Clock className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Tratamiento de la Consulta Anterior Disponible ({recetaAnterior.length} fármacos)</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {recetaAnterior.map((m) => m.medicamento).filter(Boolean).join(', ')}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onImportarRecetaAnterior(recetaAnterior)}
            className="border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs shrink-0 cursor-pointer font-semibold"
          >
            ⚡ Clonar Tratamiento Previo
          </Button>
        </div>
      )}

      {/* ── COMBOS TERAPÉUTICOS Y KITS DE RECETA (1-CLIC) ── */}
      {!readOnly && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layers className="size-4 text-primary" />
              <span>Combos Terapéuticos Frecuentes por Especialidad (1 Clic)</span>
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
              const yaEnLista = kit.medicamentos.filter((m) =>
                medicamentos.some((med) => med.medicamento.toLowerCase() === m.medicamento.toLowerCase())
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
                        {kit.medicamentos.length} fármacos
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {kit.medicamentos.map((m) => `${m.medicamento} (${m.dosis})`).join(', ')}
                    </p>

                    {isExpanded && (
                      <ul className="mt-2 pt-2 border-t border-border/50 space-y-1.5 text-[11px]">
                        {kit.medicamentos.map((m, idx) => (
                          <li key={idx} className="p-1.5 rounded bg-background/70 border border-border/50">
                            <strong className="text-foreground">{m.medicamento}</strong> ·{' '}
                            <span className="text-muted-foreground">{m.presentacion}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {m.dosis} · {m.frecuencia} · {m.duracion}
                            </div>
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
                      {yaEnLista > 0 ? `Añadir (${kit.medicamentos.length - yaEnLista} restantes)` : 'Aplicar Kit'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulario de Prescripción Manual */}
      {!readOnly && (
        <div className="p-5 rounded-xl border border-teal-200/70 dark:border-teal-900/50 bg-teal-50/30 dark:bg-teal-950/20 space-y-4">
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-semibold text-sm">
            <Pill className="size-4.5" />
            <span>Agregar Medicamento o Fármaco Específico a la Receta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <Label className="text-xs text-muted-foreground">
                Nombre del Medicamento *
              </Label>
              <Input
                placeholder="Ej. Amoxicilina + Ácido Clavulánico"
                value={nuevoMed.medicamento}
                onChange={(e) => setNuevoMed({ ...nuevoMed, medicamento: e.target.value })}
                className="mt-1 h-9.5 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Presentación / Concentración
              </Label>
              <Input
                placeholder="Ej. Comprimidos 875/125 mg"
                value={nuevoMed.presentacion}
                onChange={(e) => setNuevoMed({ ...nuevoMed, presentacion: e.target.value })}
                className="mt-1 h-9.5 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Dosis por Toma
              </Label>
              <Input
                placeholder="Ej. 1 tableta"
                value={nuevoMed.dosis}
                onChange={(e) => setNuevoMed({ ...nuevoMed, dosis: e.target.value })}
                className="mt-1 h-9.5 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Vía de Administración
              </Label>
              <Select
                value={nuevoMed.via_administracion}
                onValueChange={(val) => setNuevoMed({ ...nuevoMed, via_administracion: val })}
              >
                <SelectTrigger className="mt-1 h-9.5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIAS_ADMINISTRACION.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Frecuencia de Toma
              </Label>
              <Select
                value={nuevoMed.frecuencia}
                onValueChange={(val) => setNuevoMed({ ...nuevoMed, frecuencia: val })}
              >
                <SelectTrigger className="mt-1 h-9.5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRECUENCIAS_COMUNES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Duración del Tratamiento
              </Label>
              <Select
                value={nuevoMed.duracion}
                onValueChange={(val) => setNuevoMed({ ...nuevoMed, duracion: val })}
              >
                <SelectTrigger className="mt-1 h-9.5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURACIONES_SUGERIDAS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs text-muted-foreground">
                Instrucciones e Indicaciones Especiales para el Paciente
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Ej. Tomar después de las comidas con abundante agua. No suspender antes de los 7 días."
                  value={nuevoMed.instrucciones}
                  onChange={(e) => setNuevoMed({ ...nuevoMed, instrucciones: e.target.value })}
                  className="h-9.5 text-sm"
                />
                <Button
                  type="button"
                  onClick={handleAgregar}
                  disabled={!nuevoMed.medicamento.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 px-4 h-9.5 cursor-pointer font-semibold"
                >
                  <Plus className="size-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Medicamentos Prescritos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Fármacos Prescritos en esta Atención ({medicamentos.length})</span>
          </h4>
        </div>

        {medicamentos.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
            No se han recetado medicamentos en esta atención todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {medicamentos.map((med, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                      <Pill className="size-4 text-teal-600 shrink-0" />
                      <span>{med.medicamento}</span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-muted-foreground hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Eliminar medicamento"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  {med.presentacion && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {med.presentacion}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <Badge variant="outline" className="text-xs font-normal">
                      Dosis: {med.dosis || '1 toma'}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal">
                      {med.via_administracion || 'Oral'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {med.frecuencia}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {med.duracion}
                    </Badge>
                  </div>

                  {med.instrucciones && (
                    <p className="text-xs text-teal-800 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 p-2 rounded-lg mt-2.5 font-medium">
                      Indicación: {med.instrucciones}
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

export default PrescripcionRecetaWidget;
