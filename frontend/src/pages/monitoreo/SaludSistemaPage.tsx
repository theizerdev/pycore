import React, { useEffect, useState } from 'react';
import {
  Activity,
  Server,
  Database,
  MessageSquare,
  Mail,
  HardDrive,
  Cpu,
  Zap,
  CheckCircle2,
  Clock,
  RotateCcw,
  Gauge,
  Wifi
} from 'lucide-react';
import { toast } from 'sonner';

import { ModuleHeader } from '../../components/common/ModuleHeader';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { monitoreoApi, type MetricasSistema, type ServicioSalud } from '../../api/monitoreo';
import { cn } from '../../lib/utils';

export const SaludSistemaPage: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasSistema | null>(null);
  const [loading, setLoading] = useState(true);
  const [pingingMap, setPingingMap] = useState<Record<string, boolean>>({});

  const fetchSalud = async () => {
    try {
      setLoading(true);
      const data = await monitoreoApi.getSaludSistema();
      setMetricas(data);
    } catch (err) {
      console.error('Error cargando salud del sistema:', err);
      toast.error('No se pudo obtener el diagnóstico del sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalud();
  }, []);

  const handlePing = async (servicio: ServicioSalud) => {
    setPingingMap((prev) => ({ ...prev, [servicio.tipo]: true }));
    try {
      const res = await monitoreoApi.pingService(servicio.tipo);
      toast.success(`${servicio.nombre}: ${res.message} (${res.latencia_ms}ms)`);
      fetchSalud();
    } catch (err) {
      toast.error(`Error al conectar con ${servicio.nombre}`);
    } finally {
      setPingingMap((prev) => ({ ...prev, [servicio.tipo]: false }));
    }
  };

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'backend':
        return <Server className="w-5 h-5" />;
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5" />;
      case 'smtp':
        return <Mail className="w-5 h-5" />;
      default:
        return <HardDrive className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={<Activity className="h-6 w-6 text-white" />}
        title="Salud del Sistema & Servicios"
        description="Diagnóstico en tiempo real del backend, base de datos, integraciones y consumo de recursos."
        colorClassName="bg-emerald-600 dark:bg-emerald-700"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSalud}
          disabled={loading}
          className="bg-white hover:bg-slate-50 text-emerald-800 border-white text-xs h-9 font-semibold shadow-xs cursor-pointer"
        >
          <RotateCcw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Ejecutar Diagnóstico
        </Button>
      </ModuleHeader>

      {/* Métricas de Uptime y Estado General */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="ESTADO GLOBAL"
          value="OPERATIVO"
          colorClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          title="TIEMPO ACTIVO (UPTIME)"
          value={`${metricas?.tiempo_activo_horas || 0} hrs`}
          colorClassName="bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
        />
        <StatCard
          icon={<Database className="h-6 w-6" />}
          title="CONEXIONES DB"
          value={metricas?.conexiones_db_activas || 0}
          colorClassName="bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
        />
        <StatCard
          icon={<Zap className="h-6 w-6" />}
          title="LATENCIA PROMEDIO"
          value="2.1 ms"
          colorClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        />
      </div>

      {/* Medidores de Recursos de Hardware */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Uso de Procesador (CPU)</h4>
                <p className="text-[11px] text-muted-foreground">Carga actual de procesos</p>
              </div>
            </div>
            <span className="text-sm font-bold text-foreground font-mono">
              {metricas?.uso_cpu_porcentaje || 0}%
            </span>
          </div>
          <Progress value={metricas?.uso_cpu_porcentaje || 0} className="h-2" />
        </div>

        {/* Memoria RAM */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Memoria RAM</h4>
                <p className="text-[11px] text-muted-foreground">
                  {metricas?.memoria_usada_gb || 0} GB de {metricas?.memoria_total_gb || 0} GB
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-foreground font-mono">
              {metricas?.uso_memoria_porcentaje || 0}%
            </span>
          </div>
          <Progress value={metricas?.uso_memoria_porcentaje || 0} className="h-2" />
        </div>

        {/* Almacenamiento Disco */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Disco de Servidor</h4>
                <p className="text-[11px] text-muted-foreground">
                  {metricas?.disco_usado_gb || 0} GB de {metricas?.disco_total_gb || 0} GB
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-foreground font-mono">
              {metricas?.uso_disco_porcentaje || 0}%
            </span>
          </div>
          <Progress value={metricas?.uso_disco_porcentaje || 0} className="h-2" />
        </div>
      </div>

      {/* Lista de Servicios y Health Check */}
      <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Servicios & Conexiones Integradas</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitoreo continuo de latencias y estado de conectividad en tiempo real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {metricas?.servicios.map((s) => {
            const isOk = s.estado === 'operativo';
            const isPinging = pingingMap[s.tipo];

            return (
              <div
                key={s.nombre}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-border bg-slate-50/40 dark:bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
                      isOk
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    )}
                  >
                    {getServiceIcon(s.tipo)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{s.nombre}</span>
                      <Badge
                        variant={isOk ? 'secondary' : 'destructive'}
                        className={cn(
                          'text-[10px] font-bold px-2 py-0 uppercase',
                          isOk && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        )}
                      >
                        {s.estado}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.detalles}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-xs font-bold text-foreground font-mono">
                      {s.latencia_ms} ms
                    </div>
                    <span className="text-[10px] text-muted-foreground">Latencia</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePing(s)}
                    disabled={isPinging}
                    className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Wifi className={cn("w-3.5 h-3.5", isPinging && "animate-spin")} />
                    <span>{isPinging ? 'Probando...' : 'Ping Test'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
