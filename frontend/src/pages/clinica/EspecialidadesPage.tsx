import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { especialidadesApi } from '../../api/especialidades';
import { sucursalesApi } from '../../api/sucursales';
import type { Especialidad, EspecialidadCreateInput, EspecialidadUpdateInput, Sucursal } from '../../types';
import { toast } from 'sonner';
import {
  Stethoscope,
  Plus,
  Search,
  Building2,
  MapPin,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Activity,
  HeartPulse,
  Baby,
  Eye,
  Bone,
  Brain,
  ShieldCheck,
  Apple,
  Smile,
  Syringe,
  Pill,
  Thermometer,
  Layers,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  AlertCircle,
  Sliders
} from 'lucide-react';
import { EspecialidadPlantillaModal } from './EspecialidadPlantillaModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '../../components/ui/card';

// Catálogo de iconos clínicos disponibles
const CLINICAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope,
  HeartPulse,
  Activity,
  Baby,
  Eye,
  Bone,
  Brain,
  ShieldCheck,
  Apple,
  Smile,
  Syringe,
  Pill,
  Thermometer,
  Sparkles
};

// Paleta de colores clínicos predeterminados
const PRESET_COLORS = [
  { name: 'Teal Quirúrgico', hex: '#0d9488' },
  { name: 'Azul Médico', hex: '#0ea5e9' },
  { name: 'Cobalto Institucional', hex: '#3b82f6' },
  { name: 'Rosa Pediátrico', hex: '#ec4899' },
  { name: 'Púrpura Ginecológico', hex: '#a855f7' },
  { name: 'Rojo Cardiológico', hex: '#ef4444' },
  { name: 'Naranja Traumatología', hex: '#f97316' },
  { name: 'Verde Nutrición', hex: '#10b981' },
  { name: 'Índigo Neurológico', hex: '#6366f1' },
  { name: 'Cyan Odontológico', hex: '#06b6d4' },
];

export const EspecialidadesPage: React.FC = () => {
  const { user, sucursalActiva, hasPermission } = useAuth();

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursalesList, setSucursalesList] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEspecialidad, setEditingEspecialidad] = useState<Especialidad | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal confirmación eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Especialidad | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Modal Plantilla Clínica Dinámica
  const [plantillaModalOpen, setPlantillaModalOpen] = useState<boolean>(false);
  const [selectedEspForPlantilla, setSelectedEspForPlantilla] = useState<Especialidad | null>(null);

  const handleOpenPlantilla = (esp: Especialidad) => {
    setSelectedEspForPlantilla(esp);
    setPlantillaModalOpen(true);
  };

  // Form State
  const [formData, setFormData] = useState<{
    nombre: string;
    codigo: string;
    descripcion: string;
    color: string;
    icono: string;
    activo: boolean;
    sucursal_id: string; // "global" o id string
  }>({
    nombre: '',
    codigo: '',
    descripcion: '',
    color: '#0d9488',
    icono: 'Stethoscope',
    activo: true,
    sucursal_id: 'global'
  });

  const canCreate = hasPermission('especialidades.crear');
  const canEdit = hasPermission('especialidades.editar');
  const canDelete = hasPermission('especialidades.eliminar');

  const fetchEspecialidades = async () => {
    setLoading(true);
    try {
      const data = await especialidadesApi.list({
        sucursal_id: branchFilter === 'all' ? undefined : Number(branchFilter),
        include_global: true
      });
      setEspecialidades(data);
    } catch (err: any) {
      toast.error('Error al cargar especialidades médicas', {
        description: err.response?.data?.detail || 'No se pudo conectar con el servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspecialidades();
  }, [branchFilter]);

  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const data = await sucursalesApi.list();
        setSucursalesList(data);
      } catch {
        if (user?.sucursales_asignadas) {
          setSucursalesList(user.sucursales_asignadas.map((a: any) => a.sucursal).filter(Boolean));
        }
      }
    };
    fetchSucursales();
  }, [user]);

  // Filtrado reactivo en memoria
  const filteredEspecialidades = useMemo(() => {
    return especialidades.filter((item) => {
      // 1. Filtro texto
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.nombre.toLowerCase().includes(q) ||
        (item.codigo && item.codigo.toLowerCase().includes(q)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(q));

      // 2. Filtro estado
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? item.activo
          : !item.activo;

      return matchesSearch && matchesStatus;
    });
  }, [especialidades, searchQuery, statusFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = especialidades.length;
    const active = especialidades.filter((e) => e.activo).length;
    const inCurrentBranch = sucursalActiva
      ? especialidades.filter((e) => !e.sucursal_id || e.sucursal_id === sucursalActiva.id).length
      : total;
    const globalCount = especialidades.filter((e) => !e.sucursal_id).length;

    return { total, active, inCurrentBranch, globalCount };
  }, [especialidades, sucursalActiva]);

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setEditingEspecialidad(null);
    setFormData({
      nombre: '',
      codigo: '',
      descripcion: '',
      color: '#0d9488',
      icono: 'Stethoscope',
      activo: true,
      sucursal_id: sucursalActiva?.id ? String(sucursalActiva.id) : 'global'
    });
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (esp: Especialidad) => {
    setEditingEspecialidad(esp);
    setFormData({
      nombre: esp.nombre,
      codigo: esp.codigo || '',
      descripcion: esp.descripcion || '',
      color: esp.color || '#0d9488',
      icono: esp.icono || 'Stethoscope',
      activo: esp.activo,
      sucursal_id: esp.sucursal_id ? String(esp.sucursal_id) : 'global'
    });
    setIsModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la especialidad es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const payloadSucursalId =
        formData.sucursal_id === 'global' ? null : Number(formData.sucursal_id);

      if (editingEspecialidad) {
        const updatePayload: EspecialidadUpdateInput = {
          nombre: formData.nombre.trim(),
          codigo: formData.codigo.trim() || null,
          descripcion: formData.descripcion.trim() || null,
          color: formData.color,
          icono: formData.icono,
          activo: formData.activo,
          sucursal_id: payloadSucursalId
        };
        const updated = await especialidadesApi.update(editingEspecialidad.id, updatePayload);
        setEspecialidades((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success(`Especialidad '${updated.nombre}' actualizada exitosamente`);
      } else {
        const createPayload: EspecialidadCreateInput = {
          nombre: formData.nombre.trim(),
          codigo: formData.codigo.trim() || null,
          descripcion: formData.descripcion.trim() || null,
          color: formData.color,
          icono: formData.icono,
          activo: formData.activo,
          sucursal_id: payloadSucursalId
        };
        const created = await especialidadesApi.create(createPayload);
        setEspecialidades((prev) => [created, ...prev]);
        toast.success(`Especialidad '${created.nombre}' creada con éxito`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error('Error al guardar especialidad', {
        description: err.response?.data?.detail || 'Ocurrió un error inesperado'
      });
    } finally {
      setSaving(false);
    }
  };

  // Alternar Estado Activo Rápido
  const handleToggleActivo = async (esp: Especialidad) => {
    if (!canEdit) return;
    try {
      const updated = await especialidadesApi.update(esp.id, { activo: !esp.activo });
      setEspecialidades((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(
        `Especialidad ${updated.activo ? 'activada' : 'desactivada'} correctamente`
      );
    } catch (err: any) {
      toast.error('No se pudo cambiar el estado de la especialidad');
    }
  };

  // Confirmar Eliminación
  const handleDeleteClick = (esp: Especialidad) => {
    setItemToDelete(esp);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await especialidadesApi.delete(itemToDelete.id);
      setEspecialidades((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      toast.success(`Especialidad '${itemToDelete.nombre}' eliminada`);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error('Error al eliminar especialidad', {
        description: err.response?.data?.detail || 'No se pudo eliminar el registro'
      });
    } finally {
      setDeleting(false);
    }
  };

  // Cargar Catálogo Sugerido
  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      const targetBranch = sucursalActiva?.id || null;
      const res = await especialidadesApi.seedDefaults(targetBranch);
      setEspecialidades(res);
      toast.success('Catálogo sugerido de especialidades cargado con éxito');
    } catch (err: any) {
      toast.error('Error al cargar catálogo predeterminado', {
        description: err.response?.data?.detail || 'Ocurrió un error al poblar'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (iconName?: string | null, color?: string | null) => {
    const Component = (iconName && CLINICAL_ICONS[iconName]) ? CLINICAL_ICONS[iconName] : Stethoscope;
    return <Component className="size-5" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── CABECERA Y ACCIONES SUPERIORES ────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Especialidades Médicas</span>
                <Badge variant="outline" className="text-xs font-mono font-medium border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5">
                  MEDISOFT Clínico
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Catálogo asistencial, asignación por sedes hospitalarias y colores para turnero y citas
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canCreate && especialidades.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              className="border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer"
            >
              <Sparkles className="size-4 mr-1.5 text-teal-500" />
              <span>Cargar Sugeridas</span>
            </Button>
          )}

          {canCreate && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="size-4 mr-1.5" />
              <span>Nueva Especialidad</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── TARJETAS KPI DE RESUMEN ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Registradas</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Activas en Servicio</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {sucursalActiva ? 'En esta Sede' : 'Por Sedes'}
              </p>
              <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">{stats.inCurrentBranch}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <MapPin className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sede Global</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.globalCount}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ──────────────────────────────── */}
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

          {/* Filtro por Estado */}
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos los Estados</SelectItem>
              <SelectItem value="active" className="text-xs">Solo Activas</SelectItem>
              <SelectItem value="inactive" className="text-xs">Solo Inactivas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Sede */}
          {sucursalesList.length > 0 && (
            <Select value={branchFilter} onValueChange={(val) => setBranchFilter(val)}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Filtrar por Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todas las Sedes / Global</SelectItem>
                {sucursalesList.map((s: Sucursal) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Selector de Modo Vista y Recargar */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchEspecialidades}
            className="size-9 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Recargar especialidades"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/30">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="size-7 cursor-pointer"
              title="Vista en tarjetas"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('table')}
              className="size-7 cursor-pointer"
              title="Vista en tabla"
            >
              <ListIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL: GRID O TABLA ────────────────────────── */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80">
          <RefreshCw className="size-8 animate-spin text-primary opacity-60" />
          <p className="text-xs text-muted-foreground font-medium">Cargando especialidades médicas...</p>
        </div>
      ) : filteredEspecialidades.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/30 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Stethoscope className="size-6" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-bold text-base text-foreground">No se encontraron especialidades</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Ninguna especialidad coincide con los filtros aplicados.'
                : 'Aún no hay especialidades registradas en este centro médico.'}
            </p>
          </div>
          {canCreate && (
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={handleOpenCreate} className="cursor-pointer">
                <Plus className="size-4 mr-1.5" />
                Registrar Especialidad
              </Button>
              <Button variant="outline" size="sm" onClick={handleSeedDefaults} className="cursor-pointer">
                <Sparkles className="size-4 mr-1.5 text-teal-500" />
                Cargar Catálogo Sugerido
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── MODO GRID DE TARJETAS ──────────────────────────────────── */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEspecialidades.map((esp) => {
            const cardColor = esp.color || '#0d9488';
            return (
              <Card
                key={esp.id}
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/80 hover:border-primary/40 flex flex-col justify-between"
              >
                {/* Indicador de Color Superior */}
                <div
                  className="h-1.5 w-full transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: cardColor }}
                />

                <CardHeader className="p-4 pb-2 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Icono con fondo tonal */}
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${cardColor}15`,
                        color: cardColor,
                        border: `1px solid ${cardColor}30`
                      }}
                    >
                      {renderIcon(esp.icono, cardColor)}
                    </div>

                    {/* Sede y Código */}
                    <div className="flex flex-col items-end gap-1">
                      {esp.codigo && (
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-border bg-muted/40">
                          {esp.codigo}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 flex items-center gap-1 font-normal text-muted-foreground"
                      >
                        <MapPin className="size-2.5" />
                        <span>{esp.sucursal?.nombre || 'Todas las Sedes'}</span>
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <CardTitle className="text-base font-bold text-foreground leading-snug line-clamp-1">
                      {esp.nombre}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
                      {esp.descripcion || 'Sin descripción adicional registrada.'}
                    </CardDescription>
                  </div>
                </CardHeader>

                {/* Footer de Tarjeta: Switch y Acciones */}
                <CardContent className="p-4 pt-2 border-t border-border/40 mt-2 flex items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={esp.activo}
                      onCheckedChange={() => handleToggleActivo(esp)}
                      disabled={!canEdit}
                      aria-label="Estado activo"
                    />
                    <span className={`text-[11px] font-semibold ${esp.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {esp.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPlantilla(esp)}
                      className="h-7 text-[10px] sm:text-[11px] px-2 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer font-medium"
                      title="Configurar preguntas de preconsulta y campos de consulta"
                    >
                      <Sliders className="size-3 mr-1 text-teal-600 dark:text-teal-400" />
                      <span>Plantilla</span>
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(esp)}
                        className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Editar especialidad"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(esp)}
                        className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Eliminar especialidad"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── MODO TABLA COMPACTA ────────────────────────────────────── */
        <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Especialidad</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Sede Asignada</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEspecialidades.map((esp) => {
                  const cardColor = esp.color || '#0d9488';
                  return (
                    <tr key={esp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs"
                            style={{
                              backgroundColor: `${cardColor}18`,
                              color: cardColor,
                              border: `1px solid ${cardColor}35`
                            }}
                          >
                            {renderIcon(esp.icono, cardColor)}
                          </div>
                          <span>{esp.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {esp.codigo || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px] font-normal flex items-center gap-1 w-fit">
                          <MapPin className="size-2.5" />
                          <span>{esp.sucursal?.nombre || 'Todas las Sedes (Global)'}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {esp.descripcion || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Switch
                            checked={esp.activo}
                            onCheckedChange={() => handleToggleActivo(esp)}
                            disabled={!canEdit}
                          />
                          <span className={`text-[11px] font-medium ${esp.activo ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}`}>
                            {esp.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPlantilla(esp)}
                            className="h-6 text-[10px] px-2 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer font-medium"
                            title="Configurar Plantilla Clínica"
                          >
                            <Sliders className="size-3 mr-1 text-teal-600 dark:text-teal-400" />
                            <span>Plantilla</span>
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(esp)}
                              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(esp)}
                              className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
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
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR ESPECIALIDAD ───────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${formData.color}20`,
                  color: formData.color
                }}
              >
                {renderIcon(formData.icono, formData.color)}
              </div>
              <span>{editingEspecialidad ? 'Editar Especialidad Médica' : 'Nueva Especialidad Médica'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete los campos para configurar la especialidad en el centro de salud y turnero.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSubmit} className="space-y-4 py-2">
            {/* Nombre y Código */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="esp-nombre" className="text-xs font-semibold">
                  Nombre de Especialidad <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="esp-nombre"
                  required
                  placeholder="Ej. Cardiología Clínica"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="esp-codigo" className="text-xs font-semibold">
                  Código Interno
                </Label>
                <Input
                  id="esp-codigo"
                  placeholder="Ej. CARD-01"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* Sede Asignada */}
            <div className="space-y-1.5">
              <Label htmlFor="esp-sucursal" className="text-xs font-semibold flex items-center justify-between">
                <span>Sede / Sucursal Asignada</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (Opcional - Dejar en Global si aplica a toda la red)
                </span>
              </Label>
              <Select
                value={formData.sucursal_id}
                onValueChange={(val) => setFormData({ ...formData, sucursal_id: val })}
              >
                <SelectTrigger id="esp-sucursal" className="h-9 text-xs">
                  <SelectValue placeholder="Seleccione sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global" className="text-xs font-semibold text-primary">
                    🌐 Todas las Sedes (Global de la Institución)
                  </SelectItem>
                  {sucursalesList.map((s: Sucursal) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      🏢 {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Color Clínico */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Color Distintivo (Agenda & Turnero)</span>
                <span className="font-mono text-[10px] text-muted-foreground">{formData.color}</span>
              </Label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.hex })}
                    className={`size-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      formData.color === c.hex ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {formData.color === c.hex && <CheckCircle2 className="size-3.5 text-white drop-shadow-sm" />}
                  </button>
                ))}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="size-7 rounded-full border border-border cursor-pointer bg-transparent"
                  title="Color personalizado"
                />
              </div>
            </div>

            {/* Selector de Icono Clínico */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Icono Representativo</Label>
              <div className="grid grid-cols-7 gap-1.5 p-2 rounded-xl border border-border/80 bg-muted/20">
                {Object.keys(CLINICAL_ICONS).map((iconKey) => {
                  const IconComp = CLINICAL_ICONS[iconKey];
                  const isSelected = formData.icono === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setFormData({ ...formData, icono: iconKey })}
                      className={`flex size-9 items-center justify-center rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      title={iconKey}
                    >
                      <IconComp className="size-4.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="esp-desc" className="text-xs font-semibold">
                Descripción / Alcance Asistencial
              </Label>
              <Textarea
                id="esp-desc"
                rows={2}
                placeholder="Indique las patologías tratadas, servicios o directrices para pacientes..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            {/* Switch de Estado Activo */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">Estado Activo</Label>
                <p className="text-[11px] text-muted-foreground">
                  Habilita la especialidad para ser asignada a médicos, citas y consultas
                </p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="size-4 animate-spin mr-1.5" />
                    Guardando...
                  </>
                ) : editingEspecialidad ? (
                  'Actualizar Especialidad'
                ) : (
                  'Crear Especialidad'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN ─────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <span>Confirmar Eliminación</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              ¿Está seguro de que desea eliminar la especialidad médica{' '}
              <strong className="text-foreground">'{itemToDelete?.nombre}'</strong>? Esta acción no se puede deshacer y puede afectar historiales o médicos vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="cursor-pointer"
            >
              {deleting ? 'Eliminando...' : 'Sí, Eliminar Especialidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CONFIGURACIÓN DE PLANTILLA CLÍNICA DINÁMICA ──────────── */}
      <EspecialidadPlantillaModal
        open={plantillaModalOpen}
        onOpenChange={setPlantillaModalOpen}
        especialidad={selectedEspForPlantilla}
        onSaved={fetchEspecialidades}
      />
    </div>
  );
};
