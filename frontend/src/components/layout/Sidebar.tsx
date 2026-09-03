import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Globe,
  ShieldCheck,
  Users,
  FileClock,
  HeartPulse,
  Stethoscope,
  Radio,
  ShieldAlert,
  Activity,
  Layers,
  MessageSquare,
  CreditCard,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasPermission, user } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
      isActive
        ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 font-semibold'
        : 'text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
    }`;

  return (
    <>
      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & Close Button */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              {user?.empresa?.logo_mini_url || user?.empresa?.logo_mini_dark_url || user?.empresa?.logo_url ? (
                <img
                  src={
                    (document.documentElement.classList.contains('dark')
                      ? (user.empresa.logo_mini_url || user.empresa.logo_url)
                      : (user.empresa.logo_mini_dark_url || user.empresa.logo_mini_url || user.empresa.logo_url)) || ''
                  }
                  alt={user.empresa.nombre || 'Logo'}
                  className="w-9 h-9 object-contain rounded-xl"
                />
              ) : (
                <img
                  src="/medisoft_favicon.png"
                  alt="MEDISOFT SUITE"
                  className="w-9 h-9 object-contain"
                />
              )}
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  MEDISOFT <span className="text-teal-500 text-xs px-1 py-0.5 rounded bg-teal-500/10 font-bold">SUITE</span>
                </span>
                <span className="block text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                  {user?.empresa?.nombre || 'Hospital Suite'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-4 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {/* General */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Principal
              </div>
              <div className="space-y-1">
                <NavLink to="/dashboard" onClick={onClose} className={navItemClass}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>
              </div>
            </div>

            {/* Clínica & Atención Médica */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Clínica
              </div>
              <div className="space-y-1">
                {hasPermission('especialidades.ver') && (
                  <NavLink to="/clinica/especialidades" onClick={onClose} className={navItemClass}>
                    <Stethoscope className="w-4 h-4" />
                    <span>Especialidades</span>
                  </NavLink>
                )}

                {(hasPermission('medicos.ver') || user?.es_superadmin) && (
                  <NavLink to="/clinica/doctores" onClick={onClose} className={navItemClass}>
                    <UserCheck className="w-4 h-4" />
                    <span>Médicos y Especialistas</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* 1. Organización */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Organización
              </div>
              <div className="space-y-1">
                {(user?.es_superadmin || hasPermission('empresas.ver') || Boolean(user?.empresa_id)) && (
                  <NavLink to="/seguridad/empresas" onClick={onClose} className={navItemClass}>
                    <Building2 className="w-4 h-4" />
                    <span>{user?.es_superadmin ? 'Empresas' : 'Mi Empresa'}</span>
                  </NavLink>
                )}

                {hasPermission('sucursales.ver') && (
                  <NavLink to="/seguridad/sucursales" onClick={onClose} className={navItemClass}>
                    <MapPin className="w-4 h-4" />
                    <span>Sucursales / Sedes</span>
                  </NavLink>
                )}

                <NavLink to="/saas/suscripciones" onClick={onClose} className={navItemClass}>
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Suscripción & Tarifas</span>
                </NavLink>

                {user?.es_superadmin && (
                  <NavLink to="/saas/suscripciones-admin" onClick={onClose} className={navItemClass}>
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Suscripciones Empresas</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* 2. Seguridad */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Seguridad
              </div>
              <div className="space-y-1">
                {hasPermission('usuarios.ver') && (
                  <NavLink to="/seguridad/usuarios" onClick={onClose} className={navItemClass}>
                    <Users className="w-4 h-4" />
                    <span>Usuarios</span>
                  </NavLink>
                )}

                {hasPermission('roles.ver') && (
                  <NavLink to="/seguridad/roles" onClick={onClose} className={navItemClass}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Roles & Permisos</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* 3. Configuración */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Configuración
              </div>
              <div className="space-y-1">
                {hasPermission('paises.ver') && (
                  <NavLink to="/seguridad/paises" onClick={onClose} className={navItemClass}>
                    <Globe className="w-4 h-4" />
                    <span>Países & Localización</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* 4. Monitoreo */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Monitoreo
              </div>
              <div className="space-y-1">
                {hasPermission('auditoria.ver') && (
                  <NavLink to="/seguridad/auditoria" onClick={onClose} className={navItemClass}>
                    <FileClock className="w-4 h-4" />
                    <span>Bitácora de Auditoría</span>
                  </NavLink>
                )}

                {hasPermission('sesiones.ver') && (
                  <NavLink to="/monitoreo/sesiones" onClick={onClose} className={navItemClass}>
                    <Radio className="w-4 h-4" />
                    <span>Sesiones Activas</span>
                  </NavLink>
                )}

                {hasPermission('seguridad_accesos.ver') && (
                  <NavLink to="/monitoreo/seguridad-accesos" onClick={onClose} className={navItemClass}>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Seguridad & Accesos</span>
                  </NavLink>
                )}

                {hasPermission('salud_sistema.ver') && (
                  <NavLink to="/monitoreo/salud-sistema" onClick={onClose} className={navItemClass}>
                    <Activity className="w-4 h-4" />
                    <span>Salud del Sistema</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* 5. Integraciones & Servicios */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Integraciones
              </div>
              <div className="space-y-1">
                {hasPermission('integraciones.ver') && (
                  <NavLink to="/integraciones" onClick={onClose} className={navItemClass} end>
                    <Layers className="w-4 h-4" />
                    <span>Catálogo de Servicios</span>
                  </NavLink>
                )}

                {hasPermission('whatsapp.ver') && (
                  <NavLink to="/integraciones/whatsapp" onClick={onClose} className={navItemClass}>
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Center</span>
                  </NavLink>
                )}

                {(hasPermission('integraciones.editar') || hasPermission('mapas.ver') || hasPermission('pagos.ver')) && (
                  <NavLink to="/integraciones/mapas-pagos" onClick={onClose} className={navItemClass}>
                    <CreditCard className="w-4 h-4" />
                    <span>Mapas & Pasarelas</span>
                  </NavLink>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 text-center">
            <p className="text-[11px] font-bold text-teal-800 dark:text-teal-300">MEDISOFT SUITE v1.0</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Clinical & Hospital OS</p>
          </div>
        </div>
      </aside>
    </>
  );
};
