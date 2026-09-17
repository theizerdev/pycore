import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRegional } from '../../context/RegionalContext';
import { sucursalesApi } from '../../api/sucursales';
import { pacientesApi } from '../../api/pacientes';
import type { Paciente, Sucursal } from '../../types';
import { PhoneCountryInput } from '../../components/common/PhoneCountryInput';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  User,
  Activity,
  PhoneCall,
  Calendar,
  AlertTriangle,
  Heart,
  Plus,
  X,
  Save,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

interface PatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientToEdit?: Paciente | null;
  onSaved: (savedPatient?: Paciente) => void;
  initialSearch?: string;
}

const GRUPOS_SANGUINEOS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const ALERGIAS_COMUNES_SUGERIDAS = [
  'Penicilina',
  'Dipirona',
  'Aspirina / AINEs',
  'Sulfas / Sulfamidas',
  'Látex',
  'Yodo / Medio de Contraste',
  'Mariscos',
  'Polen / Rinitis',
];

const PARENTESCOS = [
  'Cónyuge',
  'Madre',
  'Padre',
  'Hijo / Hija',
  'Hermano / Hermana',
  'Tutor Legal',
  'Amigo / Allegado',
  'Otro',
];

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  open,
  onOpenChange,
  patientToEdit,
  onSaved,
  initialSearch,
}) => {
  const { user } = useAuth();
  const regional = useRegional();
  type PatientTab = 'demograficos' | 'ficha' | 'emergencia';
  const [activeTab, setActiveTab] = useState<PatientTab>('demograficos');
  const [saving, setSaving] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // ── 1. Estado Datos Demográficos ─────────────────────────────────────
  const [tipoDocumento, setTipoDocumento] = useState('V');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | 'O'>('M');
  const [email, setEmail] = useState('');
  const [paisTelefonoId, setPaisTelefonoId] = useState<number | null>(null);
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [sucursalRegistroId, setSucursalRegistroId] = useState<number | null>(null);

  // ── 2. Estado Ficha Médica Base ──────────────────────────────────────
  const [grupoSanguineo, setGrupoSanguineo] = useState<string>('O+');
  const [alergias, setAlergias] = useState<string[]>([]);
  const [nuevaAlergiaInput, setNuevaAlergiaInput] = useState('');
  const [antecedentesPatologicos, setAntecedentesPatologicos] = useState('');
  const [antecedentesFamiliares, setAntecedentesFamiliares] = useState('');
  const [antecedentesQuirurgicos, setAntecedentesQuirurgicos] = useState('');
  const [medicacionHabitual, setMedicacionHabitual] = useState('');
  const [observacionesMedicas, setObservacionesMedicas] = useState('');

  // ── 3. Contacto de Emergencia y Seguro ────────────────────────────────
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoParentesco, setContactoParentesco] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [seguroMedico, setSeguroMedico] = useState('');
  const [numeroPoliza, setNumeroPoliza] = useState('');
  const [activo, setActivo] = useState(true);

  // Cargar sucursales
  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const data = await sucursalesApi.list();
        setSucursales(data);
        if (!sucursalRegistroId && data.length > 0) {
          setSucursalRegistroId(user?.sucursal_defecto_id || data[0].id);
        }
      } catch (err) {
        console.error('Error cargando sucursales:', err);
      }
    };
    if (open) {
      fetchSucursales();
    }
  }, [open, user?.sucursal_defecto_id]);

  // Cargar datos en modo edición o resetear para nuevo
  useEffect(() => {
    if (!open) return;

    if (patientToEdit) {
      setTipoDocumento(patientToEdit.tipo_documento || 'V');
      setDocumentoIdentidad(patientToEdit.documento_identidad || '');
      setNombres(patientToEdit.nombres || '');
      setApellidos(patientToEdit.apellidos || '');
      setFechaNacimiento(patientToEdit.fecha_nacimiento ? String(patientToEdit.fecha_nacimiento).split('T')[0] : '');
      setGenero((patientToEdit.genero as any) || 'M');
      setEmail(patientToEdit.email || '');
      setPaisTelefonoId(patientToEdit.pais_telefono_id || null);
      setTelefono(patientToEdit.telefono || '');
      setDireccion(patientToEdit.direccion || '');
      setCiudad(patientToEdit.ciudad || '');
      setSucursalRegistroId(patientToEdit.sucursal_registro_id || null);

      setGrupoSanguineo(patientToEdit.grupo_sanguineo || 'O+');
      setAlergias(Array.isArray(patientToEdit.alergias) ? patientToEdit.alergias : []);
      setAntecedentesPatologicos(patientToEdit.antecedentes_patologicos || '');
      setAntecedentesFamiliares(patientToEdit.antecedentes_familiares || '');
      setAntecedentesQuirurgicos(patientToEdit.antecedentes_quirurgicos || '');
      setMedicacionHabitual(patientToEdit.medicacion_habitual || '');
      setObservacionesMedicas(patientToEdit.observaciones_medicas || '');

      setContactoNombre(patientToEdit.contacto_emergencia_nombre || '');
      setContactoParentesco(patientToEdit.contacto_emergencia_parentesco || '');
      setContactoTelefono(patientToEdit.contacto_emergencia_telefono || '');
      setSeguroMedico(patientToEdit.seguro_medico || '');
      setNumeroPoliza(patientToEdit.numero_poliza || '');
      setActivo(patientToEdit.activo ?? true);
      setActiveTab('demograficos');
    } else {
      setTipoDocumento('V');
      if (initialSearch && initialSearch.trim()) {
        const clean = initialSearch.trim();
        const docMatch = clean.match(/^([VEJPGvejpg]-?)?(\d{5,10})$/i);
        if (docMatch) {
          const prefix = docMatch[1] ? docMatch[1].replace('-', '').toUpperCase() : 'V';
          const number = docMatch[2];
          setTipoDocumento(prefix);
          setDocumentoIdentidad(number);
          setNombres('');
          setApellidos('');
        } else if (/^\d+$/.test(clean)) {
          setTipoDocumento('V');
          setDocumentoIdentidad(clean);
          setNombres('');
          setApellidos('');
        } else {
          const words = clean.split(/\s+/);
          if (words.length > 1) {
            setNombres(words.slice(0, -1).join(' '));
            setApellidos(words[words.length - 1]);
          } else {
            setNombres(clean);
            setApellidos('');
          }
          setDocumentoIdentidad('');
        }
      } else {
        setDocumentoIdentidad('');
        setNombres('');
        setApellidos('');
      }
      setFechaNacimiento('');
      setGenero('M');
      setEmail('');
      setPaisTelefonoId(user?.empresa?.pais_id || regional.pais?.id || 1);
      setTelefono('');
      setDireccion('');
      setCiudad('');
      setSucursalRegistroId(user?.sucursal_defecto_id || null);

      setGrupoSanguineo('O+');
      setAlergias([]);
      setNuevaAlergiaInput('');
      setAntecedentesPatologicos('');
      setAntecedentesFamiliares('');
      setAntecedentesQuirurgicos('');
      setMedicacionHabitual('');
      setObservacionesMedicas('');

      setContactoNombre('');
      setContactoParentesco('');
      setContactoTelefono('');
      setSeguroMedico('');
      setNumeroPoliza('');
      setActivo(true);
      setActiveTab('demograficos');
    }
  }, [open, patientToEdit, user?.empresa?.pais_id, user?.sucursal_defecto_id, regional.pais?.id]);

  // Cálculo de edad reactivo en tiempo real
  const edadCalculada = useMemo(() => {
    if (!fechaNacimiento) return null;
    const parts = fechaNacimiento.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const birth = new Date(year, month, day);
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    if (age <= 0) {
      let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      if (today.getDate() < birth.getDate()) months--;
      months = Math.max(0, months);
      if (months === 0) {
        const diffTime = Math.abs(today.getTime() - birth.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} días`;
      }
      return `${months} meses`;
    }
    return `${age} años`;
  }, [fechaNacimiento]);

  // Manejadores de Alergias
  const handleAddAlergia = (alergia: string) => {
    const clean = alergia.trim();
    if (!clean) return;
    if (alergias.some((a) => a.toLowerCase() === clean.toLowerCase())) {
      toast.info('Esta alergia ya está registrada');
      return;
    }
    setAlergias([...alergias, clean]);
    setNuevaAlergiaInput('');
  };

  const handleRemoveAlergia = (indexToRemove: number) => {
    setAlergias(alergias.filter((_, i) => i !== indexToRemove));
  };

  // Guardar Paciente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentoIdentidad.trim()) {
      toast.error('El documento de identidad es obligatorio');
      setActiveTab('demograficos');
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error('Nombres y apellidos son obligatorios');
      setActiveTab('demograficos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo_documento: tipoDocumento.trim().toUpperCase(),
        documento_identidad: documentoIdentidad.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        fecha_nacimiento: fechaNacimiento || null,
        genero,
        email: email.trim() || null,
        pais_telefono_id: paisTelefonoId || null,
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        ciudad: ciudad.trim() || null,
        sucursal_registro_id: sucursalRegistroId || null,
        grupo_sanguineo: grupoSanguineo || null,
        alergias,
        antecedentes_patologicos: antecedentesPatologicos.trim() || null,
        antecedentes_familiares: antecedentesFamiliares.trim() || null,
        antecedentes_quirurgicos: antecedentesQuirurgicos.trim() || null,
        medicacion_habitual: medicacionHabitual.trim() || null,
        observaciones_medicas: observacionesMedicas.trim() || null,
        contacto_emergencia_nombre: contactoNombre.trim() || null,
        contacto_emergencia_parentesco: contactoParentesco.trim() || null,
        contacto_emergencia_telefono: contactoTelefono.trim() || null,
        seguro_medico: seguroMedico.trim() || null,
        numero_poliza: numeroPoliza.trim() || null,
        activo,
      };

      let savedResult: Paciente | undefined;
      if (patientToEdit) {
        savedResult = await pacientesApi.update(patientToEdit.id, payload);
        toast.success(`Paciente ${nombres} ${apellidos} actualizado con éxito`);
      } else {
        savedResult = await pacientesApi.create(payload as any);
        toast.success(`Paciente ${nombres} ${apellidos} registrado exitosamente`);
      }

      onSaved(savedResult);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error guardando paciente:', err);
      toast.error('No se pudo guardar el paciente', {
        description: err.response?.data?.detail || 'Verifique los datos e intente nuevamente',
      });
    } finally {
      setSaving(false);
    }
  };

  const STEPS: Array<{
    id: PatientTab;
    label: string;
    shortTitle: string;
    subtitle: string;
    titleDetail: string;
    descriptionDetail: string;
    icon: any;
    isComplete: boolean;
    badge?: string;
  }> = [
    {
      id: 'demograficos',
      label: '1. Datos Personales',
      shortTitle: 'Personales',
      subtitle: 'Identificación y contacto',
      titleDetail: 'Identificación y Datos Demográficos',
      descriptionDetail: 'Información legal de filiación, residencia y canales de contacto directo.',
      icon: User,
      isComplete: Boolean(nombres.trim() && apellidos.trim() && documentoIdentidad.trim()),
    },
    {
      id: 'ficha',
      label: '2. Ficha Médica',
      shortTitle: 'Ficha Médica',
      subtitle: 'Alergias y antecedentes',
      titleDetail: 'Ficha Clínica, Alergias y Antecedentes',
      descriptionDetail: 'Grupo sanguíneo, alergias conocidas, patologías de base y medicación habitual.',
      icon: Activity,
      isComplete: Boolean(grupoSanguineo),
      badge: alergias.length > 0 ? `${alergias.length} alergias` : undefined,
    },
    {
      id: 'emergencia',
      label: '3. Emergencia y Seguro',
      shortTitle: 'Emergencia',
      subtitle: 'Contacto de apoyo y póliza',
      titleDetail: 'Contacto de Emergencia y Cobertura Médica',
      descriptionDetail: 'Familiar responsable en urgencias y póliza de seguro de salud privada.',
      icon: ShieldCheck,
      isComplete: Boolean(contactoNombre.trim() || seguroMedico.trim()),
      badge: seguroMedico.trim() ? 'Asegurado' : undefined,
    },
  ];

  const currentStepIndex = Math.max(0, STEPS.findIndex((s) => s.id === activeTab));
  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const patientInitials =
    `${nombres?.trim().charAt(0) || ''}${apellidos?.trim().charAt(0) || ''}`.toUpperCase() || 'PA';

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] h-[670px] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-border/70 z-[60]">
        {/* Encabezado */}
        <DialogHeader className="p-4 px-6 border-b border-border/80 bg-muted/20 flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-xs shrink-0">
              <User className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{patientToEdit ? `Editar Ficha de ${patientToEdit.nombres} ${patientToEdit.apellidos}` : 'Registrar Nuevo Paciente'}</span>
                {edadCalculada && (
                  <Badge variant="secondary" className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 font-medium">
                    {edadCalculada}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 bg-teal-500/5">
                  MEDISOFT Ficha
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {patientToEdit
                  ? `Actualizando historia clínica digital de ${patientToEdit.nombres} ${patientToEdit.apellidos}`
                  : 'Ficha médica integral, datos demográficos, antecedentes clínicos y contacto asistencial.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulario y Distribución Master-Detail */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* ── BARRA LATERAL DE PASOS (STEPPER) ── */}
            <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-border/70 bg-muted/20 dark:bg-muted/10 p-3 md:p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-1.5">
                <div className="hidden md:block px-2 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pasos de Registro
                  </span>
                </div>

                <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
                  {STEPS.map((step) => {
                    const IconComponent = step.icon;
                    const isActive = activeTab === step.id;
                    const isCompleted = step.isComplete;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveTab(step.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 border ${
                          isActive
                            ? 'bg-teal-500/10 border-teal-500/40 text-foreground shadow-xs'
                            : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-teal-600 text-white shadow-xs'
                              : isCompleted
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isCompleted && !isActive ? (
                            <Check className="size-4" />
                          ) : (
                            <IconComponent className="size-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-semibold truncate block ${
                                isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
                              }`}
                            >
                              {step.label}
                            </span>
                            {step.badge && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-600 text-white font-bold shrink-0">
                                {step.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {step.subtitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tarjeta de Resumen en Vivo del Paciente (Sidebar Footer) */}
              <div className="hidden md:block pt-3 border-t border-border/60 mt-3">
                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 bg-teal-600 shadow-2xs">
                      {patientInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-foreground truncate block">
                        {nombres || apellidos ? `${nombres} ${apellidos}`.trim() : 'Nuevo Paciente'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate block">
                        {tipoDocumento}-{documentoIdentidad || 'Sin documento'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] border-t border-border/50">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold font-mono">
                      {grupoSanguineo}
                    </span>
                    {edadCalculada && (
                      <span className="text-muted-foreground">
                        {edadCalculada}
                      </span>
                    )}
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded-full ${
                        activo
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PANEL DE CONTENIDO DERECHO ── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
              {/* Banner Superior del Paso Activo */}
              <div className="px-6 py-3.5 border-b border-border/60 bg-card/40 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                      Paso {currentStepIndex + 1} de 3
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                      {currentStep.titleDetail}
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {currentStep.descriptionDetail}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-teal-500 transition-all duration-300 rounded-full"
                      style={{ width: `${((currentStepIndex + 1) / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono">
                    {Math.round(((currentStepIndex + 1) / 3) * 100)}%
                  </span>
                </div>
              </div>

              {/* Contenedor scrolleable del contenido del formulario */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
                  {/* ── TAB 1: DATOS DEMOGRÁFICOS ───────────────────────── */}
                  <TabsContent value="demograficos" className="space-y-4 m-0">
                {/* Documento y Nombres */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Documento de Identidad *</Label>
                    <div className="flex items-center">
                      <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                        <SelectTrigger className="w-[70px] rounded-r-none border-r-0 text-xs h-8.5 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="V">V - Venezolano</SelectItem>
                          <SelectItem value="E">E - Extranjero</SelectItem>
                          <SelectItem value="J">J - Jurídico</SelectItem>
                          <SelectItem value="P">P - Pasaporte</SelectItem>
                          <SelectItem value="DNI">DNI</SelectItem>
                          <SelectItem value="CI">CI</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={documentoIdentidad}
                        onChange={(e) => setDocumentoIdentidad(e.target.value)}
                        placeholder="Ej. 25844912"
                        className="rounded-l-none text-xs h-8.5 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Nombres *</Label>
                    <Input
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      placeholder="Ej. Mariana Valentina"
                      className="text-xs h-8.5"
                      required
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Apellidos *</Label>
                    <Input
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Ej. Gómez Arismendi"
                      className="text-xs h-8.5"
                      required
                    />
                  </div>
                </div>

                {/* Nacimiento, Sexo y Sucursal */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        <span>Fecha de Nacimiento</span>
                      </Label>
                      {edadCalculada && (
                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                          {edadCalculada}
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      className="text-xs h-8.5"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Sexo / Género</Label>
                    <Select value={genero} onValueChange={(val: any) => setGenero(val)}>
                      <SelectTrigger className="text-xs h-8.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                        <SelectItem value="O">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Sede de Registro</Label>
                    <Select
                      value={sucursalRegistroId ? String(sucursalRegistroId) : undefined}
                      onValueChange={(v) => setSucursalRegistroId(Number(v))}
                    >
                      <SelectTrigger className="text-xs h-8.5">
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {sucursales.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contacto: Teléfono (con selector de país) y Correo */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                    <PhoneCountryInput
                      paisId={paisTelefonoId}
                      telefono={telefono}
                      onPaisChange={setPaisTelefonoId}
                      onTelefonoChange={setTelefono}
                      placeholder="Ej. 424 1703465"
                    />
                  </div>

                  <div className="sm:col-span-6 space-y-1.5">
                    <Label className="text-xs font-semibold">Correo Electrónico</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="paciente@correo.com"
                      className="text-xs h-8.5"
                    />
                  </div>
                </div>

                {/* Dirección y Ciudad */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 space-y-1.5">
                    <Label className="text-xs font-semibold">Dirección Residencial</Label>
                    <Input
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Urb., Avenida, Edificio o Casa"
                      className="text-xs h-8.5"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Ciudad / Población</Label>
                    <Input
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej. Caracas"
                      className="text-xs h-8.5"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ── TAB 2: FICHA MÉDICA BASE ────────────────────────── */}
              <TabsContent value="ficha" className="space-y-4 m-0">
                {/* Grupo Sanguíneo */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Heart className="size-4 text-rose-600 fill-rose-600/20" />
                      <span>Grupo Sanguíneo y Factor Rh</span>
                    </Label>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-bold">
                      {grupoSanguineo}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {GRUPOS_SANGUINEOS.map((gs) => {
                      const selected = grupoSanguineo === gs;
                      return (
                        <button
                          key={gs}
                          type="button"
                          onClick={() => setGrupoSanguineo(gs)}
                          className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            selected
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs scale-105'
                              : 'bg-background hover:bg-muted text-foreground border-border/80'
                          }`}
                        >
                          {gs}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gestor Interactivo de Alergias */}
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-rose-600" />
                      <span>Alergias Medicamentosas y Ambientales</span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {alergias.length === 0 ? 'Sin alergias conocidas' : `${alergias.length} registrada(s)`}
                    </span>
                  </div>

                  {/* Input para agregar alergia */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={nuevaAlergiaInput}
                      onChange={(e) => setNuevaAlergiaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAlergia(nuevaAlergiaInput);
                        }
                      }}
                      placeholder="Escribe una alergia (ej. Penicilina) y presiona Enter o Añadir..."
                      className="text-xs h-8.5 bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddAlergia(nuevaAlergiaInput)}
                      className="h-8.5 text-xs bg-rose-600 hover:bg-rose-700 text-white cursor-pointer px-3 shrink-0 gap-1"
                    >
                      <Plus className="size-3.5" />
                      <span>Añadir</span>
                    </Button>
                  </div>

                  {/* Sugerencias Rápidas */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                      Sugerencias clínicas frecuentes (clic para añadir):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ALERGIAS_COMUNES_SUGERIDAS.map((sug) => {
                        const yaAgregada = alergias.some((a) => a.toLowerCase() === sug.toLowerCase());
                        if (yaAgregada) return null;
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleAddAlergia(sug)}
                            className="text-[11px] py-0.5 px-2 rounded-md bg-background hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300/40 dark:border-rose-800/40 transition-colors cursor-pointer"
                          >
                            + {sug}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lista de Alergias Registradas */}
                  {alergias.length > 0 && (
                    <div className="pt-2 border-t border-rose-200/40 dark:border-rose-900/40 flex flex-wrap gap-2">
                      {alergias.map((al, idx) => (
                        <Badge
                          key={idx}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-1 px-2.5 gap-1.5 shadow-2xs"
                        >
                          <span>⚠️ {al}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAlergia(idx)}
                            className="hover:bg-rose-800 rounded-full p-0.5 transition-colors cursor-pointer"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Antecedentes Médicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Antecedentes Personales Patológicos</Label>
                    <Textarea
                      value={antecedentesPatologicos}
                      onChange={(e) => setAntecedentesPatologicos(e.target.value)}
                      placeholder="Hipertensión, Diabetes, Asma, Gastritis, etc."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Antecedentes Familiares</Label>
                    <Textarea
                      value={antecedentesFamiliares}
                      onChange={(e) => setAntecedentesFamiliares(e.target.value)}
                      placeholder="Cardiopatías, Cáncer, Diabetes en padres o abuelos..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cirugías e Intervenciones Previas</Label>
                    <Textarea
                      value={antecedentesQuirurgicos}
                      onChange={(e) => setAntecedentesQuirurgicos(e.target.value)}
                      placeholder="Apendicectomía (2018), Rinoplastia (2020)..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Medicación Habitual de Uso Continuo</Label>
                    <Textarea
                      value={medicacionHabitual}
                      onChange={(e) => setMedicacionHabitual(e.target.value)}
                      placeholder="Losartán 50mg diario, Levotiroxina 75mcg..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Observaciones Médicas Generales</Label>
                  <Input
                    value={observacionesMedicas}
                    onChange={(e) => setObservacionesMedicas(e.target.value)}
                    placeholder="Notas relevantes del perfil o recomendaciones clínicas..."
                    className="text-xs h-8.5"
                  />
                </div>
              </TabsContent>

              {/* ── TAB 3: CONTACTO DE EMERGENCIA & SEGURO ─────────── */}
              <TabsContent value="emergencia" className="space-y-4 m-0">
                {/* Contacto de Emergencia */}
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 space-y-3">
                  <Label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <PhoneCall className="size-4 text-amber-600" />
                    <span>Familiar o Contacto de Emergencia</span>
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5 space-y-1.5">
                      <Label className="text-xs font-semibold">Nombre Completo</Label>
                      <Input
                        value={contactoNombre}
                        onChange={(e) => setContactoNombre(e.target.value)}
                        placeholder="Ej. Alejandro Gómez"
                        className="text-xs h-8.5 bg-background"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <Label className="text-xs font-semibold">Parentesco</Label>
                      <Select value={contactoParentesco} onValueChange={setContactoParentesco}>
                        <SelectTrigger className="text-xs h-8.5 bg-background">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {PARENTESCOS.map((par) => (
                            <SelectItem key={par} value={par}>
                              {par}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <Label className="text-xs font-semibold">Teléfono de Contacto</Label>
                      <Input
                        value={contactoTelefono}
                        onChange={(e) => setContactoTelefono(e.target.value)}
                        placeholder="Ej. 0414 1234567"
                        className="text-xs h-8.5 bg-background font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Cobertura Médica / Seguro de Salud */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-teal-600" />
                    <span>Aseguradora Médica / Cobertura de Salud</span>
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Compañía de Seguros / Póliza</Label>
                      <Input
                        value={seguroMedico}
                        onChange={(e) => setSeguroMedico(e.target.value)}
                        placeholder="Ej. Seguros Caracas / Pan American Life"
                        className="text-xs h-8.5 bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Número de Certificado o Póliza</Label>
                      <Input
                        value={numeroPoliza}
                        onChange={(e) => setNumeroPoliza(e.target.value)}
                        placeholder="Ej. POL-992834-V"
                        className="text-xs h-8.5 bg-background font-mono"
                      />
                    </div>
                  </div>
                </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer de navegación unificado */}
              <div className="p-3.5 px-6 border-t border-border/70 bg-muted/10 flex items-center justify-between shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>

                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab(STEPS[currentStepIndex - 1].id)}
                      className="h-8 text-xs cursor-pointer gap-1"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Anterior</span>
                    </Button>
                  )}

                  {currentStepIndex < STEPS.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab(STEPS[currentStepIndex + 1].id)}
                      className="h-8 text-xs cursor-pointer gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                    >
                      <span>Siguiente: {STEPS[currentStepIndex + 1].shortTitle}</span>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 text-xs cursor-pointer shadow-xs gap-1.5"
                  >
                    <Save className="size-3.5" />
                    <span>{saving ? 'Guardando...' : patientToEdit ? 'Actualizar Ficha' : 'Guardar Paciente'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientFormModal;
