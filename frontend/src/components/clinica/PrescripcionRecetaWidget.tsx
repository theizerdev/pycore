import React, { useState } from 'react';
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
import { Pill, Plus, Trash2, Clock, Activity } from 'lucide-react';

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

interface PrescripcionRecetaWidgetProps {
  medicamentos: MedicamentoPrescrito[];
  onAdd: (med: MedicamentoPrescrito) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

export const PrescripcionRecetaWidget: React.FC<PrescripcionRecetaWidgetProps> = ({
  medicamentos,
  onAdd,
  onRemove,
  readOnly = false,
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
  };

  return (
    <div className="space-y-6">
      {/* Formulario de Prescripción */}
      {!readOnly && (
        <div className="p-5 rounded-xl border border-teal-200/70 dark:border-teal-900/50 bg-teal-50/30 dark:bg-teal-950/20 space-y-4">
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-semibold text-sm">
            <Pill className="size-4.5" />
            <span>Agregar Medicamento o Fármaco a la Receta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
                Instrucciones e Indicaciones Especiales
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Ej. Tomar después de las comidas con abundante agua."
                  value={nuevoMed.instrucciones}
                  onChange={(e) => setNuevoMed({ ...nuevoMed, instrucciones: e.target.value })}
                  className="h-9.5 text-sm"
                />
                <Button
                  type="button"
                  onClick={handleAgregar}
                  disabled={!nuevoMed.medicamento.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 px-4 h-9.5"
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
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Medicamentos Prescritos ({medicamentos.length})
          </h4>
        </div>

        {medicamentos.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            No se han registrado medicamentos en esta receta.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {medicamentos.map((med, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-base">
                      <Pill className="size-4 text-teal-600 shrink-0" />
                      <span>{med.medicamento}</span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Eliminar medicamento"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  {med.presentacion && (
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {med.presentacion}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {med.dosis && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        Dosis: {med.dosis}
                      </Badge>
                    )}
                    {med.via_administracion && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Vía {med.via_administracion}
                      </Badge>
                    )}
                    {med.frecuencia && (
                      <Badge variant="outline" className="text-xs font-normal text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                        <Clock className="size-3 mr-1" />
                        {med.frecuencia}
                      </Badge>
                    )}
                    {med.duracion && (
                      <Badge variant="outline" className="text-xs font-normal text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {med.duracion}
                      </Badge>
                    )}
                  </div>

                  {med.instrucciones && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                      "{med.instrucciones}"
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
