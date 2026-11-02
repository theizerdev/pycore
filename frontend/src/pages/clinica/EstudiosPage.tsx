import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  ExternalLink,
  Sparkles,
  Calendar,
  Filter,
  User,
  Stethoscope,
  X,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Clock,
  Layers,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  estudiosApi,
  type EstudioItemResponse,
  type EstudioStats,
  type ListarEstudiosParams,
} from '../../api/estudios';
import { pacientesApi } from '../../api/pacientes';
import type { Paciente } from '../../types';
import { EstudioDetalleModal } from '../../components/clinica/EstudioDetalleModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { cn, getLocalDateString } from '../../lib/utils';

export const EstudiosPage: React.FC = () => {
  // Estados de datos
  const [estudios, setEstudios] = useState<EstudioItemResponse[]>([]);
  const [stats, setStats] = useState<EstudioStats>({
    total: 0,
    laboratorio: 0,
    imagenologia: 0,
    con_alertas: 0,
    pendientes: 0,
    revisados: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 12;

  // Filtros
  const [categoriaTab, setCategoriaTab] = useState<string>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Visor y Detalle inteligente
  const [selectedEstudioId, setSelectedEstudioId] = useState<number | null>(null);
  const [modalViewerOpen, setModalViewerOpen] = useState<boolean>(false);

  // Modal de Subida / Nuevo Estudio
  const [modalUploadOpen, setModalUploadOpen] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);

  // Formulario nuevo estudio
  const [pacienteSearch, setPacienteSearch] = useState<string>('');
  const [pacientesList, setPacientesList] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [titulo, setTitulo] = useState<string>('');
  const [categoria, setCategoria] = useState<'laboratorio' | 'imagenologia' | 'informe' | 'otro'>('laboratorio');
  const [subtipo, setSubtipo] = useState<string>('');
  const [fechaEstudio, setFechaEstudio] = useState<string>(getLocalDateString());
  const [notas, setNotas] = useState<string>('');
  const [archivoBase64, setArchivoBase64] = useState<string>('');
  const [archivoNombre, setArchivoNombre] = useState<string>('');
  const [archivoTipo, setArchivoTipo] = useState<string>('');
  const [archivoTamano, setArchivoTamano] = useState<number>(0);

  // Modal confirmación eliminar
  const [estudioAEliminar, setEstudioAEliminar] = useState<EstudioItemResponse | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Debounce para búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga de estudios con filtros
  const fetchEstudios = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListarEstudiosParams = {
        page: currentPage,
        page_size: pageSize,
      };
      if (categoriaTab !== 'todos') params.categoria = categoriaTab;
      if (estadoFiltro !== 'todos') params.estado_analisis = estadoFiltro;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const res = await estudiosApi.listarGlobal(params);
      setEstudios(res.items);
      setTotalItems(res.total);
      setTotalPages(res.total_pages);
      if (res.stats) setStats(res.stats);
    } catch (err: any) {
      toast.error('No se pudieron cargar los estudios complementarios');
    } finally {
      setLoading(false);
    }
  }, [currentPage, categoriaTab, estadoFiltro, debouncedSearch, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchEstudios();
  }, [fetchEstudios]);

  // Búsqueda de pacientes para el modal de subida
  useEffect(() => {
    if (!modalUploadOpen) return;
    const fetchPacientes = async () => {
      try {
        const res = await pacientesApi.list({ q: pacienteSearch, limit: 10 });
        setPacientesList(res);
      } catch (e) {
        console.error(e);
      }
    };
    const t = setTimeout(fetchPacientes, 300);
    return () => clearTimeout(t);
  }, [pacienteSearch, modalUploadOpen]);

  // Manejador de selección de archivo local
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('El archivo excede el límite máximo de 15 MB.');
      return;
    }

    setArchivoNombre(file.name);
    setArchivoTipo(file.type || 'application/octet-stream');
    setArchivoTamano(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setArchivoBase64(base64String);
      if (!titulo) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitulo(nameWithoutExt.replace(/[-_]/g, ' '));
      }
    };
    reader.onerror = () => {
      toast.error('Error al procesar el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  // Guardar nuevo estudio
  const handleGuardarNuevoEstudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente) {
      toast.error('Por favor selecciona el paciente al que corresponde el estudio.');
      return;
    }
    if (!titulo.trim()) {
      toast.error('Por favor escribe el título del examen o informe.');
      return;
    }
    if (!archivoBase64) {
      toast.error('Debes adjuntar el archivo físico o digital del estudio (PDF o Imagen).');
      return;
    }

    setUploadLoading(true);
    try {
      await estudiosApi.crear({
        paciente_id: selectedPaciente.id,
        titulo: titulo.trim(),
        categoria,
        subtipo: subtipo.trim() || undefined,
        fecha_estudio: fechaEstudio,
        notas: notas.trim() || undefined,
        archivo_url: archivoBase64,
        archivo_nombre: archivoNombre,
        archivo_tipo: archivoTipo,
        archivo_tamano: archivoTamano,
      });

      toast.success('Estudio cargado y procesado por el bot clínico con éxito.');
      setModalUploadOpen(false);
      resetUploadForm();
      fetchEstudios();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar el nuevo estudio');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedPaciente(null);
    setPacienteSearch('');
    setTitulo('');
    setCategoria('laboratorio');
    setSubtipo('');
    setFechaEstudio(getLocalDateString());
    setNotas('');
    setArchivoBase64('');
    setArchivoNombre('');
    setArchivoTipo('');
    setArchivoTamano(0);
  };

  // Abrir visor
  const handleOpenViewer = (estudioId: number) => {
    setSelectedEstudioId(estudioId);
    setModalViewerOpen(true);
  };

  // Ejecutar eliminación
  const handleConfirmEliminar = async () => {
    if (!estudioAEliminar) return;
    setDeleteLoading(true);
    try {
      await estudiosApi.eliminar(estudioAEliminar.id);
      toast.success('Estudio eliminado con éxito');
      setDeleteConfirmOpen(false);
      setEstudioAEliminar(null);
      fetchEstudios();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar el estudio');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Formato de tamaño
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. CABECERA PRINCIPAL DEL MÓDULO                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden border border-teal-500/20">
        <div className="absolute -right-8 -bottom-8 size-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="size-13 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner shrink-0">
            <FlaskConical className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Centro de Estudios Clínicos & Laboratorio
              </h1>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30 text-[10px] font-semibold uppercase tracking-wider">
                IA Asistencial
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Recepción centralizada de exámenes paraclínicos, químicas sanguíneas, radiografías, ecografías y biopsias con análisis inteligente de biomarcadores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEstudios}
            disabled={loading}
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white gap-2 font-medium"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            <span>Actualizar</span>
          </Button>

          <Button
            onClick={() => setModalUploadOpen(true)}
            size="sm"
            className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold gap-2 shadow-lg shadow-teal-500/20"
          >
            <Plus className="size-4" />
            <span>Cargar Estudio</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TARJETAS DE ESTADÍSTICAS RÁPIDAS                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="size-5" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-foreground tracking-tight">{stats.total}</span>
            <p className="text-xs font-medium text-muted-foreground">Total de Estudios</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-foreground tracking-tight">{stats.laboratorio}</span>
            <p className="text-xs font-medium text-muted-foreground">Laboratorios</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ImageIcon className="size-5" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-foreground tracking-tight">{stats.imagenologia}</span>
            <p className="text-xs font-medium text-muted-foreground">Imagenología & Ecos</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">{stats.con_alertas}</span>
            <p className="text-xs font-medium text-muted-foreground">Alertas Clínicas</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PESTAÑAS POR CATEGORÍA Y BARRA DE FILTROS                              */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/60 pb-3">
          {/* Tabs Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos', icon: Layers, count: stats.total },
              { id: 'laboratorio', label: 'Laboratorios', icon: FlaskConical, count: stats.laboratorio },
              { id: 'imagenologia', label: 'Imagenología', icon: ImageIcon, count: stats.imagenologia },
              { id: 'informe', label: 'Informes & Biopsias', icon: FileCheck2 },
              { id: 'otro', label: 'Otros', icon: FileText },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = categoriaTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCategoriaTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                    isActive
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconComp className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selector Estado Análisis */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Filter className="size-3.5" />
              <span>Estado:</span>
            </Label>
            <Select
              value={estadoFiltro}
              onValueChange={(val) => {
                setEstadoFiltro(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[195px] h-9 text-xs rounded-xl font-medium">
                <SelectValue placeholder="Todos los Estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Estados</SelectItem>
                <SelectItem value="analizado_alterado">⚠️ Con Valores Alterados</SelectItem>
                <SelectItem value="analizado_normal">✅ Analizado Normal</SelectItem>
                <SelectItem value="pendiente">⏳ Pendiente de Análisis</SelectItem>
                <SelectItem value="revisado_medico">👨‍⚕️ Revisado por Médico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Buscador y Rango de Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 lg:col-span-6 relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título de estudio, nombre de paciente o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3 lg:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Desde:</span>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div className="sm:col-span-3 lg:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Hasta:</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs h-9 rounded-xl"
            />
            {(fechaDesde || fechaHasta) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                  setCurrentPage(1);
                }}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-rose-500"
                title="Limpiar fechas"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLA DE ESTUDIOS PARACLÍNICOS                                         */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px] border-b border-border">
              <tr>
                <th className="py-3.5 px-4">Estudio & Categoría</th>
                <th className="py-3.5 px-4">Paciente</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Médico / Consulta</th>
                <th className="py-3.5 px-4 text-center">Estado IA</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="size-6 animate-spin text-teal-600" />
                      <span className="font-medium text-xs">Cargando estudios y análisis clínicos...</span>
                    </div>
                  </td>
                </tr>
              ) : estudios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FlaskConical className="size-10 text-muted-foreground/40" />
                      <p className="font-semibold text-sm text-foreground">No se encontraron estudios</p>
                      <p className="text-xs max-w-sm">
                        No hay exámenes registrados con los filtros aplicados. Puedes cargar un nuevo estudio con el botón superior.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                estudios.map((estudio) => {
                  const isLab = estudio.categoria === 'laboratorio';
                  const isImg = estudio.categoria === 'imagenologia';
                  const hasAlerts = estudio.estado_analisis === 'analizado_alterado';
                  const isNormal = estudio.estado_analisis === 'analizado_normal';
                  const isPending = estudio.estado_analisis === 'pendiente';
                  const isReviewed = estudio.estado_analisis === 'revisado_medico';

                  return (
                    <tr
                      key={estudio.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => handleOpenViewer(estudio.id)}
                    >
                      {/* Estudio & Categoría */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "size-9 rounded-xl flex items-center justify-center shrink-0 border",
                              isLab
                                ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                                : isImg
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            )}
                          >
                            {isLab ? (
                              <FlaskConical className="size-4.5" />
                            ) : isImg ? (
                              <ImageIcon className="size-4.5" />
                            ) : (
                              <FileText className="size-4.5" />
                            )}
                          </div>
                          <div className="flex flex-col truncate max-w-xs sm:max-w-sm">
                            <span className="font-bold text-foreground text-xs truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {estudio.titulo}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <span className="capitalize font-medium">{estudio.categoria}</span>
                              {estudio.subtipo && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{estudio.subtipo}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatFileSize(estudio.archivo_tamano)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{estudio.paciente_nombre}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {estudio.paciente_documento || 'Sin doc'}
                          </span>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-medium">
                        {estudio.fecha_estudio}
                      </td>

                      {/* Médico / Consulta */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-medium text-foreground">
                            {estudio.medico_nombre || 'Sin médico asignado'}
                          </span>
                          {estudio.consulta_codigo ? (
                            <span className="text-teal-600 dark:text-teal-400 font-mono">
                              Consulta {estudio.consulta_codigo}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Externo / Recepción</span>
                          )}
                        </div>
                      </td>

                      {/* Estado IA */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {hasAlerts && (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] font-bold gap-1">
                            <AlertTriangle className="size-3" />
                            <span>{estudio.alertas_detectadas?.length || 1} Alteración(es)</span>
                          </Badge>
                        )}
                        {isNormal && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold gap-1">
                            <CheckCircle2 className="size-3" />
                            <span>Valores Normales</span>
                          </Badge>
                        )}
                        {isPending && (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold gap-1">
                            <Clock className="size-3" />
                            <span>Pendiente</span>
                          </Badge>
                        )}
                        {isReviewed && (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold gap-1">
                            <Stethoscope className="size-3" />
                            <span>Revisado</span>
                          </Badge>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenViewer(estudio.id)}
                            className="size-8 p-0 text-muted-foreground hover:text-teal-600 hover:bg-teal-500/10"
                            title="Ver detalle y biomarcadores"
                          >
                            <Eye className="size-4" />
                          </Button>

                          {estudio.archivo_url && (
                            <a
                              href={estudio.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors"
                              title="Abrir archivo original"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEstudioAEliminar(estudio);
                              setDeleteConfirmOpen(true);
                            }}
                            className="size-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            title="Eliminar estudio"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando {estudios.length} de {totalItems} estudios
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="size-8 p-0"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="font-semibold px-2 text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="size-8 p-0"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL DE SUBIDA / NUEVO ESTUDIO                                        */}
      {/* ========================================================================= */}
      <Dialog open={modalUploadOpen} onOpenChange={setModalUploadOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="size-5 text-teal-600" />
              <span>Cargar Nuevo Estudio Clínico o Laboratorio</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adjunta informes, resultados de química sanguínea o imágenes diagnósticas. El Asistente Clínico procesará automáticamente los analitos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuardarNuevoEstudio} className="space-y-4 pt-2">
            {/* Selección de Paciente */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-teal-600" />
                <span>Paciente *</span>
              </label>
              {selectedPaciente ? (
                <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs">
                      {selectedPaciente.nombres.charAt(0)}
                      {selectedPaciente.apellidos.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">
                        {selectedPaciente.nombres} {selectedPaciente.apellidos}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {selectedPaciente.tipo_documento}-{selectedPaciente.documento_identidad}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPaciente(null)}
                    className="text-xs text-muted-foreground hover:text-rose-500 h-8 px-2"
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Escribe el nombre o documento del paciente..."
                    value={pacienteSearch}
                    onChange={(e) => setPacienteSearch(e.target.value)}
                    className="text-xs h-9 rounded-xl"
                  />
                  {pacientesList.length > 0 && (
                    <div className="border border-border rounded-xl max-h-36 overflow-y-auto divide-y divide-border bg-card">
                      {pacientesList.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPaciente(p);
                            setPacienteSearch('');
                          }}
                          className="p-2 text-xs hover:bg-muted/50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium text-foreground">
                            {p.nombres} {p.apellidos}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {p.tipo_documento}-{p.documento_identidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Categoría y Subtipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Categoría *</Label>
                <Select
                  value={categoria}
                  onValueChange={(val: any) => setCategoria(val)}
                >
                  <SelectTrigger className="w-full text-xs h-9 rounded-xl font-medium">
                    <SelectValue placeholder="Seleccione categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratorio">🔬 Laboratorio Clínico</SelectItem>
                    <SelectItem value="imagenologia">🩻 Imagenología / Ecografía</SelectItem>
                    <SelectItem value="informe">📄 Informe Médico / Biopsia</SelectItem>
                    <SelectItem value="otro">📎 Otro Estudio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Subtipo / Especialidad</Label>
                <Input
                  type="text"
                  placeholder="Ej. Hematología, Perfil Lipídico, Rx Tórax..."
                  value={subtipo}
                  onChange={(e) => setSubtipo(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Título y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Título del Estudio *</Label>
                <Input
                  type="text"
                  placeholder="Ej. Perfil 20 y Química Sanguínea"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-xs h-9 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Fecha Realización *</Label>
                <Input
                  type="date"
                  value={fechaEstudio}
                  onChange={(e) => setFechaEstudio(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Subida de Archivo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Archivo Adjunto (PDF o Imagen) *</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/20 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                  <Upload className="size-6 text-teal-600" />
                  {archivoNombre ? (
                    <div>
                      <p className="font-bold text-xs text-foreground">{archivoNombre}</p>
                      <p className="text-[11px] text-muted-foreground">{formatFileSize(archivoTamano)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Haz clic o arrastra el archivo aquí
                      </p>
                      <p className="text-[11px] text-muted-foreground">PDF, PNG, JPG hasta 15 MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notas Médicas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Notas / Observaciones Clínicas</Label>
              <Textarea
                rows={2}
                placeholder="Observaciones de la muestra, laboratorio externo emisor, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="text-xs rounded-xl min-h-[64px]"
              />
            </div>

            {/* Banner IA Informativo */}
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-2.5 text-xs text-teal-800 dark:text-teal-300">
              <Sparkles className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>
                El motor asistencial inteligente evaluará los analitos del examen según los rangos médicos de referencia automáticamente al guardar.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalUploadOpen(false)}
                disabled={uploadLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploadLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2"
              >
                {uploadLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Guardar y Analizar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL VISOR DETALLE INTELIGENTE (BOT CLÍNICO)                           */}
      {/* ========================================================================= */}
      {selectedEstudioId && (
        <EstudioDetalleModal
          estudioId={selectedEstudioId}
          open={modalViewerOpen}
          onClose={() => {
            setModalViewerOpen(false);
            setSelectedEstudioId(null);
            fetchEstudios();
          }}
          onEstudioUpdated={fetchEstudios}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. DIÁLOGO DE CONFIRMACIÓN PARA ELIMINAR                                  */}
      {/* ========================================================================= */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              <span>Confirmar Eliminación</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              ¿Estás seguro de que deseas eliminar permanentemente el estudio{' '}
              <strong className="text-foreground">{estudioAEliminar?.titulo}</strong> del paciente{' '}
              <strong className="text-foreground">{estudioAEliminar?.paciente_nombre}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmEliminar}
              disabled={deleteLoading}
              className="gap-1.5"
            >
              {deleteLoading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              <span>Eliminar Estudio</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EstudiosPage;

