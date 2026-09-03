import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Usuario, Sucursal } from '../types';
import { authApi } from '../api/auth';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  permisos: string[];
  sucursalActiva: Sucursal | null;
  isLoading: boolean;
  login: (tokenData: { access_token: string; user: Usuario; permisos: string[]; sucursal_activa_id?: number | null }) => void;
  logout: () => void;
  setSucursalActiva: (sucursal: Sucursal) => void;
  hasPermission: (slug: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem('pycore_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pycore_token'));
  const [permisos, setPermisos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pycore_permissions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sucursalActiva, setSucursalActivaState] = useState<Sucursal | null>(() => {
    try {
      const saved = localStorage.getItem('pycore_sucursal');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (tokenData: { access_token: string; user: Usuario; permisos: string[]; sucursal_activa_id?: number | null }) => {
    localStorage.setItem('pycore_token', tokenData.access_token);
    localStorage.setItem('pycore_user', JSON.stringify(tokenData.user));
    localStorage.setItem('pycore_permissions', JSON.stringify(tokenData.permisos));

    // Asignar sucursal activa inicial
    let initialSucursal: Sucursal | null = null;
    if (tokenData.user.sucursales_asignadas && tokenData.user.sucursales_asignadas.length > 0) {
      if (tokenData.sucursal_activa_id) {
        const found = tokenData.user.sucursales_asignadas.find(s => s.sucursal.id === tokenData.sucursal_activa_id);
        if (found) initialSucursal = found.sucursal;
      }
      if (!initialSucursal) {
        initialSucursal = tokenData.user.sucursales_asignadas[0].sucursal;
      }
    } else if (tokenData.user.sucursal_defecto) {
      initialSucursal = tokenData.user.sucursal_defecto;
    }

    if (initialSucursal) {
      localStorage.setItem('pycore_sucursal', JSON.stringify(initialSucursal));
      setSucursalActivaState(initialSucursal);
    }

    setToken(tokenData.access_token);
    setUser(tokenData.user);
    setPermisos(tokenData.permisos);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('pycore_token');
    localStorage.removeItem('pycore_user');
    localStorage.removeItem('pycore_permissions');
    localStorage.removeItem('pycore_sucursal');
    setToken(null);
    setUser(null);
    setPermisos([]);
    setSucursalActivaState(null);
    setIsLoading(false);
  };

  const setSucursalActiva = (sucursal: Sucursal) => {
    localStorage.setItem('pycore_sucursal', JSON.stringify(sucursal));
    setSucursalActivaState(sucursal);
  };

  const hasPermission = (slug: string): boolean => {
    if (!user) return false;
    if (user.es_superadmin || permisos.includes('*')) return true;
    if (slug.startsWith('medicos.') && (permisos.includes('especialidades.ver') || permisos.includes('usuarios.ver') || Boolean(user.empresa_id))) return true;
    if (slug.startsWith('pacientes.') && (permisos.includes('especialidades.ver') || permisos.includes('medicos.ver') || Boolean(user.empresa_id))) return true;
    if (slug.startsWith('citas.') && (permisos.includes('especialidades.ver') || permisos.includes('medicos.ver') || Boolean(user.empresa_id))) return true;
    return permisos.includes(slug);
  };

  const refreshUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await authApi.getProfile();
      setUser(data.user);
      setPermisos(data.permisos);
      localStorage.setItem('pycore_user', JSON.stringify(data.user));
      localStorage.setItem('pycore_permissions', JSON.stringify(data.permisos));
    } catch (err: any) {
      console.warn('Sesión no pudo ser revalidada con el backend:', err);
      // Si el backend da 401 o no está accesible, cerramos sesión limpia
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Actualización dinámica de Favicon según el logo mini de la empresa o por defecto MEDISOFT Favicon
  useEffect(() => {
    const faviconUrl = user?.empresa?.logo_mini_url || user?.empresa?.logo_url || '/medisoft_favicon.png';
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconUrl;
  }, [user?.empresa?.logo_mini_url, user?.empresa?.logo_url]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await refreshUser();
      } else {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permisos,
        sucursalActiva,
        isLoading,
        login,
        logout,
        setSucursalActiva,
        hasPermission,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
