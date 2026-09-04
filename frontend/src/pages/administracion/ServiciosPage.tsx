import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRegional } from '../../context/RegionalContext';
import { serviciosApi } from '../../api/servicios';
import { especialidadesApi } from '../../api/especialidades';
import type { Servicio, ServicioCreateInput, Especialidad } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
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
import {
  Layers,
  Plus,
  Search,
  Stethoscope,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Activity,
  Info,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const CATEGORIAS_SERVICIOS = [
  { id: 'Consulta', label: 'Consulta Médica', color: 'text-sky-600 bg-sky-500/10 border-sky-500/30' },
  { id: 'Procedimiento', label: 'Procedimiento Clínico', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'Estudio Diagnóstico', label: 'Estudio / Examen Diagnóstico', color: 'text-violet-600 bg-violet-500/10 border-violet-500/30' },
  { id: 'Cirugía / Ambulatorio', label: 'Cirugía / Ambulatorio', color: 'text-rose-600 bg-rose-500/10 border-rose-500/30' },
  { id: 'Terapia / Rehabilitación', label: 'Terapia y Rehabilitación', color: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  { id: 'Laboratorio', label: 'Análisis de Laboratorio', color: 'text-teal-600 bg-teal-500/10 border-teal-500/30' },
  { id: 'Otro', label: 'Otro Servicio', color: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/30' },
];

export const ServiciosPage: React.FC = () => {
  const { hasPermission, sucursalActiva } = useAuth();
  const { formatMoney } = useRegional();

  const canCreate = hasPermission('servicios.crear');
  const canEdit = hasPermission('servicios.editar');
  const canDelete = hasPermission('servicios.eliminar');

  // Estados principales
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Filtros
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState<number | 'all'>('all');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ServicioCreateInput>({
    especialidad_id: 0,
    sucursal_id: null,
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'Consulta',
    precio_base: 0,
    duracion_estimada_minutos: 30,
    preparacion_requerida: '',
    requiere_medico: true,
    color: '#0ea5e9',
    activo: true,
  });

  // Carga de datos resiliente
  const fetchData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        serviciosApi.list({ sucursal_id: sucursalActiva?.id }),
        especialidadesApi.list({ activo: true, sucursal_id: sucursalActiva?.id }),
      ]);

      if (results[0].status === 'fulfilled') {
        setServicios(results[0].value || []);
      } else {
        console.error('Error cargando servicios:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        setEspecialidades(results[1].value || []);
      } else {
        console.error('Error cargando especialidades:', results[1].reason);
      }

      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        toast.error('No se pudieron cargar los servicios médicos');
      }
    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sucursalActiva?.id]);

  // Filtrado reactivo
  const filteredServicios = useMemo(() => {
    return servicios.filter((s) => {
      if (selectedEspecialidadId !== 'all' && s.especialidad_id !== selectedEspecialidadId) {
        return false;
      }
      if (selectedCategoria !== 'all' && s.categoria !== selectedCategoria) {
        return false;
      }
      if (statusFilter === 'active' && !s.activo) return false;
      if (statusFilter === 'inactive' && s.activo) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNombre = s.nombre.toLowerCase().includes(query);
        const matchCodigo = s.codigo?.toLowerCase().includes(query);
        const matchDesc = s.descripcion?.toLowerCase().includes(query);
        const matchEsp = s.especialidad?.nombre.toLowerCase().includes(query);
        if (!matchNombre && !matchCodigo && !matchDesc && !matchEsp) return false;
      }
      return true;
    });
  }, [servicios, selectedEspecialidadId, selectedCategoria, statusFilter, searchQuery]);

  // Conteo de servicios por especialidad para los tabs
  const especialidadCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    servicios.forEach((s) => {
      counts[s.especialidad_id] = (counts[s.especialidad_id] || 0) + 1;
    });
    return counts;
  }, [servicios]);

  // Métricas y KPIs
  const stats = useMemo(() => {
    const total = servicios.length;
    const activos = servicios.filter((s) => s.activo).length;
    const especialidadesConServicios = new Set(servicios.map((s) => s.especialidad_id)).size;
    const precioPromedio =
      total > 0 ? servicios.reduce((acc, curr) => acc + Number(curr.precio_base || 0), 0) / total : 0;

    return { total, activos, especialidadesConServicios, precioPromedio };
  }, [servicios]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    const defaultEspId =
      selectedEspecialidadId !== 'all'
        ? selectedEspecialidadId
        : especialidades.length > 0
        ? especialidades[0].id
        : 0;

    const espObj = especialidades.find((e) => e.id === defaultEspId);

    setEditingServicio(null);
    setFormData({
      especialidad_id: defaultEspId,
      sucursal_id: sucursalActiva?.id || null,
      codigo: espObj ? `SRV-${espObj.codigo || espObj.nombre.slice(0, 4).toUpperCase()}` : '',
      nombre: '',
      descripcion: '',
      categoria: 'Consulta',
      precio_base: 30,
      duracion_estimada_minutos: 30,
      preparacion_requerida: '',
      requiere_medico: true,
      color: espObj?.color || '#0ea5e9',
      activo: true,
    });
    setModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (servicio: Servicio) => {
    setEditingServicio(servicio);
    setFormData({
      especialidad_id: servicio.especialidad_id,
      sucursal_id: servicio.sucursal_id,
      codigo: servicio.codigo || '',
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      categoria: servicio.categoria || 'Consulta',
      precio_base: Number(servicio.precio_base) || 0,
      duracion_estimada_minutos: servicio.duracion_estimada_minutos || 30,
      preparacion_requerida: servicio.preparacion_requerida || '',
      requiere_medico: servicio.requiere_medico ?? true,
      color: servicio.color || '#0ea5e9',
      activo: servicio.activo ?? true,
    });
    setModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }
    if (!formData.especialidad_id) {
      toast.error('Debe seleccionar una especialidad médica');
      return;
    }

    try {
      setSubmitting(true);
      if (editingServicio) {
        const updated = await serviciosApi.update(editingServicio.id, formData);
        setServicios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success(`Servicio '${updated.nombre}' actualizado correctamente`);
      } else {
        const created = await serviciosApi.create(formData);
        setServicios((prev) => [created, ...prev]);
        toast.success(`Servicio '${created.nombre}' creado exitosamente`);
      }
      setModalOpen(false);
    } catch (error: any) {
      console.error('Error guardando servicio:', error);
      toast.error('Error al guardar servicio', {
        description: error.response?.data?.detail || 'Ocurrió un error inesperado',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle rápido de estado Activo/Inactivo
  const handleToggleActivo = async (servicio: Servicio) => {
    if (!canEdit) return;
    try {
      const updated = await serviciosApi.update(servicio.id, { activo: !servicio.activo });
      setServicios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(
        `Servicio '${servicio.nombre}' ${updated.activo ? 'activado' : 'inactivado'} correctamente`
      );
    } catch (error: any) {
      toast.error('No se pudo cambiar el estado del servicio', {
        description: error.response?.data?.detail || 'Error al actualizar el estado',
      });
    }
  };

  // Confirmar eliminación
  const handleDeleteConfirm = async () => {
    if (!servicioToDelete) return;
    try {
      setSubmitting(true);
      await serviciosApi.delete(servicioToDelete.id);
      setServicios((prev) => prev.filter((s) => s.id !== servicioToDelete.id));
      toast.success(`Servicio '${servicioToDelete.nombre}' eliminado exitosamente`);
      setDeleteModalOpen(false);
      setServicioToDelete(null);
    } catch (error: any) {
      toast.error('Error al eliminar servicio', {
        description: error.response?.data?.detail || 'No se pudo eliminar el registro',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Generar servicios sugeridos (Seed Defaults)
  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const res = await serviciosApi.seedDefaults(sucursalActiva?.id);
      setServicios(res);
      toast.success('Catálogo de servicios sugeridos sincronizado con éxito');
    } catch (error: any) {
      console.error('Error generando servicios sugeridos:', error);
      toast.error('Error al sincronizar servicios sugeridos', {
        description: error.response?.data?.detail || 'No se pudieron generar los servicios',
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── CABECERA Y ACCIONES SUPERIORES ────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs">
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Servicios</span>
                <Badge variant="outline" className="text-xs font-mono font-medium border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5">
                  MEDISOFT Clínico
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Catálogo de prestaciones, consultas, procedimientos y estudios clínicos por especialidad
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={seeding || loading}
              className="border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer text-xs"
            >
              <Sparkles className={cn('size-4 mr-1.5 text-teal-500', seeding && 'animate-spin')} />
              <span>{seeding ? 'Sincronizando...' : 'Sincronizar Catálogo Sugerido'}</span>
            </Button>
          )}

          {canCreate && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer text-xs"
            >
              <Plus className="size-4 mr-1.5" />
              <span>Nuevo Servicio</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── TARJETAS KPI DE RESUMEN ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Servicios</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Activos en Servicio</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.activos}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Especialidades</p>
              <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                {stats.especialidadesConServicios} / {especialidades.length}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Stethoscope className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tarifa Promedio</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                {formatMoney(stats.precioPromedio)}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRA DE PESTAÑAS POR ESPECIALIDAD MÉDICA ─────────────────── */}
      {especialidades.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="size-3.5 text-primary" />
              Filtrar por Especialidad Médica:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedEspecialidadId('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 cursor-pointer',
                selectedEspecialidadId === 'all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border/80'
              )}
            >
              <span>Todas las Especialidades</span>
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                  selectedEspecialidadId === 'all'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {servicios.length}
              </span>
            </button>

            {especialidades.map((esp) => {
              const count = especialidadCounts[esp.id] || 0;
              const isSelected = selectedEspecialidadId === esp.id;
              return (
                <button
                  key={esp.id}
                  type="button"
                  onClick={() => setSelectedEspecialidadId(esp.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 cursor-pointer',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border/80'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: esp.color || '#0ea5e9' }}
                  />
                  <span>{esp.nombre}</span>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS ──────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-2xs md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Filtro por Categoría */}
          <Select value={selectedCategoria} onValueChange={(val) => setSelectedCategoria(val)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todas las Categorías</SelectItem>
              {CATEGORIAS_SERVICIOS.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Estado */}
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos los Estados</SelectItem>
              <SelectItem value="active" className="text-xs">Solo Activos</SelectItem>
              <SelectItem value="inactive" className="text-xs">Solo Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle de Vista Grid / Table */}
        <div className="flex items-center gap-1 border border-border/80 p-1 rounded-xl bg-muted/30 shrink-0 self-end md:self-auto">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0 cursor-pointer"
            title="Vista en Tarjetas"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => setViewMode('table')}
            className="h-7 w-7 p-0 cursor-pointer"
            title="Vista en Tabla"
          >
            <ListIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL: GRID / TABLE / EMPTY ────────────────── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="size-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-semibold">Cargando catálogo de servicios...</p>
        </div>
      ) : filteredServicios.length === 0 ? (
        <Card className="border-2 border-dashed border-border/80 bg-card/40">
          <CardContent className="py-16 text-center space-y-3 p-6">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs mx-auto">
              <Layers className="size-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-foreground">No se encontraron servicios médicos</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery || selectedEspecialidadId !== 'all' || selectedCategoria !== 'all'
                  ? 'No hay servicios que coincidan con los filtros seleccionados. Intente ajustar los criterios de búsqueda.'
                  : 'Aún no se han registrado servicios en esta empresa. Puede generar el catálogo sugerido automáticamente o crear uno nuevo.'}
              </p>
            </div>
            {canCreate && (
              <div className="pt-2 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="gap-2 text-xs font-semibold cursor-pointer border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                >
                  <Sparkles className="size-4 text-teal-500" />
                  <span>Sincronizar Catálogo Sugerido</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="gap-2 bg-primary text-primary-foreground text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Nuevo Servicio</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ── VISTA CUADRÍCULA DE TARJETAS ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServicios.map((s) => {
            const esp = s.especialidad;
            const catObj = CATEGORIAS_SERVICIOS.find((c) => c.id === s.categoria);

            return (
              <Card
                key={s.id}
                className={cn(
                  'border-border/60 bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between relative overflow-hidden group',
                  !s.activo && 'opacity-65 bg-muted/20'
                )}
              >
                {/* Indicador de Color superior/lateral */}
                <div
                  className="h-1.5 w-full shrink-0"
                  style={{ backgroundColor: s.color || esp?.color || '#0ea5e9' }}
                />

                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {/* Fila superior: Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1"
                        style={{
                          backgroundColor: `${esp?.color || '#0ea5e9'}15`,
                          color: esp?.color || '#0ea5e9',
                          borderColor: `${esp?.color || '#0ea5e9'}30`,
                        }}
                      >
                        <Stethoscope className="size-3" />
                        {esp?.nombre || 'Especialidad'}
                      </span>

                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                          catObj?.color || 'bg-muted text-muted-foreground'
                        )}
                      >
                        {s.categoria}
                      </span>
                    </div>

                    {/* Nombre y Código */}
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                        {s.nombre}
                      </h4>
                      {s.codigo && (
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded mt-1 inline-block">
                          {s.codigo}
                        </span>
                      )}
                    </div>

                    {/* Descripción */}
                    {s.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {s.descripcion}
                      </p>
                    )}

                    {/* Preparación requerida si existe */}
                    {s.preparacion_requerida && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                        <Info className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span className="line-clamp-2">
                          <strong>Preparación:</strong> {s.preparacion_requerida}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pie de tarjeta: Precio, Duración y Acciones */}
                  <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3 mt-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Tarifa Base</span>
                      <p className="text-base font-black text-foreground font-mono">
                        {formatMoney(Number(s.precio_base) || 0)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Duración</span>
                        <p className="text-xs font-bold text-foreground flex items-center justify-end gap-1">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {s.duracion_estimada_minutos} min
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 border-l border-border/80 pl-2">
                        {canEdit && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActivo(s)}
                              className="size-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                              title={s.activo ? 'Desactivar servicio' : 'Activar servicio'}
                            >
                              {s.activo ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <XCircle className="size-4 text-zinc-400" />
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(s)}
                              className="size-8 p-0 cursor-pointer text-muted-foreground hover:text-primary"
                              title="Editar servicio"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                          </>
                        )}

                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setServicioToDelete(s);
                              setDeleteModalOpen(true);
                            }}
                            className="size-8 p-0 cursor-pointer text-muted-foreground hover:text-red-500"
                            title="Eliminar servicio"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── VISTA TABLA DE DATOS ── */
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Código / Servicio</th>
                  <th className="py-3 px-4">Especialidad</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Tarifa Base</th>
                  <th className="py-3 px-4 text-center">Duración</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredServicios.map((s) => {
                  const esp = s.especialidad;
                  const catObj = CATEGORIAS_SERVICIOS.find((c) => c.id === s.categoria);

                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        !s.activo && 'opacity-60 bg-muted/10'
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-xs">{s.nombre}</div>
                        {s.codigo && (
                          <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                            {s.codigo}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${esp?.color || '#0ea5e9'}15`,
                            color: esp?.color || '#0ea5e9',
                            borderColor: `${esp?.color || '#0ea5e9'}30`,
                          }}
                        >
                          <Stethoscope className="size-3" />
                          {esp?.nombre || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                            catObj?.color || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {s.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-foreground">
                        {formatMoney(Number(s.precio_base) || 0)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-muted-foreground">
                        {s.duracion_estimada_minutos} min
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={s.activo ? 'default' : 'secondary'}
                          className={cn(
                            'text-[10px]',
                            s.activo
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                          )}
                        >
                          {s.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActivo(s)}
                                className="size-7 p-0 cursor-pointer"
                                title={s.activo ? 'Desactivar' : 'Activar'}
                              >
                                {s.activo ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="size-3.5 text-zinc-400" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(s)}
                                className="size-7 p-0 cursor-pointer text-muted-foreground hover:text-primary"
                                title="Editar"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setServicioToDelete(s);
                                setDeleteModalOpen(true);
                              }}
                              className="size-7 p-0 cursor-pointer text-muted-foreground hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ──────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <Layers className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingServicio ? 'Editar Servicio Médico' : 'Nuevo Servicio Médico'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure los datos clínicos, tarifas y requerimientos del servicio por especialidad
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Especialidad Médica Asignada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Especialidad Médica <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.especialidad_id || '')}
                onValueChange={(val) => {
                  const espId = Number(val);
                  const espObj = especialidades.find((x) => x.id === espId);
                  setFormData({
                    ...formData,
                    especialidad_id: espId,
                    color: espObj?.color || formData.color,
                  });
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="-- Seleccione la Especialidad Médica --" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp.id} value={String(esp.id)} className="text-xs">
                      {esp.nombre} {esp.codigo ? `(${esp.codigo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nombre del Servicio y Código */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Nombre del Servicio <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="text"
                  placeholder="Ej. Ecocardiograma Doppler Transtorácico"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Código Interno</Label>
                <Input
                  type="text"
                  placeholder="Ej. SRV-CARD-01"
                  value={formData.codigo || ''}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Categoría y Tarifa Base */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Categoría del Servicio</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_SERVICIOS.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Tarifa / Precio Base <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.00"
                  value={formData.precio_base}
                  onChange={(e) =>
                    setFormData({ ...formData, precio_base: parseFloat(e.target.value) || 0 })
                  }
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>
            </div>

            {/* Duración Estimada y Botones Rápidos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Duración Estimada (Minutos)
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono font-bold">
                  {formData.duracion_estimada_minutos} minutos
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[15, 20, 30, 45, 60, 90].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setFormData({ ...formData, duracion_estimada_minutos: dur })}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                      formData.duracion_estimada_minutos === dur
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border'
                    )}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Descripción Clínica</Label>
              <Textarea
                rows={2}
                placeholder="Detalle o alcance de la prestación médica..."
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="text-xs"
              />
            </div>

            {/* Preparación Requerida para el Paciente */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-amber-500" />
                Indicaciones Previas / Preparación del Paciente
              </Label>
              <Textarea
                rows={2}
                placeholder="Ej. Ayuno de 8 horas, traer estudios anteriores, vejiga llena para ecografía..."
                value={formData.preparacion_requerida || ''}
                onChange={(e) => setFormData({ ...formData, preparacion_requerida: e.target.value })}
                className="text-xs"
              />
            </div>

            {/* Toggles: Requiere Médico y Estado Activo */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-foreground cursor-pointer">Requiere Médico</Label>
                  <p className="text-[10px] text-muted-foreground">Asigna especialista en cita</p>
                </div>
                <Switch
                  checked={formData.requiere_medico}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiere_medico: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-foreground cursor-pointer">Servicio Activo</Label>
                  <p className="text-[10px] text-muted-foreground">Visible para citas y caja</p>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
              </div>
            </div>

            <DialogFooter className="p-4 -mx-5 -mb-5 mt-4 border-t border-border/70 bg-muted/20 flex sm:justify-between items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs cursor-pointer"
              >
                {submitting ? 'Guardando...' : editingServicio ? 'Actualizar Servicio' : 'Crear Servicio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ──────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md p-6 bg-background border-border shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                ¿Eliminar Servicio Médico?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                ¿Está seguro de que desea eliminar el servicio{' '}
                <strong className="text-foreground font-bold">{servicioToDelete?.nombre}</strong>? Esta
                acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>

          <DialogFooter className="mt-4 flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={submitting}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={submitting}
              className="font-bold cursor-pointer"
            >
              {submitting ? 'Eliminando...' : 'Sí, Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiciosPage;
