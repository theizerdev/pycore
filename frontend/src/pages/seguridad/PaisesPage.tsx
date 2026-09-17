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
  Percent,
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

      {/* Modal Crear / Editar Master-Detail Stepper */}
      {(() => {
        const PAIS_STEPS = [
          {
            id: 'general',
            label: '1. Identificación',
            shortTitle: 'Identificación',
            subtitle: 'Nombre oficial, ISO y prefijo',
            titleDetail: 'Identificación Oficial del País',
            descriptionDetail: 'Nombre oficial, códigos ISO internacionales, idioma y prefijo telefónico.',
            icon: Globe,
            isComplete: Boolean(formData.nombre.trim() && formData.codigo_iso2.trim() && formData.codigo_iso3.trim()),
          },
          {
            id: 'formatos',
            label: '2. Moneda & Formatos',
            shortTitle: 'Moneda',
            subtitle: 'Divisa, impuestos y fechas',
            titleDetail: 'Moneda Oficial, Impuestos y Formatos Regionales',
            descriptionDetail: 'Configuración de divisas, separadores numéricos y formato de fechas.',
            icon: Coins,
            isComplete: Boolean(formData.moneda_principal.trim()),
          },
          {
            id: 'geo',
            label: '3. Geolocalización',
            shortTitle: 'Geolocalización',
            subtitle: 'Continente y zona horaria',
            titleDetail: 'Geolocalización y Zona Horaria',
            descriptionDetail: 'Continente de pertenencia, zona horaria estándar IANA y coordenadas.',
            icon: MapPin,
            isComplete: Boolean(formData.continente || formData.zona_horaria.trim()),
          },
        ];

        const currentPaisStepIndex = Math.max(0, PAIS_STEPS.findIndex((s) => s.id === activeTab));
        const currentPaisStep = PAIS_STEPS[currentPaisStepIndex] || PAIS_STEPS[0];

        return (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-5xl max-h-[92vh] h-[670px] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-border/70">
              {/* Encabezado */}
              <DialogHeader className="p-4 px-6 border-b border-border/80 bg-muted/20 flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-xs shrink-0">
                    <Globe className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{editingPais ? `Editar País: ${editingPais.nombre}` : 'Registrar Nuevo País'}</span>
                      <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 bg-teal-500/5">
                        MEDISOFT Catálogo
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {editingPais
                        ? `Actualizar parámetros y formatos para ${editingPais.nombre}`
                        : 'Complete la información para añadir un nuevo país al catálogo global'}
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
                        {PAIS_STEPS.map((step) => {
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

                    {/* Tarjeta de Resumen en Vivo del País (Sidebar Footer) */}
                    <div className="hidden md:block pt-3 border-t border-border/60 mt-3">
                      <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 bg-teal-600 shadow-2xs font-mono">
                            {formData.codigo_iso2 || 'PA'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-foreground truncate block">
                              {formData.nombre || 'Nuevo País'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                              <span>{formData.codigo_iso3 || 'ISO3'}</span>
                              <span>•</span>
                              <span>{formData.codigo_telefonico || 'Tel'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-border/50">
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            {formData.moneda_principal || 'Sin moneda'}
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
                      </div>
                    </div>
                  </div>

                  {/* ── PANEL DE CONTENIDO DERECHO ── */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
                    {/* Banner Superior del Paso Activo */}
                    <div className="px-6 py-3.5 border-b border-border/60 bg-card/40 flex items-center justify-between shrink-0">
                      <div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>{currentPaisStep.titleDetail}</span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {currentPaisStep.descriptionDetail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                          Paso {currentPaisStepIndex + 1} de {PAIS_STEPS.length}
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 transition-all duration-300"
                            style={{
                              width: `${((currentPaisStepIndex + 1) / PAIS_STEPS.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contenedor de Formularios con Scroll */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {errorMsg && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5 shadow-2xs">
                          <XCircle className="size-4 shrink-0" />
                          <span className="font-medium">{errorMsg}</span>
                        </div>
                      )}

                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Tab 1: General */}
                        <TabsContent value="general" className="mt-0 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                              <Label htmlFor="nombre" className="text-xs font-semibold">
                                Nombre Oficial del País <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                id="nombre"
                                placeholder="Ej: México, Venezuela, Colombia..."
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                required
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="codigo_iso2" className="text-xs font-semibold">
                                Código ISO2 (2 letras) <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                id="codigo_iso2"
                                placeholder="Ej: MX, VE, US"
                                maxLength={2}
                                value={formData.codigo_iso2}
                                onChange={(e) => setFormData({ ...formData, codigo_iso2: e.target.value.toUpperCase() })}
                                className="font-mono uppercase h-9 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="codigo_iso3" className="text-xs font-semibold">
                                Código ISO3 (3 letras) <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                id="codigo_iso3"
                                placeholder="Ej: MEX, VEN, USA"
                                maxLength={3}
                                value={formData.codigo_iso3}
                                onChange={(e) => setFormData({ ...formData, codigo_iso3: e.target.value.toUpperCase() })}
                                className="font-mono uppercase h-9 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="codigo_telefonico" className="text-xs font-semibold">
                                Prefijo Telefónico
                              </Label>
                              <Input
                                id="codigo_telefonico"
                                placeholder="Ej: +52, +58, +1"
                                value={formData.codigo_telefonico}
                                onChange={(e) => setFormData({ ...formData, codigo_telefonico: e.target.value })}
                                className="font-mono h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="idioma_principal" className="text-xs font-semibold">
                                Idioma Principal
                              </Label>
                              <Input
                                id="idioma_principal"
                                placeholder="Ej: es, en, pt"
                                maxLength={10}
                                value={formData.idioma_principal}
                                onChange={(e) => setFormData({ ...formData, idioma_principal: e.target.value.toLowerCase() })}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>

                          <div className="pt-3 flex items-center justify-between border-t border-border/60">
                            <div className="space-y-0.5">
                              <Label htmlFor="activo" className="text-xs font-medium cursor-pointer">
                                Habilitar país para selección activa en el sistema
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Permite asignar este país a empresas, sucursales y pacientes.
                              </p>
                            </div>
                            <Switch
                              id="activo"
                              checked={formData.activo}
                              onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                            />
                          </div>
                        </TabsContent>

                        {/* Tab 2: Moneda y Formatos */}
                        <TabsContent value="formatos" className="mt-0 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="moneda_principal" className="text-xs font-semibold">
                                Moneda Principal (ISO)
                              </Label>
                              <Input
                                id="moneda_principal"
                                placeholder="Ej: MXN, VES, USD, EUR"
                                maxLength={10}
                                value={formData.moneda_principal}
                                onChange={(e) => setFormData({ ...formData, moneda_principal: e.target.value.toUpperCase() })}
                                className="font-mono uppercase h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="impuesto_predeterminado" className="text-xs font-semibold">
                                Impuesto Predeterminado (%)
                              </Label>
                              <Input
                                id="impuesto_predeterminado"
                                type="number"
                                step="0.01"
                                placeholder="Ej: 16.00"
                                value={formData.impuesto_predeterminado}
                                onChange={(e) => setFormData({ ...formData, impuesto_predeterminado: Number(e.target.value) })}
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="formato_moneda" className="text-xs font-semibold">
                                Ejemplo / Formato Moneda
                              </Label>
                              <Input
                                id="formato_moneda"
                                placeholder="Ej: $ 1.234,56 o 1,234.56 $"
                                value={formData.formato_moneda}
                                onChange={(e) => setFormData({ ...formData, formato_moneda: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="formato_fecha" className="text-xs font-semibold">
                                Formato de Fecha
                              </Label>
                              <Select
                                value={formData.formato_fecha}
                                onValueChange={(val) => setFormData({ ...formData, formato_fecha: val })}
                              >
                                <SelectTrigger id="formato_fecha" className="h-9 text-xs">
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
                              <Label htmlFor="separador_miles" className="text-xs font-semibold">
                                Separador de Miles
                              </Label>
                              <Select
                                value={formData.separador_miles}
                                onValueChange={(val) => setFormData({ ...formData, separador_miles: val })}
                              >
                                <SelectTrigger id="separador_miles" className="h-9 text-xs">
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
                              <Label htmlFor="separador_decimales" className="text-xs font-semibold">
                                Separador de Decimales
                              </Label>
                              <Select
                                value={formData.separador_decimales}
                                onValueChange={(val) => setFormData({ ...formData, separador_decimales: val })}
                              >
                                <SelectTrigger id="separador_decimales" className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=",">Coma ( , )</SelectItem>
                                  <SelectItem value=".">Punto ( . )</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="decimales_moneda" className="text-xs font-semibold">
                                Cantidad de Decimales
                              </Label>
                              <Input
                                id="decimales_moneda"
                                type="number"
                                min={0}
                                max={4}
                                value={formData.decimales_moneda}
                                onChange={(e) => setFormData({ ...formData, decimales_moneda: Number(e.target.value) })}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        </TabsContent>

                        {/* Tab 3: Geolocalización */}
                        <TabsContent value="geo" className="mt-0 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="continente" className="text-xs font-semibold">
                                Continente
                              </Label>
                              <Select
                                value={formData.continente}
                                onValueChange={(val) => setFormData({ ...formData, continente: val })}
                              >
                                <SelectTrigger id="continente" className="h-9 text-xs">
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
                              <Label htmlFor="zona_horaria" className="text-xs font-semibold">
                                Zona Horaria (IANA)
                              </Label>
                              <Input
                                id="zona_horaria"
                                placeholder="Ej: America/Mexico_City, America/Caracas"
                                value={formData.zona_horaria}
                                onChange={(e) => setFormData({ ...formData, zona_horaria: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="latitud" className="text-xs font-semibold">
                                Latitud Geográfica
                              </Label>
                              <Input
                                id="latitud"
                                type="number"
                                step="any"
                                placeholder="Ej: 19.4326"
                                value={formData.latitud}
                                onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                                className="h-9 text-xs font-mono"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="longitud" className="text-xs font-semibold">
                                Longitud Geográfica
                              </Label>
                              <Input
                                id="longitud"
                                type="number"
                                step="any"
                                placeholder="Ej: -99.1332"
                                value={formData.longitud}
                                onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                                className="h-9 text-xs font-mono"
                              />
                            </div>
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
                        {currentPaisStepIndex > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab(PAIS_STEPS[currentPaisStepIndex - 1].id)}
                            className="h-8 text-xs cursor-pointer gap-1"
                          >
                            <ChevronLeft className="size-3.5" />
                            <span>Anterior</span>
                          </Button>
                        )}

                        {currentPaisStepIndex < PAIS_STEPS.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab(PAIS_STEPS[currentPaisStepIndex + 1].id)}
                            className="h-8 text-xs cursor-pointer gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                          >
                            <span>Siguiente: {PAIS_STEPS[currentPaisStepIndex + 1].shortTitle}</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}

                        <Button
                          type="submit"
                          size="sm"
                          disabled={saving}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold h-8 text-xs cursor-pointer shadow-xs gap-1.5"
                        >
                          <Globe className="size-3.5" />
                          <span>{saving ? 'Guardando...' : editingPais ? 'Guardar Cambios' : 'Registrar País'}</span>
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
