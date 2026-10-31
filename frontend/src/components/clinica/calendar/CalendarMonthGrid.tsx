import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { BloqueoAgenda, CitaEstado, CitaMedica } from '../../../types';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Button } from '../../ui/button';
import CalendarEventCard from './CalendarEventCard';
import MdiIcon from './calendar-mdi';
import {
  DIAS_SEMANA_CORTOS,
  MESES_ES,
  getMonthCalendarGridDays,
  isSameLocalDay,
  isSameLocalMonth,
  toDateKey,
  type ClinicalCalendarItem,
} from './calendar-types';

interface CalendarMonthGridProps {
  date: Date;
  now: Date;
  items: ClinicalCalendarItem[];
  onSelectDateAndDayMode: (d: Date) => void;
  onQuickCreateOnDate: (dateStr: string) => void;
  onSelectCita: (cita: CitaMedica) => void;
  onQuickStatusCita: (cita: CitaMedica) => void;
  onDirectChangeEstado?: (cita: CitaMedica, nuevoEstado: CitaEstado) => void;
  onOpenPatientRecord?: (pacienteId: number) => void;
  onSelectBloqueo: (bloqueo: BloqueoAgenda) => void;
  onMoveCitaToDate: (cita: CitaMedica, targetDateStr: string) => Promise<void>;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  date,
  now,
  items,
  onSelectDateAndDayMode,
  onQuickCreateOnDate,
  onSelectCita,
  onQuickStatusCita,
  onDirectChangeEstado,
  onOpenPatientRecord,
  onSelectBloqueo,
  onMoveCitaToDate,
}) => {
  const calendarDays = useMemo(() => getMonthCalendarGridDays(date), [date]);
  const todayStr = toDateKey(now);
  const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

  const [draggedCita, setDraggedCita] = useState<CitaMedica | null>(null);
  const [dropTargetDateStr, setDropTargetDateStr] = useState<string | null>(null);

  // Mapa rápido por fecha YYYY-MM-DD -> ClinicalCalendarItem[]
  const itemsByDate = useMemo(() => {
    const map = new Map<string, ClinicalCalendarItem[]>();
    for (const item of items) {
      const arr = map.get(item.dateStr);
      if (arr) {
        arr.push(item);
      } else {
        map.set(item.dateStr, [item]);
      }
    }
    return map;
  }, [items]);

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background select-none">
      {/* Cabecera de Días de la Semana */}
      <div className="grid grid-cols-7 shrink-0 border-b border-border/80 bg-card/85 divide-x divide-border/60">
        {DIAS_SEMANA_CORTOS.map((dayLabel, idx) => (
          <div
            key={dayLabel}
            className={cn(
              'py-2 text-center text-[11px] font-extrabold uppercase tracking-wider',
              idx >= 5 ? 'text-primary/80' : 'text-muted-foreground'
            )}
          >
            {dayLabel}
          </div>
        ))}
      </div>

      {/* Grilla Proporcional de Celdas Mensuales (100% Alto Disponible) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="grid flex-1 min-h-0 grid-cols-7 auto-rows-fr overflow-y-auto md:overflow-hidden"
        >
          {calendarDays.map((day) => {
            const ds = toDateKey(day);
            const dayItems = itemsByDate.get(ds) || [];
            const isToday = ds === todayStr;
            const isCurrentMonth = isSameLocalMonth(day, date);
            const isSelected = isSameLocalDay(day, date);
            const isPastDay = ds < todayStr;
            const isDropTarget = dropTargetDateStr === ds;
            const maxVisible = calendarDays.length > 35 ? 2 : 3;
            const overflowCount = Math.max(0, dayItems.length - maxVisible);

            return (
              <div
                key={ds}
                onClick={() => onSelectDateAndDayMode(day)}
                onDragOver={(e) => {
                  if (!draggedCita) return;
                  e.preventDefault();
                  if (dropTargetDateStr !== ds) {
                    setDropTargetDateStr(ds);
                  }
                }}
                onDragLeave={() => {
                  if (dropTargetDateStr === ds) {
                    setDropTargetDateStr(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTargetDateStr(null);
                  if (draggedCita && draggedCita.fecha !== ds) {
                    void onMoveCitaToDate(draggedCita, ds);
                  }
                  setDraggedCita(null);
                }}
                className={cn(
                  'group/cell relative flex flex-col border-b border-r border-border/65 p-1.5 sm:p-2 min-h-[88px] md:min-h-0 overflow-hidden transition-colors cursor-pointer',
                  !isCurrentMonth && 'bg-muted/35 text-muted-foreground/70',
                  isToday && 'bg-primary/[0.045]',
                  isSelected && !isToday && 'bg-accent/35',
                  isDropTarget && 'ring-2 ring-inset ring-primary bg-primary/12'
                )}
              >
                {/* Fila superior de la celda: Número del día + Acción rápida (+) */}
                <div className="flex items-center justify-between gap-1 mb-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                        isToday
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-extrabold scale-105'
                          : isCurrentMonth
                          ? 'text-foreground group-hover/cell:bg-accent'
                          : 'text-muted-foreground/60'
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {isToday && (
                      <span className="hidden lg:inline text-[9.5px] font-extrabold uppercase tracking-wider text-primary">
                        Hoy
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {dayItems.length > 0 && (
                      <span className="hidden xl:inline-flex text-[9.5px] font-mono font-semibold text-muted-foreground">
                        {dayItems.length}
                      </span>
                    )}
                    {!isPastDay && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickCreateOnDate(ds);
                        }}
                        title={`Agendar nueva cita el ${day.getDate()} de ${MESES_ES[day.getMonth()]}`}
                        className="opacity-0 group-hover/cell:opacity-100 flex size-5 items-center justify-center rounded-md bg-primary/12 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                      >
                        <MdiIcon icon="mdi:plus" className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista compacta de píldoras de citas del día */}
                <div className="flex flex-1 flex-col gap-1 min-h-0 overflow-hidden">
                  {dayItems.slice(0, maxVisible).map((it) => (
                    <CalendarEventCard
                      key={it.id}
                      item={it}
                      variant="month"
                      onSelectCita={onSelectCita}
                      onQuickStatusCita={onQuickStatusCita}
                      onDirectChangeEstado={onDirectChangeEstado}
                      onOpenPatientRecord={onOpenPatientRecord}
                      onSelectBloqueo={onSelectBloqueo}
                      onMonthDragStart={(_, cita) => setDraggedCita(cita)}
                    />
                  ))}

                  {/* Popover interactivo para "+N más" sin perder el contexto mensual */}
                  {overflowCount > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-auto inline-flex w-full items-center justify-between rounded-md bg-primary/10 hover:bg-primary hover:text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold text-primary transition-colors cursor-pointer"
                        >
                          <span>+{overflowCount} más</span>
                          <MdiIcon icon="mdi:chevron-right" className="size-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="center"
                        className="w-72 p-3 space-y-2.5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between border-b border-border/70 pb-2">
                          <div>
                            <p className="text-xs font-extrabold text-foreground">
                              {day.getDate()} de {MESES_ES[day.getMonth()]} {day.getFullYear()}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground">
                              {dayItems.length} registros en agenda
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectDateAndDayMode(day)}
                            className="h-7 text-[11px] gap-1 cursor-pointer"
                          >
                            <MdiIcon icon="mdi:view-day-outline" className="size-3.5 text-primary" />
                            Abrir día
                          </Button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                          {dayItems.map((it) => (
                            <CalendarEventCard
                              key={`pop-${it.id}`}
                              item={it}
                              variant="month"
                              onSelectCita={onSelectCita}
                              onQuickStatusCita={onQuickStatusCita}
                              onSelectBloqueo={onSelectBloqueo}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CalendarMonthGrid;

