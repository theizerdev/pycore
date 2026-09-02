import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn, getInitials } from '../../lib/utils';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Users,
  FileText,
  HeartPulse,
  ChevronRight,
  X,
  Settings,
  Activity,
  Radio,
  Server,
  Layers,
  MessageSquare,
  CreditCard,
  Sparkles,
  Coins,
  Smartphone,
  Wrench,
  Boxes,
  Wallet,
  Briefcase,
  Calculator
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface AdminSidebarProps {
  collapsed: boolean;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

export interface SubMenuItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
  superAdminOnly?: boolean;
  venezuelaOnly?: boolean;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export interface SectorMenuItem {
  id: string;
  title: string;
  sectorKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string; // Si es link directo sin submenú
  badge?: string;
  permission?: string;
  superAdminOnly?: boolean;
  venezuelaOnly?: boolean;
  children?: SubMenuItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  mobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const { user, sucursalActiva, hasPermission } = useAuth();
  const location = useLocation();

  const isVenezuelaEmpresa = Boolean(
    user?.es_superadmin ||
    user?.empresa?.pais_id === 2 ||
    user?.empresa?.pais?.codigo_iso2 === 'VE' ||
    (user?.empresa?.pais?.nombre && user.empresa.pais.nombre.toLowerCase().includes('venezuela'))
  );

  // Definición completa de la estructura de menú agrupada por sectores
  const menuStructure: SectorMenuItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      sectorKey: 'inicio',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'sector-organizacion',
      title: 'Organización',
      sectorKey: 'organizacion',
      icon: Building2,
      badge: '4',
      children: [
        {
          title: 'Empresas',
          href: '/seguridad/empresas',
          icon: Building2,
          permission: 'empresas.ver',
        },
        {
          title: 'Sucursales / Sedes',
          href: '/seguridad/sucursales',
          icon: MapPin,
          permission: 'sucursales.ver',
        },
        {
          title: 'Suscripción & Tarifas',
          href: '/saas/suscripciones',
          icon: CreditCard,
          badge: 'SaaS',
          badgeVariant: 'secondary'
        },
        {
          title: 'Gestión de Planes',
          href: '/saas/planes-admin',
          icon: Layers,
          superAdminOnly: true,
          badge: 'Admin',
          badgeVariant: 'secondary'
        },
        {
          title: 'Suscripciones Empresas',
          href: '/saas/suscripciones-admin',
          icon: Sparkles,
          superAdminOnly: true,
          badge: 'Admin',
          badgeVariant: 'secondary'
        },
      ],
    },
    {
      id: 'sector-seguridad',
      title: 'Seguridad',
      sectorKey: 'seguridad',
      icon: ShieldCheck,
      badge: '2',
      children: [
        {
          title: 'Usuarios',
          href: '/seguridad/usuarios',
          icon: Users,
          permission: 'users.ver',
        },
        {
          title: 'Roles & Permisos',
          href: '/seguridad/roles',
          icon: ShieldAlert,
          permission: 'roles.ver',
        },
      ],
    },
    {
      id: 'sector-configuracion',
      title: 'Configuración',
      sectorKey: 'configuracion',
      icon: Settings,
      badge: '1',
      children: [
        {
          title: 'Países & Localización',
          href: '/seguridad/paises',
          icon: Globe,
          superAdminOnly: true,
          permission: 'paises.ver',
        },
      ],
    },
    {
      id: 'sector-monitoreo',
      title: 'Monitoreo',
      sectorKey: 'monitoreo',
      icon: Activity,
      badge: '4',
      children: [
        {
          title: 'Bitácora de Auditoría',
          href: '/seguridad/auditoria',
          icon: FileText,
          permission: 'auditoria.ver',
        },
        {
          title: 'Sesiones Activas',
          href: '/monitoreo/sesiones',
          icon: Radio,
        },
        {
          title: 'Alertas & Accesos',
          href: '/monitoreo/seguridad-accesos',
          icon: ShieldAlert,
        },
        {
          title: 'Salud del Sistema',
          href: '/monitoreo/salud-sistema',
          icon: Server,
        },
      ],
    },
    {
      id: 'sector-integraciones',
      title: 'Integraciones',
      sectorKey: 'integraciones',
      icon: Layers,
      badge: '4',
      children: [
        {
          title: 'Catálogo de Servicios',
          href: '/integraciones',
           superAdminOnly: true,
          icon: Layers,
          permission: 'integraciones.ver',
        },
        {
          title: 'Tasas del Día (BCV/USDT)',
          href: '/integraciones/tasas',
          icon: Coins,
          venezuelaOnly: true,
          permission: 'tasas.ver',
        },
        {
          title: 'WhatsApp Center',
          href: '/integraciones/whatsapp',
          icon: MessageSquare,
          permission: 'whatsapp.ver',
        },
        {
           superAdminOnly: true,
          title: 'Mapas & Pasarelas',
          href: '/integraciones/mapas-pagos',
          icon: CreditCard,
          permission: 'integraciones.editar',
        },
      ],
    },
  ];

  // Estado de apertura de menús colapsables (iniciar abiertos los que contengan la ruta activa)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      'sector-equipos': true,
      'sector-reparaciones': true,
      'sector-inventario': true,
      'sector-pos': true,
      'sector-administracion': true,
      'sector-contabilidad': true,
      'sector-organizacion': true,
      'sector-seguridad': true,
      'sector-configuracion': true,
      'sector-monitoreo': true,
      'sector-integraciones': true,
    };
    menuStructure.forEach((item) => {
      if (item.children && item.children.some((c) => location.pathname.startsWith(c.href))) {
        initial[item.id] = true;
      }
    });
    return initial;
  });

  // Auto-expandir menú padre cuando la ruta cambia a un hijo
  useEffect(() => {
    menuStructure.forEach((item) => {
      if (item.children && item.children.some((c) => location.pathname.startsWith(c.href))) {
        setOpenMenus((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Backdrop para móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobileMenu}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "lg:w-20" : "lg:w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "w-64"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
            {user?.empresa?.logo_mini_url || user?.empresa?.logo_mini_dark_url || user?.empresa?.logo_url ? (
              <img
                src={
                  (document.documentElement.classList.contains('dark')
                    ? (user.empresa.logo_mini_url || user.empresa.logo_url)
                    : (user.empresa.logo_mini_dark_url || user.empresa.logo_mini_url || user.empresa.logo_url)) || ''
                }
                alt={user.empresa.nombre || 'Logo'}
                className="h-9 w-9 shrink-0 object-contain rounded-lg"
              />
            ) : (
              <img
                src="/medisoft_favicon.jpg"
                alt="MEDISOFT SUITE"
                className="h-9 w-9 shrink-0 object-contain rounded-lg shadow-sm"
              />
            )}

            {!collapsed && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5 font-bold text-sm text-sidebar-foreground">
                  <span>MEDISOFT</span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                    SUITE
                  </span>
                </div>
                <span className="truncate text-[11px] text-sidebar-foreground/60">
                  {user?.empresa?.nombre || 'Gestión Hospitalaria'}
                </span>
              </div>
            )}
          </Link>

          {/* Botón cerrar en móvil */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
            onClick={onCloseMobileMenu}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Info Sede Activa */}
        {!collapsed && sucursalActiva && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2.5 border border-sidebar-border">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Sede Activa
              </span>
              <span className="truncate text-xs font-semibold text-sidebar-foreground">
                {sucursalActiva.nombre}
              </span>
            </div>
          </div>
        )}

        {/* Navigation items agrupados por sectores con menú y submenú */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-1.5 px-3 py-4 custom-scrollbar">
          {menuStructure.map((menu) => {
            const Icon = menu.icon;

            // ── CASO 1: ENLACE DIRECTO SIN HIJOS (Ej. Dashboard) ────────
            if (!menu.children || menu.children.length === 0) {
              if (menu.permission && !hasPermission(menu.permission)) return null;

              const linkContent = (
                <NavLink
                  to={menu.href || '#'}
                  onClick={() => {
                    if (window.innerWidth < 1024) onCloseMobileMenu();
                  }}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                      collapsed ? "justify-center px-2" : "",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )
                  }
                >
                  <Icon className="size-4.5 shrink-0" />
                  {!collapsed && (
                    <div className="flex flex-1 items-center justify-between truncate">
                      <span className="truncate">{menu.title}</span>
                      {menu.badge && (
                        <span className="ml-auto rounded-full bg-sidebar-accent px-2 py-0.2 text-[9px] font-semibold text-sidebar-foreground/80">
                          {menu.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );

              if (collapsed) {
                return (
                  <Tooltip key={menu.id}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold">
                      {menu.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={menu.id}>{linkContent}</div>;
            }

            // ── CASO 2: SECTOR CON SUBMENÚS (Ej. Seguridad, Clínico) ────
            const visibleChildren = menu.children.filter((child) => {
              if (child.href === '/seguridad/empresas') {
                return user?.es_superadmin || hasPermission('empresas.ver') || Boolean(user?.empresa_id);
              }
              return (
                (!child.permission || hasPermission(child.permission)) &&
                (!child.superAdminOnly || user?.es_superadmin) &&
                (!child.venezuelaOnly || isVenezuelaEmpresa)
              );
            });

            if (visibleChildren.length === 0) return null;

            const isChildActive = visibleChildren.some((child) =>
              location.pathname.startsWith(child.href)
            );
            const isOpen = !!openMenus[menu.id];

            // Helper para título personalizado según rol
            const getChildTitle = (child: { href: string; title: string }) => {
              if (child.href === '/seguridad/empresas' && !user?.es_superadmin) {
                return 'Mi Empresa';
              }
              return child.title;
            };

            // ── 2A. MODO COLAPSADO: MOSTRAR DROPDOWN FLOTANTE ───────────
            if (collapsed) {
              return (
                <DropdownMenu key={menu.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "group flex w-full items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-all cursor-pointer",
                            isChildActive
                              ? "bg-primary/15 text-primary font-bold shadow-2xs border border-primary/25"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon className="size-4.5 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold">
                      {menu.title}
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenuContent side="right" align="start" className="w-48 shadow-lg">
                    <DropdownMenuLabel className="text-xs font-bold opacity-60">
                      {menu.title}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {visibleChildren.map((child) => {
                      const ChildIcon = child.icon;
                      const isSubActive = location.pathname.startsWith(child.href);
                      return (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link
                            to={child.href}
                            onClick={() => {
                              if (window.innerWidth < 1024) onCloseMobileMenu();
                            }}
                            className={cn(
                              "flex items-center justify-between text-xs cursor-pointer",
                              isSubActive
                                ? "bg-primary text-primary-foreground font-bold"
                                : "text-foreground hover:bg-accent"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {ChildIcon && <ChildIcon className="size-3.5" />}
                              <span>{getChildTitle(child)}</span>
                            </span>
                            {child.badge && (
                              <span className="text-[9px] opacity-75 font-mono">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // ── 2B. MODO EXPANDIDO: MENÚ COLAPSABLE CON SUBMENÚS VISTOS ─
            return (
              <div key={menu.id} className="space-y-1">
                {/* Botón Padre del Sector */}
                <button
                  type="button"
                  onClick={() => toggleMenu(menu.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    isChildActive
                      ? "bg-sidebar-accent/60 text-primary font-bold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={cn("size-4.5 shrink-0", isChildActive ? "text-primary" : "text-sidebar-foreground/70")} />
                    <span className="truncate">{menu.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {menu.badge && (
                      <span className="rounded bg-primary/10 text-primary px-1.5 py-0.2 text-[9px] font-bold">
                        {menu.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={cn(
                        "size-4 text-sidebar-foreground/50 transition-transform duration-200",
                        isOpen && "rotate-90 text-primary"
                      )}
                    />
                  </div>
                </button>

                {/* Lista de Submenús */}
                {isOpen && (
                  <div className="relative pl-6 space-y-1 mt-1 before:absolute before:left-5 before:top-1 before:bottom-2 before:w-0.5 before:bg-sidebar-border">
                    {visibleChildren.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          onClick={() => {
                            if (window.innerWidth < 1024) onCloseMobileMenu();
                          }}
                          className={({ isActive }) =>
                            cn(
                              "group flex items-center justify-between rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                              isActive
                                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )
                          }
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {ChildIcon ? (
                              <ChildIcon className="size-3.5 shrink-0 opacity-80" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-sidebar-foreground/40 group-hover:bg-sidebar-foreground" />
                            )}
                            <span className="truncate">{getChildTitle(child)}</span>
                          </div>

                          {child.badge && (
                            <span className="ml-1 rounded-full bg-sidebar-accent/80 px-1.5 py-0.2 text-[9px] font-mono">
                              {child.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom user profile section */}
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/perfil"
            className={cn(
              "flex items-center gap-3 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent p-2.5 transition-colors cursor-pointer border border-sidebar-border/60",
              collapsed && "justify-center p-2"
            )}
            title="Ver Mi Perfil"
          >
            <Avatar className="size-8 shrink-0 border border-sidebar-border ring-1 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {getInitials(`${user?.nombre || 'U'} ${user?.apellido || ''}`)}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-xs font-bold text-sidebar-foreground">
                  {user ? `${user.nombre} ${user.apellido}` : 'Usuario'}
                </p>
                <p className="truncate text-[10px] text-sidebar-foreground/60">
                  {user?.es_superadmin ? 'Superadmin' : user?.rol?.nombre || user?.email}
                </p>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </TooltipProvider>
  );
};
