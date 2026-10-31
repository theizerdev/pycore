import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { CitaMedica } from '../../../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import { Button } from '../../ui/button';
import MdiIcon from './calendar-mdi';
import {
  CITA_ESTADO_META,
  DIAS_SEMANA_MIN,
  MESES_ES,
  addMonthsLocal,
  format12Hour,
  getMonthCalendarGridDays,
  isSameLocalDay,
  isSameLocalMonth,
  toDateKey,
  type ClinicalCalendarItem,
} from './calendar-types';

interface CalendarSideDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  now: Date;
  onSelectDate: (d: Date) => void;
  items: ClinicalCalendarItem[];
  citasHoyCount: number;
  atendidasHoyCount: number;
  pacientesEnEspera: CitaMedica[];
  pacientesEnConsulta: CitaMedica[];
  punctualitySummary: {
    pacientesRetrasados: number;
    doctoresDemorados: number;
    consultasSobretiempo: number;
    totalAlertas: number;
  };
  filtroPuntualidad: 'all' | 'paciente_retrasado' | 'doctor_retrasado' | 'alertas';
  onFiltroPuntualidadChange: (
    v: 'all' | 'paciente_retrasado' | 'doctor_retrasado' | 'alertas'
  ) => void;
  onSelectCita: (cita: CitaMedica) => void;
  onQuickStatusCita: (cita: CitaMedica) => void;
  onLlamarAConsulta: (citaId: number) => void;
  onOpenPatientRecord: (pacienteId: number) => void;
}

export const CalendarSideDock: React.FC<CalendarSideDockProps> = ({
  open,
  onOpenChange,
  date,
  now,
  onSelectDate,
  items,
  citasHoyCount,
  atendidasHoyCount,
  pacientesEnEspera,
  pacientesEnConsulta,
  punctualitySummary,
  filtroPuntualidad,
  onFiltroPuntualidadChange,
  onSelectCita,
  onQuickStatusCita,
  onLlamarAConsulta,
  onOpenPatientRecord,
}) => {
  const [miniMonth, setMiniMonth] = useState<Date>(date);
  const [activeTab, setActiveTab] = useState<'day' | 'queue'>('day');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);

  useEffect(() => {
    setMiniMonth(date);
  }, [date]);

  useEffect(() => {
    const checkViewport = () => setIsMobileViewport(window.innerWidth < 1280);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const miniDays = useMemo(() => getMonthCalendarGridDays(miniMonth), [miniMonth]);

  // Conteo de citas por fecha para los puntos indicadores del mini-calendario
  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      if (it.kind === 'cita' && it.cita.estado !== 'cancelada') {
        map.set(it.dateStr, (map.get(it.dateStr) || 0) + 1);
      }
    }
    return map;
  }, [items]);

  const selectedDateStr = toDateKey(date);
  const selectedDayCitas = useMemo(
    () =>
      items
        .filter((it): it is Extract<ClinicalCalendarItem, { kind: 'cita' }> => {
          return it.kind === 'cita' && it.dateStr === selectedDateStr;
        })
        .map((it) => it.cita),
    [items, selectedDateStr]
  );

  const progressPct =
    citasHoyCount > 0 ? Math.min(100, Math.round((atendidasHoyCount / citasHoyCount) * 100)) : 0;

  const dockBody = (
    <div className="flex h-full flex-col divide-y divide-border/70 overflow-hidden text-xs select-none">
      {/* ══ 1. MINI CALENDARIO INTERACTIVO CON INDICADORES DE CARGA ══ */}
      <div className="p-3.5 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-extrabold text-foreground">
            {MESES_ES[miniMonth.getMonth()]} {miniMonth.getFullYear()}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setMiniMonth((m) => addMonthsLocal(m, -1))}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <MdiIcon icon="mdi:chevron-left" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMiniMonth(now);
                onSelectDate(now);
              }}
              title="Hoy"
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary cursor-pointer"
            >
              <MdiIcon icon="mdi:calendar-today" className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMiniMonth((m) => addMonthsLocal(m, 1))}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <MdiIcon icon="mdi:chevron-right" className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {DIAS_SEMANA_MIN.map((d, i) => (
            <span
              key={`${d}-${i}`}
              className="text-[10px] font-bold text-muted-foreground py-0.5"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {miniDays.map((d) => {
            const ds = toDateKey(d);
            const isSelected = isSameLocalDay(d, date);
            const isToday = isSameLocalDay(d, now);
            const inMonth = isSameLocalMonth(d, miniMonth);
            const count = countsByDate.get(ds) || 0;

            return (
              <button
                key={ds}
                type="button"
                onClick={() => onSelectDate(d)}
                className={cn(
                  'relative flex h-7.5 w-full flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-extrabold shadow-xs shadow-primary/30'
                    : isToday
                    ? 'bg-primary/12 text-primary font-bold ring-1 ring-primary/40'
                    : inMonth
                    ? 'text-foreground hover:bg-accent'
                    : 'text-muted-foreground/45 hover:bg-accent/50'
                )}
              >
                <span className="leading-none">{d.getDate()}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'mt-0.5 h-1 rounded-full transition-all',
                      count >= 4 ? 'w-3' : 'w-1',
                      isSelected ? 'bg-primary-foreground/90' : 'bg-primary'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ 2. RADAR DE PUNTUALIDAD Y AVANCE DEL DÍA ══ */}
      <div className="p-3.5 space-y-2.5 shrink-0 bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-foreground flex items-center gap-1.5">
            <MdiIcon icon="mdi:pulse" className="size-4 text-primary" />
            Pulso de Hoy
          </span>
          <span className="text-[10.5px] font-mono font-bold text-muted-foreground">
            {atendidasHoyCount}/{citasHoyCount} atendidas ({progressPct}%)
          </span>
        </div>

        {/* Barra de progreso clínica */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full rounded-full bg-primary transition-all duration-500"
          />
        </div>

        {/* Píldoras interactivas de retrasos */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() =>
              onFiltroPuntualidadChange(
                filtroPuntualidad === 'paciente_retrasado' ? 'all' : 'paciente_retrasado'
              )
            }
            className={cn(
              'flex items-center justify-between rounded-lg border px-2 py-1.5 text-left transition-all cursor-pointer',
              filtroPuntualidad === 'paciente_retrasado'
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : punctualitySummary.pacientesRetrasados > 0
                ? 'bg-amber-500/12 border-amber-500/35 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20'
                : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MdiIcon icon="mdi:account-alert-outline" className="size-3.5 shrink-0" />
              <span className="text-[10px] font-bold truncate">Retrasados</span>
            </div>
            <span className="font-mono text-xs font-extrabold ml-1">
              {punctualitySummary.pacientesRetrasados}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onFiltroPuntualidadChange(
                filtroPuntualidad === 'doctor_retrasado' ? 'all' : 'doctor_retrasado'
              )
            }
            className={cn(
              'flex items-center justify-between rounded-lg border px-2 py-1.5 text-left transition-all cursor-pointer',
              filtroPuntualidad === 'doctor_retrasado'
                ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                : punctualitySummary.doctoresDemorados > 0
                ? 'bg-purple-500/12 border-purple-500/35 text-purple-800 dark:text-purple-300 hover:bg-purple-500/20'
                : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MdiIcon icon="mdi:timer-alert-outline" className="size-3.5 shrink-0" />
              <span className="text-[10px] font-bold truncate">Demora Dr.</span>
            </div>
            <span className="font-mono text-xs font-extrabold ml-1">
              {punctualitySummary.doctoresDemorados}
            </span>
          </button>
        </div>
      </div>

      {/* ══ 3. PESTAÑAS: AGENDA DEL DÍA VS SALA DE ESPERA EN VIVO ══ */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 gap-1 p-2 border-b border-border/60 bg-card/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('day')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer',
              activeTab === 'day'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <MdiIcon icon="mdi:calendar-today" className="size-3.5" />
            <span>Día ({selectedDayCitas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer',
              activeTab === 'queue'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <MdiIcon icon="mdi:seat-passenger" className="size-3.5" />
            <span>
              Sala ({pacientesEnEspera.length + pacientesEnConsulta.length})
            </span>
          </button>
        </div>

        {/* Lista scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === 'day' ? (
            selectedDayCitas.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground space-y-1.5">
                <MdiIcon
                  icon="mdi:calendar-blank-outline"
                  className="size-7 mx-auto opacity-45"
                />
                <p className="text-[11px] font-medium">Sin citas para este día</p>
              </div>
            ) : (
              selectedDayCitas.map((c) => {
                const meta = CITA_ESTADO_META[c.estado] || CITA_ESTADO_META.programada;
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCita(c)}
                    className={cn(
                      'group flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer',
                      c.estado === 'cancelada' && 'opacity-55'
                    )}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'size-2 rounded-full shrink-0',
                            meta.dotClass,
                            meta.pulse && 'animate-pulse'
                          )}
                        />
                        <span className="font-mono text-[10px] font-bold text-primary">
                          {format12Hour(c.hora_inicio)}
                        </span>
                        {c.es_sobreturno && (
                          <MdiIcon icon="mdi:flash" className="size-3 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">
                        {c.paciente_nombre}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.especialidad_nombre}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(c);
                      }}
                      title="Cambiar estado"
                      className={cn(
                        'shrink-0 rounded-full border p-1 transition-colors cursor-pointer',
                        meta.badgeClass
                      )}
                    >
                      <MdiIcon icon={meta.icon} className="size-3" />
                    </button>
                  </div>
                );
              })
            )
          ) : pacientesEnEspera.length === 0 && pacientesEnConsulta.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-1.5">
              <MdiIcon icon="mdi:seat-passenger" className="size-7 mx-auto opacity-45" />
              <p className="text-[11px] font-medium">Sala de espera despejada</p>
            </div>
          ) : (
            <>
              {pacientesEnConsulta.map((c) => (
                <div
                  key={`cons-${c.id}`}
                  onClick={() => onSelectCita(c)}
                  className="rounded-xl border border-emerald-500/35 bg-emerald-500/8 p-2.5 space-y-1.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                      En Consultorio
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {format12Hour(c.hora_inicio)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">
                    {c.paciente_nombre}
                  </p>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-muted-foreground truncate">
                      Dr(a). {c.medico_nombre}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPatientRecord(c.paciente_id);
                      }}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Ficha
                    </button>
                  </div>
                </div>
              ))}

              {pacientesEnEspera.map((c) => (
                <div
                  key={`esp-${c.id}`}
                  onClick={() => onSelectCita(c)}
                  className="rounded-xl border border-amber-500/35 bg-amber-500/8 p-2.5 space-y-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                      <MdiIcon icon="mdi:seat-passenger" className="size-3.5" />
                      Aguardando turno
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                      {format12Hour(c.hora_inicio)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground truncate">
                      {c.paciente_nombre}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Dr(a). {c.medico_nombre}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLlamarAConsulta(c.id);
                    }}
                    className="w-full h-7 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold gap-1.5 cursor-pointer"
                  >
                    <MdiIcon icon="mdi:bullhorn-outline" className="size-3.5" />
                    Llamar a Consulta
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // En móvil / tablet se despliega como Sheet deslizante para no restar ancho a la grilla
  if (isMobileViewport) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[300px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border/70 shrink-0">
            <SheetTitle className="text-xs font-extrabold flex items-center gap-1.5">
              <MdiIcon icon="mdi:dock-right" className="size-4 text-primary" />
              Panel Táctico Asistencial
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">{dockBody}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // En escritorio (xl+): Panel lateral acoplado con animación suave
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="desktop-calendar-dock"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className="hidden xl:flex shrink-0 flex-col border-l border-border/80 bg-card/65 backdrop-blur-md overflow-hidden"
        >
          <div className="w-[288px] h-full flex flex-col">{dockBody}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default CalendarSideDock;
