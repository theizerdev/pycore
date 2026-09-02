import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Building2, 
  MapPin, 
  Sun, 
  Moon, 
  User as UserIcon, 
  LogOut, 
  Shield, 
  Menu,
  ChevronDown,
  Activity
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, sucursalActiva, setSucursalActiva, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sucursalesDisponibles = user?.sucursales_asignadas?.map(s => s.sucursal) || [];

  return (
    <header className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between transition-colors">
      {/* Lado Izquierdo: Toggle Mobile & Empresa/Sucursal */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Empresa & Selector de Sucursal */}
        <div className="hidden sm:flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            {user?.empresa?.logo_mini_url ? (
              <img src={user.empresa.logo_mini_url} alt="Logo" className="w-4 h-4 object-contain rounded" />
            ) : (
              <img src="/medisoft_favicon.jpg" alt="Logo" className="w-4 h-4 object-contain rounded" />
            )}
            <span className="font-semibold">{user?.empresa?.nombre || 'MEDISOFT SUITE'}</span>
          </div>

          {/* Selector de Sucursal */}
          {sucursalesDisponibles.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBranchMenu(!showBranchMenu)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-medium transition"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{sucursalActiva?.nombre || 'Seleccionar Sede'}</span>
                {sucursalesDisponibles.length > 1 && <ChevronDown className="w-3 h-3 ml-1 opacity-70" />}
              </button>

              {showBranchMenu && sucursalesDisponibles.length > 1 && (
                <div 
                  className="absolute left-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowBranchMenu(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Cambiar Sede Activa
                  </div>
                  {sucursalesDisponibles.map((suc) => (
                    <button
                      key={suc.id}
                      onClick={() => {
                        setSucursalActiva(suc);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-700/50 transition ${
                        sucursalActiva?.id === suc.id
                          ? 'text-teal-600 dark:text-teal-400 font-semibold bg-teal-50/50 dark:bg-teal-950/30'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{suc.nombre}</span>
                      </div>
                      {sucursalActiva?.id === suc.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lado Derecho: Estado, Tema, Perfil */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Badge de conexión */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>En Línea</span>
        </div>

        {/* Conmutador de Modo Oscuro/Claro */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Menú de Usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-teal-500/20">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.nombre} {user?.apellido}
              </div>
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                {user?.es_superadmin ? 'Superadmin' : user?.rol?.nombre || 'Usuario'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div 
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.nombre} {user?.apellido}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                <Link
                  to="/perfil"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center space-x-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700/50 hover:text-teal-600 dark:hover:text-teal-400 transition"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Mi Perfil & Seguridad</span>
                </Link>
                {user?.es_superadmin && (
                  <Link
                    to="/seguridad/auditoria"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center space-x-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700/50 hover:text-teal-600 dark:hover:text-teal-400 transition"
                  >
                    <Shield className="w-4 h-4 text-teal-500" />
                    <span>Registro de Auditoría</span>
                  </Link>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
