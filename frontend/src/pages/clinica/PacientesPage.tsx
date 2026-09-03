import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { pacientesApi } from '../../api/pacientes';
import { sucursalesApi } from '../../api/sucursales';
import type { Paciente, Sucursal } from '../../types';
import { PatientFormModal } from './PatientFormModal';
import { PatientRecordDrawer } from './PatientRecordDrawer';
import { formatCleanWhatsAppNumber } from './DoctorWelcomeModal';
import { getCountryFlagEmoji } from '../../context/RegionalContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import {
  Users,
  UserPlus,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  Heart,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Stethoscope,
  Activity,
  MapPin,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const PacientesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y Búsqueda
  const [search, setSearch] = useState('');
  const [selectedGrupoSanguineo, setSelectedGrupoSanguineo] = useState<string>('all');
  const [selectedGenero, setSelectedGenero] = useState<string>('all');
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Paciente | null>(null);

  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false);
  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState<Paciente | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Paciente | null>(null);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const data = await pacientesApi.list();
      setPacientes(data);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
      toast.error('Error al sincronizar el directorio de pacientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSucursales = async () => {
    try {
      const data = await sucursalesApi.list();
      setSucursales(data);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
    }
  };

  useEffect(() => {
    fetchPacientes();
    fetchSucursales();
  }, []);

  // Inactivación de paciente
  const handleInactivar = async () => {
    if (!patientToDelete) return;
    try {
      await pacientesApi.delete(patientToDelete.id);
      toast.success(`Paciente ${patientToDelete.nombres} ${patientToDelete.apellidos} inactivado`);
      fetchPacientes();
    } catch (err: any) {
      console.error('Error inactivando paciente:', err);
      toast.error('No se pudo inactivar el paciente', {
        description: err.response?.data?.detail,
      });
    } finally {
      setDeleteConfirmOpen(false);
      setPatientToDelete(null);
    }
  };

  // Filtrado reactivo en memoria
  const filteredPacientes = useMemo(() => {
    return pacientes.filter((p) => {
      // Búsqueda libre
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const docCompleto = `${p.tipo_documento}-${p.documento_identidad}`.toLowerCase();
        const nombreCompleto = `${p.nombres} ${p.apellidos}`.toLowerCase();
        const matchesDoc = docCompleto.includes(term) || p.documento_identidad.toLowerCase().includes(term);
        const matchesName = nombreCompleto.includes(term);
        const matchesEmail = p.email ? p.email.toLowerCase().includes(term) : false;
        const matchesPhone = p.telefono ? p.telefono.includes(term) : false;
        const matchesAlergia = (p.alergias || []).some((al) => al.toLowerCase().includes(term));

        if (!matchesDoc && !matchesName && !matchesEmail && !matchesPhone && !matchesAlergia) {
          return false;
        }
      }

      // Filtro Grupo Sanguíneo
      if (selectedGrupoSanguineo !== 'all') {
        if (p.grupo_sanguineo !== selectedGrupoSanguineo) return false;
      }

      // Filtro Género
      if (selectedGenero !== 'all') {
        if (p.genero !== selectedGenero) return false;
      }

      // Filtro Sucursal
      if (selectedSucursal !== 'all') {
        if (p.sucursal_registro_id !== Number(selectedSucursal)) return false;
      }

      // Filtro Estado
      if (selectedEstado !== 'all') {
        const isActivo = selectedEstado === 'activo';
        if (p.activo !== isActivo) return false;
      }

      return true;
    });
  }, [pacientes, search, selectedGrupoSanguineo, selectedGenero, selectedSucursal, selectedEstado]);

  // Métricas y KPIs
  const stats = useMemo(() => {
    const total = pacientes.length;
    const conAlergias = pacientes.filter((p) => (p.alergias || []).length > 0).length;
    const conSeguro = pacientes.filter((p) => p.seguro_medico && p.seguro_medico.trim().length > 0).length;
    const totalConsultas = pacientes.reduce((acc, p) => acc + (p.total_consultas || 0), 0);
    return { total, conAlergias, conSeguro, totalConsultas };
  }, [pacientes]);

  const openWhatsApp = (p: Paciente) => {
    const clean = formatCleanWhatsAppNumber(p.telefono || '', p.pais_codigo_telefonico || '58');
    if (!clean) {
      toast.warning('Este paciente no tiene número de teléfono registrado');
      return;
    }
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── BARRA DE TÍTULO Y ACCIÓN PRINCIPAL ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="size-7 text-teal-600" />
            <span>Directorio de Pacientes</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Fichas médicas integrales, antecedentes patológicos, alertas de alergias y evolución clínica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchPacientes}
            disabled={loading}
            className="h-9 cursor-pointer gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setPatientToEdit(null);
              setFormModalOpen(true);
            }}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
          >
            <UserPlus className="size-4" />
            <span>Nuevo Paciente</span>
          </Button>
        </div>
      </div>

      {/* ── TARJETAS DE KPIs CLÍNICOS ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Pacientes */}
        <Card className="shadow-2xs border-border/70 hover:border-teal-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Total Pacientes
              </span>
              <span className="text-2xl font-extrabold text-foreground mt-0.5 block">
                {stats.total}
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5 block">
                Fichas activas en la clínica
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Con Alergias Registradas */}
        <Card className="shadow-2xs border-border/70 hover:border-rose-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                Con Alergias
              </span>
              <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 mt-0.5 block">
                {stats.conAlergias}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Alertas farmacológicas
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Con Aseguradora / Póliza */}
        <Card className="shadow-2xs border-border/70 hover:border-indigo-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                Con Seguro / Póliza
              </span>
              <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5 block">
                {stats.conSeguro}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Coberturas médicas
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Consultas Realizadas */}
        <Card className="shadow-2xs border-border/70 hover:border-emerald-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Historial Atenciones
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                {stats.totalConsultas}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Consultas clínicas registradas
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ───────────────────────────── */}
      <Card className="shadow-2xs border-border/70">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Buscador reactivo */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, cédula / DNI, teléfono o alergia..."
                className="pl-9 text-xs h-9 bg-muted/20"
              />
            </div>

            {/* Switch de Vista: Cuadrícula vs Tabla */}
            <div className="flex items-center gap-1 border border-border/80 rounded-lg p-1 bg-muted/30 self-end md:self-auto shrink-0">
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-7 text-xs px-2.5 cursor-pointer gap-1.5"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </Button>
              <Button
                type="button"
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 text-xs px-2.5 cursor-pointer gap-1.5"
              >
                <TableIcon className="size-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </Button>
            </div>
          </div>

          {/* Selectores de Filtro */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Grupo Sanguíneo */}
            <Select value={selectedGrupoSanguineo} onValueChange={setSelectedGrupoSanguineo}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Grupo Sanguíneo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sangre: Todos</SelectItem>
                <SelectItem value="O+">O Positivo (O+)</SelectItem>
                <SelectItem value="O-">O Negativo (O-)</SelectItem>
                <SelectItem value="A+">A Positivo (A+)</SelectItem>
                <SelectItem value="A-">A Negativo (A-)</SelectItem>
                <SelectItem value="B+">B Positivo (B+)</SelectItem>
                <SelectItem value="B-">B Negativo (B-)</SelectItem>
                <SelectItem value="AB+">AB Positivo (AB+)</SelectItem>
                <SelectItem value="AB-">AB Negativo (AB-)</SelectItem>
              </SelectContent>
            </Select>

            {/* Género */}
            <Select value={selectedGenero} onValueChange={setSelectedGenero}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sexo: Todos</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="O">Otro</SelectItem>
              </SelectContent>
            </Select>

            {/* Sucursal */}
            <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sedes: Todas</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Estado */}
            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estado: Todos</SelectItem>
                <SelectItem value="activo">Solo Activos</SelectItem>
                <SelectItem value="inactivo">Solo Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── CONTENIDO PRINCIPAL: CARDS O TABLA ────────────────────── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="size-8 mx-auto animate-spin text-teal-600" />
          <p className="text-xs text-muted-foreground font-medium">Cargando directorio clínico...</p>
        </div>
      ) : filteredPacientes.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-card rounded-2xl border border-border/80 p-8 shadow-2xs">
          <Users className="size-12 mx-auto stroke-1 text-muted-foreground/40" />
          <h3 className="text-sm font-bold text-foreground">No se encontraron pacientes</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No hay coincidencias para "${search}". Intenta con otro criterio de búsqueda.`
              : 'Aún no hay pacientes registrados en este filtro.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setPatientToEdit(null);
              setFormModalOpen(true);
            }}
            className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white cursor-pointer mt-2"
          >
            Registrar Paciente Ahora
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── VISTA EN CUADRÍCULA (CARDS) ─────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPacientes.map((p) => {
            const clean = formatCleanWhatsAppNumber(p.telefono || '', p.pais_codigo_telefonico || '58');
            const alergiasCount = (p.alergias || []).length;

            return (
              <Card
                key={p.id}
                className="overflow-hidden border-border/80 hover:border-teal-500/40 transition-all hover:shadow-xs flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Fila Superior */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex size-12 items-center justify-center rounded-2xl text-white font-bold text-base shadow-xs shrink-0 border-2 border-white/20 ${
                          p.genero === 'F' ? 'bg-pink-600' : 'bg-teal-600'
                        }`}
                      >
                        {p.nombres.charAt(0)}{p.apellidos.charAt(0)}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground hover:text-teal-600 transition-colors line-clamp-1">
                          {p.nombres} {p.apellidos}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono font-semibold">
                            {p.tipo_documento}-{p.documento_identidad}
                          </span>
                          {p.edad_texto && (
                            <>
                              <span>•</span>
                              <span className="text-teal-700 dark:text-teal-300 font-semibold">{p.edad_texto}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menú de opciones */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground cursor-pointer">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPatientForRecord(p);
                            setRecordDrawerOpen(true);
                          }}
                          className="cursor-pointer gap-2"
                        >
                          <FileText className="size-3.5 text-teal-600" />
                          <span>Ver Ficha e Historial</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => openWhatsApp(p)}
                          className="cursor-pointer gap-2 text-emerald-600"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>Contactar por WhatsApp</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => {
                            setPatientToEdit(p);
                            setFormModalOpen(true);
                          }}
                          className="cursor-pointer gap-2"
                        >
                          <Edit className="size-3.5 text-muted-foreground" />
                          <span>Editar Datos</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setPatientToDelete(p);
                            setDeleteConfirmOpen(true);
                          }}
                          className="cursor-pointer gap-2 text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Inactivar Paciente</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Ficha Médica Rápida: Sangre y Alergias */}
                  <div className="p-2.5 rounded-xl bg-muted/25 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Heart className="size-3.5 text-rose-600 fill-rose-600/20" />
                        <span className="text-[11px] text-muted-foreground font-medium">Sangre:</span>
                        <span className="font-bold text-foreground">
                          {p.grupo_sanguineo || 'No registrado'}
                        </span>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          alergiasCount > 0
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {alergiasCount > 0 ? `⚠️ ${alergiasCount} Alergia(s)` : 'Sin Alergias'}
                      </Badge>
                    </div>

                    {alergiasCount > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {p.alergias.slice(0, 3).map((al, i) => (
                          <span key={i} className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded font-medium">
                            {al}
                          </span>
                        ))}
                        {alergiasCount > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{alergiasCount - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Datos de contacto y sede */}
                  <div className="space-y-1 text-xs text-muted-foreground pt-1">
                    {p.telefono && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="size-3 text-emerald-600" />
                        <span>{p.telefono}</span>
                      </div>
                    )}

                    {p.seguro_medico && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck className="size-3 text-indigo-600" />
                        <span className="truncate">{p.seguro_medico}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer de la Card con Botones */}
                  <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Stethoscope className="size-3 text-teal-600" />
                      <span>{p.total_consultas || 0} Consulta(s)</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openWhatsApp(p)}
                        className="size-7 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="size-4" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedPatientForRecord(p);
                          setRecordDrawerOpen(true);
                        }}
                        className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white cursor-pointer px-2.5 gap-1 shadow-2xs"
                      >
                        <FileText className="size-3" />
                        <span>Ficha Integral</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── VISTA EN TABLA DETALLADA ────────────────────────────── */
        <Card className="overflow-hidden border-border/80 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Paciente</th>
                  <th className="py-3 px-4 font-bold">Documento / Edad</th>
                  <th className="py-3 px-4 font-bold">Sangre / Alergias</th>
                  <th className="py-3 px-4 font-bold">Contacto / Sede</th>
                  <th className="py-3 px-4 font-bold text-center">Consultas</th>
                  <th className="py-3 px-4 font-bold text-center">Estado</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPacientes.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors group">
                    {/* Paciente */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex size-8 items-center justify-center rounded-xl text-white font-bold text-xs shadow-2xs shrink-0 ${
                            p.genero === 'F' ? 'bg-pink-600' : 'bg-teal-600'
                          }`}
                        >
                          {p.nombres.charAt(0)}{p.apellidos.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-foreground block">
                            {p.nombres} {p.apellidos}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            {p.email || 'Sin correo'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Documento / Edad */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-foreground block">
                        {p.tipo_documento}-{p.documento_identidad}
                      </span>
                      <span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium block">
                        {p.edad_texto || 'Edad no especificada'}
                      </span>
                    </td>

                    {/* Sangre / Alergias */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {p.grupo_sanguineo && (
                          <Badge className="bg-rose-600 text-white font-bold text-[10px] py-0 px-1.5">
                            {p.grupo_sanguineo}
                          </Badge>
                        )}
                        {(p.alergias || []).length > 0 ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-semibold py-0 px-1.5">
                            ⚠️ {(p.alergias || []).length} alergia(s)
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Sin alergias</span>
                        )}
                      </div>
                    </td>

                    {/* Contacto / Sede */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-foreground block">{p.telefono || 'Sin teléfono'}</span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {p.sucursal_nombre || 'Sede Central'}
                      </span>
                    </td>

                    {/* Consultas */}
                    <td className="py-3 px-4 text-center font-bold text-foreground">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Stethoscope className="size-3 text-teal-600" />
                        {p.total_consultas || 0}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          p.activo
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openWhatsApp(p)}
                          className="size-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                          title="WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPatientForRecord(p);
                            setRecordDrawerOpen(true);
                          }}
                          className="size-7 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                          title="Ver Ficha Integral"
                        >
                          <FileText className="size-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPatientToEdit(p);
                            setFormModalOpen(true);
                          }}
                          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="size-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPatientToDelete(p);
                            setDeleteConfirmOpen(true);
                          }}
                          className="size-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Inactivar"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ────────────────────────────── */}
      <PatientFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        patientToEdit={patientToEdit}
        onSaved={fetchPacientes}
      />

      {/* ── FICHA INTEGRAL E HISTORIAL CLÍNICO ─────────────────────── */}
      <PatientRecordDrawer
        open={recordDrawerOpen}
        onOpenChange={setRecordDrawerOpen}
        paciente={selectedPatientForRecord}
        onEdit={(p) => {
          setPatientToEdit(p);
          setFormModalOpen(true);
        }}
      />

      {/* ── DIALOG DE INACTIVACIÓN ─────────────────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">¿Inactivar Ficha del Paciente?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {patientToDelete && (
                <>
                  ¿Está seguro de que desea inactivar la ficha de{' '}
                  <strong className="text-foreground font-bold">
                    {patientToDelete.nombres} {patientToDelete.apellidos}
                  </strong>{' '}
                  (Doc: {patientToDelete.tipo_documento}-{patientToDelete.documento_identidad})?
                  <br />
                  Su historial médico y consultas previas se mantendrán preservados de forma segura.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInactivar}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              Inactivar Paciente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PacientesPage;
