import React, { useEffect, useState, useMemo } from 'react';
import type { Rol, Permiso } from '../../types';
import { rolesApi, permisosApi } from '../../api/roles';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  Shield,
  ShieldCheck,
  Plus,
  CheckCircle,
  MoreVertical,
  Pencil,
  ToggleRight,
  Trash2,
  Lock,
  RotateCcw,
  Search,
  Copy,
  Building2,
  Globe,
  Activity,
  Layers,
  Zap,
  X
} from 'lucide-react';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { StatCard } from '../../components/common/StatCard';
import { FilterBar, FilterField } from '../../components/common/FilterBar';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { DeleteConfirmationDialog } from '../../components/common/DeleteConfirmationDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

// Definición limpia de Sectores del Sistema
interface SectorConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ComponentType<{ className?: string }>;
  modulos: string[];
}

const SECTOR_DEFINITIONS: SectorConfig[] = [
  {
    id: 'organizacion',
    nombre: 'Organización',
    descripcion: 'Empresas, sedes y estructura institucional',
    icon: Building2,
    modulos: ['empresas', 'sucursales'],
  },
  {
    id: 'seguridad',
    nombre: 'Seguridad',
    descripcion: 'Directorio de usuarios, roles y control de acceso',
    icon: ShieldCheck,
    modulos: ['usuarios', 'roles', 'permisos'],
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    descripcion: 'Localización, países, monedas e impuestos',
    icon: Globe,
    modulos: ['paises'],
  },
  {
    id: 'monitoreo',
    nombre: 'Monitoreo',
    descripcion: 'Trazabilidad, sesiones activas, seguridad y salud del sistema',
    icon: Activity,
    modulos: ['auditoria', 'sesiones', 'seguridad_accesos', 'salud_sistema'],
  },
];

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  empresas: 'Empresas',
  sucursales: 'Sucursales / Sedes',
  usuarios: 'Directorio de Usuarios',
  roles: 'Roles & Perfiles',
  permisos: 'Catálogo de Permisos',
  paises: 'Países & Localización',
  auditoria: 'Bitácora de Auditoría',
  sesiones: 'Sesiones Activas',
  seguridad_accesos: 'Alertas & Accesos',
  salud_sistema: 'Salud del Sistema',
};

// Generador de etiquetas limpias y comprensibles para cada permiso
const getPermisoFriendlyLabel = (perm: Permiso): string => {
  if (perm.descripcion && perm.descripcion.trim().length > 3) {
    return perm.descripcion;
  }
  const mod = MODULE_DISPLAY_NAMES[perm.modulo.toLowerCase()] || perm.modulo;
  const accion = perm.accion.toLowerCase();

  switch (accion) {
    case 'ver':
      return `Ver y consultar ${mod.toLowerCase()}`;
    case 'crear':
      return `Registrar y crear ${mod.toLowerCase()}`;
    case 'editar':
      return `Modificar datos de ${mod.toLowerCase()}`;
    case 'eliminar':
      return `Eliminar ${mod.toLowerCase()}`;
    default:
      return `${accion.charAt(0).toUpperCase() + accion.slice(1)} ${mod.toLowerCase()}`;
  }
};

export const RolesPermisosPage: React.FC = () => {
  const { hasPermission, refreshUser } = useAuth();

  const [roles, setRoles] = useState<Rol[]>([]);
  const [allPermisos, setAllPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de tabla principal
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [perPageFilter, setPerPageFilter] = useState<number>(10);

  // Estados Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [saving, setSaving] = useState(false);

  // Sector activo y filtro en tiempo real dentro del modal
  const [activeSectorId, setActiveSectorId] = useState<string>('organizacion');
  const [permSearchTerm, setPermSearchTerm] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    activo: true,
    permisos_ids: [] as number[],
  });

  // Modal Eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rolToDelete, setRolToDelete] = useState<Rol | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesData, todosPermisos] = await Promise.all([
        rolesApi.list(),
        permisosApi.listTodos(),
      ]);
      setRoles(rolesData);
      setAllPermisos(todosPermisos);
    } catch (err) {
      console.error('Error cargando roles y permisos:', err);
      toast.error('Error al cargar datos de roles y permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Métricas
  const stats = useMemo(() => {
    const total = roles.length;
    const activos = roles.filter((r) => r.activo).length;
    const sistema = roles.filter((r) => r.es_sistema).length;
    return { total, activos, sistema };
  }, [roles]);

  // Filtrado de roles para DataTable
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchSearch =
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        typeFilter === 'todos' ||
        (typeFilter === 'sistema' && r.es_sistema) ||
        (typeFilter === 'personalizado' && !r.es_sistema);

      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && r.activo) ||
        (statusFilter === 'inactivos' && !r.activo);

      return matchSearch && matchType && matchStatus;
    });
  }, [roles, searchTerm, typeFilter, statusFilter]);

  // Agrupación de permisos por Sector -> Módulo
  const sectorsData = useMemo(() => {
    const modMap: Record<string, Permiso[]> = {};
    allPermisos.forEach((p) => {
      const m = p.modulo.toLowerCase();
      if (!modMap[m]) modMap[m] = [];
      modMap[m].push(p);
    });

    const handledModules = new Set<string>();

    const structured = SECTOR_DEFINITIONS.map((sector) => {
      const sectorModules = sector.modulos
        .filter((modKey) => !!modMap[modKey])
        .map((modKey) => {
          handledModules.add(modKey);
          return {
            key: modKey,
            nombre: MODULE_DISPLAY_NAMES[modKey] || modKey.charAt(0).toUpperCase() + modKey.slice(1),
            permisos: modMap[modKey],
          };
        });

      const totalSectorPerms = sectorModules.reduce((acc, m) => acc + m.permisos.length, 0);

      return {
        ...sector,
        modulosData: sectorModules,
        totalPermisos: totalSectorPerms,
      };
    }).filter((s) => s.modulosData.length > 0);

    // Módulos no clasificados
    const remaining = Object.keys(modMap).filter((m) => !handledModules.has(m));
    if (remaining.length > 0) {
      structured.push({
        id: 'otros',
        nombre: 'Otros Módulos',
        descripcion: 'Funcionalidades adicionales del sistema',
        icon: Layers,
        modulos: remaining,
        modulosData: remaining.map((m) => ({
          key: m,
          nombre: MODULE_DISPLAY_NAMES[m] || m,
          permisos: modMap[m],
        })),
        totalPermisos: remaining.reduce((acc, m) => acc + modMap[m].length, 0),
      });
    }

    return structured;
  }, [allPermisos]);

  // Sector activo actual
  const currentSector = useMemo(() => {
    return sectorsData.find((s) => s.id === activeSectorId) || sectorsData[0];
  }, [sectorsData, activeSectorId]);

  // Módulos filtrados por búsqueda dentro del sector activo
  const filteredModulesInActiveSector = useMemo(() => {
    if (!currentSector) return [];
    const term = permSearchTerm.trim().toLowerCase();

    return currentSector.modulosData
      .map((mod) => {
        if (!term) return mod;

        const modNameMatches = mod.nombre.toLowerCase().includes(term) || mod.key.toLowerCase().includes(term);
        const matchingPerms = mod.permisos.filter(
          (p) =>
            p.slug.toLowerCase().includes(term) ||
            p.accion.toLowerCase().includes(term) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(term))
        );

        if (modNameMatches) return mod;
        if (matchingPerms.length > 0) {
          return {
            ...mod,
            permisos: matchingPerms,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ key: string; nombre: string; permisos: Permiso[] }>;
  }, [currentSector, permSearchTerm]);

  // Estado global "Seleccionar todo el sistema"
  const isAllSystemSelected = allPermisos.length > 0 && formData.permisos_ids.length === allPermisos.length;

  const handleToggleSelectAllSystem = (checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        permisos_ids: allPermisos.map((p) => p.id),
      }));
      toast.success('Se han seleccionado todos los permisos del sistema');
    } else {
      setFormData((prev) => ({
        ...prev,
        permisos_ids: [],
      }));
      toast.info('Se han desmarcado todos los permisos');
    }
  };

  // Toggle todo el sector activo
  const isSectorAllSelected = useMemo(() => {
    if (!currentSector) return false;
    const sectorPermIds = currentSector.modulosData.flatMap((m) => m.permisos.map((p) => p.id));
    if (sectorPermIds.length === 0) return false;
    return sectorPermIds.every((id) => formData.permisos_ids.includes(id));
  }, [currentSector, formData.permisos_ids]);

  const handleToggleSelectSector = (checked: boolean) => {
    if (!currentSector) return;
    const sectorPermIds = currentSector.modulosData.flatMap((m) => m.permisos.map((p) => p.id));

    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          permisos_ids: Array.from(new Set([...prev.permisos_ids, ...sectorPermIds])),
        };
      } else {
        return {
          ...prev,
          permisos_ids: prev.permisos_ids.filter((id) => !sectorPermIds.includes(id)),
        };
      }
    });
  };

  // Toggle todo un módulo específico
  const handleToggleModule = (modPerms: Permiso[], selectAll: boolean) => {
    const modIds = modPerms.map((p) => p.id);
    setFormData((prev) => {
      if (selectAll) {
        return {
          ...prev,
          permisos_ids: Array.from(new Set([...prev.permisos_ids, ...modIds])),
        };
      } else {
        return {
          ...prev,
          permisos_ids: prev.permisos_ids.filter((id) => !modIds.includes(id)),
        };
      }
    });
  };

  // Toggle permiso individual
  const handleTogglePermiso = (permisoId: number) => {
    setFormData((prev) => {
      const exists = prev.permisos_ids.includes(permisoId);
      return {
        ...prev,
        permisos_ids: exists
          ? prev.permisos_ids.filter((id) => id !== permisoId)
          : [...prev.permisos_ids, permisoId],
      };
    });
  };

  // Presets Rápidos en 1 Clic
  const handleApplyPreset = (preset: 'total' | 'operador' | 'consulta' | 'limpiar') => {
    switch (preset) {
      case 'total':
        setFormData((prev) => ({ ...prev, permisos_ids: allPermisos.map((p) => p.id) }));
        toast.success('Control Total: Todos los permisos asignados');
        break;
      case 'operador': {
        const opIds = allPermisos
          .filter((p) => !p.accion.toLowerCase().includes('eliminar') && !p.slug.endsWith('.eliminar'))
          .map((p) => p.id);
        setFormData((prev) => ({ ...prev, permisos_ids: opIds }));
        toast.success('Perfil Operador asignado (Ver, Crear y Editar sin Eliminar)');
        break;
      }
      case 'consulta': {
        const readIds = allPermisos
          .filter((p) => p.accion.toLowerCase() === 'ver' || p.slug.endsWith('.ver'))
          .map((p) => p.id);
        setFormData((prev) => ({ ...prev, permisos_ids: readIds }));
        toast.success('Perfil Solo Lectura asignado');
        break;
      }
      case 'limpiar':
        setFormData((prev) => ({ ...prev, permisos_ids: [] }));
        toast.info('Permisos limpiados');
        break;
    }
  };

  // Modal Handlers
  const handleCreateClick = () => {
    setEditingRol(null);
    setFormData({
      nombre: '',
      slug: '',
      descripcion: '',
      activo: true,
      permisos_ids: [],
    });
    setActiveSectorId(sectorsData[0]?.id || 'organizacion');
    setPermSearchTerm('');
    setIsModalOpen(true);
  };

  const handleEditClick = (rol: Rol) => {
    setEditingRol(rol);
    setFormData({
      nombre: rol.nombre,
      slug: rol.slug,
      descripcion: rol.descripcion || '',
      activo: rol.activo,
      permisos_ids: rol.permisos.map((p) => p.id),
    });
    setActiveSectorId(sectorsData[0]?.id || 'organizacion');
    setPermSearchTerm('');
    setIsModalOpen(true);
  };

  const handleCloneClick = (rol: Rol) => {
    setEditingRol(null);
    setFormData({
      nombre: `Copia de ${rol.nombre}`,
      slug: `copia-${rol.slug}-${Date.now().toString().slice(-4)}`,
      descripcion: `Perfil duplicado basado en "${rol.nombre}". ${rol.descripcion || ''}`,
      activo: true,
      permisos_ids: rol.permisos.map((p) => p.id),
    });
    setActiveSectorId(sectorsData[0]?.id || 'organizacion');
    setPermSearchTerm('');
    setIsModalOpen(true);
    toast.info(`Rol duplicado listo para guardar.`);
  };

  const handleToggleStatus = async (rol: Rol) => {
    if (rol.es_sistema) {
      toast.warning('Los roles base del sistema no pueden ser desactivados.');
      return;
    }
    try {
      await rolesApi.update(rol.id, { activo: !rol.activo });
      toast.success(`Rol ${!rol.activo ? 'activado' : 'desactivado'} exitosamente`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado del rol');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre del rol es requerido');
      return;
    }

    setSaving(true);

    try {
      if (editingRol) {
        await rolesApi.update(editingRol.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          activo: formData.activo,
          permisos_ids: formData.permisos_ids,
        });
        toast.success('Rol y permisos actualizados exitosamente');
      } else {
        await rolesApi.create({
          nombre: formData.nombre,
          slug: formData.slug || formData.nombre.toLowerCase().replace(/\s+/g, '-'),
          descripcion: formData.descripcion,
          activo: formData.activo,
          permisos_ids: formData.permisos_ids,
        });
        toast.success('Nuevo rol creado exitosamente con sus permisos');
      }
      await refreshUser();
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al guardar el rol';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (rol: Rol) => {
    setRolToDelete(rol);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!rolToDelete) return;
    try {
      setDeleting(true);
      await rolesApi.delete(rolToDelete.id);
      toast.success('Rol eliminado exitosamente');
      setDeleteModalOpen(false);
      setRolToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar el rol');
    } finally {
      setDeleting(false);
    }
  };

  // Columnas de la Tabla Principal
  const columns: ColumnDef<Rol>[] = [
    {
      header: 'Rol / Perfil',
      accessorKey: 'nombre',
      sortable: true,
      className: 'font-medium',
      cell: (rol) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border',
              rol.es_sistema
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
                : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400'
            )}
          >
            {rol.es_sistema ? <Lock className="w-4.5 h-4.5" /> : <ShieldCheck className="w-4.5 h-4.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-foreground">{rol.nombre}</p>
              {rol.es_sistema && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  Sistema
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">
              {rol.descripcion || `Slug: ${rol.slug}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Permisos Sincronizados',
      sortable: true,
      cell: (rol) => {
        const count = rol.permisos?.length || 0;
        const total = allPermisos.length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div className="space-y-1.5 w-44">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground font-bold">
                {count} / {total} <span className="text-muted-foreground font-normal text-[11px]">activos</span>
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.2 rounded',
                  pct === 100
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : pct > 50
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {pct}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/40">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  pct === 100 ? 'bg-indigo-600' : pct > 50 ? 'bg-blue-600' : 'bg-sky-500'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Estado',
      sortable: true,
      accessorKey: 'activo',
      cell: (rol) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={rol.activo}
            disabled={rol.es_sistema}
            onCheckedChange={() => handleToggleStatus(rol)}
          />
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              rol.activo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
            )}
          >
            {rol.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (rol) => (
        <div className="flex justify-end gap-1">
          {hasPermission('roles.editar') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditClick(rol)}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs hover:border-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1">
              <DropdownMenuItem onClick={() => handleEditClick(rol)} className="cursor-pointer text-xs">
                <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Personalizar Permisos</span>
              </DropdownMenuItem>

              {hasPermission('roles.crear') && (
                <DropdownMenuItem onClick={() => handleCloneClick(rol)} className="cursor-pointer text-xs">
                  <Copy className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>Duplicar / Clonar Rol</span>
                </DropdownMenuItem>
              )}

              {!rol.es_sistema && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleToggleStatus(rol)} className="cursor-pointer text-xs">
                    <ToggleRight className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>{rol.activo ? 'Desactivar Rol' : 'Activar Rol'}</span>
                  </DropdownMenuItem>
                </>
              )}

              {hasPermission('roles.eliminar') && !rol.es_sistema && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(rol)}
                    className="text-destructive focus:text-destructive cursor-pointer text-xs"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    <span>Eliminar Rol</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <ModuleHeader
        icon={<ShieldCheck className="h-6 w-6 text-white" />}
        title="Roles & Permisos"
        description="Administración y asignación de permisos del sistema por sector y módulo."
        colorClassName="bg-indigo-600 dark:bg-indigo-700"
      >
        {hasPermission('roles.crear') && (
          <Button
            onClick={handleCreateClick}
            className="bg-white hover:bg-slate-100 text-indigo-800 font-semibold shadow-xs text-xs h-9 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Rol
          </Button>
        )}
      </ModuleHeader>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ShieldCheck className="h-6 w-6" />}
          title="TOTAL DE ROLES"
          value={stats.total}
          colorClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="ROLES ACTIVOS"
          value={stats.activos}
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<Lock className="h-6 w-6" />}
          title="ROLES DEL SISTEMA"
          value={stats.sistema}
          colorClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        />
      </div>

      {/* Barra de Filtros */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar Rol">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por rol, identificador, descripción..."
                className="w-full md:w-80 h-9 text-xs pl-8 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </FilterField>

          <FilterField label="Tipo de Rol">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-44 h-9 text-xs bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Tipos</SelectItem>
                <SelectItem value="sistema">Base del Sistema</SelectItem>
                <SelectItem value="personalizado">Personalizados</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Estado">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40 h-9 text-xs bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Registros por página">
            <Select
              value={String(perPageFilter)}
              onValueChange={(val) => setPerPageFilter(Number(val))}
            >
              <SelectTrigger className="w-full md:w-32 h-9 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {(searchTerm || typeFilter !== 'todos' || statusFilter !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('todos');
                setStatusFilter('todos');
              }}
              className="h-9 text-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Limpiar
            </Button>
          )}
        </div>
      </FilterBar>

      {/* DataTable */}
      <DataTable
        data={filteredRoles}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se encontraron roles registrados con los filtros aplicados."
      />

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL MATRIZ DE PERMISOS POR SECTOR Y MÓDULO (DISEÑO CLEAN WHITE) ──────── */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[940px] lg:max-w-[1040px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-card border shadow-2xl rounded-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            {/* 1. Header del Modal */}
            <div className="p-5 pb-4 border-b border-slate-100 dark:border-border flex items-center justify-between bg-white dark:bg-card pr-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shadow-2xs">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>{editingRol ? `Editar Rol` : 'Nuevo Rol'}</span>
                    {editingRol?.es_sistema && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                        Sistema
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Define el nombre del rol y personaliza los permisos del sistema por sector.
                  </DialogDescription>
                </div>
              </div>

              {/* Badge Contador de Permisos Activos con buen margen a la izquierda de la X */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300 text-xs font-bold font-mono shadow-2xs">
                <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {formData.permisos_ids.length} / {allPermisos.length} permisos activos
                </span>
              </div>
            </div>

            {/* 2. Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-card">
              {/* Fila de Inputs: Nombre del Rol & Filtro en Tiempo Real */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="input_rol_nombre" className="text-xs font-bold text-foreground">
                    Nombre del Rol <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="input_rol_nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        nombre: name,
                        slug: editingRol ? formData.slug : name.toLowerCase().replace(/\s+/g, '-'),
                      });
                    }}
                    placeholder="Ej: Administrador, Médico Especialista, Recepcionista"
                    className="h-10 text-xs bg-white dark:bg-background border-slate-200 dark:border-border font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="input_perm_search" className="text-xs font-bold text-foreground">
                    Filtrar Permisos en Tiempo Real
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="input_perm_search"
                      placeholder="Buscar por acción (ej: ver, crear, caja, ventas)..."
                      value={permSearchTerm}
                      onChange={(e) => setPermSearchTerm(e.target.value)}
                      className="h-10 text-xs pl-9 bg-white dark:bg-background border-slate-200 dark:border-border font-medium"
                    />
                    {permSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setPermSearchTerm('')}
                        className="absolute right-2.5 top-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra: Asignación de Permisos por Sector y Módulo + Toggle Seleccionar Todo el Sistema */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-border bg-slate-50/50 dark:bg-muted/20 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Asignación de Permisos por Sector y Módulo</span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Switch
                    id="switch_select_all_system"
                    checked={isAllSystemSelected}
                    onCheckedChange={handleToggleSelectAllSystem}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                  <Label
                    htmlFor="switch_select_all_system"
                    className="text-xs font-bold text-foreground cursor-pointer select-none"
                  >
                    Seleccionar todo el sistema
                  </Label>
                </div>
              </div>

              {/* Barra de Tabs por Sector con Contadores (Sin scrollbars feas) */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sectorsData.map((sector) => {
                  const sectorPermIds = sector.modulosData.flatMap((m) => m.permisos.map((p) => p.id));
                  const selectedCount = sectorPermIds.filter((id) =>
                    formData.permisos_ids.includes(id)
                  ).length;
                  const isActive = activeSectorId === sector.id;

                  return (
                    <button
                      key={sector.id}
                      type="button"
                      onClick={() => setActiveSectorId(sector.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer select-none',
                        isActive
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-bold shadow-2xs'
                          : 'bg-white dark:bg-card text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted border border-slate-200/80 dark:border-border'
                      )}
                    >
                      <span>{sector.nombre}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono',
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 dark:bg-muted dark:text-slate-300'
                        )}
                      >
                        {selectedCount}/{sector.totalPermisos}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Banner del Sector Activo + Checkbox Seleccionar Todo en este Sector */}
              <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Sector: {currentSector?.nombre}</span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Acciones Rápidas en el Sector */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('operador')}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer font-medium"
                    >
                      Preset Operador
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('consulta')}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer font-medium"
                    >
                      Solo Lectura
                    </button>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      id="checkbox_select_sector"
                      checked={isSectorAllSelected}
                      onCheckedChange={handleToggleSelectSector}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Seleccionar todo en este sector
                    </span>
                  </label>
                </div>
              </div>

              {/* Grilla de Tarjetas por Módulo (Clean White Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {filteredModulesInActiveSector.length === 0 ? (
                  <div className="col-span-full text-center py-10 border rounded-2xl bg-slate-50/50 dark:bg-muted/10">
                    <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs font-bold text-foreground">No se encontraron permisos en este sector</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Intenta buscar con otra palabra clave o cambia de sector.
                    </p>
                  </div>
                ) : (
                  filteredModulesInActiveSector.map((mod) => {
                    const modPermIds = mod.permisos.map((p) => p.id);
                    const selectedInModCount = modPermIds.filter((id) =>
                      formData.permisos_ids.includes(id)
                    ).length;
                    const isModAllSelected =
                      modPermIds.length > 0 && selectedInModCount === modPermIds.length;

                    return (
                      <div
                        key={mod.key}
                        className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-xs overflow-hidden flex flex-col"
                      >
                        {/* Cabecera del Módulo */}
                        <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-slate-100 dark:border-border bg-white dark:bg-card">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">{mod.nombre}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground">
                              {selectedInModCount}/{mod.permisos.length}
                            </span>
                          </div>

                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <Checkbox
                              checked={isModAllSelected}
                              onCheckedChange={(checked) => handleToggleModule(mod.permisos, !!checked)}
                              className="h-3.5 w-3.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            <span className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                              Todos
                            </span>
                          </label>
                        </div>

                        {/* Lista de Permisos del Módulo */}
                        <div className="p-3 space-y-1.5 flex-1">
                          {mod.permisos.map((perm) => {
                            const isChecked = formData.permisos_ids.includes(perm.id);
                            const label = getPermisoFriendlyLabel(perm);

                            return (
                              <label
                                key={perm.id}
                                className={cn(
                                  'flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer select-none text-xs',
                                  isChecked
                                    ? 'bg-slate-50 dark:bg-muted/40 font-medium text-foreground border border-slate-200/60 dark:border-border/60 shadow-2xs'
                                    : 'hover:bg-slate-50/60 dark:hover:bg-muted/20 text-slate-600 dark:text-slate-400 border border-transparent'
                                )}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleTogglePermiso(perm.id)}
                                  className="h-4 w-4 rounded data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <span className="truncate leading-tight" title={label}>
                                  {label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Footer Fijo con Acciones */}
            <div className="p-4 border-t border-slate-100 dark:border-border bg-white dark:bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <div className="text-xs text-muted-foreground font-medium">
                <span className="font-bold text-foreground">{formData.permisos_ids.length}</span> permisos seleccionados para este rol
              </div>

              <div className="flex items-center gap-2.5 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="h-9.5 text-xs bg-white hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-card dark:border-border dark:text-foreground font-semibold px-5 rounded-xl cursor-pointer shadow-2xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  {saving ? 'Guardando...' : editingRol ? 'Guardar Cambios' : 'Crear Rol'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`¿Eliminar rol "${rolToDelete?.nombre}"?`}
        description="Esta acción eliminará el rol y revocará sus permisos asignados. Esta acción no se puede deshacer."
        isConfirming={deleting}
      />
    </div>
  );
};
