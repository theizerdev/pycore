import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PanelLeftOpen } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { SubscriptionAlertBanner } from '../saas/SubscriptionAlertBanner';
import { TemplateCustomizer } from './TemplateCustomizer';
import { ChatFloatingWidget } from '../chat/ChatFloatingWidget';
import { useTemplateSettings } from '../../context/TemplateSettingsContext';
import { cn } from '../../lib/utils';

export const AdminLayout: React.FC = () => {
  const { settings, updateSetting } = useTemplateSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isFullViewportApp =
    location.pathname.startsWith('/clinica/agenda') ||
    location.pathname.startsWith('/facturacion/cobro');

  const handleToggleMenu = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      updateSetting('sidebarHidden', !settings.sidebarHidden);
    }
  };

  const handleToggleCollapse = () => {
    updateSetting('collapsed', !settings.collapsed);
  };

  return (
    <div
      className={cn(
        'bg-background text-foreground flex',
        isFullViewportApp ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen'
      )}
    >
      {/* Sidebar Desktop & Mobile */}
      <AdminSidebar
        collapsed={settings.collapsed}
        sidebarHidden={settings.sidebarHidden}
        onToggleCollapse={handleToggleCollapse}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* Botón de rescate si tanto la barra superior como el menú lateral están ocultos */}
      {settings.navbarType === 'hidden' && settings.sidebarHidden && (
        <button
          type="button"
          onClick={() => updateSetting('sidebarHidden', false)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex h-10 w-8 items-center justify-center rounded-r-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border-r border-t border-b border-primary-foreground/20 cursor-pointer transition-all hover:pl-1"
          title="Mostrar menú lateral"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      {/* Contenedor Principal */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300 min-w-0',
          settings.sidebarHidden
            ? 'lg:pl-0'
            : settings.collapsed
            ? 'lg:pl-20'
            : 'lg:pl-64',
          'pl-0',
          isFullViewportApp && 'h-full max-h-dvh overflow-hidden'
        )}
      >
        {/* Topbar Header */}
        <AdminHeader
          onToggleMenu={handleToggleMenu}
          collapsed={settings.collapsed}
          sidebarHidden={settings.sidebarHidden}
        />

        {/* Subscription Expiration Warning Banner */}
        <SubscriptionAlertBanner />

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 animate-in fade-in-50 duration-200',
            isFullViewportApp
              ? 'flex flex-col min-h-0 min-w-0 overflow-hidden p-0'
              : 'p-4 sm:p-6 lg:p-6'
          )}
        >
          <div
            className={cn(
              'transition-all',
              isFullViewportApp
                ? 'flex-1 flex flex-col min-h-0 min-w-0 w-full h-full overflow-hidden'
                : cn(
                    'mx-auto',
                    settings.contentWidth === 'compact' ? 'max-w-7xl' : 'w-full'
                  )
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Personalizador de Plantilla Flotante & Drawer (Template Customizer) */}
      <TemplateCustomizer />

      {/* Chat Clínico Interno Flotante Persistente en Todas las Pantallas */}
      <ChatFloatingWidget />
    </div>
  );
};
