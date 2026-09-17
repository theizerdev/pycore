import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TemplateSettingsProvider } from './context/TemplateSettingsContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { RegionalProvider } from './context/RegionalContext';
import { Toaster } from './components/ui/sonner';

// Helper de lazy-loading tipo-seguro compatible con exportaciones por defecto y nombradas
const lazyComponent = <P = Record<string, any>>(
  importer: () => Promise<any>,
  name?: string
): React.LazyExoticComponent<React.ComponentType<P>> =>
  React.lazy(async () => {
    const mod = await importer();
    return { default: (name ? mod[name] : mod.default) || mod.default || Object.values(mod)[0] };
  });

// Spinner visual moderno de carga clínica
const PageLoadingFallback: React.FC = () => (
  <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3">
    <div className="relative flex items-center justify-center">
      <div className="size-12 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-600 dark:border-teal-400/20 dark:border-t-teal-400" />
      <div className="absolute size-3.5 rounded-full bg-teal-500 animate-pulse" />
    </div>
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
      Cargando módulo...
    </span>
  </div>
);

// Páginas (Code-Splitting dinámico)
const Login = lazyComponent<{ initialView?: string }>(() => import('./pages/auth/Login'), 'Login');
const ForgotPassword = lazyComponent(() => import('./pages/auth/ForgotPassword'), 'ForgotPassword');
const Perfil = lazyComponent(() => import('./pages/auth/Perfil'), 'Perfil');
const Dashboard = lazyComponent(() => import('./pages/dashboard/Dashboard'), 'Dashboard');
const AdminDashboardPage = lazyComponent(() => import('./pages/administracion/AdminDashboardPage'), 'AdminDashboardPage');
const MedicoDashboardPage = lazyComponent(() => import('./pages/clinica/MedicoDashboardPage'), 'MedicoDashboardPage');

const EmpresasPage = lazyComponent(() => import('./pages/seguridad/EmpresasPage'), 'EmpresasPage');
const SucursalesPage = lazyComponent(() => import('./pages/seguridad/SucursalesPage'), 'SucursalesPage');
const PaisesPage = lazyComponent(() => import('./pages/seguridad/PaisesPage'), 'PaisesPage');
const RolesPermisosPage = lazyComponent(() => import('./pages/seguridad/RolesPermisosPage'), 'RolesPermisosPage');
const UsuariosPage = lazyComponent(() => import('./pages/seguridad/UsuariosPage'), 'UsuariosPage');
const AuditoriaPage = lazyComponent(() => import('./pages/seguridad/AuditoriaPage'), 'AuditoriaPage');

const SesionesActivasPage = lazyComponent(() => import('./pages/monitoreo/SesionesActivasPage'), 'SesionesActivasPage');
const SeguridadAccesosPage = lazyComponent(() => import('./pages/monitoreo/SeguridadAccesosPage'), 'SeguridadAccesosPage');
const SaludSistemaPage = lazyComponent(() => import('./pages/monitoreo/SaludSistemaPage'), 'SaludSistemaPage');

const IntegracionesHub = lazyComponent(() => import('./pages/integraciones/IntegracionesHub'), 'IntegracionesHub');
const WhatsAppCenter = lazyComponent(() => import('./pages/integraciones/WhatsAppCenter'), 'WhatsAppCenter');
const MapasPagosConfig = lazyComponent(() => import('./pages/integraciones/MapasPagosConfig'), 'MapasPagosConfig');
const TasasCambioPage = lazyComponent(() => import('./pages/integraciones/TasasCambioPage'), 'TasasCambioPage');

const PlanesBillingPage = lazyComponent(() => import('./pages/saas/PlanesBillingPage'), 'PlanesBillingPage');
const SuscripcionesGlobalesPage = lazyComponent(() => import('./pages/saas/SuscripcionesGlobalesPage'), 'SuscripcionesGlobalesPage');
const PlanesAdminPage = lazyComponent(() => import('./pages/saas/PlanesAdminPage'), 'PlanesAdminPage');
const SubscriptionExpiredPage = lazyComponent(() => import('./pages/saas/SubscriptionExpiredPage'), 'SubscriptionExpiredPage');

const EspecialidadesPage = lazyComponent(() => import('./pages/clinica/EspecialidadesPage'), 'EspecialidadesPage');
const DoctoresPage = lazyComponent(() => import('./pages/clinica/DoctoresPage'), 'DoctoresPage');
const PacientesPage = lazyComponent(() => import('./pages/clinica/PacientesPage'), 'PacientesPage');
const AgendaCalendarioPage = lazyComponent(() => import('./pages/clinica/AgendaCalendarioPage'), 'AgendaCalendarioPage');
const PreconsultaPublicPage = lazyComponent(() => import('./pages/clinica/PreconsultaPublicPage'), 'PreconsultaPublicPage');
const TurneroPantallaPage = lazyComponent(() => import('./pages/clinica/TurneroPantallaPage'), 'TurneroPantallaPage');
const ConsultasPage = lazyComponent(() => import('./pages/clinica/ConsultasPage'), 'ConsultasPage');
const ConsultaAtencionPage = lazyComponent<{ readOnly?: boolean }>(() => import('./pages/clinica/ConsultaAtencionPage'), 'ConsultaAtencionPage');
const ServiciosPage = lazyComponent(() => import('./pages/administracion/ServiciosPage'), 'ServiciosPage');
const LandingPage = lazyComponent(() => import('./pages/public/LandingPage'), 'LandingPage');
const LandingCmsPage = lazyComponent(() => import('./pages/administracion/LandingCmsPage'), 'LandingCmsPage');

const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.rol?.slug === 'medico') {
    return <Navigate to="/medico/dashboard" replace />;
  }
  if (user?.es_superadmin || user?.empresa_id === 1) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <TemplateSettingsProvider>
      <AuthProvider>
        <RegionalProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Rutas Públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login initialView="register" />} />
            <Route path="/verify-whatsapp" element={<Login initialView="verify-whatsapp" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/preconsulta/:token" element={<PreconsultaPublicPage />} />
            <Route path="/turnero/:codigoSucursal" element={<TurneroPantallaPage />} />

            {/* Rutas Protegidas dentro de AdminLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="medico/dashboard" element={<MedicoDashboardPage />} />
              <Route path="perfil" element={<Perfil />} />

              {/* Módulo Clínico & Asistencial */}
              <Route
                path="clinica/agenda"
                element={
                  <ProtectedRoute requiredPermission="citas.ver">
                    <AgendaCalendarioPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/consultas/sala-espera"
                element={
                  <ProtectedRoute requiredPermission="consultas.sala_espera">
                    <ConsultasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/consultas/en-consulta"
                element={
                  <ProtectedRoute requiredPermission="consultas.en_consulta">
                    <ConsultasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/consultas/atendidas"
                element={
                  <ProtectedRoute requiredPermission="consultas.atendidas">
                    <ConsultasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/consultas/:id/atencion"
                element={
                  <ProtectedRoute requiredPermission="consultas.en_consulta">
                    <ConsultaAtencionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/consultas/:id/detalle"
                element={
                  <ProtectedRoute requiredPermission="consultas.atendidas">
                    <ConsultaAtencionPage readOnly={true} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/consultas"
                element={<Navigate to="/clinica/consultas/sala-espera" replace />}
              />
              <Route
                path="clinica/especialidades"
                element={
                  <ProtectedRoute requiredPermission="especialidades.ver">
                    <EspecialidadesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/doctores"
                element={
                  <ProtectedRoute requiredPermission="medicos.ver">
                    <DoctoresPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/pacientes"
                element={
                  <ProtectedRoute requiredPermission="pacientes.ver">
                    <PacientesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="administracion/servicios"
                element={
                  <ProtectedRoute requiredPermission="servicios.ver">
                    <ServiciosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinica/servicios"
                element={<Navigate to="/administracion/servicios" replace />}
              />
              <Route
                path="administracion/landing-cms"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <LandingCmsPage />
                  </ProtectedRoute>
                }
              />

              {/* Módulos de Seguridad y Multi-Tenant */}
              <Route
                path="seguridad/empresas"
                element={
                  <ProtectedRoute requiredPermission="empresas.ver">
                    <EmpresasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="seguridad/sucursales"
                element={
                  <ProtectedRoute requiredPermission="sucursales.ver">
                    <SucursalesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="seguridad/paises"
                element={
                  <ProtectedRoute requireSuperAdmin requiredPermission="paises.ver">
                    <PaisesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="seguridad/roles"
                element={
                  <ProtectedRoute requiredPermission="roles.ver">
                    <RolesPermisosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="seguridad/usuarios"
                element={
                  <ProtectedRoute requiredPermission="usuarios.ver">
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="seguridad/auditoria"
                element={
                  <ProtectedRoute requiredPermission="auditoria.ver">
                    <AuditoriaPage />
                  </ProtectedRoute>
                }
              />

              {/* Módulos de Monitoreo */}
              <Route
                path="monitoreo/sesiones"
                element={
                  <ProtectedRoute requiredPermission="sesiones.ver">
                    <SesionesActivasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="monitoreo/seguridad-accesos"
                element={
                  <ProtectedRoute requiredPermission="seguridad_accesos.ver">
                    <SeguridadAccesosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="monitoreo/salud-sistema"
                element={
                  <ProtectedRoute requiredPermission="salud_sistema.ver">
                    <SaludSistemaPage />
                  </ProtectedRoute>
                }
              />

              {/* Módulo de Integraciones & Conexiones */}
              <Route
                path="integraciones"
                element={
                  <ProtectedRoute requireSuperAdmin requiredPermission="integraciones.ver">
                    <IntegracionesHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="integraciones/whatsapp"
                element={
                  <ProtectedRoute requiredPermission="whatsapp.ver">
                    <WhatsAppCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="integraciones/mapas-pagos"
                element={
                  <ProtectedRoute requireSuperAdmin requiredPermission="integraciones.editar">
                    <MapasPagosConfig />
                  </ProtectedRoute>
                }
              />
              <Route
                path="integraciones/tasas"
                element={
                  <ProtectedRoute requiredPermission="tasas.ver">
                    <TasasCambioPage />
                  </ProtectedRoute>
                }
              />
              {/* Módulo Mi Cuenta / SaaS Billing & Planes */}
              <Route
                path="mi-cuenta"
                element={
                  <ProtectedRoute>
                    <PlanesBillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="saas/planes"
                element={
                  <ProtectedRoute>
                    <PlanesBillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="saas/suscripciones"
                element={
                  <ProtectedRoute requiredPermission="empresas.ver">
                    <PlanesBillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="saas/suscripciones-admin"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <SuscripcionesGlobalesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="saas/planes-admin"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <PlanesAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="suscripcion-vencida"
                element={
                  <ProtectedRoute>
                    <SubscriptionExpiredPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
          <Toaster />
        </BrowserRouter>
      </RegionalProvider>
    </AuthProvider>
  </TemplateSettingsProvider>
);
};

export default App;
