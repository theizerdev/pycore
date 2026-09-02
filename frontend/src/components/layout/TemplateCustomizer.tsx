import React, { useState, useRef } from 'react';
import {
  Settings,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Check,
  Paintbrush,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import {
  useTemplateSettings,
  getContrastColor,
  type Appearance,
} from '../../context/TemplateSettingsContext';
import { cn } from '../../lib/utils';

export const TemplateCustomizer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const {
    settings,
    appearance,
    updateAppearance,
    updateSetting,
    resetSettings,
  } = useTemplateSettings();

  const presetColors = [
    { name: 'teal', hex: '#0d9488', label: 'Teal Médico' },
    { name: 'indigo', hex: '#6366f1', label: 'Indigo' },
    { name: 'blue', hex: '#2563eb', label: 'Azul Real' },
    { name: 'orange', hex: '#ea580c', label: 'Naranja' },
    { name: 'pink', hex: '#db2777', label: 'Rosa' },
  ];

  const currentPrimaryIsPreset = presetColors.some((c) => c.name === settings.primaryColor);

  return (
    <>
      {/* Botón flotante lateral derecho con animación de giro */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex h-10 w-10 items-center justify-center rounded-l-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border-l border-t border-b border-primary-foreground/20 focus:outline-none cursor-pointer transition-all hover:pr-1 group"
        title="Personalizar Plantilla"
      >
        <Settings className="size-5 animate-[spin_8s_linear_infinite] group-hover:scale-110 transition-transform" />
      </button>

      {/* Panel lateral deslizante (Drawer / Sheet) */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[400px] overflow-y-auto p-6 scrollbar-thin">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  Personalizador de Plantilla
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Personaliza y previsualiza en tiempo real
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetSettings}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Restablecer Valores por Defecto"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 py-5">
            {/* ══ 1. COLOR PRIMARIO ════════════════════════════════════ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Apariencia & Colores
                </span>
              </div>

              {/* Selector de Color */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Color Primario del Sistema
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {presetColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => updateSetting('primaryColor', color.name)}
                      style={{ backgroundColor: color.hex }}
                      className={cn(
                        'relative h-7 w-7 rounded-md cursor-pointer transition-all border border-black/10 dark:border-white/10 hover:scale-105 active:scale-95 flex items-center justify-center shadow-xs',
                        settings.primaryColor === color.name && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      )}
                      title={color.label}
                    >
                      {settings.primaryColor === color.name && (
                        <Check className="size-4 text-white" />
                      )}
                    </button>
                  ))}

                  {/* Selector Hex Personalizado */}
                  <button
                    onClick={() => colorPickerRef.current?.click()}
                    className={cn(
                      'relative h-7 w-7 rounded-md cursor-pointer transition-all border border-dashed border-muted-foreground hover:scale-105 flex items-center justify-center shadow-xs bg-muted hover:bg-muted/80',
                      !currentPrimaryIsPreset && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-solid'
                    )}
                    style={{
                      backgroundColor: !currentPrimaryIsPreset ? settings.primaryColor : undefined,
                    }}
                    title="Color Personalizado"
                  >
                    {!currentPrimaryIsPreset ? (
                      <Check className="size-4" style={{ color: getContrastColor(settings.primaryColor) }} />
                    ) : (
                      <Paintbrush className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <input
                    type="color"
                    ref={colorPickerRef}
                    value={!currentPrimaryIsPreset ? settings.primaryColor : '#0d9488'}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="sr-only"
                  />
                </div>
              </div>

              {/* Selector de Modo de Tema */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-foreground">
                  Modo de Tema
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as const).map((mode) => {
                    const isActive = appearance === mode;
                    const labels: Record<Appearance, string> = {
                      light: 'Claro',
                      dark: 'Oscuro',
                      system: 'Sistema',
                    };

                    return (
                      <button
                        key={mode}
                        onClick={() => updateAppearance(mode)}
                        className={cn(
                          'flex flex-col items-center justify-center p-2.5 rounded-lg border bg-card hover:bg-muted text-card-foreground text-xs font-medium cursor-pointer transition-all gap-1.5',
                          isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5 font-semibold text-primary' : 'border-border'
                        )}
                      >
                        {mode === 'light' && <Sun className="size-4" />}
                        {mode === 'dark' && <Moon className="size-4" />}
                        {mode === 'system' && <Monitor className="size-4" />}
                        <span>{labels[mode]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skins (Por Defecto vs Con Bordes) */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-foreground">
                  Estilo de Contorno (Piel)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['default', 'bordered'] as const).map((skinOpt) => {
                    const isActive = settings.skin === skinOpt;
                    return (
                      <button
                        key={skinOpt}
                        onClick={() => updateSetting('skin', skinOpt)}
                        className={cn(
                          'flex flex-col p-2.5 rounded-lg border bg-card hover:bg-muted text-left cursor-pointer transition-all gap-2',
                          isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-full gap-1 rounded p-1 bg-muted border',
                            skinOpt === 'bordered' ? 'border-primary/50 shadow-xs' : 'border-transparent'
                          )}
                        >
                          <div className="w-1/4 rounded bg-muted-foreground/30 shrink-0"></div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="h-2 rounded bg-muted-foreground/30 w-full"></div>
                            <div className="flex-1 rounded border border-dashed border-muted-foreground/30 w-full"></div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold">
                          {skinOpt === 'default' ? 'Por Defecto' : 'Con Bordes'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Semi-Dark Sidebar Switch */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card border-border">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-foreground">
                    Barra Lateral Semi-Dark
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Forzar sidebar oscuro en modo claro
                  </p>
                </div>
                <Switch
                  checked={settings.semiDark}
                  onCheckedChange={(checked) => updateSetting('semiDark', checked)}
                  disabled={appearance === 'dark'}
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* ══ 2. OPCIONES DE LAYOUT Y NAVEGACIÓN ════════════════════ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Estructura & Navegación
                </span>
              </div>

              {/* Navegación: Expandido vs Colapsado */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Menú de Navegación
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: false, label: 'Expandido (w-64)' },
                    { key: true, label: 'Colapsado (w-20)' },
                  ].map((opt) => {
                    const isActive = settings.collapsed === opt.key;
                    return (
                      <button
                        key={String(opt.key)}
                        onClick={() => updateSetting('collapsed', opt.key)}
                        className={cn(
                          'flex flex-col p-2.5 rounded-lg border bg-card hover:bg-muted text-left cursor-pointer transition-all gap-2',
                          isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div className="flex h-10 w-full gap-1 rounded p-1 bg-muted border border-border">
                          <div
                            className={cn(
                              'rounded bg-primary/60 transition-all shrink-0',
                              opt.key ? 'w-2' : 'w-1/4'
                            )}
                          ></div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="h-2 rounded bg-muted-foreground/30 w-full"></div>
                            <div className="flex-1 rounded bg-muted-foreground/15 w-full"></div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de Barra Superior (Navbar Type) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Barra Superior (Topbar)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sticky', 'static', 'hidden'] as const).map((type) => {
                    const isActive = settings.navbarType === type;
                    const labels: Record<string, string> = {
                      sticky: 'Fija (Sticky)',
                      static: 'Estática',
                      hidden: 'Oculta',
                    };
                    return (
                      <button
                        key={type}
                        onClick={() => updateSetting('navbarType', type)}
                        className={cn(
                          'flex flex-col p-2 rounded-lg border bg-card hover:bg-muted text-left cursor-pointer transition-all gap-1.5',
                          isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div className="flex h-10 w-full gap-1 rounded p-1 bg-muted border border-border">
                          <div className="w-2 rounded bg-muted-foreground/30 shrink-0"></div>
                          <div className="flex-1 flex flex-col gap-1">
                            {type !== 'hidden' && (
                              <div
                                className={cn(
                                  'h-2 rounded w-full border',
                                  type === 'sticky'
                                    ? 'bg-primary/40 border-primary/60'
                                    : 'bg-muted-foreground/30 border-transparent'
                                )}
                              ></div>
                            )}
                            <div className="flex-1 rounded bg-muted-foreground/15 w-full"></div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold">{labels[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ancho del Contenido */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Ancho de Contenido
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['compact', 'wide'] as const).map((widthOpt) => {
                    const isActive = settings.contentWidth === widthOpt;
                    return (
                      <button
                        key={widthOpt}
                        onClick={() => updateSetting('contentWidth', widthOpt)}
                        className={cn(
                          'flex flex-col p-2.5 rounded-lg border bg-card hover:bg-muted text-left cursor-pointer transition-all gap-2',
                          isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div className="flex h-10 w-full gap-1 rounded p-1 bg-muted border border-border justify-center">
                          <div
                            className={cn(
                              'h-full rounded bg-muted-foreground/20 border border-muted-foreground/30 transition-all',
                              widthOpt === 'compact' ? 'w-2/3' : 'w-full'
                            )}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold">
                          {widthOpt === 'compact' ? 'Compacto (Centrado)' : 'Ancho Completo'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dirección de Lectura (LTR / RTL) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Dirección de Lectura
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['ltr', 'rtl'] as const).map((dir) => {
                    const isActive = settings.direction === dir;
                    return (
                      <button
                        key={dir}
                        onClick={() => updateSetting('direction', dir)}
                        className={cn(
                          'flex flex-col p-2.5 rounded-lg border bg-card hover:bg-muted text-left cursor-pointer transition-all gap-2',
                          isActive ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div className="flex h-10 w-full gap-1 rounded p-1 bg-muted border border-border">
                          <div
                            className={cn(
                              'w-1/4 rounded bg-primary/50 shrink-0',
                              dir === 'rtl' ? 'order-last' : 'order-first'
                            )}
                          ></div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="h-2 rounded bg-muted-foreground/30 w-3/4"></div>
                            <div className="flex-1 rounded bg-muted-foreground/15 w-full"></div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold">
                          {dir === 'ltr' ? 'Izquierda a Derecha (LTR)' : 'Derecha a Izquierda (RTL)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
