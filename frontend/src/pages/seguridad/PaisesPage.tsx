import React, { useEffect, useState, useMemo } from 'react';
import type { Pais } from '../../types';
import { paisesApi } from '../../api/paises';
import { useAuth } from '../../context/AuthContext';
import {
  Globe,
  Plus,
  CheckCircle,
  XCircle,
  MoreVertical,
  Pencil,
  ToggleRight,
  Trash2,
  RotateCcw,
  Coins,
  MapPin,
  Clock,
  Percent
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

export const PaisesPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [continenteFilter, setContinenteFilter] = useState<string>('todos');
  const [perPageFilter, setPerPageFilter] = useState<number>(10);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPais, setEditingPais] = useState<Pais | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paisToDelete, setPaisToDelete] = useState<Pais | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const initialFormState = {
    nombre: '',
    codigo_iso2: '',
    codigo_iso3: '',
    codigo_telefonico: '',
    moneda_principal: 'USD',
    idioma_principal: 'es',
    continente: 'América del Sur',
    latitud: '' as string | number,
    longitud: '' as string | number,
    zona_horaria: 'America/Caracas',
    formato_fecha: 'dd/mm/yyyy',
    formato_moneda: '$ 1.234,56',
    impuesto_predeterminado: 16.0,
    separador_miles: '.',
    separador_decimales: ',',
    decimales_moneda: 2,
    activo: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await paisesApi.list();
      setPaises(data);
    } catch (err) {
      console.error('Error cargando países:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Estadísticas
  const stats = useMemo(() => {
    const total = paises.length;
    const activos = paises.filter(p => p.activo).length;
    const inactivos = total - activos;
    const monedasUnicas = new Set(paises.map(p => p.moneda_principal).filter(Boolean)).size;

    return {
      total,
      activos,
      inactivos,
      monedasUnicas
    };
  }, [paises]);

  // Lista de continentes disponibles para filtro
  const continentesDisponibles = useMemo(() => {
    const list = Array.from(new Set(paises.map(p => p.continente).filter(Boolean))) as string[];
    return list.sort();
  }, [paises]);

  // Filtrado
  const filteredPaises = useMemo(() => {
    return paises.filter(p => {
      // Filtro de búsqueda
      const matchSearch =
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_iso2.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_iso3.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo_telefonico && p.codigo_telefonico.includes(searchTerm)) ||
        (p.moneda_principal && p.moneda_principal.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de estado
      const matchStatus =
        statusFilter === 'todos'
          ? true
          : statusFilter === 'activos'
          ? p.activo
          : !p.activo;

      // Filtro de continente
      const matchContinente =
        continenteFilter === 'todos'
          ? true
          : p.continente === continenteFilter;

      return matchSearch && matchStatus && matchContinente;
    });
  }, [paises, searchTerm, statusFilter, continenteFilter]);

  const handleOpenCreate = () => {
    setEditingPais(null);
    setFormData(initialFormState);
    setErrorMsg(null);
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pais: Pais) => {
    setEditingPais(pais);
    setFormData({
      nombre: pais.nombre,
      codigo_iso2: pais.codigo_iso2,
      codigo_iso3: pais.codigo_iso3,
      codigo_telefonico: pais.codigo_telefonico || '',
      moneda_principal: pais.moneda_principal || 'USD',
      idioma_principal: pais.idioma_principal || 'es',
      continente: pais.continente || 'América del Sur',
      latitud: pais.latitud !== null && pais.latitud !== undefined ? pais.latitud : '',
      longitud: pais.longitud !== null && pais.longitud !== undefined ? pais.longitud : '',
      zona_horaria: pais.zona_horaria || 'America/Caracas',
      formato_fecha: pais.formato_fecha || 'dd/mm/yyyy',
      formato_moneda: pais.formato_moneda || '$ 1.234,56',
      impuesto_predeterminado: pais.impuesto_predeterminado ?? 16.0,
      separador_miles: pais.separador_miles || '.',
      separador_decimales: pais.separador_decimales || ',',
      decimales_moneda: pais.decimales_moneda ?? 2,
      activo: pais.activo,
    });
    setErrorMsg(null);
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setErrorMsg('El nombre del país es obligatorio.');
      return;
    }
    if (!formData.codigo_iso2.trim() || formData.codigo_iso2.trim().length !== 2) {
      setErrorMsg('El código ISO2 debe tener exactamente 2 caracteres (ej: MX, VE, US).');
      return;
    }
    if (!formData.codigo_iso3.trim() || formData.codigo_iso3.trim().length !== 3) {
      setErrorMsg('El código ISO3 debe tener exactamente 3 caracteres (ej: MEX, VEN, USA).');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload: Partial<Pais> = {
        nombre: formData.nombre.trim(),
        codigo_iso2: formData.codigo_iso2.trim().toUpperCase(),
        codigo_iso3: formData.codigo_iso3.trim().toUpperCase(),
        codigo_telefonico: formData.codigo_telefonico.trim() || null,
        moneda_principal: formData.moneda_principal.trim().toUpperCase() || null,
        idioma_principal: formData.idioma_principal.trim().toLowerCase() || null,
        continente: formData.continente.trim() || null,
        latitud: formData.latitud !== '' ? Number(formData.latitud) : null,
        longitud: formData.longitud !== '' ? Number(formData.longitud) : null,
        zona_horaria: formData.zona_horaria.trim() || null,
        formato_fecha: formData.formato_fecha || 'dd/mm/yyyy',
        formato_moneda: formData.formato_moneda || '$ 1.234,56',
        impuesto_predeterminado: Number(formData.impuesto_predeterminado) || 0.0,
        separador_miles: formData.separador_miles || '.',
        separador_decimales: formData.separador_decimales || ',',
        decimales_moneda: Number(formData.decimales_moneda) || 2,
        activo: formData.activo,
      };

      if (editingPais) {
        await paisesApi.update(editingPais.id, payload);
      } else {
        await paisesApi.create(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar los datos del país.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (pais: Pais) => {
    try {
      await paisesApi.toggleStatus(pais.id);
      fetchData();
    } catch (err) {
      console.error('Error al alternar estado del país:', err);
    }
  };

  const handleDeleteClick = (pais: Pais) => {
    setPaisToDelete(pais);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!paisToDelete) return;
    try {
      setDeleting(true);
      await paisesApi.delete(paisToDelete.id);
      setDeleteModalOpen(false);
      setPaisToDelete(null);
      fetchData();
    } catch (err) {
      console.error('Error al eliminar país:', err);
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Pais>[] = [
    {
      header: 'País / ISO',
      accessorKey: 'nombre',
      cell: (pais) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500/10 to-blue-500/20 dark:from-teal-500/20 dark:to-blue-500/30 border border-teal-500/30 flex items-center justify-center font-extrabold text-teal-600 dark:text-teal-400 text-xs tracking-wider shadow-xs">
            {pais.codigo_iso2}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{pais.nombre}</span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-slate-300 dark:border-slate-700">
                {pais.codigo_iso3}
              </Badge>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {pais.continente || 'Sin continente'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Prefijo Tel.',
      accessorKey: 'codigo_telefonico',
      cell: (pais) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-medium text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {pais.codigo_telefonico || '—'}
        </span>
      ),
    },
    {
      header: 'Moneda & IVA',
      accessorKey: 'moneda_principal',
      cell: (pais) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-200">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{pais.moneda_principal || 'USD'}</span>
            <span className="text-[10px] text-slate-500 font-normal">({pais.simbolo_moneda || '$'})</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Percent className="w-3 h-3 text-teal-500" />
            <span>IVA: {pais.impuesto_predeterminado ?? 0}%</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Zona Horaria & Coord.',
      accessorKey: 'zona_horaria',
      cell: (pais) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{pais.zona_horaria || '—'}</span>
          </div>
          {pais.latitud !== null && pais.longitud !== null && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5" />
              <span>{pais.latitud?.toFixed(2)}, {pais.longitud?.toFixed(2)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      cell: (pais) => (
        <div className="flex items-center gap-2">
          {hasPermission('paises.editar') ? (
            <Switch
              checked={pais.activo}
              onCheckedChange={() => handleToggleStatus(pais)}
              aria-label="Alternar estado"
            />
          ) : null}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
              pais.activo
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {pais.activo ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" /> Activo
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" /> Inactivo
              </>
            )}
          </span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      accessorKey: 'id',
      cell: (pais) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {hasPermission('paises.editar') && (
              <DropdownMenuItem onClick={() => handleOpenEdit(pais)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                <span>Editar País</span>
              </DropdownMenuItem>
            )}
            {hasPermission('paises.editar') && (
              <DropdownMenuItem onClick={() => handleToggleStatus(pais)} className="cursor-pointer">
                <ToggleRight className="mr-2 h-4 w-4 text-amber-500" />
                <span>{pais.activo ? 'Desactivar' : 'Activar'}</span>
              </DropdownMenuItem>
            )}
            {hasPermission('paises.eliminar') && (
              <DropdownMenuItem
                onClick={() => handleDeleteClick(pais)}
                className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado del Módulo */}
      <ModuleHeader
        icon={<Globe className="h-6 w-6" />}
        title="Catálogo de Países & Localización"
        description="Configuración de países, estándares ISO, zonas horarias, impuestos base y formatos de moneda"
        colorClassName="bg-teal-600 dark:bg-teal-700"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-1.5 shadow-xs text-slate-800 dark:text-white bg-white/10 hover:bg-white/20 border-white/20"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Refrescar</span>
          </Button>
          {hasPermission('paises.crear') && (
            <Button
              onClick={handleOpenCreate}
              className="bg-white text-teal-800 hover:bg-white/90 font-semibold gap-1.5 shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo País</span>
            </Button>
          )}
        </div>
      </ModuleHeader>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Globe className="h-6 w-6" />}
          title="TOTAL PAÍSES"
          value={stats.total}
          colorClassName="bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="ACTIVOS"
          value={stats.activos}
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<XCircle className="h-6 w-6" />}
          title="INACTIVOS"
          value={stats.inactivos}
          colorClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
        />
        <StatCard
          icon={<Coins className="h-6 w-6" />}
          title="MONEDAS ÚNICAS"
          value={stats.monedasUnicas}
          colorClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        />
      </div>

      {/* Barra de Filtros */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar">
            <Input
              placeholder="Buscar por nombre, código ISO, prefijo o moneda..."
              className="w-full md:w-80 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FilterField>

          <FilterField label="Continente">
            <Select value={continenteFilter} onValueChange={setContinenteFilter}>
              <SelectTrigger className="w-full md:w-48 h-9 text-xs">
                <SelectValue placeholder="Todos los continentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los continentes</SelectItem>
                {continentesDisponibles.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
              value={perPageFilter.toString()}
              onValueChange={(v) => setPerPageFilter(Number(v))}
            >
              <SelectTrigger className="w-full md:w-28 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {(searchTerm || statusFilter !== 'todos' || continenteFilter !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('todos');
                setContinenteFilter('todos');
              }}
              className="h-9 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Limpiar
            </Button>
          )}
        </div>
      </FilterBar>

      {/* Tabla de Datos */}
      <DataTable
        columns={columns}
        data={filteredPaises}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se encontraron países que coincidan con los criterios."
      />

      {/* Modal Crear / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{editingPais ? 'Editar País' : 'Registrar Nuevo País'}</span>
              </DialogTitle>
              <DialogDescription>
                {editingPais
                  ? `Actualizar parámetros y formatos para ${editingPais.nombre}`
                  : 'Complete la información para añadir un nuevo país al catálogo global'}
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 my-2 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
              <TabsList className="grid grid-cols-3 w-full mb-6">
                <TabsTrigger value="general" className="text-xs">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  Identificación
                </TabsTrigger>
                <TabsTrigger value="formatos" className="text-xs">
                  <Coins className="w-3.5 h-3.5 mr-1.5" />
                  Moneda & Formatos
                </TabsTrigger>
                <TabsTrigger value="geo" className="text-xs">
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  Geolocalización
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: General */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="nombre">
                      Nombre Oficial del País <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: México, Venezuela, Colombia..."
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigo_iso2">
                      Código ISO2 (2 letras) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="codigo_iso2"
                      placeholder="Ej: MX, VE, US"
                      maxLength={2}
                      value={formData.codigo_iso2}
                      onChange={(e) => setFormData({ ...formData, codigo_iso2: e.target.value.toUpperCase() })}
                      className="font-mono uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigo_iso3">
                      Código ISO3 (3 letras) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="codigo_iso3"
                      placeholder="Ej: MEX, VEN, USA"
                      maxLength={3}
                      value={formData.codigo_iso3}
                      onChange={(e) => setFormData({ ...formData, codigo_iso3: e.target.value.toUpperCase() })}
                      className="font-mono uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigo_telefonico">
                      Prefijo Telefónico
                    </Label>
                    <Input
                      id="codigo_telefonico"
                      placeholder="Ej: +52, +58, +1"
                      value={formData.codigo_telefonico}
                      onChange={(e) => setFormData({ ...formData, codigo_telefonico: e.target.value })}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="idioma_principal">
                      Idioma Principal
                    </Label>
                    <Input
                      id="idioma_principal"
                      placeholder="Ej: es, en, pt"
                      maxLength={10}
                      value={formData.idioma_principal}
                      onChange={(e) => setFormData({ ...formData, idioma_principal: e.target.value.toLowerCase() })}
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <Label htmlFor="activo" className="text-xs font-medium cursor-pointer">
                    Habilitar país para selección activa en el sistema
                  </Label>
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                </div>
              </TabsContent>

              {/* Tab 2: Moneda y Formatos */}
              <TabsContent value="formatos" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="moneda_principal">
                      Moneda Principal (ISO)
                    </Label>
                    <Input
                      id="moneda_principal"
                      placeholder="Ej: MXN, VES, USD, EUR"
                      maxLength={10}
                      value={formData.moneda_principal}
                      onChange={(e) => setFormData({ ...formData, moneda_principal: e.target.value.toUpperCase() })}
                      className="font-mono uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="impuesto_predeterminado">
                      Impuesto Predeterminado (%)
                    </Label>
                    <Input
                      id="impuesto_predeterminado"
                      type="number"
                      step="0.01"
                      placeholder="Ej: 16.00"
                      value={formData.impuesto_predeterminado}
                      onChange={(e) => setFormData({ ...formData, impuesto_predeterminado: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formato_moneda">
                      Ejemplo / Formato Moneda
                    </Label>
                    <Input
                      id="formato_moneda"
                      placeholder="Ej: $ 1.234,56 o 1,234.56 $"
                      value={formData.formato_moneda}
                      onChange={(e) => setFormData({ ...formData, formato_moneda: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formato_fecha">
                      Formato de Fecha
                    </Label>
                    <Select
                      value={formData.formato_fecha}
                      onValueChange={(val) => setFormData({ ...formData, formato_fecha: val })}
                    >
                      <SelectTrigger id="formato_fecha">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">dd/mm/yyyy (Día/Mes/Año)</SelectItem>
                        <SelectItem value="mm/dd/yyyy">mm/dd/yyyy (Mes/Día/Año)</SelectItem>
                        <SelectItem value="yyyy-mm-dd">yyyy-mm-dd (ISO estándar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="separador_miles">
                      Separador de Miles
                    </Label>
                    <Select
                      value={formData.separador_miles}
                      onValueChange={(val) => setFormData({ ...formData, separador_miles: val })}
                    >
                      <SelectTrigger id="separador_miles">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=".">Punto ( . )</SelectItem>
                        <SelectItem value=",">Coma ( , )</SelectItem>
                        <SelectItem value=" ">Espacio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="separador_decimales">
                      Separador de Decimales
                    </Label>
                    <Select
                      value={formData.separador_decimales}
                      onValueChange={(val) => setFormData({ ...formData, separador_decimales: val })}
                    >
                      <SelectTrigger id="separador_decimales">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">Coma ( , )</SelectItem>
                        <SelectItem value=".">Punto ( . )</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="decimales_moneda">
                      Cantidad de Decimales
                    </Label>
                    <Input
                      id="decimales_moneda"
                      type="number"
                      min={0}
                      max={4}
                      value={formData.decimales_moneda}
                      onChange={(e) => setFormData({ ...formData, decimales_moneda: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Geolocalización */}
              <TabsContent value="geo" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="continente">
                      Continente
                    </Label>
                    <Select
                      value={formData.continente}
                      onValueChange={(val) => setFormData({ ...formData, continente: val })}
                    >
                      <SelectTrigger id="continente">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="América del Norte">América del Norte</SelectItem>
                        <SelectItem value="América del Sur">América del Sur</SelectItem>
                        <SelectItem value="América Central">América Central</SelectItem>
                        <SelectItem value="El Caribe">El Caribe</SelectItem>
                        <SelectItem value="Europa">Europa</SelectItem>
                        <SelectItem value="Asia">Asia</SelectItem>
                        <SelectItem value="África">África</SelectItem>
                        <SelectItem value="Oceanía">Oceanía</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="zona_horaria">
                      Zona Horaria (IANA)
                    </Label>
                    <Input
                      id="zona_horaria"
                      placeholder="Ej: America/Mexico_City, America/Caracas"
                      value={formData.zona_horaria}
                      onChange={(e) => setFormData({ ...formData, zona_horaria: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="latitud">
                      Latitud Geográfica
                    </Label>
                    <Input
                      id="latitud"
                      type="number"
                      step="any"
                      placeholder="Ej: 19.4326"
                      value={formData.latitud}
                      onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="longitud">
                      Longitud Geográfica
                    </Label>
                    <Input
                      id="longitud"
                      type="number"
                      step="any"
                      placeholder="Ej: -99.1332"
                      value={formData.longitud}
                      onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                    />
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
              <Button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saving ? 'Guardando...' : editingPais ? 'Guardar Cambios' : 'Registrar País'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación de Eliminación */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`¿Eliminar país "${paisToDelete?.nombre}"?`}
        description="Esta acción eliminará permanentemente el país seleccionado."
        isConfirming={deleting}
      />
    </div>
  );
};
