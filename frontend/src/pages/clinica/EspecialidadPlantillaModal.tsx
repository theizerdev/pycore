import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { especialidadesApi } from '../../api/especialidades';
import type {
  Especialidad,
  EspecialidadPlantilla,
  EspecialidadPlantillaMedico,
  PlantillaEfectiva,
  SeccionClinica,
  CampoClinico,
  TipoCampoClinico,
} from '../../types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import {
  ClipboardList,
  Stethoscope,
  UserCheck,
  Eye,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Type,
  List,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Sliders,
  Check,
  Smile,
  Activity,
  HeartPulse,
  Baby,
  Bone,
  ShieldCheck,
  Calculator,
  Scale,
} from 'lucide-react';
import OdontogramaWidget from '../../components/clinica/OdontogramaWidget';

interface EspecialidadPlantillaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  especialidad: Especialidad | null;
  onSaved?: () => void;
}

const TIPO_CAMPO_LABELS: Record<TipoCampoClinico, { label: string; icon: any }> = {
  text: { label: 'Texto corto', icon: Type },
  textarea: { label: 'Texto largo / Anamnesis', icon: AlignLeftIcon },
  number: { label: 'Numérico con unidad', icon: Hash },
  select: { label: 'Selección única (Dropdown)', icon: List },
  multiselect: { label: 'Selección múltiple (Tags)', icon: Layers },
  boolean: { label: 'Sí / No (Interruptor)', icon: CheckCircle2 },
  date: { label: 'Fecha', icon: Calendar },
  scale_1_10: { label: 'Escala Analógica (1 al 10)', icon: Activity },
  calculated: { label: 'Cálculo Automático (IMC / Masa)', icon: Calculator },
};

function AlignLeftIcon(props: any) {
  return <Type {...props} />;
}

// Generador de clave slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

export const EspecialidadPlantillaModal: React.FC<EspecialidadPlantillaModalProps> = ({
  open,
  onOpenChange,
  especialidad,
  onSaved,
}) => {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission('especialidades.editar');

  const [activeTab, setActiveTab] = useState<'preconsulta' | 'consulta' | 'medico' | 'preview'>('preconsulta');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Estado Plantilla Base
  const [plantillaBase, setPlantillaBase] = useState<EspecialidadPlantilla | null>(null);
  const [preconsultaSections, setPreconsultaSections] = useState<SeccionClinica[]>([]);
  const [consultaSections, setConsultaSections] = useState<SeccionClinica[]>([]);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);

  // Estado Personalización del Médico
  const [plantillaMedico, setPlantillaMedico] = useState<EspecialidadPlantillaMedico | null>(null);
  const [medicoPreCampos, setMedicoPreCampos] = useState<CampoClinico[]>([]);
  const [medicoConCampos, setMedicoConCampos] = useState<CampoClinico[]>([]);
  const [medicoOcultos, setMedicoOcultos] = useState<string[]>([]);

  // Estado Plantilla Efectiva (para Live Preview)
  const [plantillaEfectiva, setPlantillaEfectiva] = useState<PlantillaEfectiva | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewSubTab, setPreviewSubTab] = useState<'preconsulta' | 'consulta'>('preconsulta');

  // Sub-modal para agregar/editar Campo
  const [fieldModalOpen, setFieldModalOpen] = useState<boolean>(false);
  const [fieldScope, setFieldScope] = useState<'preconsulta' | 'consulta' | 'medico_pre' | 'medico_con'>('preconsulta');
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [editingFieldOriginalKey, setEditingFieldOriginalKey] = useState<string | null>(null);
  const [fieldFormData, setFieldFormData] = useState<CampoClinico>({
    key: '',
    label: '',
    tipo: 'text',
    placeholder: '',
    requerido: false,
    unidad: '',
    opciones: [],
    min_val: undefined,
    max_val: undefined,
    grid_cols: 12,
  });
  const [rawOpciones, setRawOpciones] = useState<string>('');

  // Sub-modal para agregar/editar Sección
  const [sectionModalOpen, setSectionModalOpen] = useState<boolean>(false);
  const [sectionScope, setSectionScope] = useState<'preconsulta' | 'consulta'>('preconsulta');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionFormData, setSectionFormData] = useState<{
    titulo: string;
    descripcion: string;
    icono: string;
  }>({
    titulo: '',
    descripcion: '',
    icono: 'ClipboardList',
  });

  // Cargar datos al abrir modal
  const fetchData = async () => {
    if (!especialidad) return;
    setLoading(true);
    try {
      // 1. Cargar plantilla base
      const base = await especialidadesApi.getPlantilla(especialidad.id);
      setPlantillaBase(base);
      setPreconsultaSections(base.esquema_preconsulta || []);
      setConsultaSections(base.esquema_consulta || []);
      setActiveWidgets(base.widgets_activos || []);

      // 2. Cargar plantilla del médico
      const med = await especialidadesApi.getPlantillaMedico(especialidad.id);
      setPlantillaMedico(med);
      setMedicoPreCampos(med.campos_preconsulta || []);
      setMedicoConCampos(med.campos_consulta || []);
      setMedicoOcultos(med.campos_ocultos || []);

      // 3. Cargar plantilla efectiva para preview
      const efectiva = await especialidadesApi.getPlantillaEfectiva(especialidad.id);
      setPlantillaEfectiva(efectiva);
    } catch (err: any) {
      toast.error('Error al cargar la plantilla clínica', {
        description: err.response?.data?.detail || 'No se pudieron recuperar los esquemas',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && especialidad) {
      fetchData();
    }
  }, [open, especialidad]);

  // Recargar plantilla efectiva al cambiar a preview
  const refreshPreview = async () => {
    if (!especialidad) return;
    try {
      const efectiva = await especialidadesApi.getPlantillaEfectiva(especialidad.id);
      setPlantillaEfectiva(efectiva);
    } catch {
      // Ignore background preview fail
    }
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      refreshPreview();
    }
  }, [activeTab]);

  // Guardar Plantilla Base Institucional
  const handleSavePlantillaBase = async () => {
    if (!especialidad) return;
    setSaving(true);
    try {
      const updated = await especialidadesApi.savePlantilla(especialidad.id, {
        esquema_preconsulta: preconsultaSections,
        esquema_consulta: consultaSections,
        widgets_activos: activeWidgets,
      });
      setPlantillaBase(updated);
      toast.success('Plantilla base institucional guardada exitosamente');
      onSaved?.();
      refreshPreview();
    } catch (err: any) {
      toast.error('Error al guardar plantilla', {
        description: err.response?.data?.detail || 'Ocurrió un error inesperado',
      });
    } finally {
      setSaving(false);
    }
  };

  // Guardar Campos del Médico
  const handleSavePlantillaMedico = async () => {
    if (!especialidad) return;
    setSaving(true);
    try {
      const updated = await especialidadesApi.savePlantillaMedico(especialidad.id, {
        campos_preconsulta: medicoPreCampos,
        campos_consulta: medicoConCampos,
        campos_ocultos: medicoOcultos,
      });
      setPlantillaMedico(updated);
      toast.success('Sus preferencias y campos personalizados como médico han sido guardados');
      refreshPreview();
    } catch (err: any) {
      toast.error('Error al guardar personalización médica', {
        description: err.response?.data?.detail || 'Ocurrió un error inesperado',
      });
    } finally {
      setSaving(false);
    }
  };

  // Cargar Sugerencias de Especialidad
  const handleSeedDefaults = async () => {
    if (!especialidad) return;
    setLoading(true);
    try {
      const seeded = await especialidadesApi.seedDefaultPlantilla(especialidad.id);
      setPlantillaBase(seeded);
      setPreconsultaSections(seeded.esquema_preconsulta || []);
      setConsultaSections(seeded.esquema_consulta || []);
      setActiveWidgets(seeded.widgets_activos || []);
      toast.success(`Plantilla clínica oficial precargada para ${especialidad.nombre}`);
      refreshPreview();
    } catch (err: any) {
      toast.error('Error al cargar plantilla predeterminada');
    } finally {
      setLoading(false);
    }
  };

  // ── GESTIÓN DE SECCIONES ──
  const handleOpenAddSection = (scope: 'preconsulta' | 'consulta') => {
    setSectionScope(scope);
    setEditingSectionId(null);
    setSectionFormData({
      titulo: '',
      descripcion: '',
      icono: scope === 'preconsulta' ? 'ClipboardList' : 'Stethoscope',
    });
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (scope: 'preconsulta' | 'consulta', sec: SeccionClinica) => {
    setSectionScope(scope);
    setEditingSectionId(sec.id);
    setSectionFormData({
      titulo: sec.titulo,
      descripcion: sec.descripcion || '',
      icono: sec.icono || 'ClipboardList',
    });
    setSectionModalOpen(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionFormData.titulo.trim()) {
      toast.error('El título de la sección es obligatorio');
      return;
    }

    const updater = sectionScope === 'preconsulta' ? setPreconsultaSections : setConsultaSections;

    if (editingSectionId) {
      updater((prev) =>
        prev.map((s) =>
          s.id === editingSectionId
            ? {
                ...s,
                titulo: sectionFormData.titulo.trim(),
                descripcion: sectionFormData.descripcion.trim() || undefined,
                icono: sectionFormData.icono,
              }
            : s
        )
      );
    } else {
      const newSec: SeccionClinica = {
        id: `sec_${slugify(sectionFormData.titulo)}_${Date.now().toString().slice(-4)}`,
        titulo: sectionFormData.titulo.trim(),
        descripcion: sectionFormData.descripcion.trim() || undefined,
        icono: sectionFormData.icono,
        campos: [],
      };
      updater((prev) => [...prev, newSec]);
    }

    setSectionModalOpen(false);
  };

  const handleDeleteSection = (scope: 'preconsulta' | 'consulta', secId: string) => {
    const updater = scope === 'preconsulta' ? setPreconsultaSections : setConsultaSections;
    updater((prev) => prev.filter((s) => s.id !== secId));
    toast.success('Sección eliminada');
  };

  // ── GESTIÓN DE CAMPOS ──
  const handleOpenAddField = (
    scope: 'preconsulta' | 'consulta' | 'medico_pre' | 'medico_con',
    sectionId = ''
  ) => {
    setFieldScope(scope);
    setTargetSectionId(sectionId);
    setEditingFieldOriginalKey(null);
    setFieldFormData({
      key: '',
      label: '',
      tipo: 'text',
      placeholder: '',
      requerido: false,
      unidad: '',
      opciones: [],
      min_val: undefined,
      max_val: undefined,
      grid_cols: 12,
    });
    setRawOpciones('');
    setFieldModalOpen(true);
  };

  const handleOpenEditField = (
    scope: 'preconsulta' | 'consulta' | 'medico_pre' | 'medico_con',
    campo: CampoClinico,
    sectionId = ''
  ) => {
    setFieldScope(scope);
    setTargetSectionId(sectionId);
    setEditingFieldOriginalKey(campo.key);
    setFieldFormData({ ...campo });
    setRawOpciones((campo.opciones || []).join(', '));
    setFieldModalOpen(true);
  };

  const handleSaveField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldFormData.label.trim()) {
      toast.error('La pregunta o etiqueta del campo es requerida');
      return;
    }

    const fieldKey =
      fieldFormData.key.trim() || slugify(fieldFormData.label) || `campo_${Date.now()}`;

    // Parsear opciones si es select o multiselect
    let opcionesArray: string[] = [];
    if (fieldFormData.tipo === 'select' || fieldFormData.tipo === 'multiselect') {
      opcionesArray = rawOpciones
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (opcionesArray.length === 0) {
        toast.error('Debe ingresar al menos una opción separada por comas');
        return;
      }
    }

    const preparedField: CampoClinico = {
      ...fieldFormData,
      key: fieldKey,
      label: fieldFormData.label.trim(),
      placeholder: fieldFormData.placeholder?.trim() || undefined,
      unidad: fieldFormData.unidad?.trim() || undefined,
      opciones: opcionesArray.length > 0 ? opcionesArray : undefined,
    };

    if (fieldScope === 'preconsulta' || fieldScope === 'consulta') {
      const updater = fieldScope === 'preconsulta' ? setPreconsultaSections : setConsultaSections;
      updater((prev) =>
        prev.map((sec) => {
          if (sec.id === targetSectionId) {
            let updatedCampos = [...sec.campos];
            if (editingFieldOriginalKey) {
              updatedCampos = updatedCampos.map((c) =>
                c.key === editingFieldOriginalKey ? preparedField : c
              );
            } else {
              updatedCampos.push(preparedField);
            }
            return { ...sec, campos: updatedCampos };
          }
          return sec;
        })
      );
    } else if (fieldScope === 'medico_pre') {
      setMedicoPreCampos((prev) => {
        if (editingFieldOriginalKey) {
          return prev.map((c) => (c.key === editingFieldOriginalKey ? preparedField : c));
        }
        return [...prev, preparedField];
      });
    } else if (fieldScope === 'medico_con') {
      setMedicoConCampos((prev) => {
        if (editingFieldOriginalKey) {
          return prev.map((c) => (c.key === editingFieldOriginalKey ? preparedField : c));
        }
        return [...prev, preparedField];
      });
    }

    setFieldModalOpen(false);
  };

  const handleDeleteField = (
    scope: 'preconsulta' | 'consulta' | 'medico_pre' | 'medico_con',
    fieldKey: string,
    sectionId = ''
  ) => {
    if (scope === 'preconsulta' || scope === 'consulta') {
      const updater = scope === 'preconsulta' ? setPreconsultaSections : setConsultaSections;
      updater((prev) =>
        prev.map((sec) => {
          if (sec.id === sectionId) {
            return { ...sec, campos: sec.campos.filter((c) => c.key !== fieldKey) };
          }
          return sec;
        })
      );
    } else if (scope === 'medico_pre') {
      setMedicoPreCampos((prev) => prev.filter((c) => c.key !== fieldKey));
    } else if (scope === 'medico_con') {
      setMedicoConCampos((prev) => prev.filter((c) => c.key !== fieldKey));
    }
    toast.success('Campo eliminado');
  };

  // Toggle de Widget Clínico
  const handleToggleWidget = (widgetKey: string) => {
    setActiveWidgets((prev) =>
      prev.includes(widgetKey) ? prev.filter((w) => w !== widgetKey) : [...prev, widgetKey]
    );
  };

  // Renderizador de un campo en Live Preview
  const renderPreviewInput = (campo: CampoClinico) => {
    const value = previewAnswers[campo.key] ?? '';
    const setValue = (val: any) => {
      setPreviewAnswers((prev) => {
        const next = { ...prev, [campo.key]: val };

        // Detección y auto-cálculo de IMC y Masa Muscular/Magra Boer
        const pStr = campo.key === 'peso' || campo.key === 'peso_actual' ? val : (next['peso'] || next['peso_actual']);
        const tStr = campo.key === 'talla' || campo.key === 'talla_actual' ? val : (next['talla'] || next['talla_actual']);

        const peso = parseFloat(pStr);
        const talla = parseFloat(tStr);

        if (!isNaN(peso) && !isNaN(talla) && peso > 0 && talla > 0) {
          const tallaM = talla > 3 ? talla / 100 : talla;
          const imcNum = (peso / (tallaM * tallaM)).toFixed(1);
          next['imc'] = imcNum;

          // Estimación Boer de Masa Muscular / Magra:
          // Formula Boer: (0.33 * peso) + (0.35 * tallaCm) - 28.5
          const tallaCm = talla <= 3 ? talla * 100 : talla;
          const masaMagra = Math.max(1, ((0.33 * peso) + (0.35 * tallaCm) - 28.5)).toFixed(1);
          const pctMasa = Math.min(100, Math.max(10, Math.round((parseFloat(masaMagra) / peso) * 100)));
          next['masa_muscular'] = `${masaMagra} kg (${pctMasa}%)`;
        }
        return next;
      });
    };

    const colsClass =
      campo.grid_cols === 3
        ? 'sm:col-span-3'
        : campo.grid_cols === 4
        ? 'sm:col-span-4'
        : campo.grid_cols === 6
        ? 'sm:col-span-6'
        : 'sm:col-span-12';

    return (
      <div key={campo.key} className={`space-y-1.5 col-span-12 ${colsClass}`}>
        <div className="flex items-start justify-between gap-1 min-h-[26px]">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1 leading-snug line-clamp-2">
            <span>{campo.label}</span>
            {campo.requerido && <span className="text-destructive font-bold">*</span>}
          </Label>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {campo.es_medico ? (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10">
                Dr.
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5">
                Base
              </Badge>
            )}
          </div>
        </div>

        {campo.tipo === 'text' && (
          <Input
            placeholder={campo.placeholder || 'Ingrese respuesta...'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 text-xs"
          />
        )}

        {campo.tipo === 'textarea' && (
          <Textarea
            placeholder={campo.placeholder || 'Escriba las observaciones clínicas...'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            className="text-xs resize-none min-h-[40px]"
          />
        )}

        {campo.tipo === 'number' && (
          <div className="relative">
            <Input
              type="number"
              placeholder={campo.placeholder || '0'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 text-xs pr-14 font-medium"
            />
            {campo.unidad && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-1.5 py-0.5 rounded">
                {campo.unidad}
              </span>
            )}
          </div>
        )}

        {campo.tipo === 'calculated' && (
          <div className="h-10 px-2.5 rounded-md border border-teal-500/30 bg-teal-500/5 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Calculator className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-foreground truncate">
                  {value || (
                    <span className="text-muted-foreground italic font-normal text-[11px]">
                      {campo.placeholder || 'Auto (peso y talla)'}
                    </span>
                  )}
                </span>
                {campo.key === 'imc' && value && (
                  (() => {
                    const v = parseFloat(value);
                    if (v < 18.5) return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">Bajo peso</span>;
                    if (v < 25.0) return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">Normal</span>;
                    if (v < 30.0) return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">Sobrepeso</span>;
                    if (v < 35.0) return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap">Obesidad I</span>;
                    return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">Obesidad II/III</span>;
                  })()
                )}
                {campo.key === 'masa_muscular' && value && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 whitespace-nowrap">
                    Boer
                  </span>
                )}
              </div>
            </div>
            {campo.unidad && (
              <Badge variant="outline" className="text-[10px] border-teal-500/40 text-teal-700 dark:text-teal-300 font-mono shrink-0 px-1.5 py-0">
                {campo.unidad}
              </Badge>
            )}
          </div>
        )}

        {campo.tipo === 'select' && (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Seleccione una opción" />
            </SelectTrigger>
            <SelectContent>
              {(campo.opciones || []).map((op) => (
                <SelectItem key={op} value={op} className="text-xs">
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {campo.tipo === 'multiselect' && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/80 bg-muted/20 min-h-[40px] items-center">
            {(campo.opciones || []).map((op) => {
              const currentArr = Array.isArray(value) ? value : [];
              const isSelected = currentArr.includes(op);
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setValue(currentArr.filter((x: string) => x !== op));
                    } else {
                      setValue([...currentArr, op]);
                    }
                  }}
                  className={`text-xs px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {isSelected && <Check className="size-3" />}
                  <span>{op}</span>
                </button>
              );
            })}
          </div>
        )}

        {campo.tipo === 'boolean' && (
          <div className="flex items-center gap-2 h-10 pt-1">
            <Switch checked={Boolean(value)} onCheckedChange={setValue} />
            <span className="text-xs text-muted-foreground font-medium">
              {value ? 'Sí (Afirmativo)' : 'No (Negativo)'}
            </span>
          </div>
        )}

        {campo.tipo === 'date' && (
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 text-xs"
          />
        )}

        {campo.tipo === 'scale_1_10' && (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isSelected = value === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setValue(num)}
                  className={`size-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-xs'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!especialidad) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl xl:max-w-7xl w-[96vw] max-h-[96vh] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Cabecera del Modal */}
          <div className="p-5 pb-3 border-b border-border/80 bg-muted/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-xl shadow-xs"
                style={{
                  backgroundColor: `${especialidad.color || '#0ea5e9'}20`,
                  color: especialidad.color || '#0ea5e9',
                  border: `1px solid ${especialidad.color || '#0ea5e9'}40`,
                }}
              >
                <Stethoscope className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{especialidad.nombre}</h2>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {especialidad.codigo || 'CLINIC'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    v{plantillaBase?.version || 1}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Constructor dinámico de preguntas de preconsulta, examen clínico y personalización por médico
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDefaults}
                disabled={loading || saving || !canEdit}
                className="border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer h-8 text-xs"
                title="Carga el catálogo sugerido para esta rama médica"
              >
                <Sparkles className="size-3.5 mr-1 text-teal-500" />
                <span>Cargar Sugeridas</span>
              </Button>

              {activeTab === 'medico' ? (
                <Button
                  size="sm"
                  onClick={handleSavePlantillaMedico}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer h-8 text-xs"
                >
                  <Save className="size-3.5 mr-1" />
                  <span>{saving ? 'Guardando...' : 'Guardar Mis Campos'}</span>
                </Button>
              ) : activeTab !== 'preview' ? (
                <Button
                  size="sm"
                  onClick={handleSavePlantillaBase}
                  disabled={saving || !canEdit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer h-8 text-xs"
                >
                  <Save className="size-3.5 mr-1" />
                  <span>{saving ? 'Guardando...' : 'Guardar Plantilla Base'}</span>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="px-5 pt-3 border-b border-border/80 bg-background">
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full"
            >
              <TabsList className="w-full justify-start h-9 p-0 bg-transparent gap-2 border-b-0">
                <TabsTrigger
                  value="preconsulta"
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:border-teal-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5"
                >
                  <ClipboardList className="size-3.5" />
                  <span>1. Preconsulta / Interrogatorio</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                    {preconsultaSections.reduce((acc, s) => acc + s.campos.length, 0)}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="consulta"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5"
                >
                  <Stethoscope className="size-3.5" />
                  <span>2. Consulta Médica (Examen)</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                    {consultaSections.reduce((acc, s) => acc + s.campos.length, 0)}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="medico"
                  className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:border-indigo-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5"
                >
                  <UserCheck className="size-3.5" />
                  <span>3. Mis Campos como Médico</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                    {medicoPreCampos.length + medicoConCampos.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="preview"
                  className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:border-amber-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5 ml-auto"
                >
                  <Eye className="size-3.5 text-amber-500" />
                  <span>Vista Previa Interactiva</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Cuerpo con Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                <RefreshCw className="size-6 animate-spin text-primary" />
                <p className="text-xs">Cargando configuración clínica...</p>
              </div>
            ) : (
              <>
                {/* ── PESTAÑA 1: PRECONSULTA (INTERROGATORIO) ── */}
                {activeTab === 'preconsulta' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Preguntas de Triaje e Interrogatorio Previo
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Secciones y preguntas que responderá el paciente antes de entrar a consulta o enfermería en recepción.
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddSection('preconsulta')}
                          className="cursor-pointer h-8 text-xs"
                        >
                          <Plus className="size-3.5 mr-1" />
                          Nueva Sección
                        </Button>
                      )}
                    </div>

                    {preconsultaSections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/80 text-center gap-2">
                        <ClipboardList className="size-8 text-muted-foreground opacity-40" />
                        <p className="text-xs font-semibold text-foreground">No hay secciones de preconsulta configuradas</p>
                        <p className="text-[11px] text-muted-foreground max-w-sm">
                          Puede pulsar "Cargar Sugeridas" en la esquina superior para rellenar con preguntas médicas estándar, o crear una sección manualmente.
                        </p>
                      </div>
                    ) : (
                      preconsultaSections.map((sec) => (
                        <Card key={sec.id} className="border-border/80 shadow-2xs">
                          <CardHeader className="p-3.5 pb-2 bg-muted/20 border-b border-border/60 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="size-4 text-teal-600 dark:text-teal-400" />
                              <div>
                                <CardTitle className="text-xs font-bold text-foreground">{sec.titulo}</CardTitle>
                                {sec.descripcion && (
                                  <CardDescription className="text-[10px] text-muted-foreground">
                                    {sec.descripcion}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditSection('preconsulta', sec)}
                                    className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <Edit2 className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSection('preconsulta', sec.id)}
                                    className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleOpenAddField('preconsulta', sec.id)}
                                    className="h-6 text-[11px] px-2 ml-1 cursor-pointer"
                                  >
                                    <Plus className="size-3 mr-1" />
                                    Agregar Pregunta
                                  </Button>
                                </>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 space-y-2">
                            {sec.campos.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground italic text-center py-2">
                                Esta sección no tiene preguntas todavía.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {sec.campos.map((campo) => {
                                  const TypeIcon = TIPO_CAMPO_LABELS[campo.tipo]?.icon || Type;
                                  return (
                                    <div
                                      key={campo.key}
                                      className="p-2.5 rounded-lg border border-border/70 bg-card hover:border-primary/40 transition-colors flex items-start justify-between gap-2"
                                    >
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-semibold text-foreground truncate">
                                            {campo.label}
                                          </span>
                                          {campo.requerido && (
                                            <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                              Requerido
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <TypeIcon className="size-3 text-primary" />
                                            {TIPO_CAMPO_LABELS[campo.tipo]?.label}
                                          </span>
                                          {campo.unidad && <span>Unidad: {campo.unidad}</span>}
                                          {campo.grid_cols && (
                                            <span className="font-mono text-[9px]">
                                              {campo.grid_cols === 12 ? '100%' : `${(campo.grid_cols / 12) * 100}%`}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {canEdit && (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEditField('preconsulta', campo, sec.id)}
                                            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                          >
                                            <Edit2 className="size-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteField('preconsulta', campo.key, sec.id)}
                                            className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                          >
                                            <Trash2 className="size-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}

                {/* ── PESTAÑA 2: CONSULTA MÉDICA (EXAMEN Y EVALUACIÓN) ── */}
                {activeTab === 'consulta' && (
                  <div className="space-y-5">
                    {/* Sección de Widgets Clínicos Especializados */}
                    <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sliders className="size-4 text-teal-600 dark:text-teal-400" />
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Componentes Clínicos Avanzados (Widgets Especializados)
                          </h4>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Activables según la naturaleza de la especialidad
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="p-2.5 rounded-lg border border-border/80 bg-card flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">Odontograma Dental</p>
                            <p className="text-[10px] text-muted-foreground">Piezas FDI y caras</p>
                          </div>
                          <Switch
                            checked={activeWidgets.includes('odontograma')}
                            onCheckedChange={() => handleToggleWidget('odontograma')}
                            disabled={!canEdit}
                          />
                        </div>

                        <div className="p-2.5 rounded-lg border border-border/80 bg-card flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">Refracción Visual</p>
                            <p className="text-[10px] text-muted-foreground">Cartilla Snellen OD/OI</p>
                          </div>
                          <Switch
                            checked={activeWidgets.includes('refraccion')}
                            onCheckedChange={() => handleToggleWidget('refraccion')}
                            disabled={!canEdit}
                          />
                        </div>

                        <div className="p-2.5 rounded-lg border border-border/80 bg-card flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">Percentiles OMS</p>
                            <p className="text-[10px] text-muted-foreground">Curvas de crecimiento</p>
                          </div>
                          <Switch
                            checked={activeWidgets.includes('percentiles_oms')}
                            onCheckedChange={() => handleToggleWidget('percentiles_oms')}
                            disabled={!canEdit}
                          />
                        </div>

                        <div className="p-2.5 rounded-lg border border-border/80 bg-card flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">Rueda Obstétrica</p>
                            <p className="text-[10px] text-muted-foreground">FUM a FPP y semanas</p>
                          </div>
                          <Switch
                            checked={activeWidgets.includes('rueda_obstetrica')}
                            onCheckedChange={() => handleToggleWidget('rueda_obstetrica')}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    </div>

                    {activeWidgets.includes('odontograma') && (
                      <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smile className="size-4 text-teal-600 dark:text-teal-400" />
                            <span className="text-xs font-bold text-foreground">
                              Widget de Odontograma Dental Activo
                            </span>
                            <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-600 bg-teal-500/10">
                              32 Permanentes + 20 Temporales FDI
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('preview')}
                            className="text-xs h-7 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer"
                          >
                            <Eye className="size-3.5 mr-1" />
                            <span>Ver y Probar Odontograma</span>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          El odontograma anatómico interactivo de 5 caras se cargará automáticamente en la consulta médica de esta especialidad para registrar patologías y restauraciones dentales.
                        </p>
                      </div>
                    )}

                    {/* Secciones y Campos de Consulta */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Campos del Examen Físico y Evaluación Médica
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Variables clínicas, signos y campos dirigidos para el médico especialista en su consulta.
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddSection('consulta')}
                          className="cursor-pointer h-8 text-xs"
                        >
                          <Plus className="size-3.5 mr-1" />
                          Nueva Sección
                        </Button>
                      )}
                    </div>

                    {consultaSections.map((sec) => (
                      <Card key={sec.id} className="border-border/80 shadow-2xs">
                        <CardHeader className="p-3.5 pb-2 bg-muted/20 border-b border-border/60 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="size-4 text-primary" />
                            <div>
                              <CardTitle className="text-xs font-bold text-foreground">{sec.titulo}</CardTitle>
                              {sec.descripcion && (
                                <CardDescription className="text-[10px] text-muted-foreground">
                                  {sec.descripcion}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditSection('consulta', sec)}
                                  className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSection('consulta', sec.id)}
                                  className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenAddField('consulta', sec.id)}
                                  className="h-6 text-[11px] px-2 ml-1 cursor-pointer"
                                >
                                  <Plus className="size-3 mr-1" />
                                  Agregar Campo
                                </Button>
                              </>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                          {sec.campos.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic text-center py-2">
                              Esta sección no tiene campos de examen todavía.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {sec.campos.map((campo) => {
                                const TypeIcon = TIPO_CAMPO_LABELS[campo.tipo]?.icon || Type;
                                return (
                                  <div
                                    key={campo.key}
                                    className="p-2.5 rounded-lg border border-border/70 bg-card hover:border-primary/40 transition-colors flex items-start justify-between gap-2"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold text-foreground truncate">
                                          {campo.label}
                                        </span>
                                        {campo.requerido && (
                                          <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                            Requerido
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <TypeIcon className="size-3 text-primary" />
                                          {TIPO_CAMPO_LABELS[campo.tipo]?.label}
                                        </span>
                                        {campo.unidad && <span>Unidad: {campo.unidad}</span>}
                                        {campo.grid_cols && (
                                          <span className="font-mono text-[9px]">
                                            {campo.grid_cols === 12 ? '100%' : `${(campo.grid_cols / 12) * 100}%`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {canEdit && (
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenEditField('consulta', campo, sec.id)}
                                          className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                          <Edit2 className="size-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteField('consulta', campo.key, sec.id)}
                                          className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                        >
                                          <Trash2 className="size-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* ── PESTAÑA 3: PERSONALIZACIÓN INDIVIDUAL POR MÉDICO ── */}
                {activeTab === 'medico' && (
                  <div className="space-y-5">
                    <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex items-start gap-3">
                      <UserCheck className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-foreground">
                          Personalización Exclusiva para: Dr(a). {user?.nombre} {user?.apellido}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Los campos y preguntas que agregue en esta pestaña son <strong>privados y exclusivos para su perfil</strong>. Se fusionarán automáticamente con la plantilla base de la clínica en sus consultas, permitiéndole adaptar el sistema a su estilo clínico sin afectar a otros médicos.
                        </p>
                      </div>
                    </div>

                    {/* Mis Preguntas para Preconsulta */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ClipboardList className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Mis Preguntas Propias para Preconsulta / Triaje</span>
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Preguntas adicionales que se harán a los pacientes antes de ingresar a su consulta
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddField('medico_pre')}
                          className="cursor-pointer h-7 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                        >
                          <Plus className="size-3 mr-1" />
                          Agregar mi Pregunta
                        </Button>
                      </div>

                      {medicoPreCampos.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic p-3 rounded-lg border border-dashed border-border/80 text-center">
                          Aún no ha añadido preguntas personales para la preconsulta de esta especialidad.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {medicoPreCampos.map((campo) => (
                            <div
                              key={campo.key}
                              className="p-2.5 rounded-lg border border-indigo-500/30 bg-card flex items-start justify-between gap-2"
                            >
                              <div className="space-y-1 min-w-0">
                                <span className="text-xs font-semibold text-foreground truncate block">
                                  {campo.label}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                    {TIPO_CAMPO_LABELS[campo.tipo]?.label}
                                  </Badge>
                                  {campo.unidad && <span>{campo.unidad}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditField('medico_pre', campo)}
                                  className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteField('medico_pre', campo.key)}
                                  className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mis Campos para la Consulta Médica */}
                    <div className="space-y-2.5 pt-2 border-t border-border/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Stethoscope className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Mis Campos Propios para la Consulta Médica</span>
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Variables de examen físico y hallazgos específicos que solo usted utiliza en su práctica
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddField('medico_con')}
                          className="cursor-pointer h-7 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                        >
                          <Plus className="size-3 mr-1" />
                          Agregar mi Campo
                        </Button>
                      </div>

                      {medicoConCampos.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic p-3 rounded-lg border border-dashed border-border/80 text-center">
                          Aún no ha añadido campos personales para la consulta de esta especialidad.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {medicoConCampos.map((campo) => (
                            <div
                              key={campo.key}
                              className="p-2.5 rounded-lg border border-indigo-500/30 bg-card flex items-start justify-between gap-2"
                            >
                              <div className="space-y-1 min-w-0">
                                <span className="text-xs font-semibold text-foreground truncate block">
                                  {campo.label}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                    {TIPO_CAMPO_LABELS[campo.tipo]?.label}
                                  </Badge>
                                  {campo.unidad && <span>{campo.unidad}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditField('medico_con', campo)}
                                  className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteField('medico_con', campo.key)}
                                  className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── PESTAÑA 4: VISTA PREVIA INTERACTIVA (LIVE PREVIEW) ── */}
                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center gap-2">
                        <Eye className="size-4 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Simulador Interactivo de Formulario Clínico
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Muestra la combinación unificada de campos institucionales + campos personalizados del Dr. {user?.nombre}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <Button
                          size="sm"
                          variant={previewSubTab === 'preconsulta' ? 'default' : 'outline'}
                          onClick={() => setPreviewSubTab('preconsulta')}
                          className="h-7 text-xs cursor-pointer"
                        >
                          <ClipboardList className="size-3 mr-1" />
                          Ver Preconsulta
                        </Button>
                        <Button
                          size="sm"
                          variant={previewSubTab === 'consulta' ? 'default' : 'outline'}
                          onClick={() => setPreviewSubTab('consulta')}
                          className="h-7 text-xs cursor-pointer"
                        >
                          <Stethoscope className="size-3 mr-1" />
                          Ver Consulta Médica
                        </Button>
                      </div>
                    </div>

                    {/* Preview Preconsulta */}
                    {previewSubTab === 'preconsulta' && (
                      <div className="space-y-4">
                        {(plantillaEfectiva?.preconsulta_secciones || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic text-center py-6">
                            No hay preguntas de preconsulta para previsualizar.
                          </p>
                        ) : (
                          plantillaEfectiva?.preconsulta_secciones.map((sec) => (
                            <Card key={sec.id} className="border-border/80">
                              <CardHeader className="p-3.5 pb-2 border-b border-border/60 bg-muted/20">
                                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <ClipboardList className="size-3.5 text-teal-600" />
                                  <span>{sec.titulo}</span>
                                </CardTitle>
                                {sec.descripcion && (
                                  <CardDescription className="text-[11px] text-muted-foreground">
                                    {sec.descripcion}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="grid grid-cols-12 gap-3">
                                  {sec.campos.map((campo) => renderPreviewInput(campo))}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    )}

                    {/* Preview Consulta Médica */}
                    {previewSubTab === 'consulta' && (
                      <div className="space-y-4">
                        {/* Widgets Activos en Preview */}
                        {(plantillaEfectiva?.widgets_activos || []).length > 0 && (
                          <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                            <p className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                              <Sliders className="size-3" />
                              Widgets Clínicos Activos en Pantalla
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {plantillaEfectiva?.widgets_activos.map((w) => (
                                <Badge key={w} variant="secondary" className="text-xs capitalize font-semibold">
                                  ✓ {w.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tarjeta de Antropometría y Composición Corporal Dinámica si hay peso o talla */}
                        {(() => {
                          const p = parseFloat(previewAnswers['peso'] || previewAnswers['peso_actual'] || '');
                          const t = parseFloat(previewAnswers['talla'] || previewAnswers['talla_actual'] || '');
                          const imc = parseFloat(previewAnswers['imc'] || '');
                          if (!isNaN(p) && !isNaN(t) && p > 0 && t > 0) {
                            const tM = t > 3 ? t / 100 : t;
                            const pesoMin = (18.5 * tM * tM).toFixed(1);
                            const pesoMax = (24.9 * tM * tM).toFixed(1);

                            let imcColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                            let imcLabel = 'Peso Saludable / Eutrófico';
                            if (imc < 18.5) {
                              imcColor = 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30';
                              imcLabel = 'Bajo Peso';
                            } else if (imc >= 25.0 && imc < 30.0) {
                              imcColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
                              imcLabel = 'Sobrepeso';
                            } else if (imc >= 30.0 && imc < 35.0) {
                              imcColor = 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30';
                              imcLabel = 'Obesidad Clase I';
                            } else if (imc >= 35.0) {
                              imcColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
                              imcLabel = 'Obesidad Grado II/III';
                            }

                            return (
                              <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Scale className="size-4 text-teal-600 dark:text-teal-400" />
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                      Composición Corporal y Antropometría Automática
                                    </span>
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] font-bold ${imcColor}`}>
                                    {imcLabel}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                  <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                                    <span className="text-[10px] text-muted-foreground block">Índice Masa Corporal (IMC)</span>
                                    <span className="text-base font-extrabold text-foreground">{previewAnswers['imc']} <span className="text-[10px] font-normal text-muted-foreground">kg/m²</span></span>
                                  </div>

                                  <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                                    <span className="text-[10px] text-muted-foreground block">Masa Muscular / Magra (Boer)</span>
                                    <span className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                                      {previewAnswers['masa_muscular'] || 'Calculando...'}
                                    </span>
                                  </div>

                                  <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                                    <span className="text-[10px] text-muted-foreground block">Rango de Peso Ideal (OMS)</span>
                                    <span className="text-xs font-bold text-foreground mt-0.5 block">{pesoMin} kg - {pesoMax} kg</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* WIDGET INTERACTIVO DE ODONTOGRAMA SI ESTÁ ACTIVO */}
                        {(plantillaEfectiva?.widgets_activos || activeWidgets || []).includes('odontograma') && (
                          <div className="mb-4">
                            <OdontogramaWidget />
                          </div>
                        )}

                        {(plantillaEfectiva?.consulta_secciones || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic text-center py-6">
                            No hay campos de examen clínico para previsualizar.
                          </p>
                        ) : (
                          plantillaEfectiva?.consulta_secciones.map((sec) => (
                            <Card key={sec.id} className="border-border/80">
                              <CardHeader className="p-3.5 pb-2 border-b border-border/60 bg-muted/20">
                                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <Stethoscope className="size-3.5 text-primary" />
                                  <span>{sec.titulo}</span>
                                </CardTitle>
                                {sec.descripcion && (
                                  <CardDescription className="text-[11px] text-muted-foreground">
                                    {sec.descripcion}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="grid grid-cols-12 gap-3">
                                  {sec.campos.map((campo) => renderPreviewInput(campo))}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer del Modal */}
          <div className="p-3.5 border-t border-border/80 bg-muted/10 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-teal-500 inline-block" />
                Preconsulta: {preconsultaSections.reduce((acc, s) => acc + s.campos.length, 0)} preguntas
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary inline-block" />
                Consulta: {consultaSections.reduce((acc, s) => acc + s.campos.length, 0)} campos
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-indigo-500 inline-block" />
                Doctor: {medicoPreCampos.length + medicoConCampos.length} propios
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer text-xs h-8"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SUB-MODAL: AGREGAR / EDITAR SECCIÓN ── */}
      <Dialog open={sectionModalOpen} onOpenChange={setSectionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
              <Plus className="size-4 text-primary" />
              <span>{editingSectionId ? 'Editar Sección Clínica' : 'Nueva Sección Clínica'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Agrupe preguntas y variables bajo un título clínico representativo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSection} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Título de la Sección <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                placeholder="Ej. Antecedentes Cardíacos, Examen Ocular, etc."
                value={sectionFormData.titulo}
                onChange={(e) => setSectionFormData({ ...sectionFormData, titulo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descripción o Subtítulo (Opcional)</Label>
              <Input
                placeholder="Ej. Registro de factores de riesgo antes de consulta"
                value={sectionFormData.descripcion}
                onChange={(e) => setSectionFormData({ ...sectionFormData, descripcion: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSectionModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Guardar Sección
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SUB-MODAL: AGREGAR / EDITAR CAMPO CLÍNICO ── */}
      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
              <Plus className="size-4 text-primary" />
              <span>
                {editingFieldOriginalKey
                  ? 'Editar Pregunta / Campo Clínico'
                  : 'Agregar Pregunta / Campo Clínico'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure la variable clínica, el tipo de dato y las reglas de validación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveField} className="space-y-3 py-2">
            {/* Pregunta / Label */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Pregunta o Nombre del Campo <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                placeholder="Ej. ¿Tiene antecedentes de dolor torácico?"
                value={fieldFormData.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setFieldFormData({
                    ...fieldFormData,
                    label: val,
                    key: editingFieldOriginalKey ? fieldFormData.key : slugify(val),
                  });
                }}
                className="h-9 text-xs"
              />
            </div>

            {/* Tipo de Campo y Ancho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Campo</Label>
                <Select
                  value={fieldFormData.tipo}
                  onValueChange={(val: any) => setFieldFormData({ ...fieldFormData, tipo: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CAMPO_LABELS).map(([key, item]) => {
                      const Icon = item.icon;
                      return (
                        <SelectItem key={key} value={key} className="text-xs">
                          <div className="flex items-center gap-2">
                            <Icon className="size-3.5 text-primary" />
                            <span>{item.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ancho en Pantalla</Label>
                <Select
                  value={String(fieldFormData.grid_cols || 12)}
                  onValueChange={(val) => setFieldFormData({ ...fieldFormData, grid_cols: Number(val) })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12" className="text-xs">Ancho Completo (100%)</SelectItem>
                    <SelectItem value="6" className="text-xs">Media Columna (50%)</SelectItem>
                    <SelectItem value="4" className="text-xs">Un Tercio (33%)</SelectItem>
                    <SelectItem value="3" className="text-xs">Un Cuarto (25%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opciones para Select o Multiselect */}
            {(fieldFormData.tipo === 'select' || fieldFormData.tipo === 'multiselect') && (
              <div className="space-y-1.5 p-2.5 rounded-lg border border-border/80 bg-muted/20">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Opciones posibles (separadas por coma)</span>
                  <span className="text-[10px] text-muted-foreground">Ej. Sí, No, Ocasional</span>
                </Label>
                <Input
                  placeholder="Opción 1, Opción 2, Opción 3..."
                  value={rawOpciones}
                  onChange={(e) => setRawOpciones(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            {/* Unidad para Tipo Numérico y Calculado */}
            {(fieldFormData.tipo === 'number' || fieldFormData.tipo === 'calculated') && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Unidad de Medida</Label>
                  <Input
                    placeholder="Ej. kg/m², kg, mmHg"
                    value={fieldFormData.unidad || ''}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, unidad: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Valor Mínimo</Label>
                  <Input
                    type="number"
                    value={fieldFormData.min_val ?? ''}
                    onChange={(e) =>
                      setFieldFormData({
                        ...fieldFormData,
                        min_val: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Valor Máximo</Label>
                  <Input
                    type="number"
                    value={fieldFormData.max_val ?? ''}
                    onChange={(e) =>
                      setFieldFormData({
                        ...fieldFormData,
                        max_val: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Placeholder y Switch Requerido */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Texto de Ayuda / Placeholder (Opcional)</Label>
              <Input
                placeholder="Ej. Indique tiempo exacto en meses o años..."
                value={fieldFormData.placeholder || ''}
                onChange={(e) => setFieldFormData({ ...fieldFormData, placeholder: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-muted/10">
              <div>
                <Label className="text-xs font-bold text-foreground">Campo Obligatorio</Label>
                <p className="text-[10px] text-muted-foreground">
                  El paciente o médico no podrá continuar sin responder
                </p>
              </div>
              <Switch
                checked={fieldFormData.requerido}
                onCheckedChange={(val) => setFieldFormData({ ...fieldFormData, requerido: val })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFieldModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Guardar Campo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
