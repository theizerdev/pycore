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
  Printer,
  Pill,
  FlaskConical,
  BedDouble,
  FileCheck2,
  Table as TableIcon,
  LayoutGrid,
  CalendarClock,
  Eye,
  Filter,
} from 'lucide-react';
import { DocumentosImpresionModal, type TipoDocumentoClinico } from '../../components/clinica/DocumentosImpresionModal';
import { PatientRecordDrawer } from './PatientRecordDrawer';
import type { Paciente } from '../../types';

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

  const isDoctorUser = Boolean(user?.rol?.slug === 'medico');

  // Identificar el perfil médico del usuario autenticado
  const currentDoctor = useMemo(() => {
    if (!isDoctorUser || !user) return null;
    return medicos.find(
      (m) =>
        m.usuario_id === user.id ||
        (m.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [isDoctorUser, user, medicos]);

  useEffect(() => {
    if (currentDoctor) {
      setSelectedMedico(String(currentDoctor.id));
    }
  }, [currentDoctor]);

  // Modo de vista: 'table' | 'cards' (persistido en localStorage)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    return (localStorage.getItem('consultas_view_mode') as 'table' | 'cards') || 'table';
  });

  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('consultas_view_mode', mode);
  };

  // Drawer de Historia / Ficha del Paciente
  const [recordDrawerOpen, setRecordDrawerOpen] = useState<boolean>(false);
  const [patientForRecord, setPatientForRecord] = useState<Paciente | null>(null);

  const handleOpenPatientRecord = (paciente: any) => {
    if (!paciente) return;
    setPatientForRecord(paciente);
    setRecordDrawerOpen(true);
  };

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

  // Modal de impresión de documentos clínicos
  const [impresionModalOpen, setImpresionModalOpen] = useState<boolean>(false);
  const [consultaParaImprimir, setConsultaParaImprimir] = useState<ConsultaMedica | null>(null);
  const [documentoInicialImpresion, setDocumentoInicialImpresion] = useState<TipoDocumentoClinico>('informe');

  const handleAbrirImpresion = (cons: ConsultaMedica, tipo: TipoDocumentoClinico = 'informe') => {
    setConsultaParaImprimir(cons);
    setDocumentoInicialImpresion(tipo);
    setImpresionModalOpen(true);
  };

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
      confirmLabel: 'Llamar y Atender',
      confirmVariant: 'default',
      action: async () => {
        try {
          await consultasApi.cambiarEstado(consulta.id, 'en_curso');
          toast.success(`Paciente ${consulta.paciente?.nombres} ingresó a consulta médica.`);
          // Redirigir a la vista completa de atención
          navigate(`/clinica/consultas/${consulta.id}/atencion`);
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

  // Helpers de paciente
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
    return 'Edad N/A';
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

  // Semáforo clínico de tiempo de espera
  const getWaitTimeStatus = (dateStr: string) => {
    try {
      const start = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffMinutes = Math.max(0, Math.floor((now - start) / (1000 * 60)));

      if (diffMinutes < 15) {
        return {
          minutes: diffMinutes,
          text: `${diffMinutes} min`,
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dotClass: 'bg-emerald-500',
          label: 'A tiempo',
        };
      }
      if (diffMinutes <= 30) {
        return {
          minutes: diffMinutes,
          text: `${diffMinutes} min`,
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dotClass: 'bg-amber-500',
          label: 'Demora leve',
        };
      }
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const formatted = hours > 0 ? `${hours}h ${mins}m` : `${diffMinutes} min`;
      return {
        minutes: diffMinutes,
        text: formatted,
        badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse',
        dotClass: 'bg-rose-500',
        label: 'Demora alta',
      };
    } catch {
      return {
        minutes: 0,
        text: '-',
        badgeClass: 'bg-muted text-muted-foreground border-border',
        dotClass: 'bg-muted-foreground',
        label: 'N/A',
      };
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
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Buscador */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, cédula, código o motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-10 rounded-xl text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                className="bg-background h-10 rounded-xl text-xs"
              />
            </div>

            {/* Especialidad */}
            <div>
              <Select value={selectedEspecialidad} onValueChange={setSelectedEspecialidad}>
                <SelectTrigger className="h-10 rounded-xl bg-background text-xs">
                  <SelectValue placeholder="Especialidad: Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las especialidades</SelectItem>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp.id} value={String(esp.id)} className="text-xs">
                      {esp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Médico Especialista */}
            <div>
              {isDoctorUser && currentDoctor ? (
                <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  <Stethoscope className="h-4 w-4 shrink-0" />
                  <span className="truncate">Dr(a). {currentDoctor.nombres} {currentDoctor.apellidos}</span>
                </div>
              ) : (
                <Select value={selectedMedico} onValueChange={setSelectedMedico}>
                  <SelectTrigger className="h-10 rounded-xl bg-background text-xs">
                    <SelectValue placeholder="Médico: Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los médicos</SelectItem>
                    {medicos.map((med) => (
                      <SelectItem key={med.id} value={String(med.id)} className="text-xs">
                        Dr(a). {med.nombres} {med.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Sub-barra: Contador de resultados y Selector de Vista */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{consultas.length}</span>
              <span>{consultas.length === 1 ? 'consulta encontrada' : 'consultas encontradas'}</span>
              {(search || selectedMedico !== 'all' || selectedEspecialidad !== 'all' || selectedFecha !== new Date().toISOString().split('T')[0]) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setSelectedMedico('all');
                    setSelectedEspecialidad('all');
                    setSelectedFecha(new Date().toISOString().split('T')[0]);
                  }}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                >
                  <X className="size-3 mr-1" />
                  Restablecer filtros
                </Button>
              )}
            </div>

            {/* Selector de Vista: Tabla Clínica o Tarjetas */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/80">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleViewModeChange('table')}
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 transition-all cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Vista de Tabla Médica Estructurada"
              >
                <TableIcon className="size-3.5" />
                <span>Tabla</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleViewModeChange('cards')}
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 transition-all cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Vista de Tarjetas Modernas"
              >
                <LayoutGrid className="size-3.5" />
                <span>Tarjetas</span>
              </Button>
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
                'Cuando pase una cita al estado "Sala de Espera", aparecerá aquí automáticamente con su semáforo de tiempo de espera.'}
              {currentTab === 'en-consulta' &&
                'Cuando llame a un paciente desde la Sala de Espera, la consulta se activará en este panel.'}
              {currentTab === 'atendidas' &&
                'Las consultas finalizadas se archivarán aquí para consulta del historial clínico e impresión de recaudos.'}
            </p>
            {search && (
              <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-2 cursor-pointer">
                Limpiar búsqueda
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* ═════════════════════════════════════════════════════════════════
           ── VISTA TABLA CLÍNICA EJECUTIVA (viewMode === 'table') ──
           ═════════════════════════════════════════════════════════════════ */
        <Card className="border-border/80 shadow-xs overflow-hidden rounded-2xl bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <th className="py-3 px-4 w-[150px]">Turno / Espera</th>
                  <th className="py-3 px-4 min-w-[240px]">Paciente</th>
                  <th className="py-3 px-4 min-w-[200px]">Médico Especialista</th>
                  <th className="py-3 px-4 min-w-[260px]">Motivo & Triaje</th>
                  <th className="py-3 px-4 text-right min-w-[190px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {consultas.map((consulta) => {
                  const hasPreconsulta = Boolean(consulta.preconsulta);
                  const isPreconsultaCompletada = consulta.preconsulta?.estado === 'completada';
                  const waitStatus = getWaitTimeStatus(consulta.fecha_consulta);
                  const cleanPhone = consulta.paciente?.telefono ? consulta.paciente.telefono.replace(/\D/g, '') : '';

                  return (
                    <tr
                      key={consulta.id}
                      className={cn(
                        'hover:bg-muted/35 transition-colors group',
                        currentTab === 'en-consulta' && 'bg-primary/5 hover:bg-primary/10'
                      )}
                    >
                      {/* Turno / Espera */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                            <Clock className="size-3 text-muted-foreground" />
                            <span>{formatHora(consulta.fecha_consulta)}</span>
                          </div>
                          {consulta.codigo && (
                            <span className="font-mono text-[10.5px] text-muted-foreground block">
                              {consulta.codigo}
                            </span>
                          )}
                          {currentTab === 'sala-espera' && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                                waitStatus.badgeClass
                              )}
                              title={`Tiempo transcurrido en espera: ${waitStatus.text}`}
                            >
                              <span className={cn('size-1.5 rounded-full', waitStatus.dotClass)} />
                              <span>{waitStatus.text}</span>
                            </span>
                          )}
                          {currentTab === 'en-consulta' && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] py-0 px-1.5">
                              En Atención
                            </Badge>
                          )}
                          {currentTab === 'atendidas' && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5">
                              Finalizada
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenPatientRecord(consulta.paciente)}
                            className="size-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-500/25 shrink-0 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                            title="Ver expediente clínico del paciente"
                          >
                            {consulta.paciente
                              ? getInitials(`${consulta.paciente.nombres} ${consulta.paciente.apellidos}`)
                              : 'PA'}
                          </button>
                          <div className="space-y-0.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenPatientRecord(consulta.paciente)}
                              className="font-bold text-xs text-foreground hover:text-primary transition-colors text-left truncate block cursor-pointer"
                            >
                              {consulta.paciente
                                ? `${consulta.paciente.nombres} ${consulta.paciente.apellidos}`
                                : 'Paciente no identificado'}
                            </button>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                              {(consulta.paciente?.documento_identidad || consulta.paciente?.numero_documento) && (
                                <span>
                                  {consulta.paciente.tipo_documento || 'V'}-
                                  {consulta.paciente.documento_identidad || consulta.paciente.numero_documento}
                                </span>
                              )}
                              <span>•</span>
                              <span>{calculateAge(consulta.paciente?.fecha_nacimiento, consulta.paciente?.edad)}</span>
                            </div>
                            {consulta.paciente?.telefono && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-mono font-medium"
                                title="Enviar mensaje de WhatsApp"
                              >
                                <Phone className="size-2.5" />
                                <span>{consulta.paciente.telefono}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Médico Especialista */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: consulta.medico?.color_calendario || consulta.especialidad?.color || '#0d9488' }}
                            />
                            <span className="truncate">
                              {consulta.medico
                                ? `Dr(a). ${consulta.medico.nombres} ${consulta.medico.apellidos}`
                                : 'Sin especialista asignado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-muted/30">
                              {consulta.especialidad?.nombre || 'General'}
                            </Badge>
                            {consulta.sucursal?.nombre && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                • {consulta.sucursal.nombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Motivo & Triaje Clínico */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          <p className="text-xs text-foreground/90 font-medium line-clamp-2" title={consulta.motivo_consulta}>
                            {consulta.motivo_consulta || 'Consulta clínica general'}
                          </p>

                          {/* Preconsulta / Triaje / Documentos generados */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasPreconsulta ? (
                              isPreconsultaCompletada ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPreconsulta(consulta);
                                    setPreconsultaDrawerOpen(true);
                                  }}
                                  className="h-6 text-[10.5px] px-2 gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-semibold cursor-pointer"
                                >
                                  <ClipboardList className="size-3 text-emerald-600" />
                                  <span>Preconsulta Lista</span>
                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-[10px] gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2"
                                  >
                                    <Hourglass className="size-2.5" />
                                    <span>Triaje Pendiente</span>
                                  </Badge>
                                  {consulta.preconsulta?.token && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPreconsultaLink(consulta.preconsulta!.token)}
                                      className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                      title="Copiar link de preconsulta"
                                    >
                                      <Copy className="size-3" />
                                    </button>
                                  )}
                                </div>
                              )
                            ) : null}

                            {/* En atendidas: resumen de lo generado */}
                            {currentTab === 'atendidas' && (
                              <>
                                {consulta.receta_medica && consulta.receta_medica.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                                    <Pill className="size-2.5 text-emerald-600" />
                                    <span>{consulta.receta_medica.length} Rx</span>
                                  </Badge>
                                )}
                                {consulta.estudios_solicitados && consulta.estudios_solicitados.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                                    <FlaskConical className="size-2.5 text-violet-600" />
                                    <span>{consulta.estudios_solicitados.length} Est.</span>
                                  </Badge>
                                )}
                                {consulta.reposo_medico?.requiere_reposo && (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    <BedDouble className="size-2.5 text-amber-600" />
                                    <span>{consulta.reposo_medico.dias_reposo}d</span>
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 align-top text-right">
                        {currentTab === 'sala-espera' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleLlamarConsultorio(consulta)}
                              className="h-8 text-xs px-2.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
                            >
                              <Stethoscope className="size-3.5" />
                              <span>Llamar</span>
                              <ChevronRight className="size-3 opacity-70" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                  <MoreVertical className="size-3.5" />
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
                                    <ClipboardList className="mr-2 size-3.5 text-emerald-500" />
                                    Ver Preconsulta del Paciente
                                  </DropdownMenuItem>
                                )}
                                {consulta.preconsulta?.token && (
                                  <DropdownMenuItem
                                    onClick={() => handleCopyPreconsultaLink(consulta.preconsulta!.token)}
                                  >
                                    <Copy className="mr-2 size-3.5" />
                                    Copiar Link de Preconsulta
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAnularConsulta(consulta)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="mr-2 size-3.5" />
                                  Anular Consulta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {currentTab === 'en-consulta' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/clinica/consultas/${consulta.id}/atencion`)}
                              className="h-8 text-xs px-2.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs cursor-pointer"
                            >
                              <Stethoscope className="size-3.5" />
                              <span>Atender</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDevolverSalaEspera(consulta)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Devolver a sala de espera"
                            >
                              <CornerUpLeft className="size-3" />
                              <span className="hidden sm:inline">Espera</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => navigate(`/clinica/consultas/${consulta.id}/atencion`)}
                                >
                                  <Stethoscope className="mr-2 size-3.5 text-primary" />
                                  Abrir Consulta Médica
                                </DropdownMenuItem>
                                {isPreconsultaCompletada && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPreconsulta(consulta);
                                      setPreconsultaDrawerOpen(true);
                                    }}
                                  >
                                    <ClipboardList className="mr-2 size-3.5 text-emerald-500" />
                                    Ver Respuestas de Preconsulta
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleFinalizarConsulta(consulta)}
                                >
                                  <CheckCircle2 className="mr-2 size-3.5 text-emerald-600" />
                                  Finalización Rápida
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAnularConsulta(consulta)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="mr-2 size-3.5" />
                                  Anular Consulta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {currentTab === 'atendidas' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/clinica/consultas/${consulta.id}/detalle`)}
                              className="h-8 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/5 font-semibold gap-1 cursor-pointer"
                            >
                              <FileText className="size-3.5" />
                              <span>Ficha</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
                                >
                                  <Printer className="size-3.5" />
                                  <span>Imprimir</span>
                                  <ChevronRight className="size-3 opacity-70 rotate-90" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                  onClick={() => handleAbrirImpresion(consulta, 'informe')}
                                  className="cursor-pointer gap-2 py-1.5 text-xs"
                                >
                                  <FileText className="size-3.5 text-sky-500" />
                                  <span>Informe Médico</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAbrirImpresion(consulta, 'receta')}
                                  className="cursor-pointer gap-2 py-1.5 text-xs"
                                >
                                  <Pill className="size-3.5 text-emerald-500" />
                                  <span>Receta Médica (Rx)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAbrirImpresion(consulta, 'estudios')}
                                  className="cursor-pointer gap-2 py-1.5 text-xs"
                                >
                                  <FlaskConical className="size-3.5 text-violet-500" />
                                  <span>Orden de Estudios</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAbrirImpresion(consulta, 'reposo')}
                                  className="cursor-pointer gap-2 py-1.5 text-xs"
                                >
                                  <BedDouble className="size-3.5 text-amber-500" />
                                  <span>Reposo Médico</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAbrirImpresion(consulta, 'constancia')}
                                  className="cursor-pointer gap-2 py-1.5 text-xs"
                                >
                                  <FileCheck2 className="size-3.5 text-indigo-500" />
                                  <span>Constancia de Asistencia</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ═════════════════════════════════════════════════════════════════
           ── VISTA TARJETAS MODERNAS (viewMode === 'cards') ──
           ═════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
          {consultas.map((consulta) => {
            const hasPreconsulta = Boolean(consulta.preconsulta);
            const isPreconsultaCompletada = consulta.preconsulta?.estado === 'completada';
            const waitStatus = getWaitTimeStatus(consulta.fecha_consulta);
            const cleanPhone = consulta.paciente?.telefono ? consulta.paciente.telefono.replace(/\D/g, '') : '';

            return (
              <Card
                key={consulta.id}
                className={cn(
                  'group relative overflow-hidden transition-all duration-200 border-border/80 hover:shadow-md hover:border-primary/40 flex flex-col justify-between',
                  currentTab === 'en-consulta' && 'border-primary/40 bg-primary/5'
                )}
              >
                {/* Franja superior con color de especialidad / médico */}
                <div
                  className="h-1.5 w-full shrink-0"
                  style={{ backgroundColor: consulta.medico?.color_calendario || consulta.especialidad?.color || (currentTab === 'sala-espera' ? '#f59e0b' : currentTab === 'atendidas' ? '#10b981' : '#0d9488') }}
                />

                <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  {/* Fila Superior: Hora, Código y Semáforo */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span className="font-bold text-foreground text-xs">
                        {formatHora(consulta.fecha_consulta)}
                      </span>
                      {consulta.codigo && (
                        <span className="font-mono text-[10px] text-muted-foreground pl-1">
                          #{consulta.codigo}
                        </span>
                      )}
                    </div>

                    {currentTab === 'sala-espera' && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border',
                          waitStatus.badgeClass
                        )}
                        title={`Tiempo en espera: ${waitStatus.text}`}
                      >
                        <span className={cn('size-1.5 rounded-full', waitStatus.dotClass)} />
                        <span>{waitStatus.text}</span>
                      </span>
                    )}

                    {currentTab === 'en-consulta' && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[10.5px] py-0 px-2 font-bold animate-pulse">
                        En Atención
                      </Badge>
                    )}

                    {currentTab === 'atendidas' && (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-2 font-semibold">
                        Finalizada
                      </Badge>
                    )}
                  </div>

                  {/* Sección del Paciente */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenPatientRecord(consulta.paciente)}
                      className="size-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center border border-teal-500/25 shrink-0 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                      title="Ver expediente clínico"
                    >
                      {consulta.paciente
                        ? getInitials(`${consulta.paciente.nombres} ${consulta.paciente.apellidos}`)
                        : 'PA'}
                    </button>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPatientRecord(consulta.paciente)}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors text-left truncate block cursor-pointer"
                      >
                        {consulta.paciente
                          ? `${consulta.paciente.nombres} ${consulta.paciente.apellidos}`
                          : 'Paciente no identificado'}
                      </button>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        {(consulta.paciente?.documento_identidad || consulta.paciente?.numero_documento) && (
                          <span>
                            {consulta.paciente.tipo_documento || 'V'}-
                            {consulta.paciente.documento_identidad || consulta.paciente.numero_documento}
                          </span>
                        )}
                        <span>•</span>
                        <span>{calculateAge(consulta.paciente?.fecha_nacimiento, consulta.paciente?.edad)}</span>
                      </div>
                      {consulta.paciente?.telefono && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-mono font-medium pt-0.5"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <Phone className="size-2.5" />
                          <span>{consulta.paciente.telefono}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Médico y Especialidad */}
                  <div className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                        <Stethoscope className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">
                          {consulta.medico
                            ? `Dr(a). ${consulta.medico.nombres} ${consulta.medico.apellidos}`
                            : 'Especialista'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium shrink-0">
                        {consulta.especialidad?.nombre || 'General'}
                      </Badge>
                    </div>
                    {consulta.sucursal?.nombre && (
                      <span className="text-[10.5px] text-muted-foreground block truncate">
                        Sede: {consulta.sucursal.nombre}
                      </span>
                    )}
                  </div>

                  {/* Motivo y Preconsulta */}
                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Motivo de consulta:
                      </span>
                      <p className="text-xs font-medium text-foreground/90 line-clamp-2 mt-0.5">
                        {consulta.motivo_consulta || 'Consulta de rutina / Control'}
                      </p>
                    </div>

                    {/* Preconsulta / Resumen */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {hasPreconsulta ? (
                        isPreconsultaCompletada ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPreconsulta(consulta);
                              setPreconsultaDrawerOpen(true);
                            }}
                            className="h-6 text-[10.5px] px-2 gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-semibold cursor-pointer"
                          >
                            <ClipboardList className="size-3 text-emerald-600" />
                            <span>Preconsulta Lista</span>
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="h-5 text-[10px] gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2"
                            >
                              <Hourglass className="size-2.5" />
                              <span>Triaje Pendiente</span>
                            </Badge>
                            {consulta.preconsulta?.token && (
                              <button
                                type="button"
                                onClick={() => handleCopyPreconsultaLink(consulta.preconsulta!.token)}
                                className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Copiar link"
                              >
                                <Copy className="size-3" />
                              </button>
                            )}
                          </div>
                        )
                      ) : null}

                      {currentTab === 'atendidas' && (
                        <>
                          {consulta.receta_medica && consulta.receta_medica.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                              <Pill className="size-2.5 text-emerald-600" />
                              <span>{consulta.receta_medica.length} Rx</span>
                            </Badge>
                          )}
                          {consulta.estudios_solicitados && consulta.estudios_solicitados.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                              <FlaskConical className="size-2.5 text-violet-600" />
                              <span>{consulta.estudios_solicitados.length} Est.</span>
                            </Badge>
                          )}
                          {consulta.reposo_medico?.requiere_reposo && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              <BedDouble className="size-2.5 text-amber-600" />
                              <span>{consulta.reposo_medico.dias_reposo}d Reposo</span>
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Barra inferior de acciones */}
                  <div className="pt-2 border-t border-border/60">
                    {currentTab === 'sala-espera' && (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleLlamarConsultorio(consulta)}
                          className="h-8.5 text-xs px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer flex-1"
                        >
                          <Stethoscope className="size-3.5" />
                          <span>Llamar a Consultorio</span>
                          <ChevronRight className="size-3 opacity-70" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8.5 w-8.5 shrink-0 cursor-pointer">
                              <MoreVertical className="size-3.5" />
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
                                <ClipboardList className="mr-2 size-3.5 text-emerald-500" />
                                Ver Preconsulta
                              </DropdownMenuItem>
                            )}
                            {consulta.preconsulta?.token && (
                              <DropdownMenuItem
                                onClick={() => handleCopyPreconsultaLink(consulta.preconsulta!.token)}
                              >
                                <Copy className="mr-2 size-3.5" />
                                Copiar Link Preconsulta
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAnularConsulta(consulta)}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="mr-2 size-3.5" />
                              Anular Consulta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {currentTab === 'en-consulta' && (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/clinica/consultas/${consulta.id}/atencion`)}
                          className="h-8.5 text-xs px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs cursor-pointer flex-1"
                        >
                          <Stethoscope className="size-3.5" />
                          <span>Atender Paciente</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDevolverSalaEspera(consulta)}
                          className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Devolver a sala de espera"
                        >
                          <CornerUpLeft className="size-3 mr-1" />
                          <span>A Espera</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8.5 w-8.5 shrink-0 cursor-pointer">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/clinica/consultas/${consulta.id}/atencion`)}
                            >
                              <Stethoscope className="mr-2 size-3.5 text-primary" />
                              Abrir Consulta
                            </DropdownMenuItem>
                            {isPreconsultaCompletada && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPreconsulta(consulta);
                                  setPreconsultaDrawerOpen(true);
                                }}
                              >
                                <ClipboardList className="mr-2 size-3.5 text-emerald-500" />
                                Ver Preconsulta
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleFinalizarConsulta(consulta)}
                            >
                              <CheckCircle2 className="mr-2 size-3.5 text-emerald-600" />
                              Finalización Rápida
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAnularConsulta(consulta)}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="mr-2 size-3.5" />
                              Anular Consulta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {currentTab === 'atendidas' && (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clinica/consultas/${consulta.id}/detalle`)}
                          className="h-8.5 text-xs px-3 border-primary/30 text-primary hover:bg-primary/5 font-semibold gap-1.5 cursor-pointer flex-1"
                        >
                          <FileText className="size-3.5" />
                          <span>Ver Ficha</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8.5 text-xs px-3 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
                            >
                              <Printer className="size-3.5" />
                              <span>Imprimir</span>
                              <ChevronRight className="size-3 opacity-70 rotate-90" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={() => handleAbrirImpresion(consulta, 'informe')}
                              className="cursor-pointer gap-2 py-1.5 text-xs"
                            >
                              <FileText className="size-3.5 text-sky-500" />
                              <span>Informe Médico</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAbrirImpresion(consulta, 'receta')}
                              className="cursor-pointer gap-2 py-1.5 text-xs"
                            >
                              <Pill className="size-3.5 text-emerald-500" />
                              <span>Receta Médica (Rx)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAbrirImpresion(consulta, 'estudios')}
                              className="cursor-pointer gap-2 py-1.5 text-xs"
                            >
                              <FlaskConical className="size-3.5 text-violet-500" />
                              <span>Orden de Estudios</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAbrirImpresion(consulta, 'reposo')}
                              className="cursor-pointer gap-2 py-1.5 text-xs"
                            >
                              <BedDouble className="size-3.5 text-amber-500" />
                              <span>Reposo Médico</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAbrirImpresion(consulta, 'constancia')}
                              className="cursor-pointer gap-2 py-1.5 text-xs"
                            >
                              <FileCheck2 className="size-3.5 text-indigo-500" />
                              <span>Constancia de Asistencia</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
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

      {/* ── MODAL DE IMPRESIÓN DE DOCUMENTOS CLÍNICOS (INFORME, RECETA, ESTUDIOS, REPOSO, ASISTENCIA) ── */}
      <DocumentosImpresionModal
        open={impresionModalOpen}
        onOpenChange={setImpresionModalOpen}
        consulta={consultaParaImprimir}
        initialDocumento={documentoInicialImpresion}
      />

      {/* ── DRAWER DE EXPEDIENTE / FICHA DEL PACIENTE ── */}
      <PatientRecordDrawer
        open={recordDrawerOpen}
        onOpenChange={setRecordDrawerOpen}
        paciente={patientForRecord}
      />
    </div>
  );
};

