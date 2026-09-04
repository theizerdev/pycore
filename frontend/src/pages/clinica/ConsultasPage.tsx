import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { consultasApi, type ConsultaMedica, type ConsultaResumenContadores } from '../../api/consultas';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import { sucursalesApi } from '../../api/sucursales';
import type { Medico, Especialidad, Sucursal } from '../../types';
import { toast } from 'sonner';
import { cn, getInitials } from '../../lib/utils';

// UI Components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

// Icons
import {
  HeartPulse,
  Stethoscope,
  Hourglass,
  CheckCircle2,
  Users,
  Search,
  RefreshCw,
  Clock,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  MoreVertical,
  Check,
  X,
  ExternalLink,
  Copy,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CornerUpLeft,
  Activity,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';

type TabKey = 'sala-espera' | 'en-consulta' | 'atendidas';

export const ConsultasPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determinar pestaña según la ruta actual
  const currentTab = useMemo<TabKey>(() => {
    if (location.pathname.includes('en-consulta')) return 'en-consulta';
    if (location.pathname.includes('atendidas')) return 'atendidas';
    return 'sala-espera';
  }, [location.pathname]);

  // Estados de datos
  const [consultas, setConsultas] = useState<ConsultaMedica[]>([]);
  const [contadores, setContadores] = useState<ConsultaResumenContadores>({
    sala_espera: 0,
    en_consulta: 0,
    atendidas: 0,
    total_hoy: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Catálogos para filtros
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // Filtros
  const [search, setSearch] = useState<string>('');
  const [selectedFecha, setSelectedFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMedico, setSelectedMedico] = useState<string>('all');
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string>('all');
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all');

  // Drawer de Preconsulta
  const [selectedPreconsulta, setSelectedPreconsulta] = useState<ConsultaMedica | null>(null);
  const [preconsultaDrawerOpen, setPreconsultaDrawerOpen] = useState<boolean>(false);

  // Modal de acción / confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    confirmVariant?: 'default' | 'destructive';
    confirmLabel?: string;
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
  });

  // Mapear tab actual al estado de la base de datos
  const estadoFiltro = useMemo<string>(() => {
    switch (currentTab) {
      case 'sala-espera':
        return 'en_espera';
      case 'en-consulta':
        return 'en_curso';
      case 'atendidas':
        return 'finalizada';
      default:
        return 'en_espera';
    }
  }, [currentTab]);

  // Cargar catálogos
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [medRes, espRes, sucRes] = await Promise.all([
          medicosApi.list({ activo: true }).catch(() => []),
          especialidadesApi.list({ activo: true }).catch(() => []),
          sucursalesApi.list().catch(() => []),
        ]);
        setMedicos(medRes);
        setEspecialidades(espRes);
        setSucursales(sucRes);
      } catch (err) {
        console.error('Error cargando catálogos de consultas:', err);
      }
    };
    fetchCatalogos();
  }, []);

  // Cargar consultas y contadores
  const fetchConsultasData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [listRes, countRes] = await Promise.all([
        consultasApi.getConsultas({
          estado: estadoFiltro,
          fecha: selectedFecha || undefined,
          medico_id: selectedMedico !== 'all' ? Number(selectedMedico) : undefined,
          especialidad_id: selectedEspecialidad !== 'all' ? Number(selectedEspecialidad) : undefined,
          sucursal_id: selectedSucursal !== 'all' ? Number(selectedSucursal) : undefined,
          search: search.trim() || undefined,
        }),
        consultasApi.getResumenContadores({
          fecha: selectedFecha || undefined,
          medico_id: selectedMedico !== 'all' ? Number(selectedMedico) : undefined,
          sucursal_id: selectedSucursal !== 'all' ? Number(selectedSucursal) : undefined,
        }),
      ]);

      setConsultas(listRes);
      setContadores(countRes);
    } catch (err: any) {
      console.error('Error cargando consultas:', err);
      toast.error('Error al cargar la lista de consultas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [estadoFiltro, selectedFecha, selectedMedico, selectedEspecialidad, selectedSucursal, search]);

  useEffect(() => {
    fetchConsultasData();
  }, [fetchConsultasData]);

  // Navegación entre pestañas
  const handleTabChange = (tab: TabKey) => {
    switch (tab) {
      case 'sala-espera':
        navigate('/clinica/consultas/sala-espera');
        break;
      case 'en-consulta':
        navigate('/clinica/consultas/en-consulta');
        break;
      case 'atendidas':
        navigate('/clinica/consultas/atendidas');
        break;
    }
  };

  // Acciones de cambio de estado
  const handleLlamarConsultorio = (consulta: ConsultaMedica) => {
    setConfirmDialog({
      open: true,
      title: 'Llamar a Consultorio',
      description: `¿Desea llamar al paciente ${consulta.paciente?.nombres} ${consulta.paciente?.apellidos} para ingresar a consulta con el Dr(a). ${consulta.medico?.nombres} ${consulta.medico?.apellidos}?`,
      confirmLabel: 'Llamar a Consulta',
      confirmVariant: 'default',
      action: async () => {
        try {
          await consultasApi.cambiarEstado(consulta.id, 'en_curso');
          toast.success(`Paciente ${consulta.paciente?.nombres} ingresó a consulta médica.`);
          fetchConsultasData();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Error al cambiar estado de consulta');
        }
      },
    });
  };

  const handleDevolverSalaEspera = (consulta: ConsultaMedica) => {
    setConfirmDialog({
      open: true,
      title: 'Devolver a Sala de Espera',
      description: `¿Desea devolver al paciente ${consulta.paciente?.nombres} a la sala de espera?`,
      confirmLabel: 'Devolver a Espera',
      confirmVariant: 'default',
      action: async () => {
        try {
          await consultasApi.cambiarEstado(consulta.id, 'en_espera');
          toast.info(`Paciente ${consulta.paciente?.nombres} devuelto a Sala de Espera.`);
          fetchConsultasData();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Error al actualizar consulta');
        }
      },
    });
  };

  const handleFinalizarConsulta = (consulta: ConsultaMedica) => {
    setConfirmDialog({
      open: true,
      title: 'Finalizar Consulta Médica',
      description: `¿Confirmar que la atención médica de ${consulta.paciente?.nombres} ${consulta.paciente?.apellidos} ha finalizado con éxito?`,
      confirmLabel: 'Finalizar Atención',
      confirmVariant: 'default',
      action: async () => {
        try {
          await consultasApi.cambiarEstado(consulta.id, 'finalizada');
          toast.success(`Consulta de ${consulta.paciente?.nombres} finalizada.`);
          fetchConsultasData();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Error al finalizar consulta');
        }
      },
    });
  };

  const handleAnularConsulta = (consulta: ConsultaMedica) => {
    setConfirmDialog({
      open: true,
      title: 'Anular Consulta',
      description: `¿Está seguro de anular esta consulta de ${consulta.paciente?.nombres}? La cita asociada quedará cancelada.`,
      confirmLabel: 'Anular Consulta',
      confirmVariant: 'destructive',
      action: async () => {
        try {
          await consultasApi.cambiarEstado(consulta.id, 'anulada', 'Anulada por usuario');
          toast.warning(`Consulta de ${consulta.paciente?.nombres} anulada.`);
          fetchConsultasData();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Error al anular consulta');
        }
      },
    });
  };

  // Copiar link de preconsulta al portapapeles
  const handleCopyPreconsultaLink = (token: string) => {
    const url = `${window.location.origin}/preconsulta/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace de preconsulta copiado al portapapeles');
  };

  // Formatear hora de inicio
  const formatHora = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Calcular tiempo transcurrido
  const formatTiempoEspera = (dateStr: string) => {
    try {
      const start = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.max(0, Math.floor((now - start) / (1000 * 60)));

      if (diffMinutes < 60) {
        return `${diffMinutes} min`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hours}h ${mins}m`;
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ── ENCABEZADO PRINCIPAL ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Consultas Médicas
              </h1>
              <p className="text-sm text-muted-foreground">
                Control asistencial de pacientes en tiempo real, sala de espera y triaje de preconsulta
              </p>
            </div>
          </div>
        </div>

        {/* Acciones superiores */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConsultasData}
            disabled={refreshing}
            className="h-9 gap-1.5 shadow-xs"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin text-primary')} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* ── PESTAÑAS DE ESTADO KPI (SALA DE ESPERA / EN CONSULTA / ATENDIDAS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Pestaña: Sala de Espera */}
        <button
          type="button"
          onClick={() => handleTabChange('sala-espera')}
          className={cn(
            'group relative flex items-center justify-between p-4 rounded-2xl border transition-all text-left shadow-xs cursor-pointer',
            currentTab === 'sala-espera'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-card hover:bg-muted/50 border-border text-foreground'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                currentTab === 'sala-espera'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20'
              )}
            >
              <Hourglass className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-base flex items-center gap-2">
                Sala de Espera
                {currentTab === 'sala-espera' && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Pacientes esperando turno</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={cn(
                'text-2xl font-black px-2.5 py-1 rounded-xl',
                currentTab === 'sala-espera'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
              )}
            >
              {contadores.sala_espera}
            </span>
          </div>
        </button>

        {/* Pestaña: En Consulta */}
        <button
          type="button"
          onClick={() => handleTabChange('en-consulta')}
          className={cn(
            'group relative flex items-center justify-between p-4 rounded-2xl border transition-all text-left shadow-xs cursor-pointer',
            currentTab === 'en-consulta'
              ? 'bg-primary/10 border-primary/40 text-primary-950 dark:text-primary-100 ring-2 ring-primary/20 shadow-md'
              : 'bg-card hover:bg-muted/50 border-border text-foreground'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                currentTab === 'en-consulta'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              )}
            >
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-base flex items-center gap-2">
                En Consulta
                {currentTab === 'en-consulta' && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-ping" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Atención médica activa</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={cn(
                'text-2xl font-black px-2.5 py-1 rounded-xl',
                currentTab === 'en-consulta'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-primary/15 text-primary font-bold'
              )}
            >
              {contadores.en_consulta}
            </span>
          </div>
        </button>

        {/* Pestaña: Atendidas */}
        <button
          type="button"
          onClick={() => handleTabChange('atendidas')}
          className={cn(
            'group relative flex items-center justify-between p-4 rounded-2xl border transition-all text-left shadow-xs cursor-pointer',
            currentTab === 'atendidas'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-card hover:bg-muted/50 border-border text-foreground'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                currentTab === 'atendidas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20'
              )}
            >
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-base flex items-center gap-2">
                Atendidas
                {currentTab === 'atendidas' && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Consultas finalizadas hoy</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={cn(
                'text-2xl font-black px-2.5 py-1 rounded-xl',
                currentTab === 'atendidas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
              )}
            >
              {contadores.atendidas}
            </span>
          </div>
        </button>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ── */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Buscador */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, cédula, código o motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-10 rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Fecha */}
            <div>
              <Input
                type="date"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                className="bg-background h-10 rounded-xl"
              />
            </div>

            {/* Especialidad */}
            <div>
              <Select value={selectedEspecialidad} onValueChange={setSelectedEspecialidad}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <SelectValue placeholder="Especialidad: Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las especialidades</SelectItem>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp.id} value={String(esp.id)}>
                      {esp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Médico Especialista */}
            <div>
              <Select value={selectedMedico} onValueChange={setSelectedMedico}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <SelectValue placeholder="Médico: Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los médicos</SelectItem>
                  {medicos.map((med) => (
                    <SelectItem key={med.id} value={String(med.id)}>
                      Dr(a). {med.nombres} {med.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── LISTADO PRINCIPAL DE CONSULTAS SEGÚN ESTADO ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Stethoscope className="h-6 w-6 text-primary absolute inset-0 m-auto" />
          </div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Cargando consultas de {currentTab.replace('-', ' ')}...
          </p>
        </div>
      ) : consultas.length === 0 ? (
        <Card className="border-dashed border-2 border-border/70 py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-muted/70 flex items-center justify-center text-muted-foreground">
              {currentTab === 'sala-espera' && <Hourglass className="h-7 w-7" />}
              {currentTab === 'en-consulta' && <Activity className="h-7 w-7" />}
              {currentTab === 'atendidas' && <CheckCircle2 className="h-7 w-7" />}
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {currentTab === 'sala-espera' && 'No hay pacientes en sala de espera'}
              {currentTab === 'en-consulta' && 'No hay consultas en curso actualmente'}
              {currentTab === 'atendidas' && 'No se han registrado consultas atendidas hoy'}
            </h3>
            <p className="text-sm text-muted-foreground text-balance">
              {currentTab === 'sala-espera' &&
                'Cuando pase una cita al estado "Sala de Espera", aparecerá aquí automáticamente y se le enviará el formulario de preconsulta por WhatsApp.'}
              {currentTab === 'en-consulta' &&
                'Cuando llame a un paciente desde la Sala de Espera, la consulta se activará en este panel.'}
              {currentTab === 'atendidas' &&
                'Las consultas finalizadas se archivarán aquí para consulta del historial clínico.'}
            </p>
            {search && (
              <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-2">
                Limpiar búsqueda
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {consultas.map((consulta) => {
            const hasPreconsulta = Boolean(consulta.preconsulta);
            const isPreconsultaCompletada = consulta.preconsulta?.estado === 'completada';

            return (
              <Card
                key={consulta.id}
                className={cn(
                  'group relative overflow-hidden transition-all duration-200 border-border/80 hover:shadow-md hover:border-primary/40',
                  currentTab === 'en-consulta' && 'border-primary/40 bg-primary/5'
                )}
              >
                {/* Barra lateral de color según estado */}
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 w-1.5',
                    currentTab === 'sala-espera' && 'bg-amber-500',
                    currentTab === 'en-consulta' && 'bg-primary animate-pulse',
                    currentTab === 'atendidas' && 'bg-emerald-500'
                  )}
                />

                <CardContent className="p-5 pl-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Información del Paciente y Cita */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg ring-1 ring-primary/20 shadow-xs">
                        {consulta.paciente
                          ? getInitials(`${consulta.paciente.nombres} ${consulta.paciente.apellidos}`)
                          : 'PA'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-foreground hover:text-primary transition-colors">
                            {consulta.paciente
                              ? `${consulta.paciente.nombres} ${consulta.paciente.apellidos}`
                              : 'Paciente no identificado'}
                          </h4>

                          {consulta.codigo && (
                            <Badge variant="outline" className="text-xs font-mono bg-muted/40">
                              {consulta.codigo}
                            </Badge>
                          )}

                          {consulta.paciente?.edad !== undefined && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {consulta.paciente.edad} años
                            </Badge>
                          )}

                          {consulta.paciente?.numero_documento && (
                            <span className="text-xs text-muted-foreground font-mono">
                              Doc: {consulta.paciente.tipo_documento || 'V'}-{consulta.paciente.numero_documento}
                            </span>
                          )}
                        </div>

                        {/* Motivo de consulta */}
                        <p className="text-sm font-medium text-foreground/90 flex items-center gap-1.5 line-clamp-1">
                          <span className="text-muted-foreground font-normal">Motivo:</span>
                          <span className="italic">{consulta.motivo_consulta}</span>
                        </p>

                        {/* Especialista y Especialidad */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold text-foreground">
                              Dr(a). {consulta.medico?.nombres} {consulta.medico?.apellidos}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium py-0 px-2 bg-background/80"
                            >
                              {consulta.especialidad?.nombre || 'General'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Hora: {formatHora(consulta.fecha_consulta)}</span>
                          </div>

                          {currentTab === 'sala-espera' && (
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md">
                              <Hourglass className="h-3 w-3" />
                              <span>En espera: {formatTiempoEspera(consulta.fecha_consulta)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preconsulta y Acciones */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 self-end lg:self-center">
                      {/* Estado de Preconsulta */}
                      {hasPreconsulta ? (
                        isPreconsultaCompletada ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPreconsulta(consulta);
                              setPreconsultaDrawerOpen(true);
                            }}
                            className="h-9 gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-xs font-semibold"
                          >
                            <ClipboardList className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Preconsulta Lista</span>
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5"
                                  >
                                    <Hourglass className="h-3.5 w-3.5" />
                                    <span>Preconsulta Pendiente</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {consulta.preconsulta?.whatsapp_enviado
                                      ? 'Enlace enviado al WhatsApp del paciente'
                                      : 'Enlace generado, pendiente de respuesta'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {consulta.preconsulta?.token && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleCopyPreconsultaLink(consulta.preconsulta!.token)}
                                title="Copiar enlace de preconsulta"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )
                      ) : null}

                      {/* Botones de acción según la pestaña */}
                      {currentTab === 'sala-espera' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleLlamarConsultorio(consulta)}
                            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                          >
                            <Stethoscope className="h-4 w-4" />
                            <span>Llamar a Consultorio</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isPreconsultaCompletada && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPreconsulta(consulta);
                                    setPreconsultaDrawerOpen(true);
                                  }}
                                >
                                  <ClipboardList className="mr-2 h-4 w-4 text-emerald-500" />
                                  Ver Preconsulta del Paciente
                                </DropdownMenuItem>
                              )}
                              {consulta.preconsulta?.token && (
                                <DropdownMenuItem
                                  onClick={() => handleCopyPreconsultaLink(consulta.preconsulta!.token)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar Link de Preconsulta
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAnularConsulta(consulta)}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Anular Consulta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {currentTab === 'en-consulta' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDevolverSalaEspera(consulta)}
                            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                            title="Devolver a sala de espera"
                          >
                            <CornerUpLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">A Espera</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleFinalizarConsulta(consulta)}
                            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Finalizar Atención</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isPreconsultaCompletada && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPreconsulta(consulta);
                                    setPreconsultaDrawerOpen(true);
                                  }}
                                >
                                  <ClipboardList className="mr-2 h-4 w-4 text-emerald-500" />
                                  Ver Respuestas de Preconsulta
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAnularConsulta(consulta)}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Anular Consulta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {currentTab === 'atendidas' && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 py-1 px-2.5">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Atendida</span>
                          </Badge>

                          {isPreconsultaCompletada && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPreconsulta(consulta);
                                setPreconsultaDrawerOpen(true);
                              }}
                              className="h-9 gap-1.5"
                            >
                              <FileText className="h-4 w-4 text-primary" />
                              <span>Ver Preconsulta</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── DRAWER / SHEET LATERAL PARA VER PRECONSULTA COMPLETADA ── */}
      <Sheet open={preconsultaDrawerOpen} onOpenChange={setPreconsultaDrawerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <ClipboardList className="h-4 w-4" />
              <span>Ficha de Triaje y Preconsulta</span>
            </div>
            <SheetTitle className="text-xl font-bold text-foreground">
              {selectedPreconsulta?.paciente
                ? `${selectedPreconsulta.paciente.nombres} ${selectedPreconsulta.paciente.apellidos}`
                : 'Detalle de Preconsulta'}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Formulario completado por el paciente desde su teléfono móvil antes de entrar al consultorio.
            </SheetDescription>
          </SheetHeader>

          {selectedPreconsulta?.preconsulta && (
            <div className="py-5 space-y-6">
              {/* Encabezado con estado y timestamps */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/60 border border-border/80">
                <div>
                  <div className="text-xs text-muted-foreground">Estado del Formulario</div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Completado por el Paciente
                  </div>
                </div>
                {selectedPreconsulta.preconsulta.completada_at && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Hora de llenado</div>
                    <div className="font-mono text-xs font-semibold text-foreground mt-0.5">
                      {new Date(selectedPreconsulta.preconsulta.completada_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bloque: Motivo y Síntomas Principales */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  <span>Motivo y Síntomas Principales</span>
                </h4>

                <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-card shadow-2xs">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Motivo de consulta reportado por el paciente:
                    </label>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {selectedPreconsulta.preconsulta.respuestas?.motivo_consulta ||
                        selectedPreconsulta.motivo_consulta ||
                        'No especificado'}
                    </p>
                  </div>

                  {selectedPreconsulta.preconsulta.respuestas?.tiempo_evolucion && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Tiempo de evolución del malestar:
                      </label>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {selectedPreconsulta.preconsulta.respuestas.tiempo_evolucion}
                      </p>
                    </div>
                  )}

                  {selectedPreconsulta.preconsulta.respuestas?.escala_dolor !== undefined && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Escala del dolor (1-10):
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={cn(
                            'text-xs font-bold px-2.5 py-0.5',
                            Number(selectedPreconsulta.preconsulta.respuestas.escala_dolor) >= 7
                              ? 'bg-red-500 text-white'
                              : Number(selectedPreconsulta.preconsulta.respuestas.escala_dolor) >= 4
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-500 text-white'
                          )}
                        >
                          Nivel {selectedPreconsulta.preconsulta.respuestas.escala_dolor} / 10
                        </Badge>
                      </div>
                    </div>
                  )}

                  {selectedPreconsulta.preconsulta.respuestas?.sintomas_principales && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Descripción detallada de síntomas:
                      </label>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                        {selectedPreconsulta.preconsulta.respuestas.sintomas_principales}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque: Antecedentes, Alergias y Medicación */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HeartPulse className="h-3.5 w-3.5 text-primary" />
                  <span>Antecedentes y Medicación</span>
                </h4>

                <div className="rounded-xl border border-border/80 p-4 space-y-3 bg-card shadow-2xs">
                  {/* Alergias */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Alergias a Medicamentos / Alimentos:
                    </label>
                    <div className="mt-1">
                      {selectedPreconsulta.preconsulta.respuestas?.alergias ? (
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                          ⚠️ {selectedPreconsulta.preconsulta.respuestas.alergias}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Niega alergias conocidas
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Medicamentos actuales */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Medicamentos que toma actualmente:
                    </label>
                    <p className="text-sm text-foreground mt-0.5">
                      {selectedPreconsulta.preconsulta.respuestas?.medicamentos_actuales ||
                        'Ninguno reportado'}
                    </p>
                  </div>

                  {/* Enfermedades crónicas */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Antecedentes patológicos / Enfermedades crónicas:
                    </label>
                    <p className="text-sm text-foreground mt-0.5">
                      {selectedPreconsulta.preconsulta.respuestas?.enfermedades_previas ||
                        selectedPreconsulta.preconsulta.respuestas?.antecedentes ||
                        'Sin antecedentes relevantes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Respuestas adicionales o dinámicas */}
              {Object.keys(selectedPreconsulta.preconsulta.respuestas || {}).some(
                (k) =>
                  ![
                    'motivo_consulta',
                    'tiempo_evolucion',
                    'escala_dolor',
                    'sintomas_principales',
                    'alergias',
                    'medicamentos_actuales',
                    'enfermedades_previas',
                    'antecedentes',
                  ].includes(k)
              ) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Preguntas Específicas de la Especialidad</span>
                  </h4>

                  <div className="rounded-xl border border-border/80 p-4 space-y-2 bg-card shadow-2xs">
                    {Object.entries(selectedPreconsulta.preconsulta.respuestas || {})
                      .filter(
                        ([k]) =>
                          ![
                            'motivo_consulta',
                            'tiempo_evolucion',
                            'escala_dolor',
                            'sintomas_principales',
                            'alergias',
                            'medicamentos_actuales',
                            'enfermedades_previas',
                            'antecedentes',
                          ].includes(k)
                      )
                      .map(([key, val]) => (
                        <div key={key} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                          <span className="text-xs font-semibold text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <p className="text-sm text-foreground font-medium mt-0.5">
                            {typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── MODAL DE CONFIRMACIÓN ── */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl font-semibold',
                confirmDialog.confirmVariant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              onClick={async (e) => {
                e.preventDefault();
                await confirmDialog.action();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              {confirmDialog.confirmLabel || 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
