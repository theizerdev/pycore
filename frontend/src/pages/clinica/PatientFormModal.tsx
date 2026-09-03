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
} from 'lucide-react';

interface PatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientToEdit?: Paciente | null;
  onSaved: () => void;
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
}) => {
  const { user } = useAuth();
  const regional = useRegional();
  const [activeTab, setActiveTab] = useState('demograficos');
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
      setDocumentoIdentidad('');
      setNombres('');
      setApellidos('');
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

      if (patientToEdit) {
        await pacientesApi.update(patientToEdit.id, payload);
        toast.success(`Paciente ${nombres} ${apellidos} actualizado con éxito`);
      } else {
        await pacientesApi.create(payload as any);
        toast.success(`Paciente ${nombres} ${apellidos} registrado exitosamente`);
      }

      onSaved();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Encabezado */}
        <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
              <User className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{patientToEdit ? 'Editar Ficha del Paciente' : 'Registrar Nuevo Paciente'}</span>
                {edadCalculada && (
                  <Badge variant="secondary" className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30">
                    {edadCalculada}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {patientToEdit
                  ? `Actualizando historia de ${patientToEdit.nombres} ${patientToEdit.apellidos}`
                  : 'Ficha médica integral, datos demográficos, antecedentes y contacto asistencial.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulario con Pestañas */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-3 border-b border-border/70 bg-card">
              <TabsList className="grid grid-cols-3 h-9 bg-muted/50 p-1">
                <TabsTrigger value="demograficos" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <User className="size-3.5" />
                  <span>Datos Personales</span>
                </TabsTrigger>
                <TabsTrigger value="ficha" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <Activity className="size-3.5 text-rose-500" />
                  <span>Ficha Médica & Alergias</span>
                  {alergias.length > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {alergias.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="emergencia" className="text-xs gap-1.5 cursor-pointer data-[state=active]:bg-background">
                  <PhoneCall className="size-3.5 text-amber-500" />
                  <span>Emergencia & Seguro</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
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
            </div>

            {/* Footer */}
            <DialogFooter className="p-3.5 border-t border-border/80 bg-muted/10 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancelar
              </Button>

              <div className="flex items-center gap-2">
                {activeTab !== 'demograficos' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeTab === 'emergencia') setActiveTab('ficha');
                      else if (activeTab === 'ficha') setActiveTab('demograficos');
                    }}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Anterior
                  </Button>
                )}

                {activeTab !== 'emergencia' ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (activeTab === 'demograficos') setActiveTab('ficha');
                      else if (activeTab === 'ficha') setActiveTab('emergencia');
                    }}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
                  >
                    <Save className="size-3.5" />
                    <span>{saving ? 'Guardando...' : patientToEdit ? 'Actualizar Ficha' : 'Registrar Paciente'}</span>
                  </Button>
                )}
              </div>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientFormModal;
