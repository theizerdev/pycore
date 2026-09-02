import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTemplateSettings } from '../../context/TemplateSettingsContext';
import { useRegional } from '../../context/RegionalContext';
import { cn, getInitials } from '../../lib/utils';
import { suscripcionesApi } from '../../api/suscripciones';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  MapPin,
  Check,
  ChevronDown,
  User,
  LogOut,
  Command,
  Home,
  CreditCard,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';

interface AdminHeaderProps {
  onToggleMenu: () => void;
  collapsed?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleMenu, collapsed }) => {
  const { user, sucursalActiva, setSucursalActiva, logout, hasPermission } = useAuth();
  const { appearance, resolvedAppearance, updateAppearance, settings } = useTemplateSettings();
  const {
    paisNombre,
    codigoIso2,
    moneda,
    simboloMoneda,
    zonaHoraria,
    formatoFecha,
    impuestoPredeterminado,
    codigoTelefonico,
    bandera,
  } = useRegional();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);

  // Sintetizador de Sonido de Alerta Web Audio API (Sin archivos externos)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Ignorar restricciones de autoplay si la página no ha interactuado
    }
  };

  useEffect(() => {
    if (!user?.es_superadmin) return;

    let prevCount = -1;
    const checkPending = async () => {
      try {
        const data = await suscripcionesApi.getPendientesCount();
        if (data.pendientes_count > prevCount && prevCount >= 0) {
          playNotificationChime();
        }
        prevCount = data.pendientes_count;
        setPendingPaymentsCount(data.pendientes_count);
      } catch (err) {
        // Silencioso
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 15000); // Polling cada 15 segundos
    return () => clearInterval(interval);
  }, [user?.es_superadmin]);

  // Breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const getBreadcrumbTitle = (segment: string) => {
    switch (segment) {
      case 'dashboard': return 'Dashboard';
      case 'seguridad': return 'Seguridad';
      case 'empresas': return 'Empresas';
      case 'sucursales': return 'Sucursales / Sedes';
      case 'roles': return 'Roles & Permisos';
      case 'usuarios': return 'Usuarios';
      case 'auditoria': return 'Bitácora de Auditoría';
      case 'perfil': return 'Mi Perfil';
      case 'clinica': return 'Clínica';
      case 'pacientes': return 'Pacientes';
      case 'citas': return 'Citas';
      case 'consultas': return 'Consultas';
      case 'turnero': return 'Turnero';
      case 'teleconsulta': return 'Teleconsulta';
      default: return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const searchableModules = [
    { title: 'Dashboard', path: '/dashboard', group: 'General' },
    { title: 'Empresas', path: '/seguridad/empresas', group: 'Seguridad', perm: 'empresas.ver' },
    { title: 'Sucursales / Sedes', path: '/seguridad/sucursales', group: 'Seguridad', perm: 'sucursales.ver' },
    { title: 'Roles & Permisos', path: '/seguridad/roles', group: 'Seguridad', perm: 'roles.ver' },
    { title: 'Usuarios', path: '/seguridad/usuarios', group: 'Seguridad', perm: 'usuarios.ver' },
    { title: 'Bitácora de Auditoría', path: '/seguridad/auditoria', group: 'Seguridad', perm: 'auditoria.ver' },
    { title: 'Mi Perfil', path: '/perfil', group: 'Cuenta' },
  ].filter(m => !m.perm || hasPermission(m.perm));

  const filteredSearchResults = searchQuery.trim()
    ? searchableModules.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  if (settings.navbarType === 'hidden') {
    return null;
  }

  return (
    <header
      className={cn(
        "z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-md transition-colors sm:px-6",
        settings.navbarType === 'sticky' ? 'sticky top-0' : 'relative'
      )}
    >
      {/* Lado Izquierdo: Botón Menú + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-accent -ml-2 flex"
          onClick={onToggleMenu}
          title={collapsed ? "Mostrar menú" : "Ocultar menú"}
        >
          <Menu className="size-5" />
        </Button>

        {/* Migas de Pan (Breadcrumbs) */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Home className="size-3.5" />
                  <span>Inicio</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1;
              const path = `/${pathSegments.slice(0, index + 1).join('/')}`;

              return (
                <React.Fragment key={path}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-semibold text-foreground">
                        {getBreadcrumbTitle(segment)}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={path} className="text-muted-foreground hover:text-foreground">
                          {getBreadcrumbTitle(segment)}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Lado Derecho: Buscador + Sede + Notificaciones + Tema + Usuario */}
      <div className="flex items-center gap-2">
        {/* Buscador Rápido */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-9 w-48 lg:w-56 items-center justify-between rounded-md border border-input bg-background px-3 text-xs text-muted-foreground transition hover:border-primary/50 cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Buscar módulo...</span>
            </div>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>

          {searchOpen && (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border bg-popover p-2 shadow-lg animate-in fade-in zoom-in-95">
              <div className="flex items-center border-b px-2 pb-2">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribe para buscar..."
                  className="w-full bg-transparent text-xs outline-hidden text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {(searchQuery ? filteredSearchResults : searchableModules).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium hover:bg-accent text-foreground transition"
                  >
                    <span>{item.title}</span>
                    <span className="text-[10px] text-muted-foreground">{item.group}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selector de Sucursal */}
        {user?.sucursales_asignadas && user.sucursales_asignadas.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md text-xs font-medium h-9"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[120px] truncate font-semibold">
                  {sucursalActiva ? sucursalActiva.nombre : 'Sede'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Sede Activa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.sucursales_asignadas.map((sa) => {
                const isSelected = sucursalActiva?.id === sa.sucursal.id;
                return (
                  <DropdownMenuItem
                    key={sa.sucursal.id}
                    onClick={() => setSucursalActiva(sa.sucursal)}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      isSelected && "bg-primary/10 font-bold text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{sa.sucursal.nombre}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Indicador de Configuración Regional Activa */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex items-center gap-1.5 rounded-md text-xs font-semibold h-9 border-input bg-background shadow-2xs hover:border-primary/50 cursor-pointer"
              title="Configuración Regional Activa"
            >
              <span className="text-sm">{bandera}</span>
              <span className="text-[11px] font-bold text-foreground">{moneda}</span>
              <span className="text-[10px] text-muted-foreground font-mono">({simboloMoneda})</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3.5 space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b">
              <span className="text-2xl">{bandera}</span>
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{paisNombre}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                    {codigoIso2}
                  </Badge>
                </h4>
                <p className="text-[11px] text-muted-foreground">Configuración Regional Activa</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-muted-foreground">
                <span>Moneda Principal:</span>
                <span className="font-bold text-foreground font-mono">{moneda} ({simboloMoneda})</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-muted-foreground">
                <span>Zona Horaria:</span>
                <span className="font-bold text-foreground truncate max-w-[140px] font-mono text-[11px]">{zonaHoraria}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-muted-foreground">
                <span>Formato de Fecha:</span>
                <span className="font-bold text-foreground font-mono">{formatoFecha}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-muted-foreground">
                <span>IVA / Impuesto:</span>
                <span className="font-bold text-foreground font-mono">{impuestoPredeterminado}%</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-muted-foreground">
                <span>Código Telefónico:</span>
                <span className="font-bold text-foreground font-mono">{codigoTelefonico}</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Alerta Visual & Sonora de Pagos Pendientes (Exclusivo SuperAdmin) */}
        {user?.es_superadmin && pendingPaymentsCount > 0 && (
          <Button
            onClick={() => navigate('/saas/suscripciones-admin')}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-3 gap-2 shadow-lg animate-pulse cursor-pointer border border-amber-400"
            title={`${pendingPaymentsCount} comprobante(s) de pago por aprobar`}
          >
            <Sparkles className="size-4 animate-spin text-slate-950" />
            <span>{pendingPaymentsCount} Pago(s) por Aprobar</span>
          </Button>
        )}

        {/* Notificaciones */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h4 className="font-bold text-xs">Notificaciones</h4>
              <Badge variant="outline" className="text-[10px]">2 Nuevas</Badge>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/50">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Sistema Listo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Módulos y RBAC configurados correctamente.
                  </p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Conmutador de Modo Oscuro / Claro / Sistema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (appearance === 'dark' || (appearance === 'system' && resolvedAppearance === 'dark')) {
              updateAppearance('light');
            } else {
              updateAppearance('dark');
            }
          }}
          title={resolvedAppearance === 'dark' ? "Modo Claro" : "Modo Oscuro"}
        >
          {resolvedAppearance === 'dark' ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-slate-600" />
          )}
        </Button>

        {/* Menú de Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-md hover:bg-accent h-9"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials(user ? `${user.nombre} ${user.apellido}` : 'MF')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left sm:flex">
                <span className="max-w-[110px] truncate text-xs font-semibold text-foreground leading-tight">
                  {user ? `${user.nombre} ${user.apellido}` : 'Usuario'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {user?.es_superadmin ? 'Superadmin' : user?.rol?.nombre || 'Personal'}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="p-2">
              <p className="font-semibold text-xs text-foreground">
                {user ? `${user.nombre} ${user.apellido}` : 'Usuario'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/mi-cuenta" className="flex items-center gap-2 cursor-pointer text-xs">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span>Mi Cuenta & Suscripción</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="flex items-center gap-2 cursor-pointer text-xs">
                <User className="h-4 w-4" />
                <span>Mi Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer text-xs"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
