import React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { Especialidad, Medico, Sucursal } from '../../../types';
import { useTemplateSettings } from '../../../context/TemplateSettingsContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import MdiIcon from './calendar-mdi';
import {
  MESES_CORTOS_ES,
  MESES_ES,
  formatActivePeriodSubtitle,
  parseDateKey,
  toDateKey,
  type CalendarColorMode,
  type CalendarGridDensity,
  type CalendarHoursRange,
  type CalendarViewMode,
} from './calendar-types';

interface PunctualitySummary {
  pacientesRetrasados: number;
  doctoresDemorados: number;
  consultasSobretiempo: number;
  totalAlertas: number;
}

interface CalendarCommandHeaderProps {
  date: Date;
  onDateChange: (d: Date) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onGoToday: () => void;
  mode: CalendarViewMode;
  onModeChange: (m: CalendarViewMode) => void;
  visibleCount: number;
  waitingCount: number;
  inConsultCount: number;
  punctualitySummary: PunctualitySummary;

  // Búsqueda y Filtros
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedMedico: string;
  onSelectedMedicoChange: (v: string) => void;
  selectedEspecialidad: string;
  onSelectedEspecialidadChange: (v: string) => void;
  selectedSucursal: string;
  onSelectedSucursalChange: (v: string) => void;
  selectedEstado: string;
  onSelectedEstadoChange: (v: string) => void;
  selectedModalidad?: string;
  onSelectedModalidadChange?: (v: string) => void;
  filtroPuntualidad: 'all' | 'paciente_retrasado' | 'doctor_retrasado' | 'alertas';
  onFiltroPuntualidadChange: (
    v: 'all' | 'paciente_retrasado' | 'doctor_retrasado' | 'alertas'
  ) => void;
  showCancelled: boolean;
  onShowCancelledChange: (v: boolean) => void;
  onResetFilters: () => void;

  // Catálogos y Rol Médico
  isDoctorUser: boolean;
  currentDoctor: Medico | null | undefined;
  medicos: Medico[];
  especialidades: Especialidad[];
  sucursales: Sucursal[];

  // Personalización Visual del Calendario
  colorMode: CalendarColorMode;
  onColorModeChange: (m: CalendarColorMode) => void;
  hoursRange: CalendarHoursRange;
  onHoursRangeChange: (r: CalendarHoursRange) => void;
  density: CalendarGridDensity;
  onDensityChange: (d: CalendarGridDensity) => void;
  resourceColumnsMode: boolean;
  onResourceColumnsModeChange: (v: boolean) => void;

  // Acciones Operativas y Layout
  loading: boolean;
  onRefresh: () => void;
  onOpenNewCita: () => void;
  onOpenNewPatient: () => void;
  onOpenBloqueoModal: () => void;
  onOpenWhatsAppReminders: () => void;
  sideDockOpen: boolean;
  onToggleSideDock: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const VIEW_MODES: { value: CalendarViewMode; label: string; icon: string; shortcut: string }[] = [
  { value: 'day', label: 'Día', icon: 'mdi:view-day-outline', shortcut: 'D' },
  { value: 'week', label: 'Semana', icon: 'mdi:view-week-outline', shortcut: 'S' },
  { value: 'month', label: 'Mes', icon: 'mdi:calendar-month-outline', shortcut: 'M' },
  { value: 'agenda', label: 'Agenda', icon: 'mdi:timeline-clock-outline', shortcut: 'A' },
];

export const CalendarCommandHeader: React.FC<CalendarCommandHeaderProps> = ({
  date,
  onDateChange,
  onNavigatePrev,
  onNavigateNext,
  onGoToday,
  mode,
  onModeChange,
  visibleCount,
  waitingCount,
  inConsultCount,
  punctualitySummary,
  searchQuery,
  onSearchQueryChange,
  selectedMedico,
  onSelectedMedicoChange,
  selectedEspecialidad,
  onSelectedEspecialidadChange,
  selectedSucursal,
  onSelectedSucursalChange,
  selectedEstado,
  onSelectedEstadoChange,
  selectedModalidad = 'all',
  onSelectedModalidadChange,
  filtroPuntualidad,
  onFiltroPuntualidadChange,
  showCancelled,
  onShowCancelledChange,
  onResetFilters,
  isDoctorUser,
  currentDoctor,
  medicos,
  especialidades,
  sucursales,
  colorMode,
  onColorModeChange,
  hoursRange,
  onHoursRangeChange,
  density,
  onDensityChange,
  resourceColumnsMode,
  onResourceColumnsModeChange,
  loading,
  onRefresh,
  onOpenNewCita,
  onOpenNewPatient,
  onOpenBloqueoModal,
  onOpenWhatsAppReminders,
  sideDockOpen,
  onToggleSideDock,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { settings, updateSetting } = useTemplateSettings();

  const activeFiltersCount = [
    !isDoctorUser && selectedMedico !== 'all',
    selectedEspecialidad !== 'all',
    selectedSucursal !== 'all',
    selectedEstado !== 'all',
    selectedModalidad !== 'all',
    filtroPuntualidad !== 'all',
    !showCancelled,
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  const canUseResourceColumns =
    mode === 'day' && !isDoctorUser && selectedMedico === 'all' && medicos.length > 1;

  return (
    <header
      className={cn(
        'relative z-20 flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 bg-card/95 backdrop-blur-xl border-b transition-colors shrink-0',
        settings.skin === 'bordered' ? 'border-border' : 'border-border/70'
      )}
    >
      {/* Sutil resplandor ambiental superior sincronizado con --primary del TemplateCustomizer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--primary) 35%, color-mix(in oklab, var(--primary) 55%, #06b6d4) 65%, transparent 100%)',
        }}
      />

      {/* ══ CLUSTER IZQUIERDO: Emblema de Fecha + Navegación Temporal ══ */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Si el usuario ocultó el Topbar en TemplateCustomizer, mostrar botón de menú lateral */}
        {settings.navbarType === 'hidden' && !isFullscreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => updateSetting('collapsed', !settings.collapsed)}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Alternar menú lateral"
          >
            <MdiIcon icon="mdi:menu" className="size-5" />
          </Button>
        )}

        {/* Emblema Calendario Interactivo Estilo Shadcn-Calendar evolucionado a MediSoft */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.96 }}
          onClick={onGoToday}
          title="Saltar al día de hoy (Atajo: T)"
          className="group relative flex size-11 shrink-0 flex-col overflow-hidden rounded-xl border border-primary/30 bg-card shadow-xs hover:border-primary hover:shadow-md transition-all cursor-pointer"
        >
          <span className="flex h-4 w-full items-center justify-center bg-primary text-[9.5px] font-extrabold tracking-widest text-primary-foreground uppercase">
            {MESES_CORTOS_ES[date.getMonth()]}
          </span>
          <div className="relative flex flex-1 w-full items-center justify-center bg-gradient-to-b from-primary/5 to-transparent">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={toDateKey(date)}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="text-sm font-black tracking-tight text-foreground group-hover:text-primary transition-colors"
              >
                {String(date.getDate()).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.button>

        {/* Título de Mes/Año + Contadores + Controles Prev/Hoy/Next */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-none">
              {MESES_ES[date.getMonth()]} {date.getFullYear()}
            </h1>

            {/* Píldora dinámica de volumen de citas */}
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary leading-none">
              <MdiIcon icon="mdi:calendar-check" className="size-3" />
              <span>
                {visibleCount} {visibleCount === 1 ? 'cita' : 'citas'}
              </span>
            </span>

            {/* Píldora en vivo si hay pacientes en consulta */}
            {inConsultCount > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 leading-none">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                <MdiIcon icon="mdi:stethoscope" className="size-3" />
                <span>{inConsultCount} en consulta</span>
              </span>
            )}

            {/* Radar Rápido de Alertas de Puntualidad */}
            {punctualitySummary.totalAlertas > 0 && (
              <button
                type="button"
                onClick={() =>
                  onFiltroPuntualidadChange(
                    filtroPuntualidad === 'alertas' ? 'all' : 'alertas'
                  )
                }
                title="Filtrar citas con retraso o demora activa hoy"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none transition-all cursor-pointer',
                  filtroPuntualidad !== 'all'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-500/15 border-amber-500/35 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                )}
              >
                <span className="size-1.5 rounded-full bg-current animate-ping" />
                <MdiIcon icon="mdi:clock-alert-outline" className="size-3" />
                <span>
                  {punctualitySummary.totalAlertas}{' '}
                  {punctualitySummary.totalAlertas === 1 ? 'demora' : 'demoras'}
                </span>
              </button>
            )}
          </div>

          {/* Fila de Navegación Temporal */}
          <div className="mt-1 flex items-center gap-1.5">
            <div className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={onNavigatePrev}
                title="Periodo anterior (Flecha izquierda)"
                className="flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <MdiIcon icon="mdi:chevron-left" className="size-4" />
              </button>
              <button
                type="button"
                onClick={onGoToday}
                className="px-1.5 text-[10.5px] font-bold text-foreground/90 hover:text-primary transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={onNavigateNext}
                title="Siguiente periodo (Flecha derecha)"
                className="flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <MdiIcon icon="mdi:chevron-right" className="size-4" />
              </button>
            </div>

            {/* Selector rápido de salto de fecha al hacer clic en el subtítulo */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Saltar a una fecha específica"
                  className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors truncate flex items-center gap-1 cursor-pointer"
                >
                  <span className="truncate">{formatActivePeriodSubtitle(date, mode)}</span>
                  <MdiIcon icon="mdi:chevron-down" className="size-3.5 opacity-60 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-60 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MdiIcon icon="mdi:calendar-search" className="size-4 text-primary" />
                  <span>Ir a fecha específica</span>
                </p>
                <Input
                  type="date"
                  value={toDateKey(date)}
                  onChange={(e) => {
                    if (e.target.value) {
                      onDateChange(parseDateKey(e.target.value));
                    }
                  }}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onGoToday}
                  className="w-full h-7 text-xs gap-1.5 cursor-pointer"
                >
                  <MdiIcon icon="mdi:calendar-today" className="size-3.5 text-primary" />
                  Volver a Hoy
                </Button>
              </PopoverContent>
            </Popover>

            {/* Conmutador de Columnas por Médico en Vista Día */}
            {canUseResourceColumns && (
              <button
                type="button"
                onClick={() => onResourceColumnsModeChange(!resourceColumnsMode)}
                title="Dividir la vista diaria en columnas paralelas por especialista"
                className={cn(
                  'hidden md:inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ml-1',
                  resourceColumnsMode
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted'
                )}
              >
                <MdiIcon icon="mdi:view-column-outline" className="size-3" />
                <span>Por Médico</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ CLUSTER DERECHO: Buscador + Filtros + Modos Spring + Acciones ══ */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
        {/* Buscador Instantáneo de Paciente / Documento / Motivo */}
        <div className="relative hidden md:flex items-center">
          <MdiIcon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Paciente o doc..."
            className="h-8 w-36 xl:w-44 rounded-lg border border-border/80 bg-background/80 pl-8 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 focus:w-52 transition-all outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-1.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <MdiIcon icon="mdi:close-circle-outline" className="size-3.5" />
            </button>
          )}
        </div>

        {/* Selector Rápido de Médico (o Badge Bloqueado si es Médico) */}
        {isDoctorUser ? (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-semibold">
            <MdiIcon icon="mdi:shield-account-outline" className="size-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">
              {currentDoctor
                ? `Dr(a). ${currentDoctor.nombres} ${currentDoctor.apellidos}`
                : 'Mi Agenda'}
            </span>
          </div>
        ) : (
          <div className="hidden xl:block">
            <Select value={selectedMedico} onValueChange={onSelectedMedicoChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs rounded-lg bg-background/80 border-border/80">
                <SelectValue placeholder="Especialista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los médicos</SelectItem>
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: m.color || '#0d9488' }}
                      />
                      <span className="truncate">
                        {m.nombres} {m.apellidos}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Popover Unificado de Filtros Clínicos y Apariencia de Grilla */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-8 rounded-lg px-2.5 text-xs gap-1.5 cursor-pointer bg-background/80',
                activeFiltersCount > 0 &&
                  'border-primary/60 bg-primary/8 text-primary font-semibold'
              )}
              title="Filtros clínicos, paleta de colores y densidad de agenda"
            >
              <MdiIcon icon="mdi:tune-variant" className="size-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9.5px] font-extrabold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3.5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-border/70 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <MdiIcon icon="mdi:filter-variant" className="size-4 text-primary" />
                <span>Filtros & Vista Asistencial</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <MdiIcon icon="mdi:filter-remove-outline" className="size-3.5" />
                  Restablecer
                </button>
              )}
            </div>

            {/* Buscador visible en móvil dentro del popover */}
            <div className="md:hidden">
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar paciente, documento o motivo..."
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {!isDoctorUser && (
                <div className="col-span-2 space-y-1">
                  <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    Médico Tratante
                  </label>
                  <Select value={selectedMedico} onValueChange={onSelectedMedicoChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los especialistas</SelectItem>
                      {medicos.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nombres} {m.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Especialidad
                </label>
                <Select value={selectedEspecialidad} onValueChange={onSelectedEspecialidadChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp.id} value={String(esp.id)}>
                        {esp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Estado Cita
                </label>
                <Select value={selectedEstado} onValueChange={onSelectedEstadoChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="programada">Por Llegar</SelectItem>
                    <SelectItem value="confirmada">Confirmadas</SelectItem>
                    <SelectItem value="sala_espera">Sala de Espera</SelectItem>
                    <SelectItem value="en_consulta">En Consulta</SelectItem>
                    <SelectItem value="atendida">Atendidas</SelectItem>
                    <SelectItem value="no_asistio">No Asistió</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Modalidad
                </label>
                <Select
                  value={selectedModalidad}
                  onValueChange={(v) => onSelectedModalidadChange?.(v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="presencial">🏥 Presencial</SelectItem>
                    <SelectItem value="telemedicina">📹 Telemedicina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sucursales.length > 1 && (
                <div className="col-span-2 space-y-1">
                  <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    Sede / Sucursal
                  </label>
                  <Select value={selectedSucursal} onValueChange={onSelectedSucursalChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sedes</SelectItem>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2 space-y-1">
                <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Radar de Puntualidad (Hoy)
                </label>
                <Select
                  value={filtroPuntualidad}
                  onValueChange={(v) => onFiltroPuntualidadChange(v as any)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sin filtro de retraso</SelectItem>
                    <SelectItem value="alertas">Todas las alertas activas</SelectItem>
                    <SelectItem value="paciente_retrasado">Pacientes retrasados</SelectItem>
                    <SelectItem value="doctor_retrasado">Demoras médicas en sala</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border/70 pt-3 space-y-2.5">
              {/* Modo de Color de Eventos */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MdiIcon icon="mdi:palette-outline" className="size-3.5 text-primary" />
                  <span>Color de Eventos</span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'especialidad', label: 'Espec.' },
                      { id: 'medico', label: 'Médico' },
                      { id: 'estado', label: 'Estado' },
                      { id: 'tema', label: 'Tema' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onColorModeChange(opt.id)}
                      className={cn(
                        'rounded-md py-1 px-1.5 text-[10.5px] font-semibold border transition-all cursor-pointer',
                        colorMode === opt.id
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                          : 'bg-muted/40 text-muted-foreground border-border/70 hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rango Horario y Densidad */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Horario Grilla
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-0.5 border border-border/60">
                    {(
                      [
                        { id: 'clinical', label: 'Clínico' },
                        { id: 'full24', label: '24h' },
                      ] as const
                    ).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onHoursRangeChange(h.id)}
                        className={cn(
                          'rounded-md py-1 text-[10px] font-bold transition-all cursor-pointer',
                          hoursRange === h.id
                            ? 'bg-background text-primary shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Zoom / Altura
                  </label>
                  <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted/50 p-0.5 border border-border/60">
                    {(
                      [
                        { id: 'compact', label: 'S' },
                        { id: 'comfortable', label: 'M' },
                        { id: 'spacious', label: 'L' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onDensityChange(d.id)}
                        className={cn(
                          'rounded-md py-1 text-[10px] font-bold transition-all cursor-pointer',
                          density === d.id
                            ? 'bg-background text-primary shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-medium text-foreground">
                  Mostrar citas canceladas
                </span>
                <Switch checked={showCancelled} onCheckedChange={onShowCancelledChange} />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* ── SELECTOR DE VISTAS CON FÍSICA SPRING (Inspirado en calendar-shadcn) ── */}
        <LayoutGroup id="medisoft-calendar-mode-switcher">
          <div
            role="tablist"
            aria-label="Modo de vista del calendario"
            className="inline-flex items-center rounded-xl border border-border/80 bg-muted/50 p-0.5 shadow-2xs"
          >
            {VIEW_MODES.map((m) => {
              const isSelected = mode === m.value;
              return (
                <motion.button
                  key={m.value}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  layout
                  onClick={() => onModeChange(m.value)}
                  title={`Vista ${m.label} (Atajo: ${m.shortcut})`}
                  className={cn(
                    'relative flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none',
                    isSelected
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="cal-active-mode-bg"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <MdiIcon icon={m.icon} className="size-4 shrink-0" />
                    <AnimatePresence mode="popLayout" initial={false}>
                      {isSelected && (
                        <motion.span
                          key={`lbl-${m.value}`}
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          className="overflow-hidden whitespace-nowrap font-bold"
                        >
                          {m.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>

        {/* Botón Sincronizar */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          title="Sincronizar agenda en vivo"
          className="h-8 w-8 rounded-lg bg-background/80 cursor-pointer shrink-0"
        >
          <MdiIcon
            icon="mdi:sync"
            className={cn('size-4', loading && 'animate-spin text-primary')}
          />
        </Button>

        {/* Menú de Operaciones Asistenciales (Paciente Rápido, Bloqueos, WhatsApp) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs gap-1.5 bg-background/80 cursor-pointer"
              title="Operaciones clínicas rápidas"
            >
              <MdiIcon icon="mdi:star-four-points" className="size-3.5 text-primary" />
              <span className="hidden 2xl:inline">Operaciones</span>
              <MdiIcon icon="mdi:chevron-down" className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              Gestión Rápida de Recepción
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onOpenNewPatient}
              className="gap-2.5 text-xs cursor-pointer py-2"
            >
              <MdiIcon icon="mdi:account-plus-outline" className="size-4 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold">Nuevo Paciente en Sala</span>
                <span className="text-[10px] text-muted-foreground">
                  Registro rápido sin cita previa
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenBloqueoModal}
              className="gap-2.5 text-xs cursor-pointer py-2"
            >
              <MdiIcon icon="mdi:calendar-lock-outline" className="size-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="font-semibold">Bloquear Horario</span>
                <span className="text-[10px] text-muted-foreground">
                  Quirófano, descanso, reunión o permiso
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenWhatsAppReminders}
              className="gap-2.5 text-xs cursor-pointer py-2"
            >
              <MdiIcon icon="mdi:whatsapp" className="size-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="font-semibold">Recordatorios WhatsApp</span>
                <span className="text-[10px] text-muted-foreground">
                  Despachar avisos para citas de mañana
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MdiIcon icon="mdi:keyboard-outline" className="size-3.5" />
                Atajos rápidos:
              </span>
              <span className="font-mono font-semibold">D • S • M • A • T • N</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botón Panel Táctico Lateral (Mini-Calendario + Sala de Espera en Vivo) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleSideDock}
          title="Mostrar/ocultar panel táctico de sala de espera y mini-calendario"
          className={cn(
            'h-8 rounded-lg px-2 text-xs gap-1.5 cursor-pointer relative',
            sideDockOpen
              ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
              : 'bg-background/80 text-muted-foreground hover:text-foreground'
          )}
        >
          <MdiIcon icon="mdi:dock-right" className="size-4" />
          {waitingCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9.5px] font-extrabold text-white">
              {waitingCount}
            </span>
          )}
        </Button>

        {/* Botón Modo Enfoque / Pantalla Completa */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          title={
            isFullscreen
              ? 'Salir de modo enfoque (Esc / F)'
              : 'Modo enfoque a pantalla completa (Atajo: F)'
          }
          className="hidden sm:inline-flex h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <MdiIcon
            icon={isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}
            className="size-4.5"
          />
        </Button>

        {/* CTA Principal: Agendar Cita (Sincronizado 100% con --primary del TemplateCustomizer) */}
        <Button
          type="button"
          size="sm"
          onClick={onOpenNewCita}
          className="badge-beam-container h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3 gap-1.5 shadow-sm shadow-primary/25 cursor-pointer"
        >
          <MdiIcon icon="mdi:calendar-plus" className="size-4" />
          <span>Agendar Cita</span>
        </Button>
      </div>
    </header>
  );
};

export default CalendarCommandHeader;
