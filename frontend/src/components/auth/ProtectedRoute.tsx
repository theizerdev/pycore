import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission, requireSuperAdmin }) => {
  const { user, token, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-teal-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Cargando PyCore...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificación Obligatoria de WhatsApp OTP (FixSale POS System)
  const isSuperAdminUser = user.es_superadmin;
  if (!isSuperAdminUser && user.whatsapp_verified === false) {
    return <Navigate to="/verify-whatsapp" replace />;
  }

  // Verificación de Vencimiento de Suscripción (FixSale POS System)
  const isExemptEmpresa = user.empresa_id === 1;
  if (!isExemptEmpresa && user.empresa) {
    const isVencidoStatus = user.empresa.plan_estado === 'vencido';
    const isPastDate = user.empresa.plan_vencimiento
      ? new Date(user.empresa.plan_vencimiento).getTime() < new Date().getTime() && user.empresa.plan_estado !== 'activo'
      : false;

    const isExpiredScreen = location.pathname.includes('/suscripcion-vencida') || location.pathname.includes('/mi-cuenta');

    if ((isVencidoStatus || isPastDate) && !isExpiredScreen) {
      return <Navigate to="/suscripcion-vencida" replace />;
    }
  }

  if ((requireSuperAdmin && !user.es_superadmin) || (requiredPermission && !hasPermission(requiredPermission))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div className="w-16 h-16 mx-auto bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Acceso Restringido</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Tu rol actual no dispone del permiso necesario (<code className="text-teal-600 dark:text-teal-400 font-mono bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded">{requiredPermission}</code>) para acceder a este módulo.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition"
          >
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
