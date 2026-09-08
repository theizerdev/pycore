import React, { useEffect, useState, useMemo } from 'react';
import type { Empresa, Pais } from '../../types';
import { empresasApi } from '../../api/empresas';
import { paisesApi } from '../../api/paises';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { optimizeImageFile } from '../../lib/imageOptimizer';
import {
  Building2,
  Plus,
  CheckCircle,
  XCircle,
  MoreVertical,
  Pencil,
  ToggleRight,
  Phone,
  Mail,
  Trash2,
  MapPin,
  Building,
  RotateCcw,
  Globe,
  Compass,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  FileImage,
  Link as LinkIcon,
  CreditCard,
  Landmark,
  Smartphone,
  Coins
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

export const EmpresasPage: React.FC = () => {
  const { user, hasPermission, refreshUser } = useAuth();
  const isSuperAdmin = user?.es_superadmin ?? false;

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [paisFilter, setPaisFilter] = useState<string>('todos');
  const [perPageFilter, setPerPageFilter] = useState<number>(10);

  // Estados Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado Modal Eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const initialFormState = {
    nombre: '',
    identificacion_fiscal: '',
    telefono: '',
    email: '',
    pais_id: undefined as number | undefined,
    pais_telefono_id: undefined as number | undefined,
    moneda_principal: 'USD' as 'USD' | 'VES',
    direccion: '',
    ciudad: '',
    latitud: '' as string | number,
    longitud: '' as string | number,
    logo_url: '',
    logo_mini_url: '',
    logo_mini_dark_url: '',
    activo: true,
    // Métodos de Pago
    banco_nombre: '',
    banco_tipo_cuenta: 'Cuenta Corriente',
    banco_numero_cuenta: '',
    banco_titular: '',
    banco_doc_identidad: '',
    pagomovil_banco: '',
    pagomovil_telefono: '',
    pagomovil_doc_identidad: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isDraggingFull, setIsDraggingFull] = useState(false);
  const [isDraggingMini, setIsDraggingMini] = useState(false);
  const [isDraggingMiniDark, setIsDraggingMiniDark] = useState(false);

  const processImageFile = async (
    file: File,
    field: 'logo_url' | 'logo_mini_url' | 'logo_mini_dark_url',
    successMsg: string
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP)');
      return;
    }

    try {
      const isMini = field !== 'logo_url';
      const maxWidth = isMini ? 400 : 1000;
      const maxHeight = isMini ? 400 : 1000;

      const result = await optimizeImageFile(file, maxWidth, maxHeight, 0.85);

      setFormData((prev) => ({ ...prev, [field]: result.dataUrl }));

      if (result.wasOptimized) {
        toast.success(
          `✨ Imagen optimizada automáticamente: reducida de ${result.originalSizeMB} MB a ${result.newSizeKB} KB`,
          { duration: 4500 }
        );
      } else {
        toast.success(successMsg);
      }
    } catch (err) {
      console.error('Error optimizando imagen:', err);
      toast.error('Ocurrió un error al procesar y optimizar la imagen.');
    }
  };

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      const [empData, paisData] = await Promise.all([
        empresasApi.list(),
        paisesApi.list({ activo: true })
      ]);
      setEmpresas(empData);
      setPaises(paisData);

      // Si no es SuperAdmin, auto-cargar su única empresa para edición directa
      if (!isSuperAdmin && empData.length > 0) {
        const myEmp = empData[0];
        setEditingEmpresa(myEmp);
        setFormData({
          nombre: myEmp.nombre || '',
          identificacion_fiscal: myEmp.identificacion_fiscal || myEmp.documento || '',
          telefono: myEmp.telefono || '',
          email: myEmp.email || '',
          pais_id: myEmp.pais_id || undefined,
          pais_telefono_id: myEmp.pais_telefono_id || undefined,
          moneda_principal: (myEmp.moneda_principal as 'USD' | 'VES') || 'USD',
          direccion: myEmp.direccion || '',
          ciudad: myEmp.ciudad || '',
          latitud: myEmp.latitud !== null && myEmp.latitud !== undefined ? myEmp.latitud : '',
          longitud: myEmp.longitud !== null && myEmp.longitud !== undefined ? myEmp.longitud : '',
          logo_url: myEmp.logo_url || '',
          logo_mini_url: myEmp.logo_mini_url || '',
          logo_mini_dark_url: myEmp.logo_mini_dark_url || '',
          activo: myEmp.activo ?? true,
          banco_nombre: myEmp.banco_nombre || '',
          banco_tipo_cuenta: myEmp.banco_tipo_cuenta || 'Cuenta Corriente',
          banco_numero_cuenta: myEmp.banco_numero_cuenta || '',
          banco_titular: myEmp.banco_titular || '',
          banco_doc_identidad: myEmp.banco_doc_identidad || '',
          pagomovil_banco: myEmp.pagomovil_banco || '',
          pagomovil_telefono: myEmp.pagomovil_telefono || '',
          pagomovil_doc_identidad: myEmp.pagomovil_doc_identidad || '',
        });
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // País seleccionado actual en el formulario para centrado del mapa
  const selectedPais = useMemo(() => {
    if (!formData.pais_id) return null;
    return paises.find(p => p.id === Number(formData.pais_id)) || null;
  }, [formData.pais_id, paises]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = empresas.length;
    const activos = empresas.filter((e) => e.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [empresas]);

  // Filtrado reactivo con búsqueda en múltiples campos
  const filteredEmpresas = useMemo(() => {
    return empresas.filter((e) => {
      const doc = e.identificacion_fiscal || e.documento || '';
      const matchSearch =
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.ciudad && e.ciudad.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.pais?.nombre && e.pais.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && e.activo) ||
        (statusFilter === 'inactivos' && !e.activo);

      const matchPais =
        paisFilter === 'todos' ||
        (e.pais_id && String(e.pais_id) === paisFilter);

      return matchSearch && matchStatus && matchPais;
    });
  }, [empresas, searchTerm, statusFilter, paisFilter]);

  // Manejadores
  const handleCreateClick = () => {
    setEditingEmpresa(null);
    const defaultPais = paises.length > 0 ? paises[0] : null;
    setFormData({
      ...initialFormState,
      pais_id: defaultPais?.id,
      pais_telefono_id: defaultPais?.id,
      moneda_principal: 'USD',
      latitud: defaultPais?.latitud ?? '',
      longitud: defaultPais?.longitud ?? '',
    });
    setActiveTab('general');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setFormData({
      nombre: emp.nombre,
      identificacion_fiscal: emp.identificacion_fiscal || emp.documento || '',
      telefono: emp.telefono || '',
      email: emp.email || '',
      pais_id: emp.pais_id || undefined,
      pais_telefono_id: emp.pais_telefono_id || emp.pais_id || undefined,
      moneda_principal: (emp.moneda_principal as 'USD' | 'VES') || 'USD',
      direccion: emp.direccion || '',
      ciudad: emp.ciudad || '',
      latitud: emp.latitud !== null && emp.latitud !== undefined ? emp.latitud : '',
      longitud: emp.longitud !== null && emp.longitud !== undefined ? emp.longitud : '',
      logo_url: emp.logo_url || emp.logo || '',
      logo_mini_url: emp.logo_mini_url || '',
      logo_mini_dark_url: emp.logo_mini_dark_url || '',
      activo: emp.activo,
      banco_nombre: emp.banco_nombre || '',
      banco_tipo_cuenta: emp.banco_tipo_cuenta || 'Cuenta Corriente',
      banco_numero_cuenta: emp.banco_numero_cuenta || '',
      banco_titular: emp.banco_titular || '',
      banco_doc_identidad: emp.banco_doc_identidad || '',
      pagomovil_banco: emp.pagomovil_banco || '',
      pagomovil_telefono: emp.pagomovil_telefono || '',
      pagomovil_doc_identidad: emp.pagomovil_doc_identidad || '',
    });
    setActiveTab('general');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (empresa: Empresa) => {
    try {
      await empresasApi.update(empresa.id, { activo: !empresa.activo });
      toast.success(`Empresa ${!empresa.activo ? 'activada' : 'desactivada'} exitosamente`);
      fetchEmpresas();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado de la empresa');
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
      // Si no tenía coordenadas o estaban vacías, asignar las del país
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
      pais_id: formData.pais_id ? Number(formData.pais_id) : null,
      pais_telefono_id: formData.pais_telefono_id ? Number(formData.pais_telefono_id) : null,
      latitud: formData.latitud !== '' ? Number(formData.latitud) : null,
      longitud: formData.longitud !== '' ? Number(formData.longitud) : null,
    };

    try {
      if (editingEmpresa) {
        await empresasApi.update(editingEmpresa.id, payload);
        toast.success('Empresa actualizada exitosamente');
        if (user && editingEmpresa.id === user.empresa_id) {
          await refreshUser();
        }
      } else {
        await empresasApi.create(payload);
        toast.success('Empresa creada exitosamente');
      }
      setIsModalOpen(false);
      fetchEmpresas();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al guardar la empresa';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (emp: Empresa) => {
    setEmpresaToDelete(emp);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!empresaToDelete) return;
    try {
      setDeleting(true);
      await empresasApi.delete(empresaToDelete.id);
      toast.success('Empresa eliminada exitosamente');
      setDeleteModalOpen(false);
      setEmpresaToDelete(null);
      fetchEmpresas();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar la empresa');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Empresa>[] = [
    {
      header: 'Empresa / Institución',
      accessorKey: 'nombre',
      sortable: true,
      className: 'font-medium',
      cell: (empresa) => (
        <div className="flex items-center gap-3">
          {empresa.logo_mini_url || empresa.logo_url || empresa.logo ? (
            <img
              src={empresa.logo_mini_url || empresa.logo_url || empresa.logo || ''}
              alt={empresa.nombre}
              className="w-8 h-8 rounded object-contain border bg-slate-50 dark:bg-slate-800"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm text-foreground">{empresa.nombre}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-mono">
                {empresa.identificacion_fiscal || empresa.documento || 'SIN RIF'}
              </p>
              {empresa.pais && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  {empresa.pais.codigo_iso2}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Ubicación & Geolocalización',
      cell: (empresa) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate max-w-[220px]">
              {empresa.ciudad ? `${empresa.ciudad}, ${empresa.direccion || ''}` : empresa.direccion || 'No registrada'}
            </span>
          </div>
          {empresa.latitud !== null && empresa.latitud !== undefined && empresa.longitud !== null && empresa.longitud !== undefined && (
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 pl-5">
              <Compass className="w-2.5 h-2.5 text-blue-500" />
              <span>{empresa.latitud.toFixed(4)}, {empresa.longitud.toFixed(4)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Contacto',
      cell: (empresa) => (
        <div className="space-y-0.5">
          {empresa.telefono && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 text-muted-foreground/70" />
              <span>{empresa.telefono}</span>
            </div>
          )}
          {empresa.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 text-muted-foreground/70" />
              <span>{empresa.email}</span>
            </div>
          )}
          {!empresa.telefono && !empresa.email && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Sedes',
      cell: (empresa) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Building className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{empresa.sucursales?.length || 0} sedes</span>
        </div>
      ),
    },
    {
      header: 'Moneda',
      cell: (empresa) => (
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 w-fit',
          empresa.moneda_principal === 'VES'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
        )}>
          {empresa.moneda_principal === 'VES' ? '🇻🇪 VES (Bs.)' : '💵 USD ($)'}
        </span>
      ),
    },
    {
      header: 'Estado',
      sortable: true,
      accessorKey: 'activo',
      cell: (empresa) => (
        <div className="flex items-center space-x-2">
          {hasPermission('empresas.editar') && (
            <Switch
              checked={empresa.activo}
              onCheckedChange={() => handleToggleStatus(empresa)}
            />
          )}
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              empresa.activo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900'
            )}
          >
            {empresa.activo ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (empresa) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasPermission('empresas.editar') && (
              <DropdownMenuItem onClick={() => handleEditClick(empresa)}>
                <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                Editar
              </DropdownMenuItem>
            )}
            {hasPermission('empresas.editar') && (
              <DropdownMenuItem onClick={() => handleToggleStatus(empresa)}>
                <ToggleRight className="mr-2 h-4 w-4 text-amber-500" />
                {empresa.activo ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
            )}
            {hasPermission('empresas.eliminar') && (
              <DropdownMenuItem
                onClick={() => handleDeleteClick(empresa)}
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

  const renderCompanyFormTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full mb-6 ${isSuperAdmin || editingEmpresa?.id === 1 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="general" className="flex items-center gap-2 text-xs">
          <Building2 className="h-4 w-4" />
          General y Contacto
        </TabsTrigger>
        <TabsTrigger value="logos" className="flex items-center gap-2 text-xs">
          <ImageIcon className="h-4 w-4" />
          Identidad & Logos
        </TabsTrigger>
        <TabsTrigger value="ubicacion" className="flex items-center gap-2 text-xs">
          <MapPin className="h-4 w-4" />
          Ubicación & Mapa
        </TabsTrigger>
        {(isSuperAdmin || editingEmpresa?.id === 1) && (
          <TabsTrigger value="metodos_pago" className="flex items-center gap-2 text-xs">
            <CreditCard className="h-4 w-4 text-amber-500" />
            Métodos de Pago
          </TabsTrigger>
        )}
      </TabsList>

      {/* Tab 1: General y Contacto */}
      <TabsContent value="general" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Razón Social */}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="razon_social">Razón Social / Nombre de Empresa *</Label>
            <Input
              id="razon_social"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Centro Médico Santa Fe C.A."
            />
          </div>

          {/* Documento */}
          <div className="space-y-1.5">
            <Label htmlFor="identificacion_fiscal">Documento / RIF / RUC *</Label>
            <Input
              id="identificacion_fiscal"
              required
              value={formData.identificacion_fiscal}
              onChange={(e) => setFormData({ ...formData, identificacion_fiscal: e.target.value })}
              placeholder="J-12345678-9"
            />
          </div>

          {/* País */}
          <div className="space-y-1.5">
            <Label htmlFor="empresa_pais">País de Operación *</Label>
            <Select
              value={formData.pais_id ? String(formData.pais_id) : ''}
              onValueChange={handlePaisChange}
            >
              <SelectTrigger id="empresa_pais">
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

          {/* Moneda Principal de Operación */}
          <div className="space-y-1.5">
            <Label htmlFor="moneda_principal" className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Moneda Principal de Operación *</span>
            </Label>
            <Select
              value={formData.moneda_principal || 'USD'}
              onValueChange={(val: 'USD' | 'VES') => setFormData({ ...formData, moneda_principal: val })}
            >
              <SelectTrigger id="moneda_principal">
                <SelectValue placeholder="Selecciona la moneda principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600">$</span>
                    <span>Dólar Estadounidense (USD - $)</span>
                  </div>
                </SelectItem>
                <SelectItem value="VES">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">Bs.</span>
                    <span>Bolívar Venezolano (VES - Bs.)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {formData.moneda_principal === 'USD'
                ? '💵 Precios y montos en Dólares ($) con equivalencia en Bolívares a la tasa BCV.'
                : '🇻🇪 Precios y montos reflejados directamente en Bolívares (Bs.).'}
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@centromedico.com"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+58 212 555-0000"
            />
          </div>

          {/* Estado Switch (Solo SuperAdmin) */}
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <div className="flex items-center space-x-2 pt-1">
                <Switch
                  id="status"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Tab 2: Identidad Corporativa & Logos con Drag & Drop */}
      <TabsContent value="logos" className="space-y-6">
        {/* ZONA 1: Logo Completo (Reportes & PDF) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <FileImage className="size-4 text-teal-600 dark:text-teal-400" />
              <span>Logo Completo (Reportes, PDF y Facturas)</span>
            </Label>
            {formData.logo_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData({ ...formData, logo_url: '' })}
                className="h-6 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="size-3 mr-1" />
                Quitar
              </Button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFull(true);
            }}
            onDragLeave={() => setIsDraggingFull(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFull(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processImageFile(file, 'logo_url', 'Logo completo cargado correctamente');
            }}
            className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[130px] ${
              isDraggingFull
                ? 'border-teal-500 bg-teal-500/10 scale-[1.01]'
                : formData.logo_url
                ? 'border-teal-500/40 bg-slate-50 dark:bg-slate-900/40'
                : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-500/5'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processImageFile(file, 'logo_url', 'Logo completo cargado correctamente');
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />

            {formData.logo_url ? (
              <div className="space-y-2 flex flex-col items-center">
                <img
                  src={formData.logo_url}
                  alt="Logo Completo"
                  className="max-h-20 max-w-full object-contain rounded-lg shadow-xs"
                />
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">✓ Imagen cargada exitosamente</p>
                <span className="text-[10px] text-muted-foreground">Arrastra otra imagen para reemplazar</span>
              </div>
            ) : (
              <div className="space-y-2 flex flex-col items-center pointer-events-none">
                <div className="size-10 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Arrastra y suelta tu Logo Completo aquí</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">o haz clic para explorar archivos (PNG, JPG, SVG)</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1 pt-1">
            <Label htmlFor="logo_url_input" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <LinkIcon className="size-3" />
              <span>O ingresa la URL directa de la imagen:</span>
            </Label>
            <Input
              id="logo_url_input"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://ejemplo.com/logo-completo.png"
              className="text-xs h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* ZONA 2: Logo Mini Claro */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-cyan-600 dark:text-cyan-400" />
                <span>Logo Mini Claro (Fondos Oscuros / Semi-Dark)</span>
              </Label>
              {formData.logo_mini_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, logo_mini_url: '' })}
                  className="h-6 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="size-3 mr-1" />
                  Quitar
                </Button>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingMini(true);
              }}
              onDragLeave={() => setIsDraggingMini(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingMini(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processImageFile(file, 'logo_mini_url', 'Logo mini claro cargado correctamente');
              }}
              className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
                isDraggingMini
                  ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]'
                  : formData.logo_mini_url
                  ? 'border-cyan-500/40 bg-slate-950/80 text-white'
                  : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-cyan-500/5'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file, 'logo_mini_url', 'Logo mini claro cargado correctamente');
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />

              {formData.logo_mini_url ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xs">
                    <img
                      src={formData.logo_mini_url}
                      alt="Logo Mini Claro"
                      className="size-9 object-contain rounded-md"
                    />
                  </div>
                  <p className="text-[11px] text-cyan-400 font-medium">✓ Isotipo claro para fondo oscuro</p>
                  <span className="text-[10px] text-slate-400">Arrastra otra imagen para reemplazar</span>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center pointer-events-none">
                  <div className="size-10 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <UploadCloud className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Isotipo Claro (Para Fondos Oscuros)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Usado en menú lateral oscuro o modo noche</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <Label htmlFor="logo_mini_url_input" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <LinkIcon className="size-3" />
                <span>URL directa logo claro:</span>
              </Label>
              <Input
                id="logo_mini_url_input"
                value={formData.logo_mini_url}
                onChange={(e) => setFormData({ ...formData, logo_mini_url: e.target.value })}
                placeholder="https://ejemplo.com/logo-mini-claro.png"
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* ZONA 3: Logo Mini Oscuro */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
                <span>Logo Mini Oscuro (Fondos Claros / Light Mode)</span>
              </Label>
              {formData.logo_mini_dark_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, logo_mini_dark_url: '' })}
                  className="h-6 text-[10px] text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="size-3 mr-1" />
                  Quitar
                </Button>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingMiniDark(true);
              }}
              onDragLeave={() => setIsDraggingMiniDark(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingMiniDark(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processImageFile(file, 'logo_mini_dark_url', 'Logo mini oscuro cargado correctamente');
              }}
              className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
                isDraggingMiniDark
                  ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                  : formData.logo_mini_dark_url
                  ? 'border-amber-500/40 bg-white dark:bg-slate-100 text-slate-900'
                  : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-500/5'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file, 'logo_mini_dark_url', 'Logo mini oscuro cargado correctamente');
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />

              {formData.logo_mini_dark_url ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <img
                      src={formData.logo_mini_dark_url}
                      alt="Logo Mini Oscuro"
                      className="size-9 object-contain rounded-md"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium">✓ Isotipo oscuro para fondo claro</p>
                  <span className="text-[10px] text-slate-500">Arrastra otra imagen para reemplazar</span>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center pointer-events-none">
                  <div className="size-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <UploadCloud className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Isotipo Oscuro (Para Fondos Claros)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Usado en menú lateral blanco o modo día</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <Label htmlFor="logo_mini_dark_url_input" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <LinkIcon className="size-3" />
                <span>URL directa logo oscuro:</span>
              </Label>
              <Input
                id="logo_mini_dark_url_input"
                value={formData.logo_mini_dark_url}
                onChange={(e) => setFormData({ ...formData, logo_mini_dark_url: e.target.value })}
                placeholder="https://ejemplo.com/logo-mini-oscuro.png"
                className="text-xs h-8"
              />
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Tab 3: Ubicación & Mapa MapTiler */}
      <TabsContent value="ubicacion" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ciudad">Ciudad / Localidad</Label>
            <Input
              id="ciudad"
              value={formData.ciudad}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              placeholder="Caracas"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="direccion">Dirección Completa</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Av. Principal, Edificio Torre Médica..."
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
              <Label htmlFor="latitud_empresa" className="text-[11px] text-slate-500">
                Latitud Manual
              </Label>
              <Input
                id="latitud_empresa"
                type="number"
                step="any"
                placeholder="Ej: 10.4806"
                className="h-8 text-xs font-mono"
                value={formData.latitud}
                onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitud_empresa" className="text-[11px] text-slate-500">
                Longitud Manual
              </Label>
              <Input
                id="longitud_empresa"
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

      {/* Tab 4: Métodos de Pago (SaaS Master) */}
      {(isSuperAdmin || editingEmpresa?.id === 1) && (
        <TabsContent value="metodos_pago" className="space-y-6">
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1">
            <p className="font-bold flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <CreditCard className="h-4 w-4" />
              Configuración de Métodos de Pago SaaS (Empresa Máster)
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Configura los datos bancarios y Pago Móvil de la empresa principal. Las clínicas visualizarán esta información para realizar sus pagos de suscripción al equivalente en Bolívares (VES) a la tasa del BCV Euro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transferencia Bancaria */}
            <div className="p-4 rounded-xl border bg-card space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Landmark className="h-4 w-4 text-emerald-600" />
                <h4 className="font-bold text-sm text-foreground">Transferencia Bancaria</h4>
              </div>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Banco Destino</Label>
                  <Input
                    value={formData.banco_nombre}
                    onChange={(e) => setFormData({ ...formData, banco_nombre: e.target.value })}
                    placeholder="Ej: Banco de Venezuela"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Cuenta</Label>
                    <Input
                      value={formData.banco_tipo_cuenta}
                      onChange={(e) => setFormData({ ...formData, banco_tipo_cuenta: e.target.value })}
                      placeholder="Ej: Cuenta Corriente"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">RIF / CI Titular</Label>
                    <Input
                      value={formData.banco_doc_identidad}
                      onChange={(e) => setFormData({ ...formData, banco_doc_identidad: e.target.value })}
                      placeholder="Ej: J-50123456-7"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Titular de la Cuenta</Label>
                  <Input
                    value={formData.banco_titular}
                    onChange={(e) => setFormData({ ...formData, banco_titular: e.target.value })}
                    placeholder="Ej: Vitalmed Salud C.A."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número de Cuenta (20 Dígitos)</Label>
                  <Input
                    value={formData.banco_numero_cuenta}
                    onChange={(e) => setFormData({ ...formData, banco_numero_cuenta: e.target.value })}
                    placeholder="Ej: 0102-0123-45-0123456789"
                  />
                </div>
              </div>
            </div>

            {/* Pago Móvil */}
            <div className="p-4 rounded-xl border bg-card space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <h4 className="font-bold text-sm text-foreground">Pago Móvil (VES)</h4>
              </div>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Banco Pago Móvil</Label>
                  <Input
                    value={formData.pagomovil_banco}
                    onChange={(e) => setFormData({ ...formData, pagomovil_banco: e.target.value })}
                    placeholder="Ej: 0102 - Banco de Venezuela"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono Registrado</Label>
                  <Input
                    value={formData.pagomovil_telefono}
                    onChange={(e) => setFormData({ ...formData, pagomovil_telefono: e.target.value })}
                    placeholder="Ej: 0424-1234567"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cédula / RIF Registrado</Label>
                  <Input
                    value={formData.pagomovil_doc_identidad}
                    onChange={(e) => setFormData({ ...formData, pagomovil_doc_identidad: e.target.value })}
                    placeholder="Ej: J-50123456-7"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ModuleHeader */}
      <ModuleHeader
        icon={<Building2 className="h-6 w-6 text-white" />}
        title="Empresas"
        description="Gestiona las empresas, su asignación de país, geolocalización MapTiler e información de contacto."
        colorClassName="bg-teal-600 dark:bg-teal-700"
      >
        {hasPermission('empresas.crear') && (
          <Button
            onClick={handleCreateClick}
            className="bg-white hover:bg-slate-100 text-teal-800 font-semibold shadow-xs text-xs h-9"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Empresa
          </Button>
        )}
      </ModuleHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          icon={<Building2 className="h-6 w-6" />}
          title="TOTAL EMPRESAS"
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
              placeholder="Buscar por nombre, documento, email, ciudad..."
              className="w-full md:w-80 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FilterField>

          {paises.length > 0 && (
            <FilterField label="País">
              <Select value={paisFilter} onValueChange={setPaisFilter}>
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

          {(searchTerm || statusFilter !== 'todos' || paisFilter !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('todos');
                setPaisFilter('todos');
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
        data={filteredEmpresas}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se encontraron empresas registradas con los filtros aplicados."
      />


      {/* Modal de Creación / Edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'}</span>
              </DialogTitle>
              <DialogDescription>
                Completa la información corporativa y selecciona la ubicación en el mapa interactivo.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 my-2 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {errorMsg}
              </div>
            )}

            <div className="mt-4">
              {renderCompanyFormTabs()}
            </div>

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
                {saving ? 'Guardando...' : editingEmpresa ? 'Guardar Cambios' : 'Crear Empresa'}
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
        title={`¿Eliminar empresa "${empresaToDelete?.nombre}"?`}
        description="Esta acción eliminará permanentemente la empresa y sus asociaciones del sistema."
        isConfirming={deleting}
      />
    </div>
  );
};
