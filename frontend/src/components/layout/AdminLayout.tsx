import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { TemplateCustomizer } from './TemplateCustomizer';
import { useTemplateSettings } from '../../context/TemplateSettingsContext';
import { cn } from '../../lib/utils';

export const AdminLayout: React.FC = () => {
  const { settings, updateSetting } = useTemplateSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleCollapse = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      updateSetting('collapsed', !settings.collapsed);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar Desktop & Mobile */}
      <AdminSidebar
        collapsed={settings.collapsed}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* Contenedor Principal */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 min-w-0",
          settings.collapsed ? "lg:pl-20" : "lg:pl-64",
          "pl-0"
        )}
      >
        {/* Topbar Header */}
        <AdminHeader
          onToggleMenu={toggleCollapse}
          collapsed={settings.collapsed}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-6 animate-in fade-in-50 duration-200">
          <div
            className={cn(
              "mx-auto transition-all",
              settings.contentWidth === 'compact' ? "max-w-7xl" : "w-full"
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Personalizador de Plantilla Flotante & Drawer (Template Customizer) */}
      <TemplateCustomizer />
    </div>
  );
};
