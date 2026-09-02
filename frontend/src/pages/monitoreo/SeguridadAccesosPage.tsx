import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  Ban,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Search,
  KeyRound,
  Globe2,
  Clock,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const formatFullDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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
import { monitoreoApi, type EventoSeguridad } from '../../api/monitoreo';
import { cn } from '../../lib/utils';

export const SeguridadAccesosPage: React.FC = () => {
  const [eventos, setEventos] = useState<EventoSeguridad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('todos');
  const [perPageFilter, setPerPageFilter] = useState(10);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      const data = await monitoreoApi.getEventosSeguridad();
      setEventos(data);
    } catch (err) {
      console.error('Error cargando eventos de seguridad:', err);
      toast.error('No se pudieron cargar los eventos de seguridad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const stats = useMemo(() => {
    const total = eventos.length;
    const fallidos = eventos.filter((e) => e.tipo === 'login_fallido').length;
    const bloqueados = eventos.filter((e) => e.bloqueado).length;
    return { total, fallidos, bloqueados };
  }, [eventos]);

  const filteredEventos = useMemo(() => {
    return eventos.filter((e) => {
      const matchesSearch =
        (e.usuario_email && e.usuario_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        e.ip_address.includes(searchTerm) ||
        e.mensaje.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.ubicacion && e.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesLevel = levelFilter === 'todos' || e.nivel === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [eventos, searchTerm, levelFilter]);

  const handleToggleBlockIp = async (ip: string, currentState: boolean) => {
    try {
      const nextState = !currentState;
      await monitoreoApi.toggleBloqueoIp(ip, nextState);
      toast.success(`IP ${ip} ${nextState ? 'bloqueada permanentemente' : 'desbloqueada'}`);
      fetchEventos();
    } catch (err) {
      toast.error('Error al actualizar el bloqueo de IP');
    }
  };

  const columns: ColumnDef<EventoSeguridad>[] = [
    {
      header: 'Severidad / Evento',
      accessorKey: 'tipo',
      sortable: true,
      cell: (row) => {
        const isDanger = row.nivel === 'danger';
        const isWarning = row.nivel === 'warning';
        return (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
                isDanger
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : isWarning
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
              )}
            >
              {isDanger ? (
                <Ban className="w-4.5 h-4.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-4.5 h-4.5" />
              ) : (
                <Info className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs capitalize text-foreground">
                  {row.tipo.replace('_', ' ')}
                </span>
                <Badge
                  variant={isDanger ? 'destructive' : isWarning ? 'secondary' : 'outline'}
                  className="text-[10px] uppercase font-bold px-1.5 py-0"
                >
                  {row.nivel}
                </Badge>
              </div>
              <p className="text-xs text-foreground font-medium line-clamp-1 max-w-[340px] pt-0.5">
                {row.mensaje}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Usuario / Destino',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">{row.usuario_email || 'No autenticado'}</div>
          <p className="text-[11px] text-muted-foreground">{row.navegador || 'Cliente HTTP'}</p>
        </div>
      ),
    },
    {
      header: 'Origen / IP',
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
            <Globe2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{row.ip_address}</span>
            {row.bloqueado && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 font-mono">
                IP BLOQUEADA
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{row.ubicacion || 'Ubicación Desconocida'}</p>
        </div>
      ),
    },
    {
      header: 'Fecha & Hora',
      accessorKey: 'timestamp',
      sortable: true,
      cell: (row) => (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            {formatFullDate(row.timestamp)}
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>Reciente</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Acción IP',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleBlockIp(row.ip_address, row.bloqueado)}
            className={cn(
              'h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs',
              row.bloqueado
                ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-300'
                : 'text-rose-600 hover:bg-rose-50 border-rose-200'
            )}
          >
            {row.bloqueado ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Desbloquear IP</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Bloquear IP</span>
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={<ShieldAlert className="h-6 w-6 text-white" />}
        title="Seguridad & Intentos de Acceso"
        description="Detección de accesos sospechosos, intentos de login fallidos y control de lista negra de IPs."
        colorClassName="bg-rose-600 dark:bg-rose-700"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEventos}
          disabled={loading}
          className="bg-white hover:bg-slate-50 text-rose-800 border-white text-xs h-9 font-semibold shadow-xs cursor-pointer"
        >
          <RotateCcw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Actualizar
        </Button>
      </ModuleHeader>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ShieldAlert className="h-6 w-6" />}
          title="EVENTOS REGISTRADOS"
          value={stats.total}
          colorClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
        />
        <StatCard
          icon={<KeyRound className="h-6 w-6" />}
          title="INTENTOS FALLIDOS"
          value={stats.fallidos}
          colorClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        />
        <StatCard
          icon={<Ban className="h-6 w-6" />}
          title="IPS BLOQUEADAS"
          value={stats.bloqueados}
          colorClassName="bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
        />
      </div>

      {/* Filtros */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar Evento">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario, IP, mensaje..."
                className="w-full md:w-80 h-9 text-xs pl-8 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </FilterField>

          <FilterField label="Nivel de Severidad">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-44 h-9 text-xs bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Niveles</SelectItem>
                <SelectItem value="danger">Peligro / Crítico (Danger)</SelectItem>
                <SelectItem value="warning">Advertencia (Warning)</SelectItem>
                <SelectItem value="info">Informativo (Info)</SelectItem>
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

      {/* Tabla de Eventos de Seguridad */}
      <DataTable
        data={filteredEventos}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se registran incidentes de seguridad en el periodo."
      />
    </div>
  );
};
