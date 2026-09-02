import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  MapPin, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Shield,
  FileClock,
  Sparkles,
  Server,
  KeyRound
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { empresasApi } from '../../api/empresas';
import { sucursalesApi } from '../../api/sucursales';
import { usuariosApi } from '../../api/usuarios';
import { rolesApi } from '../../api/roles';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export const Dashboard: React.FC = () => {
  const { user, sucursalActiva, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    empresas: 0,
    sucursales: 0,
    usuarios: 0,
    roles: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [emp, suc, usr, rol] = await Promise.allSettled([
          empresasApi.list(),
          sucursalesApi.list(),
          usuariosApi.list(),
          rolesApi.list()
        ]);

        setStats({
          empresas: emp.status === 'fulfilled' ? emp.value.length : 0,
          sucursales: suc.status === 'fulfilled' ? suc.value.length : 0,
          usuarios: usr.status === 'fulfilled' ? usr.value.length : 0,
          roles: rol.status === 'fulfilled' ? rol.value.length : 0,
        });
      } catch (err) {
        console.error('Error cargando métricas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner Principal Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-500/20 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PyCore SaaS • Sistema Base Multi-Tenant</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Bienvenido, {user?.nombre} {user?.apellido}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Plataforma base empresarial con aislamiento lógico de datos, roles granulares y alta escalabilidad en tiempo real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Sede Activa</span>
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-teal-300 mt-0.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="truncate">{sucursalActiva?.nombre || 'Sede Central'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Estadísticas con Card shadcn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Empresas */}
        <Card className="hover:shadow-md hover:border-teal-500/40 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Empresas / Clínicas
            </CardTitle>
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {loading ? '-' : stats.empresas}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Instituciones independientes
            </p>
          </CardContent>
        </Card>

        {/* Sucursales */}
        <Card className="hover:shadow-md hover:border-cyan-500/40 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Sedes / Sucursales
            </CardTitle>
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {loading ? '-' : stats.sucursales}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Centros médicos y consultorios
            </p>
          </CardContent>
        </Card>

        {/* Usuarios */}
        <Card className="hover:shadow-md hover:border-indigo-500/40 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Usuarios Activos
            </CardTitle>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {loading ? '-' : stats.usuarios}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Médicos, enfermeros y secretaría
            </p>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card className="hover:shadow-md hover:border-emerald-500/40 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Roles y Permisos
            </CardTitle>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {loading ? '-' : stats.roles}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Perfiles con matriz RBAC activa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Módulos & Estado del Servidor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accesos Rápidos de Seguridad */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center space-x-2">
              <Shield className="w-4 h-4 text-teal-500" />
              <span>Módulos de Seguridad & Administración</span>
            </h2>
            <Badge variant="teal">Fase 1 Lista</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Directorio de Usuarios */}
            {hasPermission('usuarios.ver') && (
              <Card className="group hover:border-teal-500/50 hover:shadow-lg transition">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                    <Users className="w-5 h-5" />
                  </div>
                  <CardTitle className="pt-2 text-sm">Directorio de Usuarios</CardTitle>
                  <CardDescription className="line-clamp-2">
                    Gestión de médicos, enfermería y recepción con asignación multi-sede.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link to="/seguridad/usuarios">
                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <span>Administrar Directorio</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Roles y Matriz de Permisos */}
            {hasPermission('roles.ver') && (
              <Card className="group hover:border-teal-500/50 hover:shadow-lg transition">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <CardTitle className="pt-2 text-sm">Roles & Matriz RBAC</CardTitle>
                  <CardDescription className="line-clamp-2">
                    Configuración granular de qué acciones y pantallas puede ver cada rol.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link to="/seguridad/roles">
                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <span>Configurar Permisos</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Sedes y Sucursales */}
            {hasPermission('sucursales.ver') && (
              <Card className="group hover:border-teal-500/50 hover:shadow-lg transition">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <CardTitle className="pt-2 text-sm">Sedes & Sucursales</CardTitle>
                  <CardDescription className="line-clamp-2">
                    Administración de consultorios físicos y centros médicos de la clínica.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link to="/seguridad/sucursales">
                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <span>Ver Sedes</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Auditoría */}
            {hasPermission('auditoria.ver') && (
              <Card className="group hover:border-teal-500/50 hover:shadow-lg transition">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                    <FileClock className="w-5 h-5" />
                  </div>
                  <CardTitle className="pt-2 text-sm">Auditoría & Logs</CardTitle>
                  <CardDescription className="line-clamp-2">
                    Trazabilidad cronológica inmutable con IP, usuario y detalles JSON.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link to="/seguridad/auditoria">
                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <span>Consultar Logs</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Estado de la Infraestructura & APIs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center space-x-2">
            <Server className="w-4 h-4 text-cyan-500" />
            <span>Infraestructura & Estado</span>
          </h2>

          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-xs text-muted-foreground font-medium">Backend ASGI</span>
              <Badge variant="teal">FastAPI 0.110+ (Python)</Badge>
            </div>

            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-xs text-muted-foreground font-medium">Frontend SPA</span>
              <Badge variant="cyan">React 19 + TypeScript</Badge>
            </div>

            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-xs text-muted-foreground font-medium">Diseño UI</span>
              <Badge variant="secondary">shadcn/ui + Radix UI</Badge>
            </div>

            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-xs text-muted-foreground font-medium">Base de Datos</span>
              <Badge variant="outline">SQLAlchemy 2.0 Async</Badge>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground font-medium">API Docs</span>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Swagger UI</span>
                <ArrowRight className="w-3 h-3 -rotate-45" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
