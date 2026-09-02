import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Laptop,
  Smartphone,
  ShieldAlert,
  RotateCcw,
  Search,
  LogOut,
  Radio,
  Building2,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

import { ModuleHeader } from '../../components/common/ModuleHeader';
import { StatCard } from '../../components/common/StatCard';
import { FilterBar, FilterField } from '../../components/common/FilterBar';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { monitoreoApi, type SesionActiva } from '../../api/monitoreo';
import { cn } from '../../lib/utils';

export const SesionesActivasPage: React.FC = () => {
  const [sesiones, setSesiones] = useState<SesionActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('todos');
  const [perPageFilter, setPerPageFilter] = useState(10);
  const autoRefresh = true;

  // Modal para revocar
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<SesionActiva | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchSesiones = async () => {
    try {
      setLoading(true);
      const data = await monitoreoApi.getSesiones();
      setSesiones(data);
    } catch (err) {
      console.error('Error cargando sesiones activas:', err);
      toast.error('No se pudieron cargar las sesiones activas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSesiones();
  }, []);

  // Auto-refresh interval cada 30 segundos si está activo
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      monitoreoApi.getSesiones().then(setSesiones).catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const stats = useMemo(() => {
    const total = sesiones.length;
    const desktop = sesiones.filter((s) => s.dispositivo.toLowerCase().includes('desktop')).length;
    const mobile = sesiones.filter((s) => s.dispositivo.toLowerCase().includes('mobile')).length;
    return { total, desktop, mobile };
  }, [sesiones]);

  const filteredSesiones = useMemo(() => {
    return sesiones.filter((s) => {
      const matchesSearch =
        s.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.usuario_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ip_address.includes(searchTerm) ||
        s.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDevice =
        deviceFilter === 'todos' ||
        (deviceFilter === 'desktop' && s.dispositivo.toLowerCase().includes('desktop')) ||
        (deviceFilter === 'mobile' && s.dispositivo.toLowerCase().includes('mobile'));

      return matchesSearch && matchesDevice;
    });
  }, [sesiones, searchTerm, deviceFilter]);

  const handleRevokeClick = (sesion: SesionActiva) => {
    setSessionToRevoke(sesion);
    setRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!sessionToRevoke) return;
    try {
      setRevoking(true);
      await monitoreoApi.revocarSesion(sessionToRevoke.id);
      toast.success(`Sesión de ${sessionToRevoke.usuario_nombre} cerrada forzosamente`);
      setRevokeModalOpen(false);
      setSessionToRevoke(null);
      fetchSesiones();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al revocar la sesión');
    } finally {
      setRevoking(false);
    }
  };

  const columns: ColumnDef<SesionActiva>[] = [
    {
      header: 'Usuario / Rol',
      accessorKey: 'usuario_nombre',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-center text-xs border border-cyan-500/20 shadow-2xs">
              {row.usuario_nombre.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">{row.usuario_nombre}</span>
              {row.es_actual && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Tu Sesión
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{row.usuario_email} • <span className="font-medium text-foreground/80">{row.usuario_rol}</span></p>
          </div>
        </div>
      ),
    },
    {
      header: 'Sede / Empresa',
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{row.empresa || 'Empresa Principal'}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <MapPin className="w-3 h-3" />
            <span>{row.sucursal || 'Sede Central'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Dispositivo / IP',
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            {row.dispositivo.toLowerCase().includes('mobile') ? (
              <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-cyan-600" />
            )}
            <span>{row.navegador}</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            IP: {row.ip_address} • {row.ubicacion}
          </p>
        </div>
      ),
    },
    {
      header: 'Actividad',
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
            <Radio className="w-3 h-3 animate-ping" />
            <span>En línea</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Inicio: {formatDate(row.inicio_sesion)}
          </p>
        </div>
      ),
    },
    {
      header: 'Acción',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end">
          {row.es_actual ? (
            <Badge variant="secondary" className="text-xs text-muted-foreground font-medium">
              Sesión Actual
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRevokeClick(row)}
              className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/40 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={<Radio className="h-6 w-6 text-white animate-pulse" />}
        title="Sesiones Activas en Tiempo Real"
        description="Monitoreo de usuarios conectados en vivo, dispositivos y control de cierre remoto."
        colorClassName="bg-cyan-600 dark:bg-cyan-700"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSesiones}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-cyan-800 border-white text-xs h-9 font-semibold shadow-xs cursor-pointer"
          >
            <RotateCcw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </ModuleHeader>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          title="USUARIOS CONECTADOS"
          value={stats.total}
          colorClassName="bg-cyan-100 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400"
        />
        <StatCard
          icon={<Laptop className="h-6 w-6" />}
          title="DESKTOP / ESCRITORIO"
          value={stats.desktop}
          colorClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
        />
        <StatCard
          icon={<Smartphone className="h-6 w-6" />}
          title="DISPOSITIVOS MÓVILES"
          value={stats.mobile}
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
      </div>

      {/* Filtros */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar Sesión">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario, correo, IP o ciudad..."
                className="w-full md:w-80 h-9 text-xs pl-8 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </FilterField>

          <FilterField label="Dispositivo">
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-full md:w-44 h-9 text-xs bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Dispositivos</SelectItem>
                <SelectItem value="desktop">Computadoras (Desktop)</SelectItem>
                <SelectItem value="mobile">Móviles / Tablets</SelectItem>
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
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </FilterBar>

      {/* Tabla de Sesiones */}
      <DataTable
        data={filteredSesiones}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No hay sesiones activas registradas en este momento."
      />

      {/* Modal Confirmación de Cierre Remoto */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-2">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              ¿Cerrar sesión forzosamente?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Esta acción desconectará de inmediato al usuario{' '}
              <strong className="text-foreground">{sessionToRevoke?.usuario_nombre}</strong> ({sessionToRevoke?.usuario_email}) en la IP{' '}
              <span className="font-mono font-semibold">{sessionToRevoke?.ip_address}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevokeModalOpen(false)}
              disabled={revoking}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRevoke}
              disabled={revoking}
              className="text-xs bg-rose-600 hover:bg-rose-700 font-bold"
            >
              {revoking ? 'Cerrando...' : 'Confirmar Desconexión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
