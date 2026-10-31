import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { TemplateCustomizer } from './TemplateCustomizer';
import { ChatFloatingWidget } from '../chat/ChatFloatingWidget';
import { useTemplateSettings } from '../../context/TemplateSettingsContext';
import { cn } from '../../lib/utils';

export const AdminLayout: React.FC = () => {
  const { settings, updateSetting } = useTemplateSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isFullCanvasCalendar = location.pathname.startsWith('/clinica/agenda');

  const toggleCollapse = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      updateSetting('collapsed', !settings.collapsed);
    }
  };

  return (
    <div
      className={cn(
        'bg-background text-foreground flex',
        isFullCanvasCalendar ? 'h-dvh overflow-hidden' : 'min-h-screen'
      )}
    >
      {/* Sidebar Desktop & Mobile */}
      <AdminSidebar
        collapsed={settings.collapsed}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* Contenedor Principal */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300 min-w-0',
          settings.collapsed ? 'lg:pl-20' : 'lg:pl-64',
          'pl-0',
          isFullCanvasCalendar && 'h-full overflow-hidden'
        )}
      >
        {/* Topbar Header */}
        <AdminHeader
          onToggleMenu={toggleCollapse}
          collapsed={settings.collapsed}
        />

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 animate-in fade-in-50 duration-200',
            isFullCanvasCalendar
              ? 'flex flex-col min-h-0 min-w-0 overflow-hidden p-0'
              : 'p-4 sm:p-6 lg:p-6'
          )}
        >
          <div
            className={cn(
              'transition-all',
              isFullCanvasCalendar
                ? 'flex-1 flex flex-col min-h-0 min-w-0 w-full h-full'
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
