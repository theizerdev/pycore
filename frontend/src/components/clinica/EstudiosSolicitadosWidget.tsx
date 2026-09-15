import React, { useState } from 'react';
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
import { FlaskConical, Plus, Trash2, AlertCircle, Sparkles } from 'lucide-react';

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

const ESTUDIOS_RAPIDOS = [
  { nombre: 'Hemograma Completo', categoria: 'Laboratorio' },
  { nombre: 'Perfil Lipídico (Colesterol/Triglicéridos)', categoria: 'Laboratorio' },
  { nombre: 'Glucosa en Ayunas', categoria: 'Laboratorio' },
  { nombre: 'Urea y Creatinina', categoria: 'Laboratorio' },
  { nombre: 'Examen General de Orina', categoria: 'Laboratorio' },
  { nombre: 'Rayos X de Tórax (PA)', categoria: 'Rayos X' },
  { nombre: 'Ecografía Abdominal Completa', categoria: 'Ecografía' },
  { nombre: 'Electrocardiograma (ECG)', categoria: 'Cardiología / ECG' },
];

interface EstudiosSolicitadosWidgetProps {
  estudios: EstudioSolicitado[];
  onAdd: (estudio: EstudioSolicitado) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

export const EstudiosSolicitadosWidget: React.FC<EstudiosSolicitadosWidgetProps> = ({
  estudios,
  onAdd,
  onRemove,
  readOnly = false,
}) => {
  const [nuevoEstudio, setNuevoEstudio] = useState<EstudioSolicitado>({
    nombre: '',
    categoria: 'Laboratorio',
    justificacion_clinica: '',
    urgente: false,
    indicaciones_preparacion: '',
  });

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
    onAdd({
      nombre: sug.nombre,
      categoria: sug.categoria,
      justificacion_clinica: 'Evaluación y control médico general',
      urgente: false,
      indicaciones_preparacion: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Sugerencias Rápidas */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Estudios y Exámenes Frecuentes:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ESTUDIOS_RAPIDOS.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSugerenciaRapida(sug)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shadow-2xs font-medium cursor-pointer"
              >
                + {sug.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de Solicitud de Estudio */}
      {!readOnly && (
        <div className="p-5 rounded-xl border border-sky-200/70 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-950/20 space-y-4">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-semibold text-sm">
            <FlaskConical className="size-4.5" />
            <span>Solicitar Nuevo Examen o Estudio Diagnóstico</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
                Categoría
              </Label>
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
              <Label className="text-xs text-slate-500 dark:text-slate-400">
                Justificación Clínica
              </Label>
              <Input
                placeholder="Ej. Paciente con lumbociatalgia refractaria"
                value={nuevoEstudio.justificacion_clinica ?? ''}
                onChange={(e) => setNuevoEstudio({ ...nuevoEstudio, justificacion_clinica: e.target.value })}
                className="mt-1 h-9.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500 dark:text-slate-400">
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
                  className="bg-sky-600 hover:bg-sky-700 text-white shrink-0 px-4 h-9.5"
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
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Estudios Solicitados ({estudios.length})
          </h4>
        </div>

        {estudios.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            No se han solicitado estudios auxiliares en esta atención.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {estudios.map((est, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-base">
                      <FlaskConical className="size-4 text-sky-600 shrink-0" />
                      <span>{est.nombre}</span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
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
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Justificación:</span>{' '}
                      {est.justificacion_clinica}
                    </p>
                  )}

                  {est.indicaciones_preparacion && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg mt-2 font-medium">
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
