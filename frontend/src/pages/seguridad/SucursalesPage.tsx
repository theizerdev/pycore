import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Sucursal, Empresa, Pais, SuscripcionEmpresa } from '../../types';
import { sucursalesApi } from '../../api/sucursales';
import { empresasApi } from '../../api/empresas';
import { paisesApi } from '../../api/paises';
import { planesApi } from '../../api/planes';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  MapPin,
  Plus,
  CheckCircle,
  XCircle,
  MoreVertical,
  Pencil,
  ToggleRight,
  Phone,
  Building2,
  Trash2,
  RotateCcw,
  Globe,
  Compass
} from 'lucide-react';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { StatCard } from '../../components/common/StatCard';
import { FilterBar, FilterField } from '../../components/common/FilterBar';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { DeleteConfirmationDialog } from '../../components/common/DeleteConfirmationDialog';
import { MapLocationPicker } from '../../components/common/MapLocationPicker';
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

export const SucursalesPage: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('todas');
  const [selectedPaisId, setSelectedPaisId] = useState<string>('todos');
  const [perPageFilter, setPerPageFilter] = useState<number>(10);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sucursalToDelete, setSucursalToDelete] = useState<Sucursal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const initialFormState = {
    empresa_id: 1,
    pais_id: undefined as number | undefined,
    pais_telefono_id: undefined as number | undefined,
    nombre: '',
    codigo: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    latitud: '' as string | number,
    longitud: '' as string | number,
    activo: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  // Info de Límites de Suscripción
  const [suscripcionInfo, setSuscripcionInfo] = useState<SuscripcionEmpresa | null>(null);

  useEffect(() => {
    planesApi.getMiSuscripcion().then(setSuscripcionInfo).catch(console.error);
  }, []);

  const maxAllowedSucursales = user?.es_superadmin
    ? 999
    : (suscripcionInfo?.metricas.max_sucursales || 1);
  const isExempt = Boolean(user?.empresa_id === 1 || user?.es_superadmin);
  const totalCreadas = sucursales.length;
  const canAddSucursal = isExempt || totalCreadas < maxAllowedSucursales;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sucData, empData, paisData] = await Promise.all([
        sucursalesApi.list(selectedEmpresaId !== 'todas' ? Number(selectedEmpresaId) : undefined),
        user?.es_superadmin ? empresasApi.list() : Promise.resolve([]),
        paisesApi.list({ activo: true })
      ]);
      setSucursales(sucData);
      setEmpresas(empData);
      setPaises(paisData);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEmpresaId]);

  // País seleccionado actual en el formulario para centrado del mapa
  const selectedPais = useMemo(() => {
    if (!formData.pais_id) return null;
    return paises.find(p => p.id === Number(formData.pais_id)) || null;
  }, [formData.pais_id, paises]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = sucursales.length;
    const activos = sucursales.filter((s) => s.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [sucursales]);

  // Filtrado reactivo
  const filteredSucursales = useMemo(() => {
    return sucursales.filter((s) => {
      const matchSearch =
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.codigo && s.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.ciudad && s.ciudad.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.telefono && s.telefono.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.direccion && s.direccion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.pais?.nombre && s.pais.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && s.activo) ||
        (statusFilter === 'inactivos' && !s.activo);

      const matchPais =
        selectedPaisId === 'todos' ||
        (s.pais_id && String(s.pais_id) === selectedPaisId);

      return matchSearch && matchStatus && matchPais;
    });
  }, [sucursales, searchTerm, statusFilter, selectedPaisId]);

  const handleOpenCreate = () => {
    if (!canAddSucursal) {
      toast.error(`Límite de sucursales alcanzado. Tu plan actual permite un máximo de ${maxAllowedSucursales} sucursal(es). Para agregar más, actualiza tu suscripción.`);
      return;
    }
    setEditingSucursal(null);
    const defaultEmpresaId = user?.empresa_id || (empresas.length > 0 ? empresas[0].id : 1);
    const defaultPais = paises.length > 0 ? paises[0] : null;

    setFormData({
      ...initialFormState,
      empresa_id: defaultEmpresaId,
      pais_id: defaultPais?.id,
      pais_telefono_id: defaultPais?.id,
      latitud: defaultPais?.latitud ?? '',
      longitud: defaultPais?.longitud ?? '',
    });
    setActiveTab('general');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (suc: Sucursal) => {
    setEditingSucursal(suc);
    setFormData({
      empresa_id: suc.empresa_id,
      pais_id: suc.pais_id || undefined,
      pais_telefono_id: suc.pais_telefono_id || suc.pais_id || undefined,
      nombre: suc.nombre,
      codigo: suc.codigo || '',
      telefono: suc.telefono || '',
      direccion: suc.direccion || '',
      ciudad: suc.ciudad || '',
      latitud: suc.latitud !== null && suc.latitud !== undefined ? suc.latitud : '',
      longitud: suc.longitud !== null && suc.longitud !== undefined ? suc.longitud : '',
      activo: suc.activo,
    });
    setActiveTab('general');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (sucursal: Sucursal) => {
    try {
      await sucursalesApi.update(sucursal.id, { activo: !sucursal.activo });
      toast.success(`Sucursal ${!sucursal.activo ? 'activada' : 'desactivada'} exitosamente`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado de la sucursal');
    }
  };

  const handleCoordinatesChange = (newLat: number, newLng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitud: newLat,
      longitud: newLng,
    }));
  };

  const handleAddressFound = (address: string, city: string) => {
    setFormData((prev) => ({
      ...prev,
      ...(address ? { direccion: address } : {}),
      ...(city ? { ciudad: city } : {}),
    }));
    if (address || city) {
      toast.info(`📍 Ubicación detectada: ${[city, address].filter(Boolean).join(' - ')}`);
    }
  };

  const handlePaisChange = (paisIdStr: string) => {
    const pId = Number(paisIdStr);
    const foundPais = paises.find((p) => p.id === pId);
    setFormData((prev) => ({
      ...prev,
      pais_id: pId,
      pais_telefono_id: pId,
      latitud: prev.latitud === '' && foundPais?.latitud ? foundPais.latitud : prev.latitud,
      longitud: prev.longitud === '' && foundPais?.longitud ? foundPais.longitud : prev.longitud,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      ...formData,
      empresa_id: Number(formData.empresa_id),
      pais_id: formData.pais_id ? Number(formData.pais_id) : null,
      pais_telefono_id: formData.pais_telefono_id ? Number(formData.pais_telefono_id) : null,
      latitud: formData.latitud !== '' ? Number(formData.latitud) : null,
      longitud: formData.longitud !== '' ? Number(formData.longitud) : null,
    };

    try {
      if (editingSucursal) {
        await sucursalesApi.update(editingSucursal.id, payload);
        toast.success('Sucursal actualizada exitosamente');
      } else {
        await sucursalesApi.create(payload);
        toast.success('Sucursal creada exitosamente');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al guardar la sucursal';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (suc: Sucursal) => {
    setSucursalToDelete(suc);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sucursalToDelete) return;
    try {
      setDeleting(true);
      await sucursalesApi.delete(sucursalToDelete.id);
      toast.success('Sucursal eliminada exitosamente');
      setDeleteModalOpen(false);
      setSucursalToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar la sucursal');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Sucursal>[] = [
    {
      header: 'Sucursal / Sede',
      accessorKey: 'nombre',
      sortable: true,
      cell: (sucursal) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{sucursal.nombre}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-mono">
                {sucursal.codigo || 'SIN CÓDIGO'}
              </p>
              {sucursal.pais && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  {sucursal.pais.codigo_iso2}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Ubicación & Geolocalización',
      cell: (sucursal) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate max-w-[220px]">
              {sucursal.ciudad ? `${sucursal.ciudad}, ${sucursal.direccion || ''}` : sucursal.direccion || 'Sin dirección'}
            </span>
          </div>
          {sucursal.latitud !== null && sucursal.latitud !== undefined && sucursal.longitud !== null && sucursal.longitud !== undefined && (
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 pl-5">
              <Compass className="w-2.5 h-2.5 text-blue-500" />
              <span>{sucursal.latitud.toFixed(4)}, {sucursal.longitud.toFixed(4)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Contacto',
      cell: (sucursal) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3 text-muted-foreground/70" />
          <span>{sucursal.telefono || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Estado',
      sortable: true,
      accessorKey: 'activo',
      cell: (sucursal) => (
        <div className="flex items-center space-x-2">
          {hasPermission('sucursales.editar') && (
            <Switch
              checked={sucursal.activo}
              onCheckedChange={() => handleToggleStatus(sucursal)}
            />
          )}
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              sucursal.activo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900'
            )}
          >
            {sucursal.activo ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (sucursal) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasPermission('sucursales.editar') && (
              <DropdownMenuItem onClick={() => handleOpenEdit(sucursal)}>
                <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                Editar
              </DropdownMenuItem>
            )}
            {hasPermission('sucursales.editar') && (
              <DropdownMenuItem onClick={() => handleToggleStatus(sucursal)}>
                <ToggleRight className="mr-2 h-4 w-4 text-amber-500" />
                {sucursal.activo ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
            )}
            {hasPermission('sucursales.eliminar') && (
              <DropdownMenuItem
                onClick={() => handleDeleteClick(sucursal)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ModuleHeader */}
      <ModuleHeader
        icon={<MapPin className="h-6 w-6 text-white" />}
        title="Sucursales (Sedes Médicas)"
        description="Gestiona las sedes operativas, su país y ubicación geográfica con MapTiler."
        colorClassName="bg-teal-600 dark:bg-teal-700"
      >
        {hasPermission('sucursales.crear') && (
          <Button
            onClick={handleOpenCreate}
            className="bg-white hover:bg-slate-100 text-teal-800 font-semibold shadow-xs text-xs h-9"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Sucursal
          </Button>
        )}
      </ModuleHeader>

      {/* Banner Informativo de Límite de Sucursales (Estilo FixSale POS) */}
      {!isExempt && (
        <div
          className={cn(
            'p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs',
            !canAddSucursal
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg font-bold ${!canAddSucursal ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
              <MapPin className="size-4" />
            </div>
            <div>
              <p className="font-bold text-sm">
                Capacidad de Sedes: {totalCreadas} de {maxAllowedSucursales} sucursal(es) contratadas
              </p>
              <p className="text-[11px] opacity-90">
                {!canAddSucursal
                  ? 'Has alcanzado el límite máximo de sedes contratadas en tu suscripción.'
                  : 'Tu plan actual incluye la capacidad para registrar y operar con tus sedes médicas autorizadas.'}
              </p>
            </div>
          </div>

          <Link
            to="/saas/suscripciones"
            className="shrink-0 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
          >
            {!canAddSucursal ? 'Ampliar Plan / Contratar Sede Extra →' : 'Ver Detalle de Suscripción'}
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          icon={<MapPin className="h-6 w-6" />}
          title="TOTAL SUCURSALES"
          value={stats.total}
          colorClassName="bg-teal-100 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="ACTIVAS"
          value={stats.activos}
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<XCircle className="h-6 w-6" />}
          title="INACTIVAS"
          value={stats.inactivos}
          colorClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
        />
      </div>

      {/* FilterBar */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar">
            <Input
              placeholder="Buscar por nombre, código, ciudad, dirección..."
              className="w-full md:w-80 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FilterField>

          {user?.es_superadmin && empresas.length > 0 && (
            <FilterField label="Empresa">
              <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                <SelectTrigger className="w-full md:w-52 h-9 text-xs">
                  <SelectValue placeholder="Todas las Empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Empresas</SelectItem>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          )}

          {paises.length > 0 && (
            <FilterField label="País">
              <Select value={selectedPaisId} onValueChange={setSelectedPaisId}>
                <SelectTrigger className="w-full md:w-44 h-9 text-xs">
                  <SelectValue placeholder="Todos los Países" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Países</SelectItem>
                  {paises.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre} ({p.codigo_iso2})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          )}

          <FilterField label="Estado">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-36 h-9 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activas</SelectItem>
                <SelectItem value="inactivos">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Registros por página">
            <Select
              value={String(perPageFilter)}
              onValueChange={(val) => setPerPageFilter(Number(val))}
            >
              <SelectTrigger className="w-full md:w-32 h-9 text-xs">
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

          {(searchTerm || statusFilter !== 'todos' || selectedEmpresaId !== 'todas' || selectedPaisId !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('todos');
                setSelectedEmpresaId('todas');
                setSelectedPaisId('todos');
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
        data={filteredSucursales}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se encontraron sucursales registradas con los filtros aplicados."
      />

      {/* Modal de Creación / Edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{editingSucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}</span>
              </DialogTitle>
              <DialogDescription>
                Completa la información de la sede médica y selecciona la ubicación en el mapa interactivo.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 my-2 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {errorMsg}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
              <TabsList className="grid w-full mb-6 grid-cols-2">
                <TabsTrigger value="general" className="flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4" />
                  General y Contacto
                </TabsTrigger>
                <TabsTrigger value="ubicacion" className="flex items-center gap-2 text-xs">
                  <MapPin className="h-4 w-4" />
                  Ubicación & Mapa MapTiler
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: General y Contacto */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user?.es_superadmin && empresas.length > 0 && (
                    <div className="md:col-span-2 space-y-1.5">
                      <Label htmlFor="empresa_id">Empresa Perteneciente *</Label>
                      <Select
                        value={String(formData.empresa_id)}
                        onValueChange={(val) => setFormData({ ...formData, empresa_id: Number(val) })}
                      >
                        <SelectTrigger id="empresa_id" className="h-9 text-xs">
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

                  {/* Nombre de la Sede */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre_sucursal">Nombre de la Sucursal *</Label>
                    <Input
                      id="nombre_sucursal"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Sede Norte - Consultorios"
                    />
                  </div>

                  {/* Código */}
                  <div className="space-y-1.5">
                    <Label htmlFor="codigo_sucursal">Código de Sede</Label>
                    <Input
                      id="codigo_sucursal"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="SN-01"
                      className="font-mono uppercase"
                    />
                  </div>

                  {/* País */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sucursal_pais">País de la Sede *</Label>
                    <Select
                      value={formData.pais_id ? String(formData.pais_id) : ''}
                      onValueChange={handlePaisChange}
                    >
                      <SelectTrigger id="sucursal_pais">
                        <SelectValue placeholder="Selecciona un país" />
                      </SelectTrigger>
                      <SelectContent>
                        {paises.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-teal-600" />
                              <span>{p.nombre} ({p.codigo_iso2})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Teléfono */}
                  <div className="space-y-1.5">
                    <Label htmlFor="telefono_sucursal">Teléfono Directo</Label>
                    <Input
                      id="telefono_sucursal"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+58 212 555-0101"
                    />
                  </div>

                  {/* Estado Switch */}
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="status_sucursal">Estado</Label>
                    <div className="flex items-center space-x-2 pt-1">
                      <Switch
                        id="status_sucursal"
                        checked={formData.activo}
                        onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Ubicación & Mapa MapTiler */}
              <TabsContent value="ubicacion" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ciudad_sucursal">Ciudad / Localidad</Label>
                    <Input
                      id="ciudad_sucursal"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder="Caracas"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="direccion_sucursal">Dirección Completa</Label>
                    <Input
                      id="direccion_sucursal"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      placeholder="Av. Principal, Piso 3, Consultorio 301..."
                    />
                  </div>
                </div>

                {/* Mapa Interactivo MapTiler */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      <span>Ubicación Geográfica en el Mapa (MapTiler)</span>
                    </Label>
                    {selectedPais && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        País: <strong className="text-teal-700 dark:text-teal-300">{selectedPais.nombre}</strong>
                      </span>
                    )}
                  </div>

                  <MapLocationPicker
                    lat={formData.latitud}
                    lng={formData.longitud}
                    onChange={handleCoordinatesChange}
                    onAddressFound={handleAddressFound}
                    countryLat={selectedPais?.latitud}
                    countryLng={selectedPais?.longitud}
                    countryName={selectedPais?.nombre}
                    height="280px"
                  />

                  {/* Campos manuales de latitud y longitud */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="latitud_sucursal" className="text-[11px] text-slate-500">
                        Latitud Manual
                      </Label>
                      <Input
                        id="latitud_sucursal"
                        type="number"
                        step="any"
                        placeholder="Ej: 10.4806"
                        className="h-8 text-xs font-mono"
                        value={formData.latitud}
                        onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="longitud_sucursal" className="text-[11px] text-slate-500">
                        Longitud Manual
                      </Label>
                      <Input
                        id="longitud_sucursal"
                        type="number"
                        step="any"
                        placeholder="Ej: -66.9036"
                        className="h-8 text-xs font-mono"
                        value={formData.longitud}
                        onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                {saving ? 'Guardando...' : editingSucursal ? 'Guardar Cambios' : 'Crear Sucursal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`¿Eliminar sucursal "${sucursalToDelete?.nombre}"?`}
        description="Esta acción eliminará permanentemente la sede médica seleccionada."
        isConfirming={deleting}
      />
    </div>
  );
};
