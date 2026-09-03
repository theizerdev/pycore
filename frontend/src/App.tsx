import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TemplateSettingsProvider } from './context/TemplateSettingsContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

// Páginas
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Perfil } from './pages/auth/Perfil';
import { Dashboard } from './pages/dashboard/Dashboard';
import { EmpresasPage } from './pages/seguridad/EmpresasPage';
import { SucursalesPage } from './pages/seguridad/SucursalesPage';
import { PaisesPage } from './pages/seguridad/PaisesPage';
import { RolesPermisosPage } from './pages/seguridad/RolesPermisosPage';
import { UsuariosPage } from './pages/seguridad/UsuariosPage';
import { AuditoriaPage } from './pages/seguridad/AuditoriaPage';
import { SesionesActivasPage } from './pages/monitoreo/SesionesActivasPage';
import { SeguridadAccesosPage } from './pages/monitoreo/SeguridadAccesosPage';
import { SaludSistemaPage } from './pages/monitoreo/SaludSistemaPage';
import { IntegracionesHub } from './pages/integraciones/IntegracionesHub';
import { WhatsAppCenter } from './pages/integraciones/WhatsAppCenter';
import { MapasPagosConfig } from './pages/integraciones/MapasPagosConfig';
import { TasasCambioPage } from './pages/integraciones/TasasCambioPage';
import { PlanesBillingPage } from './pages/saas/PlanesBillingPage';
import { SuscripcionesGlobalesPage } from './pages/saas/SuscripcionesGlobalesPage';
import { PlanesAdminPage } from './pages/saas/PlanesAdminPage';
import { SubscriptionExpiredPage } from './pages/saas/SubscriptionExpiredPage';
import { EspecialidadesPage } from './pages/clinica/EspecialidadesPage';
import { DoctoresPage } from './pages/clinica/DoctoresPage';
import { PacientesPage } from './pages/clinica/PacientesPage';
import { AgendaCalendarioPage } from './pages/clinica/AgendaCalendarioPage';
import { RegionalProvider } from './context/RegionalContext';
import { Toaster } from './components/ui/sonner';

export const App: React.FC = () => {
  return (
    <TemplateSettingsProvider>
      <AuthProvider>
        <RegionalProvider>
          <BrowserRouter>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login initialView="register" />} />
            <Route path="/verify-whatsapp" element={<Login initialView="verify-whatsapp" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Rutas Protegidas dentro de AdminLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
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
                  <ProtectedRoute>
                    <SesionesActivasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="monitoreo/seguridad-accesos"
                element={
                  <ProtectedRoute>
                    <SeguridadAccesosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="monitoreo/salud-sistema"
                element={
                  <ProtectedRoute>
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
                  <ProtectedRoute>
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
          <Toaster />
        </BrowserRouter>
      </RegionalProvider>
    </AuthProvider>
  </TemplateSettingsProvider>
);
};

export default App;
