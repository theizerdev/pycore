import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { medicosApi } from '../../api/medicos';
import { especialidadesApi } from '../../api/especialidades';
import { sucursalesApi } from '../../api/sucursales';
import type { Medico, Especialidad, Sucursal } from '../../types';
import { DoctorFormModal } from './DoctorFormModal';
import { toast } from 'sonner';
import {
  UserCheck,
  Stethoscope,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Award,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  FileCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { getCountryFlagEmoji } from '../../context/RegionalContext';

export const DoctoresPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('medicos.crear');
  const canEdit = hasPermission('medicos.editar');
  const canDelete = hasPermission('medicos.eliminar');

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('all');
  const [filterSucursal, setFilterSucursal] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal de creación / edición
  const [modalOpen, setModalOpen] = useState(false);
  const [medicoToEdit, setMedicoToEdit] = useState<Medico | null>(null);

  // Modal de confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [medicoToDelete, setMedicoToDelete] = useState<Medico | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMedicos = async () => {
    setLoading(true);
    try {
      const [medRes, espRes, sucRes] = await Promise.all([
        medicosApi.list(),
        especialidadesApi.list(),
        sucursalesApi.list(),
      ]);
      setMedicos(medRes);
      setEspecialidades(espRes);
      setSucursales(sucRes);
    } catch (err) {
      console.error('Error cargando lista de médicos:', err);
      toast.error('No se pudo cargar el directorio médico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicos();
  }, []);

  // Filtrado de médicos en cliente
  const filteredMedicos = useMemo(() => {
    return medicos.filter((m) => {
      // Búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = `${m.nombres} ${m.apellidos}`.toLowerCase().includes(q);
        const matchDoc = m.documento_identidad?.toLowerCase().includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        const matchLic = m.licencia_medica?.toLowerCase().includes(q);
        const matchEsp = m.especialidad_nombre?.toLowerCase().includes(q);
        const matchSub = (m.subespecialidades || []).some((s) => s.nombre.toLowerCase().includes(q));
        if (!matchName && !matchDoc && !matchEmail && !matchLic && !matchEsp && !matchSub) {
          return false;
        }
      }

      // Especialidad
      if (filterEspecialidad !== 'all') {
        if (m.especialidad_id !== Number(filterEspecialidad)) return false;
      }

      // Sucursal
      if (filterSucursal !== 'all') {
        const sId = Number(filterSucursal);
        const isDefault = m.sucursal_defecto_id === sId;
        const isAssigned = (m.sucursales_ids || []).includes(sId);
        if (!isDefault && !isAssigned) return false;
      }

      // Estado
      if (filterEstado !== 'all') {
        const isActive = filterEstado === 'active';
        if (m.activo !== isActive) return false;
      }

      return true;
    });
  }, [medicos, searchTerm, filterEspecialidad, filterSucursal, filterEstado]);

  // KPIs
  const stats = useMemo(() => {
    const total = medicos.length;
    const active = medicos.filter((m) => m.activo).length;
    const withSubesp = medicos.filter((m) => (m.subespecialidades || []).length > 0).length;
    const specialtiesCovered = new Set(medicos.map((m) => m.especialidad_id)).size;
    return { total, active, withSubesp, specialtiesCovered };
  }, [medicos]);

  const handleOpenCreate = () => {
    setMedicoToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (m: Medico) => {
    setMedicoToEdit(m);
    setModalOpen(true);
  };

  const handleOpenDelete = (m: Medico) => {
    setMedicoToDelete(m);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!medicoToDelete) return;
    setDeleting(true);
    try {
      await medicosApi.delete(medicoToDelete.id);
      toast.success(`Médico Dr(a). ${medicoToDelete.nombres} ${medicoToDelete.apellidos} inactivado`);
      fetchMedicos();
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      toast.error('Error al inactivar médico', {
        description: err.response?.data?.detail || 'No se pudo completar la acción',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── CABECERA Y ACCIONES ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Médicos y Especialistas</span>
                <Badge variant="outline" className="text-xs font-mono font-medium border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5">
                  Directorio Clínico
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Cuerpo médico asistencial, subespecialidades acumuladas, credenciales sanitarias y asignación de agenda
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMedicos}
            disabled={loading}
            className="h-8 text-xs cursor-pointer"
            title="Refrescar directorio"
          >
            <RefreshCw className={`size-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>

          {canCreate && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer h-8 text-xs gap-1.5"
            >
              <Plus className="size-4" />
              <span>Nuevo Médico</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── TARJETAS KPI DE RESUMEN ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Médicos</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Activos en Consulta</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Especialidades Cubiertas</p>
              <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">{stats.specialtiesCovered}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Stethoscope className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Con Subespecialidades</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.withSubesp}</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Award className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ───────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/70 p-3.5 backdrop-blur-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula, correo, licencia o subespecialidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 h-9 text-xs"
            />
          </div>

          {/* Filtro por Especialidad */}
          <Select value={filterEspecialidad} onValueChange={setFilterEspecialidad}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
              <SelectValue placeholder="Todas las especialidades" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all" className="text-xs font-semibold">Todas las especialidades</SelectItem>
              {especialidades.map((esp) => (
                <SelectItem key={esp.id} value={String(esp.id)} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: esp.color || '#0d9488' }} />
                    <span>{esp.nombre}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Sucursal */}
          <Select value={filterSucursal} onValueChange={setFilterSucursal}>
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">Todas las sedes</SelectItem>
              {sucursales.map((suc) => (
                <SelectItem key={suc.id} value={String(suc.id)} className="text-xs">
                  {suc.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Estado */}
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">Todos</SelectItem>
              <SelectItem value="active" className="text-xs">Solo Activos</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alternador de Vista (Cuadrícula / Tabla) */}
        <div className="flex items-center gap-1 border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="size-8 cursor-pointer"
            title="Vista de cuadrícula"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
            className="size-8 cursor-pointer"
            title="Vista de tabla"
          >
            <TableIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── LISTADO: VISTA DE CUADRÍCULA (GRID) ────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMedicos.map((med) => {
            const initials = `${med.nombres.charAt(0)}${med.apellidos.charAt(0)}`.toUpperCase();
            const subCount = (med.subespecialidades || []).length;

            return (
              <Card
                key={med.id}
                className="group relative border-border/80 bg-card/80 hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Borde superior con color distintivo de agenda del médico */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: med.color || '#0d9488' }}
                />

                <CardHeader className="p-4 pb-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar del Médico con iniciales */}
                      <div
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl font-bold text-sm text-white shadow-xs border-2 border-white/20"
                        style={{ backgroundColor: med.color || '#0d9488' }}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-foreground text-sm tracking-tight truncate">
                            Dr(a). {med.nombres} {med.apellidos}
                          </h3>
                        </div>

                        {/* Especialidad Principal */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold px-2 py-0 border"
                            style={{
                              borderColor: `${med.especialidad_color || '#0d9488'}40`,
                              backgroundColor: `${med.especialidad_color || '#0d9488'}15`,
                              color: med.especialidad_color || '#0d9488',
                            }}
                          >
                            {med.especialidad_nombre || 'Especialista'}
                          </Badge>

                          {med.licencia_medica && (
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                              <FileCheck className="size-3 text-teal-600" />
                              <span>{med.licencia_medica}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleOpenEdit(med)} className="gap-2 cursor-pointer">
                            <Edit2 className="size-3.5 text-primary" />
                            <span>Editar Ficha</span>
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(med)}
                            className="gap-2 text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Inactivar Médico</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Datos de contacto */}
                  <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="size-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{med.email}</span>
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        {med.tipo_documento}-{med.documento_identidad}
                      </Badge>
                    </div>

                    {med.telefono && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">
                          {getCountryFlagEmoji(med.pais_codigo_iso2)}
                        </span>
                        <Phone className="size-3 text-muted-foreground/70" />
                        <span className="font-mono text-[11px] text-foreground">
                          {med.pais_codigo_telefonico} {med.telefono}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Subespecialidades (Carrito chips) */}
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground flex items-center gap-1">
                        <Award className="size-3 text-teal-600" />
                        <span>Subespecialidades ({subCount})</span>
                      </span>
                    </div>

                    {subCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {med.subespecialidades.map((s, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] bg-muted/40 font-medium border-border/70 text-foreground py-0.5"
                            title={`${s.nivel_experiencia} • ${s.anos_servicio} años de servicio`}
                          >
                            <span>{s.nombre}</span>
                            <span className="ml-1 text-[9px] text-teal-600 dark:text-teal-400 font-bold">
                              ({s.anos_servicio}a)
                            </span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">
                        Sin subespecialidades registradas
                      </p>
                    )}
                  </div>

                  {/* Pie de Tarjeta: Estado y Botón Editar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`size-2 rounded-full ${
                          med.activo ? 'bg-emerald-500' : 'bg-zinc-400'
                        }`}
                      />
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {med.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      {med.usuario_id && (
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5">
                          Usuario Activo
                        </Badge>
                      )}
                    </div>

                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(med)}
                        className="h-7 text-xs text-primary hover:bg-primary/10 cursor-pointer gap-1"
                      >
                        <Edit2 className="size-3" />
                        <span>Editar</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LISTADO: VISTA DE TABLA DETALLADA ──────────────────────────── */}
      {viewMode === 'table' && (
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Médico</th>
                  <th className="p-3">Identificación</th>
                  <th className="p-3">Especialidad Principal</th>
                  <th className="p-3">Subespecialidades</th>
                  <th className="p-3">Contacto</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredMedicos.map((med) => {
                  const subCount = (med.subespecialidades || []).length;
                  return (
                    <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="size-3 rounded-full shrink-0"
                            style={{ backgroundColor: med.color || '#0d9488' }}
                          />
                          <div>
                            <span className="font-bold text-foreground block">
                              Dr(a). {med.nombres} {med.apellidos}
                            </span>
                            {med.licencia_medica && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Lic: {med.licencia_medica}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        <Badge variant="outline" className="text-[10px]">
                          {med.tipo_documento}-{med.documento_identidad}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${med.especialidad_color || '#0d9488'}15`,
                            color: med.especialidad_color || '#0d9488',
                          }}
                        >
                          {med.especialidad_nombre}
                        </Badge>
                      </td>

                      <td className="p-3 max-w-xs">
                        {subCount > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {med.subespecialidades.map((s, idx) => (
                              <Badge key={idx} variant="outline" className="text-[9px] bg-muted/30">
                                {s.nombre} ({s.anos_servicio}a)
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className="text-[11px] text-foreground block">{med.email}</span>
                          {med.telefono && (
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                              <span>{getCountryFlagEmoji(med.pais_codigo_iso2)}</span>
                              <span>{med.pais_codigo_telefonico} {med.telefono}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            med.activo
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-500/10 text-zinc-600'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${med.activo ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                          {med.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(med)}
                              className="size-7 text-primary hover:bg-primary/10 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(med)}
                              className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Inactivar"
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

      {/* Estado Vacío */}
      {!loading && filteredMedicos.length === 0 && (
        <Card className="border-dashed border-border/80 bg-muted/10 p-12 text-center space-y-3">
          <UserCheck className="size-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-bold text-base text-foreground">No se encontraron médicos</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchTerm || filterEspecialidad !== 'all' || filterSucursal !== 'all'
              ? 'No hay profesionales que coincidan con los filtros de búsqueda aplicados.'
              : 'Aún no hay médicos registrados en esta clínica. Registra el primero para comenzar a gestionar consultas.'}
          </p>
          {canCreate && (
            <Button onClick={handleOpenCreate} size="sm" className="h-8 text-xs cursor-pointer gap-1.5">
              <Plus className="size-4" />
              <span>Registrar Primer Médico</span>
            </Button>
          )}
        </Card>
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ───────────────────────────────── */}
      <DoctorFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        medicoToEdit={medicoToEdit}
        onSaved={fetchMedicos}
      />

      {/* ── DIALOG DE CONFIRMACIÓN DE INACTIVACIÓN ─────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-4" />
              <span>¿Inactivar médico del servicio?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              El Dr(a). <b>{medicoToDelete?.nombres} {medicoToDelete?.apellidos}</b> dejará de estar disponible
              para nuevas citas y turnos en la clínica. Su cuenta de usuario y su historial de consultas
              previas se mantendrán protegidos para fines legales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs" disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-8 text-xs font-semibold"
            >
              {deleting ? 'Inactivando...' : 'Confirmar Inactivación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DoctoresPage;
