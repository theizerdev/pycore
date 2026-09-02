import React, { createContext, useContext, useState, useEffect } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

export interface TemplateSettings {
  primaryColor: string;
  skin: 'default' | 'bordered';
  semiDark: boolean;
  collapsed: boolean;
  navbarType: 'sticky' | 'static' | 'hidden';
  contentWidth: 'compact' | 'wide';
  direction: 'ltr' | 'rtl';
}

const DEFAULT_SETTINGS: TemplateSettings = {
  primaryColor: 'teal',
  skin: 'default',
  semiDark: true,
  collapsed: false,
  navbarType: 'sticky',
  contentWidth: 'wide',
  direction: 'ltr',
};

interface TemplateSettingsContextType {
  settings: TemplateSettings;
  appearance: Appearance;
  resolvedAppearance: 'light' | 'dark';
  updateAppearance: (mode: Appearance) => void;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  resetSettings: () => void;
}

const TemplateSettingsContext = createContext<TemplateSettingsContextType | undefined>(undefined);

// Helper para calcular contraste de texto para colores personalizados
export function getContrastColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return '#ffffff';

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

export const TemplateSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Apariencia (light, dark, system)
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const saved = localStorage.getItem('pycore_appearance');
    return (saved as Appearance) || 'system';
  });

  const [resolvedAppearance, setResolvedAppearance] = useState<'light' | 'dark'>('light');

  // Ajustes de plantilla
  const [settings, setSettings] = useState<TemplateSettings>(() => {
    try {
      const stored = localStorage.getItem('pycore_template_settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error cargando configuración de plantilla:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSetting = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('pycore_template_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateAppearance = (mode: Appearance) => {
    setAppearance(mode);
    localStorage.setItem('pycore_appearance', mode);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('pycore_template_settings', JSON.stringify(DEFAULT_SETTINGS));
    updateAppearance('system');
  };

  // 1. Resolver y aplicar Modo Oscuro / Claro / Sistema
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (appearance === 'dark') {
        isDark = true;
      } else if (appearance === 'system') {
        isDark = mediaQuery.matches;
      }

      setResolvedAppearance(isDark ? 'dark' : 'light');

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (appearance === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [appearance]);

  // 2. Aplicar Datasets de Personalización al elemento raíz
  useEffect(() => {
    const root = document.documentElement;

    const presetColors = ['teal', 'indigo', 'blue', 'orange', 'pink'];

    if (presetColors.includes(settings.primaryColor)) {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--sidebar-primary');
      root.dataset.primary = settings.primaryColor;
    } else {
      // Color Hex personalizado
      root.dataset.primary = 'custom';
      root.style.setProperty('--primary', settings.primaryColor);
      root.style.setProperty('--primary-foreground', getContrastColor(settings.primaryColor));
      root.style.setProperty('--sidebar-primary', settings.primaryColor);
    }

    // Skins (default / bordered)
    root.dataset.skin = settings.skin;

    // Semi Dark sidebar
    root.dataset.sidebar = settings.semiDark ? 'dark' : 'light';

    // Navbar (sticky / static / hidden)
    root.dataset.navbar = settings.navbarType;

    // Content Width (compact / wide)
    root.dataset.contentWidth = settings.contentWidth;

    // Direction (ltr / rtl)
    root.setAttribute('dir', settings.direction);

  }, [settings]);

  return (
    <TemplateSettingsContext.Provider
      value={{
        settings,
        appearance,
        resolvedAppearance,
        updateAppearance,
        updateSetting,
        resetSettings,
      }}
    >
      {children}
    </TemplateSettingsContext.Provider>
  );
};

export const useTemplateSettings = () => {
  const context = useContext(TemplateSettingsContext);
  if (!context) {
    throw new Error('useTemplateSettings debe usarse dentro de un TemplateSettingsProvider');
  }
  return context;
};
