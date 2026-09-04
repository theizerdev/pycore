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
  Filter,
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
  List,
  UserCheck,
  Building2,
  FlaskConical,
  Activity,
  HeartPulse,
  Info,
  RefreshCw,
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

  // Carga inicial
  const fetchData = async () => {
    try {
      setLoading(true);
      const [serviciosRes, especialidadesRes] = await Promise.all([
        serviciosApi.list({ sucursal_id: sucursalActiva?.id }),
        especialidadesApi.list({ activo: true, sucursal_id: sucursalActiva?.id }),
      ]);
      setServicios(serviciosRes);
      setEspecialidades(especialidadesRes);
    } catch (error) {
      console.error('Error cargando servicios y especialidades:', error);
      toast.error('No se pudieron cargar los servicios médicos');
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
      // Filtro especialidad
      if (selectedEspecialidadId !== 'all' && s.especialidad_id !== selectedEspecialidadId) {
        return false;
      }
      // Filtro categoría
      if (selectedCategoria !== 'all' && s.categoria !== selectedCategoria) {
        return false;
      }
      // Filtro estado
      if (statusFilter === 'active' && !s.activo) return false;
      if (statusFilter === 'inactive' && s.activo) return false;
      // Búsqueda
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

  // Métricas rápidas
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
        toast.success('Servicio médico actualizado correctamente');
      } else {
        const created = await serviciosApi.create(formData);
        setServicios((prev) => [created, ...prev]);
        toast.success('Servicio médico creado exitosamente');
      }
      setModalOpen(false);
    } catch (error: any) {
      console.error('Error guardando servicio:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar el servicio');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle rápido de estado Activo/Inactivo
  const handleToggleActivo = async (servicio: Servicio) => {
    try {
      const updated = await serviciosApi.update(servicio.id, { activo: !servicio.activo });
      setServicios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(
        `Servicio ${updated.activo ? 'activado' : 'inactivado'} correctamente`
      );
    } catch (error) {
      toast.error('Error al cambiar el estado del servicio');
    }
  };

  // Confirmar eliminación
  const handleDeleteConfirm = async () => {
    if (!servicioToDelete) return;
    try {
      setSubmitting(true);
      await serviciosApi.delete(servicioToDelete.id);
      setServicios((prev) => prev.filter((s) => s.id !== servicioToDelete.id));
      toast.success('Servicio médico eliminado exitosamente');
      setDeleteModalOpen(false);
      setServicioToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar el servicio');
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
      toast.success('Catálogo de servicios sugeridos generado con éxito');
    } catch (error: any) {
      console.error('Error generando servicios sugeridos:', error);
      toast.error(error.response?.data?.detail || 'Error al generar servicios sugeridos');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── CABECERA PRINCIPAL ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Servicios Médicos
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Catálogo de prestaciones, consultas, estudios y procedimientos según cada especialidad médica
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasPermission('servicios.crear') && (
            <>
              <Button
                variant="outline"
                onClick={handleSeedDefaults}
                disabled={seeding || loading}
                className="gap-2 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
              >
                <Sparkles className={cn('h-4 w-4 text-amber-500', seeding && 'animate-spin')} />
                <span>{seeding ? 'Generando...' : 'Generar Sugeridos'}</span>
              </Button>

              <Button
                onClick={handleOpenCreate}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Servicio</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── TARJETAS DE ESTADÍSTICAS RÁPIDAS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Servicios</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Prestaciones registradas</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Servicios Activos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.activos}</p>
          <p className="text-[10px] text-muted-foreground">Disponibles para citas y facturación</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Especialidades</span>
            <Stethoscope className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {stats.especialidadesConServicios} / {especialidades.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Especialidades con catálogo asignado</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tarifa Promedio</span>
            <DollarSign className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono">
            {formatMoney(stats.precioPromedio)}
          </p>
          <p className="text-[10px] text-muted-foreground">Costo base promedio por servicio</p>
        </div>
      </div>

      {/* ── BARRA DE PESTAÑAS POR ESPECIALIDAD MÉDICA ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-primary" />
            Filtrar por Especialidad Médica:
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedEspecialidadId('all')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 cursor-pointer',
              selectedEspecialidadId === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
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
                  'px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
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

      {/* ── BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar servicio por nombre, código o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filtro de Categoría */}
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            >
              <option value="all">Todas las Categorías</option>
              {CATEGORIAS_SERVICIOS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Filtro de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>
        </div>

        {/* Toggle de Vista Grid / Table */}
        <div className="flex items-center gap-1 self-end md:self-auto border border-border/80 p-1 rounded-xl bg-muted/30">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0 cursor-pointer"
            title="Vista en Tarjetas"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => setViewMode('table')}
            className="h-7 w-7 p-0 cursor-pointer"
            title="Vista en Tabla"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL: GRID / TABLE / EMPTY ── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-semibold">Cargando catálogo de servicios...</p>
        </div>
      ) : filteredServicios.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border/80 rounded-2xl bg-card/40 space-y-3 p-6">
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary inline-block">
            <Layers className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-foreground">No se encontraron servicios médicos</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || selectedEspecialidadId !== 'all' || selectedCategoria !== 'all'
                ? 'No hay servicios que coincidan con los filtros seleccionados. Intente ajustar los criterios de búsqueda.'
                : 'Aún no se han registrado servicios en esta empresa. Puede generar el catálogo sugerido automáticamente o crear uno nuevo.'}
            </p>
          </div>
          {hasPermission('servicios.crear') && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Generar Servicios Sugeridos</span>
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="gap-2 bg-primary text-primary-foreground text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Servicio</span>
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── VISTA CUADRÍCULA DE TARJETAS ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServicios.map((s) => {
            const esp = s.especialidad;
            const catObj = CATEGORIAS_SERVICIOS.find((c) => c.id === s.categoria);

            return (
              <div
                key={s.id}
                className={cn(
                  'rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between gap-4 relative overflow-hidden group',
                  !s.activo && 'opacity-65 bg-muted/20'
                )}
              >
                {/* Indicador de Color lateral */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-1.5"
                  style={{ backgroundColor: s.color || esp?.color || '#0ea5e9' }}
                />

                <div className="space-y-2.5 pl-1.5">
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
                      <Stethoscope className="h-3 w-3" />
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                        {s.nombre}
                      </h4>
                    </div>
                    {s.codigo && (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded mt-1 inline-block">
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
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span className="line-clamp-2">
                        <strong>Preparación:</strong> {s.preparacion_requerida}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta: Precio, Duración y Acciones */}
                <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3 pl-1.5">
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
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.duracion_estimada_minutos} min
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 border-l border-border/80 pl-2">
                      {hasPermission('servicios.editar') && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActivo(s)}
                            className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            title={s.activo ? 'Desactivar servicio' : 'Activar servicio'}
                          >
                            {s.activo ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-zinc-400" />
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(s)}
                            className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-primary"
                            title="Editar servicio"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {hasPermission('servicios.eliminar') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setServicioToDelete(s);
                            setDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-red-500"
                          title="Eliminar servicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VISTA TABLA DE DATOS ── */
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
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
                          <Stethoscope className="h-3 w-3" />
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
                          {hasPermission('servicios.editar') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActivo(s)}
                                className="h-7 w-7 p-0 cursor-pointer"
                                title={s.activo ? 'Desactivar' : 'Activar'}
                              >
                                {s.activo ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(s)}
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-primary"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {hasPermission('servicios.eliminar') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setServicioToDelete(s);
                                setDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
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
              <select
                required
                value={formData.especialidad_id}
                onChange={(e) => {
                  const espId = Number(e.target.value);
                  const espObj = especialidades.find((x) => x.id === espId);
                  setFormData({
                    ...formData,
                    especialidad_id: espId,
                    color: espObj?.color || formData.color,
                  });
                }}
                className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              >
                <option value={0} disabled>
                  -- Seleccione la Especialidad Médica --
                </option>
                {especialidades.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nombre} {esp.codigo ? `(${esp.codigo})` : ''}
                  </option>
                ))}
              </select>
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
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                >
                  {CATEGORIAS_SERVICIOS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Tarifa / Precio Base ($) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                    $
                  </span>
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
                    className="pl-7 text-xs h-9 font-mono font-bold"
                  />
                </div>
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
                <Info className="h-3.5 w-3.5 text-amber-500" />
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
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={formData.requiere_medico}
                  onChange={(e) => setFormData({ ...formData, requiere_medico: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-[11px]">
                  <p className="font-bold text-foreground">Requiere Médico</p>
                  <p className="text-muted-foreground text-[10px]">Asigna especialista en cita</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-[11px]">
                  <p className="font-bold text-foreground">Servicio Activo</p>
                  <p className="text-muted-foreground text-[10px]">Visible para citas y caja</p>
                </div>
              </label>
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm cursor-pointer"
              >
                {submitting ? 'Guardando...' : editingServicio ? 'Actualizar Servicio' : 'Crear Servicio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md p-6 bg-background border-border shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 shrink-0">
              <AlertCircle className="h-6 w-6" />
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
