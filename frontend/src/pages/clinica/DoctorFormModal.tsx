import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import { sucursalesApi } from '../../api/sucursales';
import type {
  Medico,
  MedicoCreateInput,
  MedicoUpdateInput,
  SubespecialidadItem,
  Especialidad,
  Sucursal,
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
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { PhoneCountryInput } from '../../components/common/PhoneCountryInput';
import {
  UserCheck,
  Stethoscope,
  ShoppingCart,
  ShieldCheck,
  Key,
  Plus,
  Trash2,
  Sparkles,
  Award,
  Clock,
  FileCheck,
  Info,
  CheckCircle2,
  Building2,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DoctorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicoToEdit?: Medico | null;
  onSaved: () => void;
}

const NIVELES_EXPERIENCIA = [
  { id: 'Residente / Becario', label: 'Residente / Becario en Formación', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { id: 'Especialista Junior (1-3 años)', label: 'Especialista Junior (1 a 3 años)', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { id: 'Especialista Titular (4-8 años)', label: 'Especialista Titular (4 a 8 años)', color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' },
  { id: 'Senior / Consultor (> 9 años)', label: 'Senior / Consultor (> 9 años)', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  { id: 'Jefe de Servicio / Docente', label: 'Jefe de Servicio / Docente Universitario', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
];

const COLORES_PREDEFINIDOS = [
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#ec4899', // Pink
  '#ea580c', // Orange
  '#16a34a', // Green
  '#d97706', // Amber
  '#e11d48', // Rose
];

export const DoctorFormModal: React.FC<DoctorFormModalProps> = ({
  open,
  onOpenChange,
  medicoToEdit,
  onSaved,
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(medicoToEdit);

  // Estados de catálogos
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'personal' | 'especialidad' | 'subespecialidades' | 'acceso'>('personal');

  // Formulario principal
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('V');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [email, setEmail] = useState('');
  const [paisTelefonoId, setPaisTelefonoId] = useState<number | null>(null);
  const [telefono, setTelefono] = useState('');
  const [licenciaMedica, setLicenciaMedica] = useState('');
  const [especialidadId, setEspecialidadId] = useState<number | null>(null);
  const [color, setColor] = useState('#0d9488');
  const [sucursalDefectoId, setSucursalDefectoId] = useState<number | null>(null);
  const [sucursalesIds, setSucursalesIds] = useState<number[]>([]);
  const [biografia, setBiografia] = useState('');
  const [activo, setActivo] = useState(true);

  // Carrito de Subespecialidades
  const [subespecialidadesCarrito, setSubespecialidadesCarrito] = useState<SubespecialidadItem[]>([]);
  // Input provisional para el carrito
  const [subNombre, setSubNombre] = useState('');
  const [subNivel, setSubNivel] = useState('Especialista Titular (4-8 años)');
  const [subAnos, setSubAnos] = useState<number>(3);
  const [subCertificado, setSubCertificado] = useState('');

  // Cuenta de Usuario
  const [crearUsuario, setCrearUsuario] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Cargar especialidades y sucursales
  useEffect(() => {
    if (!open) return;
    const loadCatalogs = async () => {
      setLoadingData(true);
      try {
        const [espRes, sucRes] = await Promise.all([
          especialidadesApi.list({ activo: true }),
          sucursalesApi.list(),
        ]);
        setEspecialidades(espRes);
        setSucursales(sucRes);

        // Si es nuevo y hay especialidades, preseleccionar la primera
        if (!medicoToEdit && espRes.length > 0 && !especialidadId) {
          setEspecialidadId(espRes[0].id);
        }
        // Si hay sucursales, preseleccionar por defecto
        if (!medicoToEdit && sucRes.length > 0 && !sucursalDefectoId) {
          setSucursalDefectoId(sucRes[0].id);
          setSucursalesIds([sucRes[0].id]);
        }
      } catch (err) {
        console.error('Error cargando catálogos de doctor:', err);
      } finally {
        setLoadingData(false);
      }
    };
    loadCatalogs();
  }, [open]);

  // Inicializar valores al editar o crear
  useEffect(() => {
    if (medicoToEdit) {
      setNombres(medicoToEdit.nombres || '');
      setApellidos(medicoToEdit.apellidos || '');
      setTipoDocumento(medicoToEdit.tipo_documento || 'V');
      setDocumentoIdentidad(medicoToEdit.documento_identidad || '');
      setEmail(medicoToEdit.email || '');
      setPaisTelefonoId(medicoToEdit.pais_telefono_id || null);
      setTelefono(medicoToEdit.telefono || '');
      setLicenciaMedica(medicoToEdit.licencia_medica || '');
      setEspecialidadId(medicoToEdit.especialidad_id || null);
      setColor(medicoToEdit.color || '#0d9488');
      setSucursalDefectoId(medicoToEdit.sucursal_defecto_id || null);
      setSucursalesIds(medicoToEdit.sucursales_ids || []);
      setBiografia(medicoToEdit.biografia || '');
      setActivo(medicoToEdit.activo ?? true);
      setSubespecialidadesCarrito(medicoToEdit.subespecialidades || []);
      setCrearUsuario(Boolean(medicoToEdit.usuario_id));
      setPassword('');
    } else {
      // Reset
      setNombres('');
      setApellidos('');
      setTipoDocumento('V');
      setDocumentoIdentidad('');
      setEmail('');
      setPaisTelefonoId(user?.empresa?.pais_id || null);
      setTelefono('');
      setLicenciaMedica('');
      setColor('#0d9488');
      setBiografia('');
      setActivo(true);
      setSubespecialidadesCarrito([]);
      setCrearUsuario(true);
      generateRandomPassword();
    }
    setActiveTab('personal');
  }, [medicoToEdit, open]);

  // Generador de contraseña aleatoria segura
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Dr*';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const copyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPass(true);
    toast.success('Contraseña temporal copiada al portapapeles');
    setTimeout(() => setCopiedPass(false), 2000);
  };

  // ── GESTIÓN DEL CARRITO DE SUBESPECIALIDADES ──
  const handleAddSubespecialidad = () => {
    if (!subNombre.trim()) {
      toast.error('Por favor escribe el nombre de la subespecialidad');
      return;
    }

    // Evitar duplicados exactos
    if (subespecialidadesCarrito.some((s) => s.nombre.toLowerCase().trim() === subNombre.toLowerCase().trim())) {
      toast.error('Esta subespecialidad ya fue agregada al carrito');
      return;
    }

    const item: SubespecialidadItem = {
      id: `sub_${Date.now()}`,
      nombre: subNombre.trim(),
      nivel_experiencia: subNivel,
      anos_servicio: Number(subAnos) || 1,
      certificado_folio: subCertificado.trim() || undefined,
    };

    setSubespecialidadesCarrito([...subespecialidadesCarrito, item]);
    // Limpiar inputs
    setSubNombre('');
    setSubCertificado('');
    setSubAnos(3);
    toast.success(`Subespecialidad "${item.nombre}" añadida al carrito`, {
      description: `${item.nivel_experiencia} • ${item.anos_servicio} años de servicio`,
    });
  };

  const handleRemoveSubespecialidad = (indexToRemove: number) => {
    const removed = subespecialidadesCarrito[indexToRemove];
    setSubespecialidadesCarrito(subespecialidadesCarrito.filter((_, i) => i !== indexToRemove));
    if (removed) {
      toast.info(`Subespecialidad "${removed.nombre}" eliminada del carrito`);
    }
  };

  // Sucursales toggle
  const handleToggleSucursal = (sucId: number) => {
    if (sucursalesIds.includes(sucId)) {
      if (sucursalesIds.length === 1) {
        toast.warning('El médico debe tener al menos una sucursal asignada');
        return;
      }
      setSucursalesIds(sucursalesIds.filter((id) => id !== sucId));
    } else {
      setSucursalesIds([...sucursalesIds, sucId]);
    }
  };

  // Guardar Médico
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error('Nombres y apellidos son obligatorios');
      setActiveTab('personal');
      return;
    }
    if (!documentoIdentidad.trim()) {
      toast.error('El documento de identidad es obligatorio');
      setActiveTab('personal');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Por favor ingresa un correo electrónico válido');
      setActiveTab('personal');
      return;
    }
    if (!especialidadId) {
      toast.error('Debes seleccionar la especialidad principal');
      setActiveTab('especialidad');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && medicoToEdit) {
        const updateData: MedicoUpdateInput = {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          tipo_documento: tipoDocumento,
          documento_identidad: documentoIdentidad.trim(),
          email: email.trim().toLowerCase(),
          pais_telefono_id: paisTelefonoId,
          telefono: telefono.trim() || null,
          licencia_medica: licenciaMedica.trim() || null,
          especialidad_id: especialidadId,
          subespecialidades: subespecialidadesCarrito,
          color,
          sucursal_defecto_id: sucursalDefectoId,
          sucursales_ids: sucursalesIds,
          biografia: biografia.trim() || null,
          activo,
          password: password ? password : undefined,
        };
        await medicosApi.update(medicoToEdit.id, updateData);
        toast.success(`Ficha del Dr(a). ${nombres} ${apellidos} actualizada con éxito`);
      } else {
        const createData: MedicoCreateInput = {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          tipo_documento: tipoDocumento,
          documento_identidad: documentoIdentidad.trim(),
          email: email.trim().toLowerCase(),
          pais_telefono_id: paisTelefonoId,
          telefono: telefono.trim() || null,
          licencia_medica: licenciaMedica.trim() || null,
          especialidad_id: especialidadId,
          subespecialidades: subespecialidadesCarrito,
          color,
          sucursal_defecto_id: sucursalDefectoId,
          sucursales_ids: sucursalesIds,
          biografia: biografia.trim() || null,
          activo,
          crear_usuario: crearUsuario,
          password: password || undefined,
        };
        await medicosApi.create(createData);
        toast.success(`Dr(a). ${nombres} ${apellidos} registrado exitosamente`, {
          description: crearUsuario
            ? 'Se ha generado su cuenta de acceso institucional'
            : 'Ficha médica guardada',
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error al guardar médico', {
        description: err.response?.data?.detail || 'Ocurrió un error inesperado',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[94vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabecera del Modal */}
        <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-xs">
              <UserCheck className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>{isEditing ? `Editar Dr(a). ${medicoToEdit?.nombres} ${medicoToEdit?.apellidos}` : 'Registrar Nuevo Médico / Especialista'}</span>
                <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 bg-teal-500/5">
                  MEDISOFT Clínico
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Ficha profesional, credenciales sanitarias, subespecialidades acumuladas y cuenta de usuario
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulario con Pestañas */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de Pestañas */}
          <div className="px-5 pt-3 border-b border-border/80 bg-background">
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full"
            >
              <TabsList className="w-full justify-start h-9 p-0 bg-transparent gap-2 border-b-0">
                <TabsTrigger
                  value="personal"
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:border-teal-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <UserCheck className="size-3.5" />
                  <span>1. Identificación y Contacto</span>
                </TabsTrigger>

                <TabsTrigger
                  value="especialidad"
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:border-teal-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="size-3.5" />
                  <span>2. Especialidad y Licencia</span>
                </TabsTrigger>

                <TabsTrigger
                  value="subespecialidades"
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:border-teal-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="size-3.5 text-teal-600 dark:text-teal-400" />
                  <span>3. Subespecialidades</span>
                  {subespecialidadesCarrito.length > 0 && (
                    <Badge className="size-4.5 p-0 flex items-center justify-center rounded-full bg-teal-600 text-[10px] text-white ml-1">
                      {subespecialidadesCarrito.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="acceso"
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:border-teal-500 border-b-2 border-transparent rounded-none px-3 py-1.5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Key className="size-3.5" />
                  <span>4. Acceso al Sistema</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Contenido de Pestañas con Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* ── PESTAÑA 1: IDENTIFICACIÓN Y CONTACTO ──────────────────────── */}
            {activeTab === 'personal' && (
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Nombres del Doctor(a) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="Ej. Carlos Eduardo"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Apellidos del Doctor(a) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="Ej. Mendoza Rivas"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de Documento</Label>
                    <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">C.I. Venezolano (V)</SelectItem>
                        <SelectItem value="E">C.I. Extranjero (E)</SelectItem>
                        <SelectItem value="J">Jurídico / Firma (J)</SelectItem>
                        <SelectItem value="P">Pasaporte (P)</SelectItem>
                        <SelectItem value="DNI">DNI / Cédula General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Número de Documento de Identidad <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="Ej. 14258963"
                      value={documentoIdentidad}
                      onChange={(e) => setDocumentoIdentidad(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Correo Electrónico Profesional <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      required
                      placeholder="doctor.mendoza@clinica.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Servirá como usuario para inicio de sesión y notificaciones de agenda
                    </p>
                  </div>

                  {/* Teléfono agrupado con país de la empresa */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Teléfono Móvil / WhatsApp</span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                        País de empresa sugerido
                      </span>
                    </Label>
                    <PhoneCountryInput
                      paisId={paisTelefonoId}
                      telefono={telefono}
                      onPaisChange={setPaisTelefonoId}
                      onTelefonoChange={setTelefono}
                      placeholder="412 1234567"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={activo} onCheckedChange={setActivo} />
                    <div>
                      <Label className="text-xs font-bold">Médico Activo en Servicio</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Permite que el médico esté disponible para asignación de turnos y citas
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('especialidad')}
                    className="text-xs h-8 cursor-pointer"
                  >
                    <span>Siguiente: Especialidad</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── PESTAÑA 2: ESPECIALIDAD Y LICENCIA ────────────────────────── */}
            {activeTab === 'especialidad' && (
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Especialidad Médica Principal <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={especialidadId ? String(especialidadId) : ''}
                      onValueChange={(val) => setEspecialidadId(Number(val))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Seleccionar especialidad del catálogo..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {especialidades.map((esp) => (
                          <SelectItem key={esp.id} value={String(esp.id)} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: esp.color || '#0d9488' }}
                              />
                              <span className="font-semibold">{esp.nombre}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({esp.codigo})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Define la plantilla clínica por defecto para sus consultas médicas
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Número de Licencia Médica / Registro Profesional
                    </Label>
                    <Input
                      placeholder="Ej. CMP-45892 / MP-12903"
                      value={licenciaMedica}
                      onChange={(e) => setLicenciaMedica(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Colegiatura oficial, matrícula médica o número de registro sanitario
                    </p>
                  </div>
                </div>

                {/* Color de Identificación en Agenda y Turnero */}
                <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Color Identificativo para Agenda y Turnero</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{color}</span>
                  </Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLORES_PREDEFINIDOS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`size-7 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
                          color === c ? 'border-primary scale-115 shadow-xs' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="size-3.5 text-white stroke-[3]" />}
                      </button>
                    ))}
                    <Input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="size-7 p-0.5 rounded-lg cursor-pointer bg-transparent border border-border/80"
                      title="Elegir color personalizado"
                    />
                  </div>
                </div>

                {/* Asignación de Sucursales / Sedes */}
                <div className="space-y-2.5 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-teal-600" />
                      <span>Sedes Hospitalarias y Sucursales de Atención</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Selecciona las sedes donde este especialista pasará consulta
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {sucursales.map((suc) => {
                      const isChecked = sucursalesIds.includes(suc.id);
                      return (
                        <div
                          key={suc.id}
                          onClick={() => handleToggleSucursal(suc.id)}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200'
                              : 'bg-card border-border/60 hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={isChecked} onCheckedChange={() => handleToggleSucursal(suc.id)} />
                            <span className="font-semibold">{suc.nombre}</span>
                          </div>
                          {sucursalDefectoId === suc.id && (
                            <Badge variant="outline" className="text-[9px] border-teal-500/30 text-teal-600">
                              Sede Base
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Biografía / Resumen */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Resumen Profesional / Perfil Clínico (Opcional)</Label>
                  <Textarea
                    placeholder="Breve reseña curricular, áreas de interés clínico o perfil visible para los pacientes..."
                    value={biografia}
                    onChange={(e) => setBiografia(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('personal')}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('subespecialidades')}
                    className="text-xs h-8 cursor-pointer gap-1.5"
                  >
                    <ShoppingCart className="size-3.5 text-teal-600" />
                    <span>Siguiente: Subespecialidades</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── PESTAÑA 3: SUBESPECIALIDADES EN FORMATO "CARRITO DE COMPRAS" ── */}
            {activeTab === 'subespecialidades' && (
              <div className="space-y-5 max-w-3xl">
                {/* Banner explicativo */}
                <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
                    <ShoppingCart className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Carrito de Subespecialidades y Acreditaciones Médicas
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Agrega las subramas, fellowships o diplomados del doctor. Cada una se acumula en la lista
                      con su nivel de experiencia, años de servicio y folio del certificado médico antes de guardar.
                    </p>
                  </div>
                </div>

                {/* Formulario de entrada al carrito */}
                <div className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Plus className="size-3.5 text-teal-600" />
                      <span>Añadir Subespecialidad al Carrito</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {subespecialidadesCarrito.length} en la lista
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Nombre de la Subespecialidad <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Ej. Cardiología Intervencionista, Cirugía Bariátrica..."
                        value={subNombre}
                        onChange={(e) => setSubNombre(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nivel de Experiencia / Rango</Label>
                      <Select value={subNivel} onValueChange={setSubNivel}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NIVELES_EXPERIENCIA.map((n) => (
                            <SelectItem key={n.id} value={n.id} className="text-xs">
                              {n.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span>Años de Servicio / Práctica</span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={subAnos}
                        onChange={(e) => setSubAnos(Number(e.target.value))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <FileCheck className="size-3 text-muted-foreground" />
                        <span>Certificado Médico / Folio de Título (Opcional)</span>
                      </Label>
                      <Input
                        placeholder="Ej. Reg. Posgrado Nº 8492-F, Certificado Junta Médica..."
                        value={subCertificado}
                        onChange={(e) => setSubCertificado(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddSubespecialidad}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer h-8 text-xs shadow-xs gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      <span>Añadir al Carrito</span>
                    </Button>
                  </div>
                </div>

                {/* Lista / Carrito de Subespecialidades Agregadas */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Subespecialidades en Carrito ({subespecialidadesCarrito.length})
                    </h5>
                    {subespecialidadesCarrito.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSubespecialidadesCarrito([])}
                        className="h-6 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Vaciar lista
                      </Button>
                    )}
                  </div>

                  {subespecialidadesCarrito.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-border/80 bg-muted/10 text-muted-foreground space-y-1.5">
                      <ShoppingCart className="size-8 mx-auto text-muted-foreground/30" />
                      <p className="font-semibold text-xs text-foreground">El carrito de subespecialidades está vacío</p>
                      <p className="text-[11px] max-w-sm mx-auto">
                        Si el médico posee diplomados, fellowships o subramas, agrégalas en el formulario superior.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {subespecialidadesCarrito.map((item, idx) => {
                        const nivelConfig = NIVELES_EXPERIENCIA.find((n) => n.id === item.nivel_experiencia);
                        return (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all hover:border-teal-500/40"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Award className="size-4 text-teal-600 shrink-0" />
                                <span className="font-bold text-xs text-foreground">{item.nombre}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold ${
                                    nivelConfig ? nivelConfig.color : 'bg-muted text-foreground'
                                  }`}
                                >
                                  {item.nivel_experiencia}
                                </Badge>
                                <span className="text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="size-3" />
                                  <span>{item.anos_servicio} {item.anos_servicio === 1 ? 'año' : 'años'} de servicio</span>
                                </span>
                                {item.certificado_folio && (
                                  <span className="text-muted-foreground flex items-center gap-0.5 font-mono text-[10px]">
                                    <FileCheck className="size-3 text-emerald-500" />
                                    <span>Folio: {item.certificado_folio}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSubespecialidad(idx)}
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer self-end sm:self-auto shrink-0"
                              title="Eliminar del carrito"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('especialidad')}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('acceso')}
                    className="text-xs h-8 cursor-pointer"
                  >
                    <span>Siguiente: Acceso al Sistema</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── PESTAÑA 4: ACCESO AL SISTEMA / USUARIO ─────────────────────── */}
            {activeTab === 'acceso' && (
              <div className="space-y-4 max-w-3xl">
                <div className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="size-4 text-primary" />
                      <div>
                        <Label className="text-xs font-bold text-foreground">
                          {isEditing ? 'Cuenta de Acceso al Sistema' : 'Crear Cuenta de Usuario para este Médico'}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Permite al doctor iniciar sesión con su correo electrónico institucional
                        </p>
                      </div>
                    </div>
                    {!isEditing && (
                      <Switch checked={crearUsuario} onCheckedChange={setCrearUsuario} />
                    )}
                  </div>

                  {(crearUsuario || isEditing) && (
                    <div className="pt-3 border-t border-border/60 space-y-3">
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-teal-600" />
                          <span>
                            Rol del Sistema Asignado: <b>Médico Especialista</b>
                          </span>
                        </div>
                        <Badge className="bg-teal-600 text-white text-[10px]">
                          Agenda & Consultas
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            {isEditing ? 'Cambiar Contraseña (Dejar en blanco para no modificar)' : 'Contraseña Temporal Inicial'}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={generateRandomPassword}
                            className="h-6 text-[11px] text-teal-600 hover:text-teal-700 cursor-pointer"
                          >
                            <Sparkles className="size-3 mr-1" />
                            <span>Generar Segura</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-9 text-xs font-mono pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>

                          {password && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={copyPassword}
                              className="h-9 text-xs cursor-pointer px-2.5"
                              title="Copiar contraseña"
                            >
                              {copiedPass ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('subespecialidades')}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Anterior
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer del Modal */}
          <DialogFooter className="p-3.5 border-t border-border/80 bg-muted/10 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-teal-500 inline-block" />
                {subespecialidadesCarrito.length} subespecialidades registradas
              </span>
            </div>

            <div className="flex items-center gap-2">
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
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 text-xs cursor-pointer shadow-xs gap-1.5"
              >
                <CheckCircle2 className="size-3.5" />
                <span>{saving ? 'Guardando...' : isEditing ? 'Actualizar Ficha' : 'Guardar Médico'}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorFormModal;
