import React, { useState, useEffect, useMemo } from 'react';
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
import { toast } from 'sonner';
import { cn, getInitials } from '../../lib/utils';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

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
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Save,
  Printer,
  Calendar,
  Sparkles,
  Info,
  Thermometer,
  Activity,
  Droplets,
  Scale,
  Ruler,
  FileCheck,
  Building2,
  FileText,
  User,
} from 'lucide-react';

interface ConsultaAtencionWizardModalProps {
  consulta: ConsultaMedica | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  readOnly?: boolean;
}

// Catálogo de categorías de estudios
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

// Estudios rápidos sugeridos
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

// Vías de administración
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

// Frecuencias comunes
const FRECUENCIAS_COMUNES = [
  'Cada 6 horas (4 veces al día)',
  'Cada 8 horas (3 veces al día)',
  'Cada 12 horas (2 veces al día)',
  'Cada 24 horas (1 vez al día)',
  'En la noche antes de dormir',
  'En ayunas por la mañana',
  'SOS / Según dolor o síntoma',
];

// Duraciones sugeridas
const DURACIONES_SUGERIDAS = [
  '3 días',
  '5 días',
  '7 días',
  '10 días',
  '14 días',
  '30 días',
  'Tratamiento continuo',
];

// CIE-10 Sugerencias frecuentes
const CIE10_FRECUENTES = [
  { codigo: 'Z00.0', descripcion: 'Examen médico general de rutina' },
  { codigo: 'J00', descripcion: 'Rinofaringitis aguda (Resfriado común)' },
  { codigo: 'J02.9', descripcion: 'Faringitis aguda, no especificada' },
  { codigo: 'J06.9', descripcion: 'Infección aguda de las vías respiratorias superiores' },
  { codigo: 'I10', descripcion: 'Hipertensión esencial (primaria)' },
  { codigo: 'E11.9', descripcion: 'Diabetes mellitus tipo 2 sin complicaciones' },
  { codigo: 'K29.7', descripcion: 'Gastritis, no especificada' },
  { codigo: 'N39.0', descripcion: 'Infección del tracto urinario, sitio no especificado' },
  { codigo: 'M54.5', descripcion: 'Lumbago no especificado' },
  { codigo: 'R10.4', descripcion: 'Otros dolores abdominales y los no especificados' },
  { codigo: 'K02.9', descripcion: 'Caries dental, no especificada' },
  { codigo: 'K05.0', descripcion: 'Gingivitis aguda' },
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

export const ConsultaAtencionWizardModal: React.FC<ConsultaAtencionWizardModalProps> = ({
  consulta,
  open,
  onOpenChange,
  onSuccess,
  readOnly = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);

  // ── ESTADOS DE LA CONSULTA MÉDICA ──
  const [motivoConsulta, setMotivoConsulta] = useState<string>('');
  const [enfermedadActual, setEnfermedadActual] = useState<string>('');

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
  const [nuevoEstudio, setNuevoEstudio] = useState<EstudioSolicitado>({
    nombre: '',
    categoria: 'Laboratorio',
    justificacion_clinica: '',
    urgente: false,
    indicaciones_preparacion: '',
  });

  // Carrito de Medicamentos (Receta)
  const [medicamentos, setMedicamentos] = useState<MedicamentoPrescrito[]>([]);
  const [nuevoMed, setNuevoMed] = useState<MedicamentoPrescrito>({
    medicamento: '',
    presentacion: '',
    dosis: '',
    via_administracion: 'Oral',
    frecuencia: 'Cada 8 horas (3 veces al día)',
    duracion: '7 días',
    instrucciones: '',
  });

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

  // ── CARGAR DATOS CUANDO SE ABRE LA CONSULTA ──
  useEffect(() => {
    if (consulta && open) {
      setCurrentStep(1);
      setMotivoConsulta(consulta.motivo_consulta || '');
      setEnfermedadActual(consulta.enfermedad_actual || '');

      setSignosVitales({
        peso: consulta.signos_vitales?.peso || '',
        talla: consulta.signos_vitales?.talla || '',
        temperatura: consulta.signos_vitales?.temperatura || '',
        presion_sistolica: consulta.signos_vitales?.presion_sistolica || '',
        presion_diastolica: consulta.signos_vitales?.presion_diastolica || '',
        frecuencia_cardiaca: consulta.signos_vitales?.frecuencia_cardiaca || '',
        frecuencia_respiratoria: consulta.signos_vitales?.frecuencia_respiratoria || '',
        saturacion_oxigeno: consulta.signos_vitales?.saturacion_oxigeno || '',
        glucosa_capilar: consulta.signos_vitales?.glucosa_capilar || '',
        observaciones_triaje: consulta.signos_vitales?.observaciones_triaje || '',
      });

      setDatosPlantilla(consulta.datos_plantilla || {});
      setEstudios(consulta.estudios_solicitados || []);
      setMedicamentos(consulta.receta_medica || []);

      if (consulta.reposo_medico) {
        setReposo({
          requiere_reposo: Boolean(consulta.reposo_medico.requiere_reposo),
          fecha_inicio:
            consulta.reposo_medico.fecha_inicio || new Date().toISOString().split('T')[0],
          fecha_fin:
            consulta.reposo_medico.fecha_fin || new Date().toISOString().split('T')[0],
          dias_reposo: Number(consulta.reposo_medico.dias_reposo) || 1,
          motivo_diagnostico: consulta.reposo_medico.motivo_diagnostico || '',
          observaciones: consulta.reposo_medico.observaciones || '',
        });
      } else {
        setReposo({
          requiere_reposo: false,
          fecha_inicio: new Date().toISOString().split('T')[0],
          fecha_fin: new Date().toISOString().split('T')[0],
          dias_reposo: 1,
          motivo_diagnostico: '',
          observaciones: '',
        });
      }

      setDiagnosticoPrincipal(consulta.diagnostico_principal || '');
      setDiagnosticosSecundarios(
        Array.isArray(consulta.diagnosticos_secundarios)
          ? consulta.diagnosticos_secundarios.map((d) => (typeof d === 'string' ? d : d?.nombre || String(d)))
          : []
      );
      setPlanTratamiento(consulta.plan_tratamiento || '');
      setIndicacionesGenerales(consulta.indicaciones_generales || '');

      // Cargar plantilla dinámica de la especialidad
      if (consulta.especialidad_id) {
        setLoadingPlantilla(true);
        especialidadesApi
          .getPlantillaEfectiva(consulta.especialidad_id)
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
    }
  }, [consulta, open]);

  // ── CÁLCULO DINÁMICO DE IMC ──
  const imcInfo = useMemo(() => {
    const p = parseFloat(String(signosVitales.peso));
    const t = parseFloat(String(signosVitales.talla));
    if (!p || !t || p <= 0 || t <= 0) return null;

    const tallaM = t > 3 ? t / 100 : t; // si ingresó en cm (ej: 170) o en m (1.70)
    const imc = p / (tallaM * tallaM);
    const imcFormatted = imc.toFixed(1);

    if (imc < 18.5) {
      return { imc: imcFormatted, label: 'Bajo Peso', color: 'text-sky-600 bg-sky-500/10 border-sky-500/20' };
    }
    if (imc >= 18.5 && imc <= 24.9) {
      return {
        imc: imcFormatted,
        label: 'Peso Saludable / Normal',
        color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
      };
    }
    if (imc >= 25.0 && imc <= 29.9) {
      return {
        imc: imcFormatted,
        label: 'Sobrepeso',
        color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
      };
    }
    return {
      imc: imcFormatted,
      label: 'Obesidad',
      color: 'text-red-600 bg-red-500/10 border-red-500/20',
    };
  }, [signosVitales.peso, signosVitales.talla]);

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

  // ── MANEJO DEL CARRITO DE ESTUDIOS ──
  const handleAgregarEstudio = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nuevoEstudio.nombre.trim()) {
      toast.error('Ingrese el nombre del estudio médico o examen');
      return;
    }
    setEstudios((prev) => [
      ...prev,
      {
        ...nuevoEstudio,
        id: `est_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
    ]);
    setNuevoEstudio({
      nombre: '',
      categoria: 'Laboratorio',
      justificacion_clinica: '',
      urgente: false,
      indicaciones_preparacion: '',
    });
    toast.success('Estudio agregado a la orden médica');
  };

  const handleEliminarEstudio = (idx: number) => {
    setEstudios((prev) => prev.filter((_, i) => i !== idx));
    toast.info('Estudio eliminado de la orden');
  };

  // ── MANEJO DEL CARRITO DE MEDICAMENTOS ──
  const handleAgregarMedicamento = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nuevoMed.medicamento.trim()) {
      toast.error('Ingrese el nombre o principio activo del medicamento');
      return;
    }
    setMedicamentos((prev) => [
      ...prev,
      {
        ...nuevoMed,
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
    ]);
    setNuevoMed({
      medicamento: '',
      presentacion: '',
      dosis: '',
      via_administracion: 'Oral',
      frecuencia: 'Cada 8 horas (3 veces al día)',
      duracion: '7 días',
      instrucciones: '',
    });
    toast.success('Medicamento prescrito agregado');
  };

  const handleEliminarMedicamento = (idx: number) => {
    setMedicamentos((prev) => prev.filter((_, i) => i !== idx));
    toast.info('Medicamento retirado de la receta');
  };

  // ── DIAGNÓSTICOS SECUNDARIOS ──
  const handleAgregarDiagSecundario = () => {
    if (!nuevoDiagSecundario.trim()) return;
    if (!diagnosticosSecundarios.includes(nuevoDiagSecundario.trim())) {
      setDiagnosticosSecundarios((prev) => [...prev, nuevoDiagSecundario.trim()]);
    }
    setNuevoDiagSecundario('');
  };

  const handleEliminarDiagSecundario = (index: number) => {
    setDiagnosticosSecundarios((prev) => prev.filter((_, i) => i !== index));
  };

  // ── CONSTRUIR PAYLOAD DE CONSULTA ──
  const buildPayload = (isFinalizing = false) => {
    return {
      motivo_consulta: motivoConsulta,
      enfermedad_actual: enfermedadActual,
      signos_vitales: signosVitales,
      datos_plantilla: datosPlantilla,
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
      if (onSuccess) onSuccess();
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
      setCurrentStep(6);
      toast.error('Por favor indique el Diagnóstico Principal antes de finalizar la consulta');
      return;
    }

    try {
      setFinalizing(true);
      const payload = buildPayload(true);
      await consultasApi.updateConsulta(consulta.id, payload);
      // Cambiar estado a finalizada
      await consultasApi.cambiarEstado(consulta.id, 'finalizada');
      toast.success('🎉 ¡Consulta Médica finalizada y registrada exitosamente!');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error al finalizar consulta:', error);
      toast.error(error?.response?.data?.detail || 'Error al registrar la finalización de la consulta');
    } finally {
      setFinalizing(false);
    }
  };

  // ── IMPRIMIR REPORTE / RECETA ──
  const handleImprimir = () => {
    window.print();
  };

  const stepsList = [
    { num: 1, label: 'Preconsulta y Motivo', icon: ClipboardList },
    { num: 2, label: 'Signos Vitales', icon: HeartPulse },
    { num: 3, label: 'Evaluación y Hallazgos', icon: Stethoscope },
    { num: 4, label: 'Estudios Médicos', icon: FlaskConical },
    { num: 5, label: 'Receta y Reposo', icon: Pill },
    { num: 6, label: 'Diagnóstico y Cierre', icon: CheckCircle2 },
  ];

  if (!consulta) return null;

  const preconsultaRespuestas = consulta.preconsulta?.respuestas || {};
  const hasPreconsulta = Boolean(consulta.preconsulta);
  const isPreconsultaCompletada = consulta.preconsulta?.estado === 'completada';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] p-0 overflow-hidden flex flex-col gap-0 border-border/80 shadow-2xl rounded-2xl">
        {/* ── HEADER DEL PACIENTE Y ESPECIALIDAD ── */}
        <DialogHeader className="p-4 sm:p-5 bg-card border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg ring-1 ring-primary/20 shadow-xs">
              {consulta.paciente
                ? getInitials(`${consulta.paciente.nombres} ${consulta.paciente.apellidos}`)
                : 'PA'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {consulta.paciente
                    ? `${consulta.paciente.nombres} ${consulta.paciente.apellidos}`
                    : 'Paciente'}
                </DialogTitle>
                {consulta.codigo && (
                  <Badge variant="outline" className="text-xs font-mono bg-muted/50">
                    {consulta.codigo}
                  </Badge>
                )}
                {readOnly && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    Atención Finalizada
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                <span>
                  <strong>Edad:</strong>{' '}
                  <span className="font-semibold text-foreground">
                    {calculateAge(consulta.paciente?.fecha_nacimiento, consulta.paciente?.edad)}
                  </span>
                </span>
                <span>
                  <strong>Género:</strong>{' '}
                  <span className="font-semibold text-foreground">
                    {formatGender(consulta.paciente?.genero)}
                  </span>
                </span>
                <span>
                  <strong>Doc:</strong>{' '}
                  <span className="font-semibold text-foreground font-mono">
                    {consulta.paciente?.tipo_documento || 'V'}-
                    {consulta.paciente?.documento_identidad || consulta.paciente?.numero_documento || 'No registrado'}
                  </span>
                </span>
                {consulta.paciente?.grupo_sanguineo && (
                  <Badge variant="outline" className="text-[10px] font-bold text-rose-600 border-rose-300">
                    Grupo: {consulta.paciente.grupo_sanguineo}
                  </Badge>
                )}
                <span className="text-primary font-semibold">
                  • {consulta.especialidad?.nombre || 'Consulta General'}
                </span>
                <span>
                  • Dr(a). {consulta.medico?.nombres} {consulta.medico?.apellidos}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleImprimir}
                className="gap-1.5 h-9"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Imprimir Ficha</span>
              </Button>
            )}
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
        </DialogHeader>

        {/* ── BARRA DE PROGRESO DE LOS 6 PASOS ── */}
        <div className="bg-muted/40 border-b border-border/70 px-4 py-2.5 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {stepsList.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                    isActive &&
                      'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/30 font-bold',
                    isPast && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20',
                    !isActive && !isPast && 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                      isActive && 'bg-white/20 text-primary-foreground',
                      isPast && 'bg-emerald-500 text-white',
                      !isActive && !isPast && 'bg-muted-foreground/20 text-muted-foreground'
                    )}
                  >
                    {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.num}
                  </span>
                  <span className="truncate max-w-[120px]">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CUERPO PRINCIPAL DEL WIZARD (CONTENIDO POR PASO) ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-background space-y-6">
          {/* ======================================================== */}
          {/* ── PASO 1: PRECONSULTA Y MOTIVO DE CONSULTA ─────────── */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Paso 1: Preconsulta del Paciente y Motivo de Atención
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Revise las respuestas que el paciente llenó en su celular y registre el motivo y la anamnesis actual.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda: Información de Preconsulta Digital */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Ficha de Preconsulta Digital
                    </h4>
                    {hasPreconsulta ? (
                      isPreconsultaCompletada ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          Completada por Paciente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                          Pendiente de llenar
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">Sin Preconsulta</Badge>
                    )}
                  </div>

                  {hasPreconsulta && isPreconsultaCompletada ? (
                    <Card className="border-border/80 bg-muted/20 shadow-2xs">
                      <CardContent className="p-4 space-y-3.5">
                        {/* Motivo reportado por paciente */}
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Motivo reportado por el paciente:
                          </span>
                          <p className="text-sm font-medium text-foreground mt-0.5">
                            {preconsultaRespuestas.motivo_consulta ||
                              consulta.motivo_consulta ||
                              'No especificado'}
                          </p>
                        </div>

                        {/* Escala de dolor y evolución */}
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">
                              Escala del Dolor (1-10):
                            </span>
                            <div className="mt-1">
                              {preconsultaRespuestas.escala_dolor !== undefined ? (
                                <Badge
                                  className={cn(
                                    'text-xs font-bold',
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

                        {/* Síntomas detallados */}
                        {preconsultaRespuestas.sintomas_principales && (
                          <div className="pt-1 border-t border-border/40">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Síntomas reportados:
                            </span>
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap mt-1 bg-background/80 p-2.5 rounded-lg border border-border/60">
                              {preconsultaRespuestas.sintomas_principales}
                            </p>
                          </div>
                        )}

                        {/* ALERGIAS (ALERTA CRÍTICA) */}
                        <div className="pt-1 border-t border-border/40">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Alergias Conocidas:
                          </span>
                          <div className="mt-1">
                            {preconsultaRespuestas.alergias ? (
                              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>⚠️ {preconsultaRespuestas.alergias}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                Niega alergias a medicamentos o alimentos
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Medicación actual */}
                        <div className="pt-1 border-t border-border/40">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Medicamentos Actuales:
                          </span>
                          <p className="text-xs text-foreground mt-0.5">
                            {preconsultaRespuestas.medicamentos_actuales || 'Ninguno reportado'}
                          </p>
                        </div>

                        {/* Antecedentes patológicos */}
                        <div className="pt-1 border-t border-border/40">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Antecedentes / Enfermedades Crónicas:
                          </span>
                          <p className="text-xs text-foreground mt-0.5">
                            {preconsultaRespuestas.enfermedades_previas ||
                              preconsultaRespuestas.antecedentes ||
                              'Sin antecedentes crónicos declarados'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-border/70 text-center space-y-2 bg-muted/10">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-semibold text-foreground">
                        Sin respuestas de preconsulta previa
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        El paciente no completó el enlace de WhatsApp antes de ingresar. Puede
                        interrogarlo directamente e ingresar los datos a continuación.
                      </p>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Motivo de Consulta y Enfermedad Actual (Médico) */}
                <div className="lg:col-span-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Registro Médico de la Consulta
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="motivo_consulta" className="text-xs font-semibold">
                        Motivo Principal de Consulta <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="motivo_consulta"
                        value={motivoConsulta}
                        onChange={(e) => setMotivoConsulta(e.target.value)}
                        placeholder="Ej: Dolor abdominal recurrente en fosa ilíaca derecha..."
                        disabled={readOnly}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="enfermedad_actual" className="text-xs font-semibold">
                        Enfermedad Actual / Anamnesis Próxima (Evolución y Semiología)
                      </Label>
                      <Textarea
                        id="enfermedad_actual"
                        value={enfermedadActual}
                        onChange={(e) => setEnfermedadActual(e.target.value)}
                        placeholder="Paciente refiere cuadro clínico de 3 días de evolución caracterizado por dolor de tipo cólico de inicio súbito, acompañado de..."
                        disabled={readOnly}
                        rows={7}
                        className="resize-y"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        Consejo de Documentación
                      </div>
                      <p>
                        Asegúrese de registrar cronología, carácter del dolor, factores agravantes o
                        atenuantes y síntomas acompañantes para un historial clínico completo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ── PASO 2: SIGNOS VITALES Y TRIAJE ──────────────────── */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    Paso 2: Signos Vitales y Parámetros Basales
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Registro de constantes biológicas durante la consulta. El Índice de Masa Corporal (IMC) se calculará automáticamente.
                  </p>
                </div>

                {imcInfo && (
                  <Badge variant="outline" className={cn('text-xs font-bold py-1 px-3', imcInfo.color)}>
                    IMC: {imcInfo.imc} kg/m² ({imcInfo.label})
                  </Badge>
                )}
              </div>

              {/* Banner de IMC en tiempo real */}
              {imcInfo && (
                <div
                  className={cn(
                    'p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all',
                    imcInfo.color
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Scale className="h-6 w-6 shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider">
                        Índice de Masa Corporal (IMC)
                      </div>
                      <div className="text-lg font-black">
                        {imcInfo.imc} kg/m² — <span className="font-bold">{imcInfo.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold opacity-90">
                    Peso: {signosVitales.peso || '--'} kg | Altura: {signosVitales.talla || '--'} cm
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Peso */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Scale className="h-4 w-4 text-primary" />
                      Peso Corporal <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(kg)</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="350"
                    value={signosVitales.peso}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, peso: val }));
                      setDatosPlantilla((prev) => ({ ...prev, peso: val }));
                    }}
                    placeholder="Ej: 70.5"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Altura / Talla */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Ruler className="h-4 w-4 text-primary" />
                      Talla / Altura <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(cm)</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="30"
                    max="250"
                    value={signosVitales.talla}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, talla: val }));
                      setDatosPlantilla((prev) => ({ ...prev, talla: val }));
                    }}
                    placeholder="Ej: 172"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Presión Sistólica */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Activity className="h-4 w-4 text-rose-500" />
                      Tensión Sistólica <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(mmHg)</span>
                  </Label>
                  <Input
                    type="number"
                    value={signosVitales.presion_sistolica}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, presion_sistolica: val }));
                      setDatosPlantilla((prev) => ({ ...prev, ta_sistolica: val, presion_sistolica: val }));
                    }}
                    placeholder="Ej: 120"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Presión Diastólica */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Activity className="h-4 w-4 text-rose-500" />
                      Tensión Diastólica <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(mmHg)</span>
                  </Label>
                  <Input
                    type="number"
                    value={signosVitales.presion_diastolica}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, presion_diastolica: val }));
                      setDatosPlantilla((prev) => ({ ...prev, ta_diastolica: val, presion_diastolica: val }));
                    }}
                    placeholder="Ej: 80"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Frecuencia Cardíaca */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <HeartPulse className="h-4 w-4 text-red-500" />
                      Frecuencia Cardíaca <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(lpm)</span>
                  </Label>
                  <Input
                    type="number"
                    value={signosVitales.frecuencia_cardiaca}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, frecuencia_cardiaca: val }));
                      setDatosPlantilla((prev) => ({ ...prev, frecuencia_cardiaca: val }));
                    }}
                    placeholder="Ej: 75"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Frecuencia Respiratoria */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Activity className="h-4 w-4 text-sky-500" />
                      Frecuencia Resp.
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(rpm)</span>
                  </Label>
                  <Input
                    type="number"
                    value={signosVitales.frecuencia_respiratoria}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, frecuencia_respiratoria: val }));
                      setDatosPlantilla((prev) => ({ ...prev, frecuencia_respiratoria: val }));
                    }}
                    placeholder="Ej: 16"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Temperatura */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Thermometer className="h-4 w-4 text-amber-500" />
                      Temperatura <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(°C)</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={signosVitales.temperatura}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, temperatura: val }));
                      setDatosPlantilla((prev) => ({ ...prev, temperatura: val }));
                    }}
                    placeholder="Ej: 36.5"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Saturación O2 */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Droplets className="h-4 w-4 text-emerald-500" />
                      Saturación O2 (SpO2)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(%)</span>
                  </Label>
                  <Input
                    type="number"
                    value={signosVitales.saturacion_oxigeno}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, saturacion_oxigeno: val }));
                      setDatosPlantilla((prev) => ({ ...prev, saturacion_o2: val, saturacion_oxigeno: val }));
                    }}
                    placeholder="Ej: 98"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>

                {/* Glucosa Capilar */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 shadow-2xs sm:col-span-2 lg:col-span-4">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Droplets className="h-4 w-4 text-purple-500" />
                      Glucosa Capilar / HGT
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">(mg/dL)</span>
                  </Label>
                  <Input
                    type="number"
                    value={signosVitales.glucosa_capilar}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignosVitales((prev) => ({ ...prev, glucosa_capilar: val }));
                      setDatosPlantilla((prev) => ({ ...prev, glucosa_capilar: val }));
                    }}
                    placeholder="Ej: 95 (Opcional si se realizó glicemia capilar)"
                    disabled={readOnly}
                    className="text-sm font-semibold h-10 font-mono"
                  />
                </div>
              </div>

              {/* Observaciones de triaje */}
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <Label htmlFor="observaciones_triaje" className="text-xs font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Observaciones de Triaje / Estado General del Paciente
                </Label>
                <Textarea
                  id="observaciones_triaje"
                  value={signosVitales.observaciones_triaje}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSignosVitales((prev) => ({ ...prev, observaciones_triaje: val }));
                    setDatosPlantilla((prev) => ({ ...prev, observaciones_triaje: val }));
                  }}
                  placeholder="Paciente lúcido, orientado en tiempo y espacio, afebril, ventilando espontáneamente sin dificultad aparente..."
                  disabled={readOnly}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ── PASO 3: EVALUACIÓN Y PLANTILLA DE ESPECIALIDAD ───── */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Paso 3: Evaluación y Hallazgos Clínicos ({consulta.especialidad?.nombre || 'General'})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Formulario dinámico configurado según los protocolos de la especialidad del médico tratante.
                  </p>
                </div>
                {plantillaEfectiva?.tiene_plantilla_base && (
                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                    Plantilla Personalizada de Especialidad
                  </Badge>
                )}
              </div>

              {loadingPlantilla ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs">Cargando protocolo y campos clínicos de la especialidad...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* WIDGET INTERACTIVO DE ODONTOGRAMA SI APLICA */}
                  {(plantillaEfectiva?.widgets_activos || []).includes('odontograma') && (
                    <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-sky-500" />
                          <h4 className="text-sm font-bold text-foreground">
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
                    </div>
                  )}

                  {/* SECCIONES DINÁMICAS DE LA PLANTILLA (FILTRANDO DUPLICADOS DE SIGNOS VITALES) */}
                  {(() => {
                    const seccionesFiltradas = (plantillaEfectiva?.consulta_secciones || []).filter(
                      (seccion: SeccionClinica) => {
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
                        <Card className="border-border/80 shadow-2xs">
                          <CardContent className="p-5 space-y-4">
                            <div className="border-b border-border/60 pb-2.5">
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
                                  Examen Físico General y por Sistemas
                                </Label>
                                <Textarea
                                  value={datosPlantilla.examen_fisico_general || ''}
                                  onChange={(e) =>
                                    setDatosPlantilla((prev) => ({
                                      ...prev,
                                      examen_fisico_general: e.target.value,
                                    }))
                                  }
                                  placeholder="Detalle inspección general, cabeza/cuello, tórax/cardiopulmonar, abdomen, extremidades, neurológico..."
                                  disabled={readOnly}
                                  rows={4}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                  Hallazgos Relevantes / Observaciones Clínicas
                                </Label>
                                <Textarea
                                  value={datosPlantilla.hallazgos_clinicos || ''}
                                  onChange={(e) =>
                                    setDatosPlantilla((prev) => ({
                                      ...prev,
                                      hallazgos_clinicos: e.target.value,
                                    }))
                                  }
                                  placeholder="Signos positivos, lesiones, ruidos anormales, asimetrías o anomalías detectadas..."
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
                      <Card key={seccion.id} className="border-border/80 shadow-2xs">
                        <CardContent className="p-5 space-y-4">
                          <div className="border-b border-border/60 pb-2.5">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-primary" />
                              {seccion.titulo}
                            </h4>
                            {seccion.descripcion && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {seccion.descripcion}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {seccion.campos?.map((campo: CampoClinico) => {
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
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ── PASO 4: ESTUDIOS Y EXÁMENES (CARRITO) ────────────── */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    Paso 4: Solicitud de Estudios y Exámenes Complementarios
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Añada los exámenes de laboratorio, imágenes diagnósticas o procedimientos que el paciente requiera.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs font-bold self-start sm:self-auto">
                  {estudios.length} {estudios.length === 1 ? 'Estudio solicitado' : 'Estudios solicitados'}
                </Badge>
              </div>

              {/* Formulario de Agregar Estudio */}
              {!readOnly && (
                <Card className="border-primary/30 bg-primary/5 shadow-xs">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Agregar Estudio a la Orden
                    </div>

                    {/* Chips de selección rápida */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Sugerencias Rápidas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ESTUDIOS_RAPIDOS.map((est) => (
                          <button
                            key={est.nombre}
                            type="button"
                            onClick={() =>
                              setNuevoEstudio((prev) => ({
                                ...prev,
                                nombre: est.nombre,
                                categoria: est.categoria,
                              }))
                            }
                            className="text-xs px-2.5 py-1 rounded-lg bg-background/80 hover:bg-background border border-border/70 hover:border-primary/40 text-foreground transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>+ {est.nombre}</span>
                            <span className="text-[10px] text-muted-foreground">({est.categoria})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      <div className="md:col-span-5 space-y-1">
                        <Label className="text-xs font-semibold">Nombre del Estudio / Examen *</Label>
                        <Input
                          value={nuevoEstudio.nombre}
                          onChange={(e) =>
                            setNuevoEstudio((prev) => ({ ...prev, nombre: e.target.value }))
                          }
                          placeholder="Ej: Ecografía Renal Bilateral"
                          className="h-9.5 bg-background"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs font-semibold">Categoría</Label>
                        <Select
                          value={nuevoEstudio.categoria}
                          onValueChange={(val) =>
                            setNuevoEstudio((prev) => ({ ...prev, categoria: val }))
                          }
                        >
                          <SelectTrigger className="h-9.5 bg-background">
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

                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-xs font-semibold">Justificación Clínica / Sospecha</Label>
                        <Input
                          value={nuevoEstudio.justificacion_clinica || ''}
                          onChange={(e) =>
                            setNuevoEstudio((prev) => ({
                              ...prev,
                              justificacion_clinica: e.target.value,
                            }))
                          }
                          placeholder="Ej: Descartar litiasis renal"
                          className="h-9.5 bg-background"
                        />
                      </div>

                      <div className="md:col-span-8 space-y-1">
                        <Label className="text-xs font-semibold">Indicaciones / Preparación previa</Label>
                        <Input
                          value={nuevoEstudio.indicaciones_preparacion || ''}
                          onChange={(e) =>
                            setNuevoEstudio((prev) => ({
                              ...prev,
                              indicaciones_preparacion: e.target.value,
                            }))
                          }
                          placeholder="Ej: En ayunas de 8 horas, vejiga llena (tomar 4 vasos de agua 1 hora antes)..."
                          className="h-9.5 bg-background"
                        />
                      </div>

                      <div className="md:col-span-4 flex items-center justify-between gap-3 pt-5">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={nuevoEstudio.urgente}
                            onCheckedChange={(checked) =>
                              setNuevoEstudio((prev) => ({ ...prev, urgente: checked }))
                            }
                          />
                          <Label className="text-xs font-semibold cursor-pointer">
                            ¿Estudio Urgente?
                          </Label>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleAgregarEstudio()}
                          className="h-9.5 gap-1.5 px-4 font-semibold"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Agregar</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista / Carrito de Estudios */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Orden de Estudios Médicos Solicitados ({estudios.length})
                </h4>

                {estudios.length === 0 ? (
                  <div className="p-8 rounded-xl border-2 border-dashed border-border/70 text-center text-muted-foreground bg-muted/10 space-y-1.5">
                    <FlaskConical className="h-7 w-7 mx-auto opacity-50" />
                    <p className="text-sm font-semibold text-foreground">
                      No se han solicitado estudios para esta consulta
                    </p>
                    <p className="text-xs">
                      Si el paciente no amerita estudios complementarios, puede continuar al siguiente paso.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {estudios.map((est, idx) => (
                      <div
                        key={est.id || idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">
                              {idx + 1}. {est.nombre}
                            </span>
                            <Badge variant="outline" className="text-xs font-medium">
                              {est.categoria || 'General'}
                            </Badge>
                            {est.urgente && (
                              <Badge className="bg-red-500 text-white text-[10px] font-bold">
                                URGENTE
                              </Badge>
                            )}
                          </div>

                          {est.justificacion_clinica && (
                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground/80">Justificación:</strong>{' '}
                              {est.justificacion_clinica}
                            </p>
                          )}

                          {est.indicaciones_preparacion && (
                            <p className="text-xs text-primary font-medium">
                              <strong>Preparación:</strong> {est.indicaciones_preparacion}
                            </p>
                          )}
                        </div>

                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarEstudio(idx)}
                            className="text-muted-foreground hover:text-destructive shrink-0 self-end sm:self-center h-8 w-8"
                            title="Eliminar estudio"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ── PASO 5: PRESCRIPCIÓN MÉDICA Y REPOSO ─────────────── */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Pill className="h-5 w-5 text-primary" />
                  Paso 5: Prescripción Médica (Receta) y Licencia / Reposo
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prescriba los fármacos con su dosificación detallada y emita el reposo médico laboral si corresponde.
                </p>
              </div>

              {/* SECCIÓN 1: CARRITO DE MEDICAMENTOS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-primary" />
                    Receta Médica Farmacológica ({medicamentos.length})
                  </h4>
                </div>

                {!readOnly && (
                  <Card className="border-primary/30 bg-primary/5 shadow-xs">
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      <div className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Añadir Medicamento a la Receta
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                        <div className="md:col-span-5 space-y-1">
                          <Label className="text-xs font-semibold">
                            Medicamento / Principio Activo *
                          </Label>
                          <Input
                            value={nuevoMed.medicamento}
                            onChange={(e) =>
                              setNuevoMed((prev) => ({ ...prev, medicamento: e.target.value }))
                            }
                            placeholder="Ej: Amoxicilina + Ácido Clavulánico"
                            className="h-9.5 bg-background font-medium"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs font-semibold">Presentación</Label>
                          <Input
                            value={nuevoMed.presentacion || ''}
                            onChange={(e) =>
                              setNuevoMed((prev) => ({ ...prev, presentacion: e.target.value }))
                            }
                            placeholder="Ej: Comp. 875/125 mg"
                            className="h-9.5 bg-background"
                          />
                        </div>

                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-xs font-semibold">Dosis</Label>
                          <Input
                            value={nuevoMed.dosis || ''}
                            onChange={(e) =>
                              setNuevoMed((prev) => ({ ...prev, dosis: e.target.value }))
                            }
                            placeholder="Ej: 1 comprimido"
                            className="h-9.5 bg-background"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs font-semibold">Vía de Administración</Label>
                          <Select
                            value={nuevoMed.via_administracion}
                            onValueChange={(val) =>
                              setNuevoMed((prev) => ({ ...prev, via_administracion: val }))
                            }
                          >
                            <SelectTrigger className="h-9.5 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VIAS_ADMINISTRACION.map((via) => (
                                <SelectItem key={via} value={via}>
                                  {via}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-xs font-semibold">Frecuencia</Label>
                          <Select
                            value={nuevoMed.frecuencia}
                            onValueChange={(val) =>
                              setNuevoMed((prev) => ({ ...prev, frecuencia: val }))
                            }
                          >
                            <SelectTrigger className="h-9.5 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FRECUENCIAS_COMUNES.map((frec) => (
                                <SelectItem key={frec} value={frec}>
                                  {frec}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs font-semibold">Duración</Label>
                          <Select
                            value={nuevoMed.duracion}
                            onValueChange={(val) =>
                              setNuevoMed((prev) => ({ ...prev, duracion: val }))
                            }
                          >
                            <SelectTrigger className="h-9.5 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DURACIONES_SUGERIDAS.map((dur) => (
                                <SelectItem key={dur} value={dur}>
                                  {dur}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2 flex items-end">
                          <Button
                            type="button"
                            onClick={() => handleAgregarMedicamento()}
                            className="h-9.5 w-full font-semibold gap-1.5"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Añadir</span>
                          </Button>
                        </div>

                        <div className="md:col-span-12 space-y-1">
                          <Label className="text-xs font-semibold">
                            Instrucciones Especiales / Advertencias para el Paciente
                          </Label>
                          <Input
                            value={nuevoMed.instrucciones || ''}
                            onChange={(e) =>
                              setNuevoMed((prev) => ({ ...prev, instrucciones: e.target.value }))
                            }
                            placeholder="Ej: Tomar con alimentos. No suspender antes de los 7 días aunque desaparezcan los síntomas."
                            className="h-9.5 bg-background"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de Medicamentos Prescritos */}
                {medicamentos.length === 0 ? (
                  <div className="p-6 rounded-xl border-2 border-dashed border-border/70 text-center text-muted-foreground bg-muted/10 space-y-1">
                    <Pill className="h-6 w-6 mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-foreground">
                      No se han añadido medicamentos a la receta
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {medicamentos.map((med, idx) => (
                      <div
                        key={med.id || idx}
                        className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {idx + 1}. {med.medicamento}
                            </span>
                            {med.presentacion && (
                              <Badge variant="outline" className="text-[11px]">
                                {med.presentacion}
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>
                              <strong className="text-foreground/80">Posología:</strong> {med.dosis} •{' '}
                              {med.frecuencia} • {med.via_administracion}
                            </div>
                            <div>
                              <strong className="text-foreground/80">Durante:</strong> {med.duracion}
                            </div>
                            {med.instrucciones && (
                              <div className="text-primary italic mt-1 font-medium">
                                💡 {med.instrucciones}
                              </div>
                            )}
                          </div>
                        </div>

                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarMedicamento(idx)}
                            className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                            title="Eliminar medicamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: REPOSO MÉDICO (LICENCIA) */}
              <div className="pt-4 border-t border-border/70 space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
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
                </div>

                {reposo.requiere_reposo && (
                  <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
                    <CardContent className="p-4 sm:p-5 space-y-4">
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
                            className="h-9.5 bg-background font-mono"
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
                            className="h-9.5 bg-background font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Días Totales Calculados</Label>
                          <div className="h-9.5 flex items-center px-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-sm">
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
                            className="h-9.5 bg-background"
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
                            className="h-9.5 bg-background"
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
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Paso 6: Diagnóstico CIE-10, Plan de Tratamiento y Finalización
                </h3>
                <p className="text-xs text-muted-foreground">
                  Establezca el diagnóstico definitivo, indicaciones generales y revise el resumen consolidado de la atención médica.
                </p>
              </div>

              {/* Diagnósticos y Plan */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-4">
                  {/* Diagnóstico Principal */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>
                        Diagnóstico Principal (CIE-10 / Juicio Clínico) <span className="text-destructive">*</span>
                      </span>
                    </Label>
                    <Input
                      value={diagnosticoPrincipal}
                      onChange={(e) => setDiagnosticoPrincipal(e.target.value)}
                      placeholder="Ej: J00 Rinofaringitis aguda (Resfriado común)"
                      disabled={readOnly}
                      className="h-10 text-sm font-semibold"
                    />

                    {/* Sugerencias Rápidas CIE-10 */}
                    {!readOnly && (
                      <div className="pt-1.5 space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          CIE-10 Frecuentes:
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 rounded-lg border border-border/60 bg-muted/20">
                          {CIE10_FRECUENTES.map((cie) => (
                            <button
                              key={cie.codigo}
                              type="button"
                              onClick={() =>
                                setDiagnosticoPrincipal(`${cie.codigo} - ${cie.descripcion}`)
                              }
                              className="text-[11px] px-2 py-0.5 rounded bg-background hover:bg-primary/10 hover:text-primary border border-border/70 transition-all text-left truncate max-w-full cursor-pointer"
                            >
                              <strong>{cie.codigo}</strong>: {cie.descripcion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Diagnósticos Secundarios */}
                  <div className="space-y-2">
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
                          className="h-9"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAgregarDiagSecundario}
                          className="h-9 shrink-0 font-semibold"
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
                            className="text-xs py-1 px-2.5 gap-1.5 bg-muted"
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
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-4">
                  {/* Plan de Tratamiento */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Plan de Tratamiento Integral y Conducta Médica
                    </Label>
                    <Textarea
                      value={planTratamiento}
                      onChange={(e) => setPlanTratamiento(e.target.value)}
                      placeholder="Medidas generales, control de síntomas, signos de alarma por los que debe acudir a urgencias..."
                      disabled={readOnly}
                      rows={3}
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
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* ── RESUMEN CONSOLIDADO DE LA ATENCIÓN MÉDICA ── */}
              <div className="pt-4 border-t border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Resumen Consolidado de la Consulta
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImprimir}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Vista de Impresión</span>
                  </Button>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4 text-xs">
                  {/* Fila 1: Paciente y Vitals */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-border/60">
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

                  {/* Fila 2: Medicamentos prescritos y Estudios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Pill className="h-3.5 w-3.5 text-primary" />
                        Medicamentos Prescritos ({medicamentos.length}):
                      </span>
                      {medicamentos.length > 0 ? (
                        <ul className="list-disc list-inside mt-1.5 space-y-1 text-muted-foreground">
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
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <FlaskConical className="h-3.5 w-3.5 text-primary" />
                        Estudios Solicitados ({estudios.length}):
                      </span>
                      {estudios.length > 0 ? (
                        <ul className="list-disc list-inside mt-1.5 space-y-1 text-muted-foreground">
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

                  {/* Reposo médico si aplica */}
                  {reposo.requiere_reposo && (
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold">
                      <span>
                        ⚠️ Reposo Médico otorgado por {reposo.dias_reposo} día(s) (Desde:{' '}
                        {reposo.fecha_inicio} Hasta: {reposo.fecha_fin})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER CON NAVEGACIÓN Y ACCIONES ── */}
        <div className="p-4 sm:p-5 bg-card border-t border-border/70 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="gap-1.5 h-9"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Anterior</span>
              </Button>
            )}
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              Paso {currentStep} de 6
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {!readOnly && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGuardarBorrador}
                disabled={saving || finalizing}
                className="gap-1.5 h-9"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Borrador'}</span>
              </Button>
            )}

            {currentStep < 6 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="gap-1.5 h-9 font-semibold"
              >
                <span>Siguiente</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : !readOnly ? (
              <Button
                type="button"
                size="sm"
                onClick={handleGuardarYFinalizar}
                disabled={saving || finalizing}
                className="gap-1.5 h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{finalizing ? 'Finalizando...' : 'Guardar y Finalizar Atención'}</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 font-semibold"
              >
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultaAtencionWizardModal;
