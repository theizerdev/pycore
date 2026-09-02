import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRegional } from '../../context/RegionalContext';
import { authApi } from '../../api/auth';
import { auditoriaApi } from '../../api/auditoria';
import type { AuditoriaLog } from '../../types';
import {
  User as UserIcon,
  Building2,
  MapPin,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Stethoscope,
  Activity,
  Copy,
  Check,
  Sparkles,
  Clock,
  Laptop,
  Globe,
  KeyRound,
  ShieldAlert,
  Camera,
  RotateCcw,
  BadgeCheck,
  Briefcase,
  Layers
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { cn, getInitials } from '../../lib/utils';

export const Perfil: React.FC = () => {
  const { user, sucursalActiva, refreshUser } = useAuth();
  const { paisNombre, codigoIso2, moneda, simboloMoneda, zonaHoraria, bandera } = useRegional();
  const [activeTab, setActiveTab] = useState('overview');

  // Estado formulario de edición de datos
  const [editNombre, setEditNombre] = useState(user?.nombre || '');
  const [editApellido, setEditApellido] = useState(user?.apellido || '');
  const [editTelefono, setEditTelefono] = useState(user?.telefono || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado formulario de contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showPasswordNueva, setShowPasswordNueva] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copiado de ID al portapapeles
  const [copiedId, setCopiedId] = useState(false);

  // Logs de auditoría personal
  const [myLogs, setMyLogs] = useState<AuditoriaLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (user) {
      setEditNombre(user.nombre);
      setEditApellido(user.apellido);
      setEditTelefono(user.telefono || '');
    }
  }, [user]);

  // Cargar logs del usuario
  useEffect(() => {
    const fetchUserLogs = async () => {
      if (!user) return;
      try {
        setLoadingLogs(true);
        const data = await auditoriaApi.list({ limit: 15 });
        setMyLogs(data.slice(0, 8));
      } catch (err) {
        console.error('Error cargando actividad de usuario:', err);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchUserLogs();
  }, [user]);

  // Medidor de fortaleza de contraseña
  const passwordStrength = useMemo(() => {
    if (!passwordNueva) return 0;
    let score = 0;
    if (passwordNueva.length >= 6) score += 25;
    if (passwordNueva.length >= 8) score += 25;
    if (/[0-9]/.test(passwordNueva)) score += 25;
    if (/[A-Z]/.test(passwordNueva) && /[^A-Za-z0-9]/.test(passwordNueva)) score += 25;
    return score;
  }, [passwordNueva]);

  const getStrengthLabel = (score: number) => {
    if (score <= 25) return { text: 'Débil', color: 'bg-rose-500', textClass: 'text-rose-500' };
    if (score <= 50) return { text: 'Regular', color: 'bg-amber-500', textClass: 'text-amber-500' };
    if (score <= 75) return { text: 'Buena', color: 'bg-blue-500', textClass: 'text-blue-500' };
    return { text: 'Excelente', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
  };

  const handleCopyId = () => {
    if (user) {
      navigator.clipboard.writeText(String(user.id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Guardar datos personales
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);

    try {
      await authApi.updateProfile({
        nombre: editNombre.trim(),
        apellido: editApellido.trim(),
        telefono: editTelefono.trim(),
      });
      await refreshUser();
      setProfileMsg({ type: 'success', text: '¡Datos del perfil actualizados correctamente!' });
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Ocurrió un error al actualizar los datos.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Guardar contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (passwordNueva !== passwordConfirm) {
      setPasswordMsg({ type: 'error', text: 'La confirmación de la nueva contraseña no coincide.' });
      return;
    }

    if (passwordNueva.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword({
        password_actual: passwordActual,
        password_nueva: passwordNueva,
      });
      setPasswordMsg({ type: 'success', text: '¡Contraseña actualizada exitosamente!' });
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Error al cambiar la contraseña. Verifica tu contraseña actual.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ══ HEADER CARD COMPLETO (ESTILO VUEXY OFICIAL) ══════════════ */}
        <Card className="overflow-hidden border shadow-sm bg-card">
          {/* Banner de Portada Proporcionado con Overlay Gradiente y Patrón */}
          <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-teal-700 via-teal-600 to-indigo-800 p-4 sm:p-6 text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none">
              <Stethoscope className="size-48 text-white" />
            </div>

            <div className="relative z-10 flex justify-between items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/10">
                <Sparkles className="size-3 text-teal-300" />
                <span>Portal Profesional PyCore</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyId}
                className="bg-black/20 hover:bg-black/30 text-white border border-white/15 backdrop-blur-md h-7 px-2.5 text-xs font-mono cursor-pointer"
              >
                {copiedId ? (
                  <>
                    <Check className="size-3 mr-1 text-emerald-300" />
                    <span>ID #{user?.id}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 mr-1" />
                    <span>ID #{user?.id}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Información del Usuario bajo la Portada */}
          <div className="px-6 pb-6 pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
              {/* Avatar + Nombres */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="relative shrink-0 mx-auto sm:mx-0">
                  <Avatar className="size-24 sm:size-28 rounded-2xl border-4 border-card shadow-xl ring-1 ring-border bg-gradient-to-br from-primary to-teal-800">
                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-2xl sm:text-3xl rounded-2xl">
                      {getInitials(user ? `${user.nombre} ${user.apellido}` : 'MF')}
                    </AvatarFallback>
                  </Avatar>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="absolute bottom-1 right-1 size-4 rounded-full bg-emerald-500 ring-4 ring-card cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Usuario Activo y en Línea</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="space-y-1.5 text-center sm:text-left pt-2 sm:pt-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {user?.nombre} {user?.apellido}
                    </h1>
                    <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 text-xs font-semibold">
                      <CheckCircle2 className="size-3 mr-1 text-teal-500" />
                      Verificado
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-1 gap-x-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <ShieldCheck className="size-3.5" />
                      {user?.es_superadmin ? 'Superadministrador' : user?.rol?.nombre || 'Personal Médico'}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      {user?.empresa?.nombre || 'PyCore Corporation'}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
                      <MapPin className="size-3.5" />
                      {sucursalActiva ? sucursalActiva.nombre : 'Sede Principal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-center sm:justify-end gap-2 pb-1 shrink-0">
                <Button
                  variant={activeTab === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('edit')}
                  className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <UserIcon className="size-3.5" />
                  <span>Editar Perfil</span>
                </Button>
                <Button
                  variant={activeTab === 'security' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('security')}
                  className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Lock className="size-3.5" />
                  <span>Seguridad</span>
                </Button>
              </div>
            </div>

            {/* Pestañas de Navegación Estilo Vuexy (Segmented Tabs Bar) */}
            <div className="border-t pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/60 p-1 rounded-xl w-full sm:w-auto h-auto flex flex-wrap gap-1 border justify-start">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-semibold rounded-lg px-3.5 py-2 gap-1.5 transition-all cursor-pointer"
                  >
                    <UserIcon className="size-3.5" />
                    <span>Vista General</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="edit"
                    className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-semibold rounded-lg px-3.5 py-2 gap-1.5 transition-all cursor-pointer"
                  >
                    <Save className="size-3.5" />
                    <span>Editar Datos</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-semibold rounded-lg px-3.5 py-2 gap-1.5 transition-all cursor-pointer"
                  >
                    <Lock className="size-3.5" />
                    <span>Seguridad & Clave</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-xs font-semibold rounded-lg px-3.5 py-2 gap-1.5 transition-all cursor-pointer"
                  >
                    <Activity className="size-3.5" />
                    <span>Bitácora de Actividad</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        {/* ══ CONTENIDO DE LAS PESTAÑAS ═════════════════════════════════ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* ── 1. VISTA GENERAL (OVERVIEW) ──────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Información de Usuario & Sedes */}
              <div className="space-y-6">
                {/* Tarjeta Acerca de Mí */}
                <Card className="shadow-xs border">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="size-3.5 text-primary" />
                        <span>Acerca de Mí</span>
                      </CardTitle>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        Cuenta Activa
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <UserIcon className="size-3.5 text-muted-foreground" />
                        Nombre Completo:
                      </span>
                      <span className="font-semibold text-foreground">
                        {user?.nombre} {user?.apellido}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        Correo Electrónico:
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[160px]" title={user?.email}>
                        {user?.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground" />
                        Teléfono:
                      </span>
                      <span className="font-semibold text-foreground">
                        {user?.telefono || 'No registrado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="size-3.5 text-primary" />
                        Rol de Acceso:
                      </span>
                      <Badge variant="secondary" className="font-bold text-[10px] bg-primary/10 text-primary">
                        {user?.es_superadmin ? 'Superadmin (*)' : user?.rol?.nombre}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        Empresa / Organización:
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[160px]">
                        {user?.empresa?.nombre || 'PyCore Central'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Globe className="size-3.5 text-muted-foreground" />
                        País & Configuración Regional:
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>{bandera}</span>
                        <span>{paisNombre}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                          {codigoIso2}
                        </Badge>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="size-3.5 text-muted-foreground" />
                        Moneda & Zona Horaria:
                      </span>
                      <span className="font-mono text-xs text-foreground">
                        {moneda} ({simboloMoneda}) • {zonaHoraria}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Tarjeta Sedes Autorizadas */}
                <Card className="shadow-xs border">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary" />
                        <span>Sedes & Sucursales</span>
                      </CardTitle>
                      {user?.es_superadmin ? (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">
                          Acceso Global
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {Array.from(new Map(user?.sucursales_asignadas?.map(sa => [sa.sucursal.id, sa]) || []).values()).length} sedes
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2.5">
                    {user?.es_superadmin && (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/40 text-xs mb-2">
                        <Globe className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-purple-900 dark:text-purple-200">Acceso Multi-Sede Ilimitado</p>
                          <p className="text-[11px] text-purple-700/80 dark:text-purple-400">
                            Como Superadministrador tienes autorización para operar y consultar todas las sedes del sistema.
                          </p>
                        </div>
                      </div>
                    )}
                    {(() => {
                      const unique = Array.from(
                        new Map(user?.sucursales_asignadas?.map(sa => [sa.sucursal.id, sa]) || []).values()
                      );
                      if (unique.length > 0) {
                        return unique.map((sa) => {
                          const isDefault = user?.sucursal_defecto_id === sa.sucursal.id;
                          return (
                            <div
                              key={sa.sucursal.id}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg border text-xs transition-colors',
                                isDefault
                                  ? 'bg-primary/5 border-primary/30 shadow-2xs'
                                  : 'bg-card hover:bg-muted/40'
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold">
                                  <MapPin className="size-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{sa.sucursal.nombre}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Código: {sa.sucursal.codigo || 'SEDE'}
                                  </p>
                                </div>
                              </div>
                              {isDefault && (
                                <Badge className="bg-primary text-primary-foreground text-[9px] font-bold">
                                  Principal ⭐
                                </Badge>
                              )}
                            </div>
                          );
                        });
                      }
                      return <p className="text-xs text-muted-foreground italic">No hay sedes específicas asignadas.</p>;
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Columna Derecha: Métricas, Línea de Tiempo & Dispositivos */}
              <div className="lg:col-span-2 space-y-6">
                {/* Grid de 3 StatCards Clave */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 flex flex-col justify-between space-y-2 border shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Actividad en Sistema</span>
                      <div className="p-2 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Activity className="size-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-foreground">128+</div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Eventos registrados en bitácora
                      </span>
                    </div>
                  </Card>

                  <Card className="p-4 flex flex-col justify-between space-y-2 border shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Estado de Cuenta</span>
                      <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="size-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">100%</div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Protección Activa & Verificada
                      </span>
                    </div>
                  </Card>

                  <Card className="p-4 flex flex-col justify-between space-y-2 border shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Sesión Actual</span>
                      <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Clock className="size-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">En Línea</div>
                      <span className="text-[10px] text-muted-foreground">
                        Autenticado hoy
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Línea de Tiempo de Actividad Reciente (Estilo Vuexy) */}
                <Card className="shadow-xs border">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Activity className="size-4 text-primary" />
                        <span>Línea de Tiempo de Actividad Reciente</span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('activity')}
                        className="text-xs text-primary font-semibold h-7 hover:underline cursor-pointer"
                      >
                        Ver Bitácora Completa →
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {loadingLogs ? (
                      <div className="text-xs text-muted-foreground py-6 text-center">
                        Cargando actividad...
                      </div>
                    ) : myLogs.length > 0 ? (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                        {myLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="relative group">
                            {/* Punto en la línea de tiempo */}
                            <div className="absolute -left-6 top-1 size-3 rounded-full bg-primary ring-4 ring-card" />
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">
                                  {log.accion} en módulo <span className="uppercase text-primary font-mono">{log.modulo}</span>
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                IP Origen: {log.ip || '127.0.0.1'} • {new Date(log.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No hay eventos registrados recientemente.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Sesión Actual & Dispositivo */}
                <Card className="shadow-xs border bg-muted/20">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Laptop className="size-3.5 text-primary" />
                      <span>Dispositivo & Conexión Actual</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg border bg-card flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          <Laptop className="size-4" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px]">Dispositivo / SO</p>
                          <p className="font-semibold text-foreground">Navegador Web / Windows</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-card flex items-center gap-3">
                        <div className="p-2 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                          <Globe className="size-4" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px]">Dirección IP</p>
                          <p className="font-mono font-semibold text-foreground">127.0.0.1 (Localhost)</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-card flex items-center gap-3">
                        <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <KeyRound className="size-4" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px]">Estado de Sesión</p>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">Token JWT Válido</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── 2. EDITAR DATOS PERSONALES (ESTILO VUEXY ACCOUNT SETTINGS) ─ */}
          <TabsContent value="edit" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Tarjeta de Avatar & Resumen de Identidad */}
              <div className="space-y-6">
                <Card className="shadow-xs border">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Camera className="size-3.5 text-primary" />
                      <span>Foto de Perfil & Avatar</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4 text-center">
                    <div className="relative mx-auto size-28">
                      <Avatar className="size-28 rounded-2xl border-4 border-card shadow-lg ring-2 ring-primary/20 bg-gradient-to-br from-primary to-teal-800">
                        <AvatarFallback className="bg-primary text-primary-foreground font-black text-3xl rounded-2xl">
                          {getInitials(user ? `${user.nombre} ${user.apellido}` : 'MF')}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 p-2 rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer"
                        title="Cambiar Foto de Perfil"
                      >
                        <Camera className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="font-extrabold text-foreground text-sm">
                        {user?.nombre} {user?.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate px-2">
                        {user?.email}
                      </p>
                    </div>

                    <div className="pt-2 border-t text-[11px] text-muted-foreground space-y-1 text-left bg-muted/30 p-3 rounded-lg border">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <BadgeCheck className="size-3.5 text-primary" />
                        Requisitos de Imagen
                      </p>
                      <p>• Formatos: PNG, JPG, WebP</p>
                      <p>• Tamaño máximo recomendado: 2MB</p>
                      <p>• Proporción cuadrada 1:1 recomendada</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Tarjeta de Identidad de Cuenta (Inmutables) */}
                <Card className="shadow-xs border">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-primary" />
                      <span>Credenciales Asignadas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <ShieldCheck className="size-3 text-primary" />
                        Rol Institucional
                      </span>
                      <p className="font-bold text-foreground">
                        {user?.es_superadmin ? 'Superadministrador del Sistema' : user?.rol?.nombre}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Building2 className="size-3 text-primary" />
                        Entidad Asignada
                      </span>
                      <p className="font-bold text-foreground truncate">
                        {user?.empresa?.nombre || 'PyCore Central'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Layers className="size-3 text-teal-600 dark:text-teal-400" />
                        Sede de Trabajo
                      </span>
                      <p className="font-bold text-teal-600 dark:text-teal-400">
                        {sucursalActiva ? sucursalActiva.nombre : 'Sede Principal'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Columna Derecha: Formulario de Actualización de Datos */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm border">
                  <CardHeader className="pb-4 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                          <UserIcon className="size-4 text-primary" />
                          <span>Detalles de la Cuenta & Contacto</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Actualiza tu información pública y medios de notificación médica.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono w-fit">
                        ID Usuario: #{user?.id}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    {profileMsg && (
                      <div
                        className={cn(
                          'p-4 mb-6 rounded-xl text-xs flex items-center gap-3 border shadow-xs animate-in fade-in duration-200',
                          profileMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 font-semibold'
                        )}
                      >
                        {profileMsg.type === 'success' ? (
                          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{profileMsg.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div className="space-y-1.5">
                          <Label htmlFor="nombre" className="text-xs font-semibold flex items-center gap-1.5">
                            <UserIcon className="size-3.5 text-primary" />
                            <span>Nombre *</span>
                          </Label>
                          <Input
                            id="nombre"
                            required
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            placeholder="Ej. Carlos"
                            className="h-10 text-xs font-medium"
                          />
                        </div>

                        {/* Apellido */}
                        <div className="space-y-1.5">
                          <Label htmlFor="apellido" className="text-xs font-semibold flex items-center gap-1.5">
                            <UserIcon className="size-3.5 text-primary" />
                            <span>Apellido *</span>
                          </Label>
                          <Input
                            id="apellido"
                            required
                            value={editApellido}
                            onChange={(e) => setEditApellido(e.target.value)}
                            placeholder="Ej. Mendoza"
                            className="h-10 text-xs font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Correo Electrónico (Inmutable) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                              <Mail className="size-3.5 text-muted-foreground" />
                              <span>Correo Electrónico</span>
                            </Label>
                            <Badge variant="outline" className="text-[9px] text-muted-foreground bg-muted font-mono">
                              Inmutable
                            </Badge>
                          </div>
                          <Input
                            id="email"
                            disabled
                            value={user?.email || ''}
                            className="h-10 text-xs bg-muted/60 text-muted-foreground cursor-not-allowed opacity-90 font-medium"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            El correo sirve como identificador único de inicio de sesión.
                          </p>
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-1.5">
                          <Label htmlFor="telefono" className="text-xs font-semibold flex items-center gap-1.5">
                            <Phone className="size-3.5 text-primary" />
                            <span>Teléfono / Celular</span>
                          </Label>
                          <Input
                            id="telefono"
                            value={editTelefono}
                            onChange={(e) => setEditTelefono(e.target.value)}
                            placeholder="+58 412 0000000"
                            className="h-10 text-xs font-medium font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Usado para alertas SMS y confirmaciones del sistema.
                          </p>
                        </div>
                      </div>

                      {/* Preferencias de Región y Sistema */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                            <Globe className="size-3.5 text-primary" />
                            <span>Idioma de Interfaz</span>
                          </Label>
                          <Input
                            disabled
                            value="Español (Latinoamérica)"
                            className="h-10 text-xs bg-muted/30 cursor-not-allowed opacity-80"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="size-3.5 text-primary" />
                            <span>Zona Horaria del Sistema</span>
                          </Label>
                          <Input
                            disabled
                            value="America/Caracas (UTC -04:00)"
                            className="h-10 text-xs bg-muted/30 cursor-not-allowed opacity-80 font-mono"
                          />
                        </div>
                      </div>

                      {/* Barra de Acciones */}
                      <div className="pt-5 border-t flex flex-wrap items-center justify-between gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (user) {
                              setEditNombre(user.nombre);
                              setEditApellido(user.apellido);
                              setEditTelefono(user.telefono || '');
                              setProfileMsg(null);
                            }
                          }}
                          className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="size-3.5 text-muted-foreground" />
                          <span>Restablecer</span>
                        </Button>

                        <Button
                          type="submit"
                          size="sm"
                          disabled={savingProfile}
                          className="h-10 text-xs font-bold gap-2 px-5 cursor-pointer shadow-xs"
                        >
                          {savingProfile ? (
                            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="size-4" />
                          )}
                          <span>Guardar Cambios</span>
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── 3. SEGURIDAD & CONTRASEÑA ────────────────────────────── */}
          <TabsContent value="security" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario de Cambio de Contraseña */}
              <Card className="p-6 lg:col-span-2 space-y-6 shadow-sm border">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Lock className="size-4 text-primary" />
                    <span>Cambio de Contraseña de Acceso</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mantén tu cuenta protegida con una contraseña robusta y segura.
                  </p>
                </CardHeader>

                {passwordMsg && (
                  <div
                    className={cn(
                      'p-3.5 rounded-xl text-xs flex items-center gap-2.5 border',
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {passwordMsg.type === 'success' ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0" />
                    )}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Contraseña Actual */}
                  <div className="space-y-1.5">
                    <Label htmlFor="passActual" className="text-xs font-semibold">
                      Contraseña Actual *
                    </Label>
                    <div className="relative">
                      <Input
                        id="passActual"
                        type={showPasswordActual ? 'text' : 'password'}
                        required
                        value={passwordActual}
                        onChange={(e) => setPasswordActual(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 text-xs pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordActual(!showPasswordActual)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPasswordActual ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nueva Contraseña */}
                    <div className="space-y-1.5">
                      <Label htmlFor="passNueva" className="text-xs font-semibold">
                        Nueva Contraseña *
                      </Label>
                      <div className="relative">
                        <Input
                          id="passNueva"
                          type={showPasswordNueva ? 'text' : 'password'}
                          required
                          value={passwordNueva}
                          onChange={(e) => setPasswordNueva(e.target.value)}
                          placeholder="••••••••"
                          className="h-10 text-xs pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordNueva(!showPasswordNueva)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPasswordNueva ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>

                      {/* Medidor de Fortaleza */}
                      {passwordNueva && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground">Fortaleza:</span>
                            <span className={cn('font-bold', getStrengthLabel(passwordStrength).textClass)}>
                              {getStrengthLabel(passwordStrength).text}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full transition-all duration-300', getStrengthLabel(passwordStrength).color)}
                              style={{ width: `${passwordStrength}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirmar Contraseña */}
                    <div className="space-y-1.5">
                      <Label htmlFor="passConfirm" className="text-xs font-semibold">
                        Confirmar Nueva Contraseña *
                      </Label>
                      <div className="relative">
                        <Input
                          id="passConfirm"
                          type={showPasswordConfirm ? 'text' : 'password'}
                          required
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          placeholder="••••••••"
                          className="h-10 text-xs pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPasswordConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingPassword}
                      className="h-10 text-xs font-bold cursor-pointer"
                    >
                      {savingPassword ? (
                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                      ) : (
                        <Save className="size-3.5 mr-1.5" />
                      )}
                      <span>Actualizar Contraseña</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Requisitos y Seguridad */}
              <Card className="p-6 space-y-4 shadow-sm border">
                <CardHeader className="p-0 border-b pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="size-4 text-amber-500" />
                    <span>Requisitos de Seguridad</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn('size-3.5', passwordNueva.length >= 6 ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                    <span>Mínimo 6 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn('size-3.5', passwordNueva.length >= 8 ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                    <span>Recomendado 8 o más caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn('size-3.5', /[0-9]/.test(passwordNueva) ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                    <span>Al menos un número (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn('size-3.5', /[A-Z]/.test(passwordNueva) ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                    <span>Al menos una letra mayúscula</span>
                  </div>
                </CardContent>

                <CardFooter className="p-0 pt-4 border-t text-[11px] text-muted-foreground block">
                  <p>
                    Las contraseñas se almacenan mediante hashing criptográfico <strong>BCrypt</strong> irreversible con salt individualizado.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* ── 4. HISTORIAL DE ACTIVIDAD (AUDITORÍA) ────────────────── */}
          <TabsContent value="activity" className="space-y-6 mt-0">
            <Card className="shadow-sm border">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Activity className="size-4 text-primary" />
                      <span>Bitácora de Actividad Personal</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Registro de eventos, inicios de sesión y modificaciones ejecutadas por tu cuenta.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {myLogs.length} eventos
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {myLogs.length > 0 ? (
                  myLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-2 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                          <Clock className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{log.accion}</span>
                            <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                              {log.modulo}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            IP: {log.ip || '127.0.0.1'} • {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-muted text-muted-foreground self-start sm:self-center">
                        ID #{log.id}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">
                    No hay eventos registrados en la bitácora.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
