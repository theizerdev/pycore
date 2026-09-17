import React, { useEffect, useState, useMemo } from 'react';
import type { Usuario, Rol, Sucursal, Empresa, SuscripcionEmpresa } from '../../types';
import { usuariosApi } from '../../api/usuarios';
import { rolesApi } from '../../api/roles';
import { sucursalesApi } from '../../api/sucursales';
import { empresasApi } from '../../api/empresas';
import { planesApi } from '../../api/planes';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  CheckCircle,
  MoreVertical,
  Pencil,
  ToggleRight,
  Trash2,
  Mail,
  Shield,
  KeyRound,
  RotateCcw,
  UserCheck,
  MapPin,
  Star,
  Globe,
  Eye,
  EyeOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export const UsuariosPage: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  // Info de Límites de Suscripción
  const [suscripcionInfo, setSuscripcionInfo] = useState<SuscripcionEmpresa | null>(null);

  useEffect(() => {
    planesApi.getMiSuscripcion().then(setSuscripcionInfo).catch(console.error);
  }, []);

  const maxAllowedUsuarios = currentUser?.es_superadmin
    ? 999
    : (suscripcionInfo?.metricas.max_usuarios || 3);
  const isExempt = Boolean(currentUser?.empresa_id === 1 || currentUser?.es_superadmin);
  const totalActivos = usuarios.filter((u) => u.activo).length;
  const canAddUsuario = isExempt || totalActivos < maxAllowedUsuarios;

  // Filtros idénticos a fixsalePOS
  const [searchTerm, setSearchTerm] = useState('');
  const [rolFilter, setRolFilter] = useState<string>('todos');
  const [sucursalFilter, setSucursalFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [perPageFilter, setPerPageFilter] = useState<number>(10);

  // Estados Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Cambiar Contraseña Rápido
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [userForPassword, setUserForPassword] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleOpenPasswordModal = (u: Usuario) => {
    setUserForPassword(u);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordModalOpen(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPassword) return;

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    try {
      setSavingPassword(true);
      await usuariosApi.update(userForPassword.id, { password: newPassword });
      toast.success(`🔑 Contraseña de ${userForPassword.nombre} actualizada correctamente`);
      setPasswordModalOpen(false);
      setUserForPassword(null);
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setPasswordError(err.response?.data?.detail || 'Error al actualizar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    rol_id: 1,
    empresa_id: 1,
    sucursal_defecto_id: 1,
    sucursales_ids: [] as number[],
    activo: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usrData, rolData, sucData, empData] = await Promise.all([
        usuariosApi.list(),
        rolesApi.list(),
        sucursalesApi.list(),
        currentUser?.es_superadmin ? empresasApi.list() : Promise.resolve([])
      ]);

      setUsuarios(usrData);
      setRoles(rolData);
      setSucursales(sucData);
      setEmpresas(empData);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Métricas estilo fixsalePOS
  const stats = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.activo).length;
    const superadmins = usuarios.filter((u) => u.es_superadmin).length;
    return { total, activos, superadmins };
  }, [usuarios]);

  // Filtrado reactivo con búsqueda en múltiples campos
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      const matchSearch =
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.telefono && u.telefono.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRol = rolFilter === 'todos' || String(u.rol_id) === rolFilter;

      const matchSucursal =
        sucursalFilter === 'todas' ||
        u.sucursales_asignadas?.some((s) => String(s.sucursal.id) === sucursalFilter);

      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && u.activo) ||
        (statusFilter === 'inactivos' && !u.activo);

      return matchSearch && matchRol && matchSucursal && matchStatus;
    });
  }, [usuarios, searchTerm, rolFilter, sucursalFilter, statusFilter]);

  // Filtrar sucursales por la empresa seleccionada en el formulario
  const sucursalesFiltradas = useMemo(() => {
    if (!formData.empresa_id) return sucursales;
    return sucursales.filter((s) => s.empresa_id === Number(formData.empresa_id));
  }, [sucursales, formData.empresa_id]);

  // Manejadores Modal
  const handleCreateClick = () => {
    if (!canAddUsuario) {
      toast.error(
        `Límite de usuarios alcanzado (${totalActivos}/${maxAllowedUsuarios}). Tu plan actual '${suscripcionInfo?.plan_activo?.nombre || 'Básico'}' no permite registrar más usuarios activos. Actualiza tu plan en Planes & Facturación para ampliar el equipo.`
      );
      return;
    }
    setEditingUser(null);
    const defaultRolId = roles[0]?.id || 1;
    const defaultEmpId = currentUser?.empresa_id || (empresas[0]?.id || 1);
    const empSucs = sucursales.filter((s) => s.empresa_id === defaultEmpId);
    const defaultSucId = empSucs.length > 0 ? empSucs[0].id : (sucursales[0]?.id || 1);

    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      telefono: '',
      rol_id: defaultRolId,
      empresa_id: defaultEmpId,
      sucursal_defecto_id: defaultSucId,
      sucursales_ids: [defaultSucId],
      activo: true,
    });
    setActiveTab('general');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (u: Usuario) => {
    setEditingUser(u);
    const userEmpId = u.empresa_id || 1;
    const empSucs = sucursales.filter((s) => s.empresa_id === userEmpId);
    const currentSucId =
      u.sucursal_defecto_id ||
      u.sucursales_asignadas?.[0]?.sucursal?.id ||
      (empSucs[0]?.id || sucursales[0]?.id || 1);

    setFormData({
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      password: '',
      telefono: u.telefono || '',
      rol_id: u.rol_id,
      empresa_id: userEmpId,
      sucursal_defecto_id: currentSucId,
      sucursales_ids: [currentSucId],
      activo: u.activo,
    });
    setActiveTab('general');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Cambio de empresa: actualiza la empresa y selecciona automáticamente la primera sucursal de esa empresa
  const handleEmpresaChange = (empId: number) => {
    const empSucs = sucursales.filter((s) => s.empresa_id === empId);
    const firstSuc = empSucs.length > 0 ? empSucs[0].id : (sucursales[0]?.id || 1);
    setFormData((prev) => ({
      ...prev,
      empresa_id: empId,
      sucursal_defecto_id: firstSuc,
      sucursales_ids: [firstSuc],
    }));
  };

  // Seleccionar exactamente 1 sucursal por usuario
  const handleSelectSucursal = (sucId: number) => {
    setFormData((prev) => ({
      ...prev,
      sucursal_defecto_id: sucId,
      sucursales_ids: [sucId],
    }));
  };

  const handleToggleStatus = async (u: Usuario) => {
    if (u.id === currentUser?.id) {
      toast.warning('No puedes desactivar tu propia cuenta activa.');
      return;
    }
    try {
      await usuariosApi.update(u.id, { activo: !u.activo });
      toast.success(`Usuario ${!u.activo ? 'activado' : 'desactivado'} correctamente`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado del usuario');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingUser) {
        const payload: any = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          rol_id: formData.rol_id,
          empresa_id: formData.empresa_id,
          sucursal_defecto_id: formData.sucursal_defecto_id,
          sucursales_ids: formData.sucursales_ids,
          activo: formData.activo,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await usuariosApi.update(editingUser.id, payload);
        toast.success('Usuario actualizado exitosamente');
      } else {
        if (!formData.password) {
          setErrorMsg('La contraseña es requerida para registrar un nuevo usuario.');
          setSaving(false);
          return;
        }
        await usuariosApi.create(formData);
        toast.success('Usuario creado exitosamente');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al guardar usuario';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (u: Usuario) => {
    setUserToDelete(u);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      await usuariosApi.delete(userToDelete.id);
      toast.success('Usuario eliminado correctamente');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar usuario');
    } finally {
      setDeleting(false);
    }
  };

  // Columnas de la Tabla
  const columns: ColumnDef<Usuario>[] = [
    {
      header: 'Usuario',
      accessorKey: 'nombre',
      sortable: true,
      className: 'font-medium',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0 border">
            {u.nombre.charAt(0)}{u.apellido.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-foreground">{u.nombre} {u.apellido}</p>
              {u.es_superadmin && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Superadmin
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 text-muted-foreground/70" />
              <span>{u.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Rol de Seguridad',
      cell: (u) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-900">
          <KeyRound className="w-3.5 h-3.5" />
          <span>{u.rol?.nombre || 'Sin Rol'}</span>
        </span>
      ),
    },
    {
      header: 'Sedes Asignadas',
      cell: (u) => {
        if (u.es_superadmin) {
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800 shadow-xs">
                <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Todas las sedes (Global)</span>
              </span>
              {u.sucursal_defecto && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Principal: {u.sucursal_defecto.nombre}</span>
                </span>
              )}
            </div>
          );
        }

        // Deduplicar sucursales asignadas por ID
        const uniqueSucursales = Array.from(
          new Map(u.sucursales_asignadas?.map((s) => [s.sucursal.id, s]) || []).values()
        );

        if (uniqueSucursales.length === 0) {
          if (u.sucursal_defecto) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900">
                <MapPin className="w-3 h-3 text-muted-foreground/70" />
                <span>{u.sucursal_defecto.nombre}</span>
                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground italic">Sin sedes asignadas</span>;
        }

        // Priorizar la sede principal primero
        const sorted = [...uniqueSucursales].sort((a, b) => {
          if (a.sucursal.id === u.sucursal_defecto_id) return -1;
          if (b.sucursal.id === u.sucursal_defecto_id) return 1;
          return a.sucursal.nombre.localeCompare(b.sucursal.nombre);
        });

        const visible = sorted.slice(0, 2);
        const remaining = sorted.slice(2);

        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
              {visible.map((s) => {
                const isDefault = u.sucursal_defecto_id === s.sucursal.id;
                return (
                  <span
                    key={s.sucursal.id}
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border',
                      isDefault
                        ? 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900 font-semibold'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <MapPin className="w-3 h-3 text-muted-foreground/70" />
                    <span className="truncate max-w-[130px]" title={s.sucursal.nombre}>
                      {s.sucursal.nombre}
                    </span>
                    {isDefault && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                  </span>
                );
              })}
              {remaining.length > 0 && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border cursor-help hover:bg-muted/80 transition-colors"
                  title={remaining.map((r) => r.sucursal.nombre).join(', ')}
                >
                  +{remaining.length} más
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Estado',
      sortable: true,
      accessorKey: 'activo',
      cell: (u) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={u.activo}
            disabled={u.id === currentUser?.id}
            onCheckedChange={() => handleToggleStatus(u)}
          />
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              u.activo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
            )}
          >
            {u.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (u) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {hasPermission('usuarios.editar') && (
                <DropdownMenuItem onClick={() => handleEditClick(u)} className="cursor-pointer text-xs">
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  <span>Editar Usuario</span>
                </DropdownMenuItem>
              )}
              {hasPermission('usuarios.editar') && (
                <DropdownMenuItem onClick={() => handleOpenPasswordModal(u)} className="cursor-pointer text-xs">
                  <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-500" />
                  <span>Cambiar Contraseña</span>
                </DropdownMenuItem>
              )}
              {u.id !== currentUser?.id && (
                <DropdownMenuItem onClick={() => handleToggleStatus(u)} className="cursor-pointer text-xs">
                  <ToggleRight className="mr-2 h-3.5 w-3.5" />
                  <span>{u.activo ? 'Desactivar' : 'Activar'}</span>
                </DropdownMenuItem>
              )}
              {hasPermission('usuarios.eliminar') && !u.es_superadmin && u.id !== currentUser?.id && (
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(u)}
                  className="text-destructive focus:text-destructive cursor-pointer text-xs"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ModuleHeader exactamente como en fixsalePOS */}
      <ModuleHeader
        icon={<Users className="h-6 w-6 text-white" />}
        title="Directorio de Usuarios"
        description="Gestión de médicos, enfermería, recepción y administradores clínicos del sistema."
        colorClassName="bg-teal-600 dark:bg-teal-700"
      >
        <div className="flex items-center gap-3">
          {!isExempt && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-700/50 text-teal-100 text-xs font-semibold border border-teal-500/30">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>Cupo del Plan: {stats.activos} / {maxAllowedUsuarios} usuarios</span>
            </div>
          )}
          {hasPermission('usuarios.crear') && (
            <Button
              onClick={handleCreateClick}
              className="bg-white hover:bg-slate-100 text-teal-800 font-semibold shadow-xs text-xs h-9 cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          )}
        </div>
      </ModuleHeader>

      {/* Stat Cards en fila idénticos a fixsalePOS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          title="TOTAL USUARIOS"
          value={stats.total}
          colorClassName="bg-teal-100 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="USUARIOS ACTIVOS"
          value={isExempt ? `${stats.activos}` : `${stats.activos} / ${maxAllowedUsuarios}`}
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<Shield className="h-6 w-6" />}
          title="SUPERADMINISTRADORES"
          value={stats.superadmins}
          colorClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        />
      </div>

      {/* FilterBar idéntico a fixsalePOS */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar">
            <Input
              placeholder="Buscar por nombre, email, teléfono..."
              className="w-full md:w-72 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FilterField>

          <FilterField label="Rol">
            <Select value={rolFilter} onValueChange={setRolFilter}>
              <SelectTrigger className="w-full md:w-44 h-9 text-xs">
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Sede / Sucursal">
            <Select value={sucursalFilter} onValueChange={setSucursalFilter}>
              <SelectTrigger className="w-full md:w-48 h-9 text-xs">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las Sedes</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Estado">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-36 h-9 text-xs">
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
              <SelectTrigger className="w-full md:w-28 h-9 text-xs">
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

          {(searchTerm || rolFilter !== 'todos' || sucursalFilter !== 'todas' || statusFilter !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setRolFilter('todos');
                setSucursalFilter('todas');
                setStatusFilter('todos');
              }}
              className="h-9 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Limpiar
            </Button>
          )}
        </div>
      </FilterBar>

      {/* DataTable Reutilizable */}
      <DataTable
        data={filteredUsuarios}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se encontraron usuarios registrados con los filtros aplicados."
      />

      {/* ── Modal de Creación / Edición Master-Detail Stepper ────────────────── */}
      {(() => {
        const USUARIO_STEPS = [
          {
            id: 'general',
            label: '1. Datos & Acceso',
            shortTitle: 'Datos & Acceso',
            subtitle: 'Nombre, email y credenciales',
            titleDetail: 'Datos Personales y Credenciales de Acceso',
            descriptionDetail: 'Información básica del colaborador, contacto y contraseña de inicio de sesión.',
            icon: UserCheck,
            isComplete: Boolean(formData.nombre.trim() && formData.apellido.trim() && formData.email.trim()),
          },
          {
            id: 'roles_sedes',
            label: '2. Rol & Sede Asignada',
            shortTitle: 'Rol & Sede',
            subtitle: 'Permisos y sucursal física',
            titleDetail: 'Nivel de Seguridad, Rol y Sede Médica Asignada',
            descriptionDetail: 'Define las responsabilidades del usuario y la sede hospitalaria donde prestará servicio.',
            icon: Shield,
            isComplete: Boolean(formData.rol_id && formData.sucursal_defecto_id),
          },
        ];

        const currentUsuarioStepIndex = Math.max(0, USUARIO_STEPS.findIndex((s) => s.id === activeTab));
        const currentUsuarioStep = USUARIO_STEPS[currentUsuarioStepIndex] || USUARIO_STEPS[0];
        const selectedRolObj = roles.find((r) => r.id === formData.rol_id);
        const selectedSucursalObj = sucursales.find((s) => s.id === formData.sucursal_defecto_id);
        const fullName = [formData.nombre, formData.apellido].filter(Boolean).join(' ');
        const initials = ((formData.nombre.trim().charAt(0) || '') + (formData.apellido.trim().charAt(0) || '')).toUpperCase() || 'U';

        return (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-5xl max-h-[92vh] h-[670px] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-border/70">
              {/* Encabezado */}
              <DialogHeader className="p-4 px-6 border-b border-border/80 bg-muted/20 flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-xs shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{editingUser ? `Editar Usuario: ${editingUser.nombre} ${editingUser.apellido}` : 'Registrar Nuevo Usuario'}</span>
                      <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 bg-teal-500/5">
                        MEDISOFT Seguridad
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Completa los datos del colaborador y sus permisos de acceso en las sedes médicas.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                  {/* ── BARRA LATERAL DE PASOS (STEPPER) ── */}
                  <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-border/70 bg-muted/20 dark:bg-muted/10 p-3 md:p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
                    <div className="space-y-1.5">
                      <div className="hidden md:block px-2 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Pasos de Registro
                        </span>
                      </div>

                      <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
                        {USUARIO_STEPS.map((step) => {
                          const IconComponent = step.icon;
                          const isActive = activeTab === step.id;
                          const isCompleted = step.isComplete;

                          return (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => setActiveTab(step.id)}
                              className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 border ${
                                isActive
                                  ? 'bg-teal-500/10 border-teal-500/40 text-foreground shadow-xs'
                                  : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div
                                className={`size-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                                  isActive
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : isCompleted
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isCompleted && !isActive ? (
                                  <Check className="size-4" />
                                ) : (
                                  <IconComponent className="size-4" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-xs font-semibold truncate block ${
                                    isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
                                  }`}
                                >
                                  {step.label}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate block">
                                  {step.subtitle}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarjeta de Resumen en Vivo del Usuario (Sidebar Footer) */}
                    <div className="hidden md:block pt-3 border-t border-border/60 mt-3">
                      <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 bg-teal-600 shadow-2xs font-mono">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-foreground truncate block">
                              {fullName || 'Nuevo Usuario'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate block">
                              {formData.email || 'correo@ejemplo.com'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-border/50">
                          <span className="text-muted-foreground truncate max-w-[110px]">
                            {selectedRolObj?.nombre || 'Sin Rol'}
                          </span>
                          <span
                            className={`font-semibold px-1.5 py-0.5 rounded-full ${
                              formData.activo
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {formData.activo ? '● Activo' : '○ Inactivo'}
                          </span>
                        </div>
                        {selectedSucursalObj && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5 truncate">
                            <MapPin className="size-3 text-teal-600 shrink-0" />
                            <span className="truncate">{selectedSucursalObj.nombre}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── PANEL DE CONTENIDO DERECHO ── */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
                    {/* Banner Superior del Paso Activo */}
                    <div className="px-6 py-3.5 border-b border-border/60 bg-card/40 flex items-center justify-between shrink-0">
                      <div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>{currentUsuarioStep.titleDetail}</span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {currentUsuarioStep.descriptionDetail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                          Paso {currentUsuarioStepIndex + 1} de {USUARIO_STEPS.length}
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 transition-all duration-300"
                            style={{
                              width: `${((currentUsuarioStepIndex + 1) / USUARIO_STEPS.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contenedor de Formularios con Scroll */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {errorMsg && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5 shadow-2xs">
                          <span className="font-medium">{errorMsg}</span>
                        </div>
                      )}

                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* ══ Tab 1: Datos Personales & Acceso ════════════════════════ */}
                        <TabsContent value="general" className="mt-0 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="usr_nombre" className="text-xs font-semibold">
                                Nombres <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                id="usr_nombre"
                                required
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Ej. Roberto"
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="usr_apellido" className="text-xs font-semibold">
                                Apellidos <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                id="usr_apellido"
                                required
                                value={formData.apellido}
                                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                                placeholder="Ej. Silva"
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="usr_email" className="text-xs font-semibold">
                                Correo Electrónico <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                id="usr_email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="usuario@pycore.com"
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="usr_telefono" className="text-xs font-semibold">
                                Teléfono / WhatsApp
                              </Label>
                              <Input
                                id="usr_telefono"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                placeholder="+58 414 1234567"
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                              <Label htmlFor="usr_password" className="text-xs font-semibold">
                                {editingUser ? 'Nueva Contraseña (Dejar en blanco para conservar la actual)' : 'Contraseña de Acceso *'}
                              </Label>
                              <Input
                                id="usr_password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="h-9 text-xs font-mono"
                              />
                            </div>

                            <div className="md:col-span-2 pt-2 flex items-center justify-between border-t border-border/60">
                              <div className="space-y-0.5">
                                <Label htmlFor="usr_activo" className="text-xs font-semibold cursor-pointer">
                                  Estado de Cuenta
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                  {formData.activo ? 'Cuenta activa (Permite iniciar sesión en la plataforma)' : 'Cuenta bloqueada / inactiva'}
                                </p>
                              </div>
                              <Switch
                                id="usr_activo"
                                checked={formData.activo}
                                disabled={editingUser?.id === currentUser?.id}
                                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        {/* ══ Tab 2: Rol & Sede Asignada ══════════════════════════════ */}
                        <TabsContent value="roles_sedes" className="mt-0 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="usr_rol" className="text-xs font-semibold">
                                Rol de Seguridad <span className="text-rose-500">*</span>
                              </Label>
                              <Select
                                value={String(formData.rol_id)}
                                onValueChange={(val) => setFormData({ ...formData, rol_id: Number(val) })}
                              >
                                <SelectTrigger id="usr_rol" className="h-9 text-xs">
                                  <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                      {r.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {currentUser?.es_superadmin && empresas.length > 0 && (
                              <div className="space-y-1.5">
                                <Label htmlFor="usr_empresa" className="text-xs font-semibold">
                                  Empresa Perteneciente <span className="text-rose-500">*</span>
                                </Label>
                                <Select
                                  value={String(formData.empresa_id)}
                                  onValueChange={(val) => handleEmpresaChange(Number(val))}
                                >
                                  <SelectTrigger id="usr_empresa" className="h-9 text-xs">
                                    <SelectValue placeholder="Seleccionar empresa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {empresas.map((emp) => (
                                      <SelectItem key={emp.id} value={String(emp.id)}>
                                        {emp.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Asignación de 1 Sede/Sucursal por Usuario */}
                          <div className="space-y-3 pt-3 border-t border-border/60">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                  <span>Sede Asignada a este Usuario:</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Selecciona la sucursal de la empresa a la que pertenecerá el usuario (1 por usuario).
                                </p>
                              </div>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {sucursalesFiltradas.length} {sucursalesFiltradas.length === 1 ? 'sucursal disponible' : 'sucursales disponibles'}
                              </span>
                            </div>

                            {sucursalesFiltradas.length === 0 ? (
                              <div className="p-4 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 text-center space-y-1">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                  No hay sucursales registradas para esta empresa.
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Crea una sucursal en el módulo de Sucursales para poder asignarla a los usuarios.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {sucursalesFiltradas.map((s) => {
                                  const isSelected = formData.sucursal_defecto_id === s.id;

                                  return (
                                    <div
                                      key={s.id}
                                      onClick={() => handleSelectSucursal(s.id)}
                                      className={cn(
                                        'p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer select-none',
                                        isSelected
                                          ? 'bg-teal-50/90 border-teal-500 ring-1 ring-teal-500/50 dark:bg-teal-950/30 dark:border-teal-400 shadow-xs'
                                          : 'bg-background hover:bg-muted/40 border-input text-muted-foreground'
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className={cn(
                                            'w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0',
                                            isSelected
                                              ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400'
                                              : 'border-muted-foreground/40 bg-background'
                                          )}
                                        >
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />}
                                        </div>
                                        <div className="truncate">
                                          <p className={cn('text-xs font-semibold truncate', isSelected ? 'text-foreground font-bold' : 'text-foreground/80')}>
                                            {s.nombre}
                                          </p>
                                          {s.ciudad && (
                                            <p className="text-[10px] text-muted-foreground truncate">{s.ciudad}</p>
                                          )}
                                        </div>
                                      </div>

                                      {isSelected && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 shrink-0">
                                          Sede Asignada ⭐
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Footer de navegación unificado */}
                    <div className="p-3.5 px-6 border-t border-border/70 bg-muted/10 flex items-center justify-between shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsModalOpen(false)}
                        disabled={saving}
                        className="h-8 text-xs cursor-pointer"
                      >
                        Cancelar
                      </Button>

                      <div className="flex items-center gap-2">
                        {currentUsuarioStepIndex > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab(USUARIO_STEPS[currentUsuarioStepIndex - 1].id)}
                            className="h-8 text-xs cursor-pointer gap-1"
                          >
                            <ChevronLeft className="size-3.5" />
                            <span>Anterior</span>
                          </Button>
                        )}

                        {currentUsuarioStepIndex < USUARIO_STEPS.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab(USUARIO_STEPS[currentUsuarioStepIndex + 1].id)}
                            className="h-8 text-xs cursor-pointer gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                          >
                            <span>Siguiente: {USUARIO_STEPS[currentUsuarioStepIndex + 1].shortTitle}</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}

                        <Button
                          type="submit"
                          size="sm"
                          disabled={saving}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold h-8 text-xs cursor-pointer shadow-xs gap-1.5"
                        >
                          <Users className="size-3.5" />
                          <span>{saving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`¿Eliminar usuario "${userToDelete?.nombre} ${userToDelete?.apellido}"?`}
        description="Esta acción eliminará permanentemente la cuenta de usuario y revocará todos sus accesos al sistema."
        isConfirming={deleting}
      />

      {/* 🔑 Modal Explicito de Cambiar Contraseña Rápido */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSavePassword}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <KeyRound className="size-5 text-amber-500" />
                <span>Cambiar Contraseña de Usuario</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Asigna una nueva clave de acceso para <strong>{userForPassword?.nombre} {userForPassword?.apellido}</strong> ({userForPassword?.email}).
              </DialogDescription>
            </DialogHeader>

            {passwordError && (
              <div className="p-3 my-2 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {passwordError}
              </div>
            )}

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="new_pass" className="font-bold">Nueva Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="new_pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_pass" className="font-bold">Confirmar Nueva Contraseña *</Label>
                <Input
                  id="confirm_pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingPassword}
                className="text-xs font-bold gap-2 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
              >
                {savingPassword ? 'Guardando...' : 'Actualizar Contraseña'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
