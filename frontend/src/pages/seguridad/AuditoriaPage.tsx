import React, { useEffect, useState, useMemo } from 'react';
import type { AuditoriaLog } from '../../types';
import { auditoriaApi } from '../../api/auditoria';
import {
  FileClock,
  Code2,
  RotateCcw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { StatCard } from '../../components/common/StatCard';
import { FilterBar, FilterField } from '../../components/common/FilterBar';
import { DataTable, type ColumnDef } from '../../components/common/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
} from '../../components/ui/dialog';
import { cn } from '../../lib/utils';

export const AuditoriaPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [moduloFilter, setModuloFilter] = useState('todos');
  const [accionFilter, setAccionFilter] = useState('todos');
  const [perPageFilter, setPerPageFilter] = useState(15);

  // Modal para ver detalles JSON
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await auditoriaApi.list({
        modulo: moduloFilter !== 'todos' ? moduloFilter : undefined,
        accion: accionFilter !== 'todos' ? accionFilter : undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error('Error cargando logs de auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduloFilter, accionFilter]);

  // Métricas
  const stats = useMemo(() => {
    const total = logs.length;
    const exitosos = logs.filter((l) => l.accion.includes('EXITOSO') || l.accion.includes('CREAR') || l.accion.includes('ACTUALIZAR')).length;
    const fallidos = logs.filter((l) => l.accion.includes('FALLIDO') || l.accion.includes('ERROR') || l.accion.includes('ELIMINAR')).length;
    return { total, exitosos, fallidos };
  }, [logs]);

  // Filtrado reactivo por texto
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        l.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.ip && l.ip.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.user_agent && l.user_agent.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchSearch;
    });
  }, [logs, searchTerm]);

  const getActionBadgeColor = (accion: string) => {
    if (accion.includes('FALLIDO') || accion.includes('ERROR') || accion.includes('ELIMINAR')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900';
    }
    if (accion.includes('EXITOSO') || accion.includes('CREAR')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900';
  };

  // Columnas
  const columns: ColumnDef<AuditoriaLog>[] = [
    {
      header: 'Fecha & Hora',
      accessorKey: 'created_at',
      sortable: true,
      className: 'font-mono text-xs text-muted-foreground whitespace-nowrap',
      cell: (log) => (
        <span>{new Date(log.created_at).toLocaleString()}</span>
      ),
    },
    {
      header: 'Módulo',
      accessorKey: 'modulo',
      sortable: true,
      cell: (log) => (
        <span className="font-semibold text-xs uppercase px-2 py-0.5 rounded-md bg-muted text-foreground border">
          {log.modulo}
        </span>
      ),
    },
    {
      header: 'Acción Ejecutada',
      accessorKey: 'accion',
      sortable: true,
      cell: (log) => (
        <span
          className={cn(
            'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border',
            getActionBadgeColor(log.accion)
          )}
        >
          {log.accion}
        </span>
      ),
    },
    {
      header: 'IP / Origen',
      accessorKey: 'ip',
      cell: (log) => (
        <span className="font-mono text-xs text-muted-foreground">
          {log.ip || '127.0.0.1'}
        </span>
      ),
    },
    {
      header: 'Trazabilidad',
      className: 'text-right',
      cell: (log) => (
        <div className="flex justify-end">
          {log.detalles ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(log)}
              className="h-7 text-xs"
            >
              <Code2 className="w-3.5 h-3.5 mr-1 text-primary" />
              <span>Ver Payload</span>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Sin payload</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ModuleHeader exactamente como fixsalePOS */}
      <ModuleHeader
        icon={<FileClock className="h-6 w-6 text-white" />}
        title="Bitácora de Auditoría"
        description="Registro inmutable de actividades, autenticaciones y modificaciones administrativas en tiempo real."
        colorClassName="bg-teal-600 dark:bg-teal-700"
      >
        <Button
          onClick={fetchLogs}
          className="bg-white hover:bg-slate-100 text-teal-800 font-semibold shadow-xs text-xs h-9"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Actualizar Registros
        </Button>
      </ModuleHeader>

      {/* Stat Cards en fila idénticos a fixsalePOS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          icon={<FileClock className="h-6 w-6" />}
          title="TOTAL EVENTOS"
          value={stats.total}
          colorClassName="bg-teal-100 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="EVENTOS SATISFACTORIOS"
          value={stats.exitosos}
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6" />}
          title="ALERTAS / FALLOS"
          value={stats.fallidos}
          colorClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
        />
      </div>

      {/* FilterBar idéntico a fixsalePOS */}
      <FilterBar>
        <div className="flex flex-wrap items-end gap-4">
          <FilterField label="Buscar">
            <Input
              placeholder="Buscar por módulo, acción, IP..."
              className="w-full md:w-72 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FilterField>

          <FilterField label="Módulo">
            <Select value={moduloFilter} onValueChange={setModuloFilter}>
              <SelectTrigger className="w-full md:w-44 h-9 text-xs">
                <SelectValue placeholder="Todos los módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Módulos</SelectItem>
                <SelectItem value="auth">Autenticación (auth)</SelectItem>
                <SelectItem value="usuarios">Usuarios (usuarios)</SelectItem>
                <SelectItem value="roles">Roles & Permisos (roles)</SelectItem>
                <SelectItem value="empresas">Empresas (empresas)</SelectItem>
                <SelectItem value="sucursales">Sucursales (sucursales)</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Acción">
            <Select value={accionFilter} onValueChange={setAccionFilter}>
              <SelectTrigger className="w-full md:w-48 h-9 text-xs">
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las Acciones</SelectItem>
                <SelectItem value="LOGIN_EXITOSO">LOGIN_EXITOSO</SelectItem>
                <SelectItem value="LOGIN_FALLIDO">LOGIN_FALLIDO</SelectItem>
                <SelectItem value="CREAR_USUARIO">CREAR_USUARIO</SelectItem>
                <SelectItem value="ACTUALIZAR_USUARIO">ACTUALIZAR_USUARIO</SelectItem>
                <SelectItem value="CREAR_ROL">CREAR_ROL</SelectItem>
                <SelectItem value="ACTUALIZAR_ROL">ACTUALIZAR_ROL</SelectItem>
                <SelectItem value="CREAR_EMPRESA">CREAR_EMPRESA</SelectItem>
                <SelectItem value="CREAR_SUCURSAL">CREAR_SUCURSAL</SelectItem>
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
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {(searchTerm || moduloFilter !== 'todos' || accionFilter !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setModuloFilter('todos');
                setAccionFilter('todos');
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
        data={filteredLogs}
        columns={columns}
        isLoading={loading}
        pageSize={perPageFilter}
        emptyMessage="No se encontraron eventos de auditoría registrados con los filtros aplicados."
      />

      {/* Modal para inspeccionar payload JSON */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <span>Detalles del Evento de Auditoría</span>
            </DialogTitle>
            <DialogDescription>
              {selectedLog && `${selectedLog.accion} en ${selectedLog.modulo} • ${new Date(selectedLog.created_at).toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground">ID Registro:</span>{' '}
                  <span className="font-mono font-semibold">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Origen:</span>{' '}
                  <span className="font-mono font-semibold">{selectedLog.ip || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Payload JSON:
                </span>
                <div className="mt-1.5 p-4 rounded-lg bg-slate-950 text-teal-300 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                  <pre>{JSON.stringify(selectedLog.detalles, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
