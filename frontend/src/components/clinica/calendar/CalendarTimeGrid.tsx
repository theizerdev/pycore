import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn, getInitials } from '../../../lib/utils';
import type { BloqueoAgenda, CitaEstado, CitaMedica, Medico } from '../../../types';
import CalendarEventCard from './CalendarEventCard';
import MdiIcon from './calendar-mdi';
import {
  DENSITY_HOUR_HEIGHT,
  DIAS_SEMANA_CORTOS,
  DIAS_SEMANA_LARGOS,
  computeColumnFreeGaps,
  computeDayColumnPositions,
  format12Hour,
  formatDurationBadge,
  formatDurationShort,
  formatHourAxisLabel,
  getMondayWeekdayIndex,
  getWeekDaysMonday,
  isSameLocalDay,
  minutesToTimeStr,
  toDateKey,
  type CalendarGridDensity,
  type CalendarHoursRange,
  type CitaCalendarItem,
  type ClinicalCalendarItem,
} from './calendar-types';

interface TimeGridColumn {
  key: string;
  date: Date;
  dateStr: string;
  medico?: Medico;
}

interface CalendarTimeGridProps {
  mode: 'day' | 'week';
  date: Date;
  now: Date;
  items: ClinicalCalendarItem[];
  medicos: Medico[];
  hoursRange: CalendarHoursRange;
  density: CalendarGridDensity;
  resourceColumnsMode: boolean;
  onSelectDateAndDayMode: (d: Date) => void;
  onSlotSelect: (
    dateStr: string,
    startTime: string,
    durationMinutes: number,
    medicoId?: number
  ) => void;
  onSelectCita: (cita: CitaMedica) => void;
  onQuickStatusCita: (cita: CitaMedica) => void;
  onDirectChangeEstado: (cita: CitaMedica, nuevoEstado: CitaEstado) => void;
  onOpenPatientRecord: (pacienteId: number) => void;
  onSelectBloqueo: (bloqueo: BloqueoAgenda) => void;
  onRescheduleCita: (
    cita: CitaMedica,
    newDateStr: string,
    newStartTime: string,
    newEndTime: string,
    newDuration: number,
    newMedicoId?: number
  ) => Promise<void>;
  onResizeCita: (
    cita: CitaMedica,
    newEndTime: string,
    newDuration: number
  ) => Promise<void>;
}

interface DragMoveState {
  kind: 'move';
  citaItem: CitaCalendarItem;
  originX: number;
  originY: number;
  grabOffsetMinutes: number;
  active: boolean;
  targetColIndex: number;
  snappedStartMin: number;
}

interface DragResizeState {
  kind: 'resize';
  citaItem: CitaCalendarItem;
  originY: number;
  active: boolean;
  snappedEndMin: number;
}

interface DragCreateState {
  kind: 'create';
  colIndex: number;
  originY: number;
  anchorMin: number;
  currentMin: number;
  dragged: boolean;
}

type ActivePointerInteraction = DragMoveState | DragResizeState | DragCreateState | null;

export const CalendarTimeGrid: React.FC<CalendarTimeGridProps> = ({
  mode,
  date,
  now,
  items,
  medicos,
  hoursRange,
  density,
  resourceColumnsMode,
  onSelectDateAndDayMode,
  onSlotSelect,
  onSelectCita,
  onQuickStatusCita,
  onDirectChangeEstado,
  onOpenPatientRecord,
  onSelectBloqueo,
  onRescheduleCita,
  onResizeCita,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnsWrapperRef = useRef<HTMLDivElement>(null);

  const hourHeightPx = DENSITY_HOUR_HEIGHT[density];
  const todayStr = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Construcción de columnas (1 columna día, N columnas de médicos en día, o 7 días en semana)
  const columns: TimeGridColumn[] = useMemo(() => {
    if (mode === 'week') {
      return getWeekDaysMonday(date).map((d) => {
        const ds = toDateKey(d);
        return { key: ds, date: d, dateStr: ds };
      });
    }

    const ds = toDateKey(date);
    if (resourceColumnsMode && medicos.length > 1) {
      const dayItems = items.filter((it) => it.dateStr === ds);
      const medIdsWithEvents = new Set(
        dayItems.map((it) => (it.kind === 'cita' ? it.cita.medico_id : it.bloqueo.medico_id))
      );
      const activeMeds = medicos.filter((m) => m.activo !== false);
      let displayMeds = activeMeds.filter((m) => medIdsWithEvents.has(m.id));
      if (displayMeds.length === 0) {
        displayMeds = activeMeds.slice(0, 6);
      } else if (displayMeds.length < Math.min(4, activeMeds.length)) {
        for (const m of activeMeds) {
          if (!medIdsWithEvents.has(m.id) && displayMeds.length < 5) {
            displayMeds.push(m);
          }
        }
      }
      if (displayMeds.length > 0) {
        return displayMeds.map((m) => ({
          key: `${ds}_med_${m.id}`,
          date,
          dateStr: ds,
          medico: m,
        }));
      }
    }

    return [{ key: ds, date, dateStr: ds }];
  }, [mode, date, resourceColumnsMode, medicos, items]);

  // Rango dinámico de horas (expande automáticamente si hay citas fuera del horario clínico)
  const { startHour, endHour } = useMemo(() => {
    if (hoursRange === 'full24') {
      return { startHour: 0, endHour: 24 };
    }
    const visibleDates = new Set(columns.map((c) => c.dateStr));
    let minH = 7;
    let maxH = 20;
    for (const it of items) {
      if (!visibleDates.has(it.dateStr)) continue;
      minH = Math.min(minH, Math.floor(it.startMinutes / 60));
      maxH = Math.max(maxH, Math.ceil(it.endMinutes / 60));
    }
    return {
      startHour: Math.max(0, minH),
      endHour: Math.min(24, Math.max(maxH, minH + 8)),
    };
  }, [hoursRange, columns, items]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  );

  const totalGridHeightPx = hours.length * hourHeightPx;

  // Auto-scroll suave hacia la hora actual (o inicio de jornada clínica)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const targetHour =
      now.getHours() >= startHour && now.getHours() <= endHour
        ? Math.max(startHour, now.getHours() - 1)
        : Math.max(startHour, 8);
    const scrollTop = (targetHour - startHour) * hourHeightPx;
    el.scrollTo({ top: Math.max(0, scrollTop - 16), behavior: 'smooth' });
  }, [mode, startHour, hourHeightPx]);

  // Estado de hover fantasma (Ghost Slot) e interacciones de arrastre
  const [hoverSlot, setHoverSlot] = useState<{
    colIndex: number;
    snappedMin: number;
  } | null>(null);

  const [interaction, setInteraction] = useState<ActivePointerInteraction>(null);

  // Convierte clientY relativo a la grilla en minutos ajustados a intervalos de 15 min
  const clientYToMinutes = (clientY: number, snapStep = 15): number => {
    const wrapper = columnsWrapperRef.current;
    if (!wrapper) return startHour * 60;
    const rect = wrapper.getBoundingClientRect();
    const relY = Math.max(0, Math.min(totalGridHeightPx, clientY - rect.top));
    const rawMin = startHour * 60 + (relY / hourHeightPx) * 60;
    const snapped = Math.round(rawMin / snapStep) * snapStep;
    return Math.max(startHour * 60, Math.min(endHour * 60 - snapStep, snapped));
  };

  const clientXToColIndex = (clientX: number): number => {
    const wrapper = columnsWrapperRef.current;
    if (!wrapper || columns.length <= 1) return 0;
    const rect = wrapper.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
    const colWidth = rect.width / columns.length;
    return Math.max(0, Math.min(columns.length - 1, Math.floor(relX / colWidth)));
  };

  // Listeners globales para Drag-Move, Drag-Resize y Drag-Create
  useEffect(() => {
    if (!interaction) return;

    const handlePointerMove = (e: PointerEvent) => {
      setInteraction((prev) => {
        if (!prev) return null;

        if (prev.kind === 'move') {
          const dist = Math.hypot(e.clientX - prev.originX, e.clientY - prev.originY);
          const isNowActive = prev.active || dist > 5;
          if (!isNowActive) return prev;

          const colIdx = clientXToColIndex(e.clientX);
          const rawPointerMin = clientYToMinutes(e.clientY, 15);
          const desiredStart = Math.round((rawPointerMin - prev.grabOffsetMinutes) / 15) * 15;
          const clampedStart = Math.max(
            startHour * 60,
            Math.min(endHour * 60 - prev.citaItem.durationMinutes, desiredStart)
          );

          return {
            ...prev,
            active: true,
            targetColIndex: colIdx,
            snappedStartMin: clampedStart,
          };
        }

        if (prev.kind === 'resize') {
          const dist = Math.abs(e.clientY - prev.originY);
          const isNowActive = prev.active || dist > 3;
          const pointerMin = clientYToMinutes(e.clientY, 5);
          const newEnd = Math.max(
            prev.citaItem.startMinutes + 15,
            Math.min(endHour * 60, pointerMin)
          );
          return {
            ...prev,
            active: isNowActive,
            snappedEndMin: newEnd,
          };
        }

        if (prev.kind === 'create') {
          const dist = Math.abs(e.clientY - prev.originY);
          const curMin = clientYToMinutes(e.clientY, 15);
          return {
            ...prev,
            currentMin: curMin,
            dragged: prev.dragged || dist > 10,
          };
        }

        return prev;
      });
    };

    const handlePointerUp = () => {
      const current = interaction;
      setInteraction(null);
      if (!current) return;

      if (current.kind === 'move' && current.active) {
        const targetCol = columns[current.targetColIndex];
        if (!targetCol) return;
        const newStart = current.snappedStartMin;
        const dur = current.citaItem.durationMinutes;
        const newEnd = Math.min(23 * 60 + 59, newStart + dur);
        const startStr = minutesToTimeStr(newStart);
        const endStr = minutesToTimeStr(newEnd);
        const newMedId = targetCol.medico?.id;

        if (
          targetCol.dateStr !== current.citaItem.dateStr ||
          startStr !== current.citaItem.cita.hora_inicio ||
          (newMedId && newMedId !== current.citaItem.cita.medico_id)
        ) {
          void onRescheduleCita(
            current.citaItem.cita,
            targetCol.dateStr,
            startStr,
            endStr,
            dur,
            newMedId
          );
        }
      } else if (current.kind === 'resize' && current.active) {
        const newEnd = current.snappedEndMin;
        const newDur = Math.max(15, newEnd - current.citaItem.startMinutes);
        const endStr = minutesToTimeStr(newEnd);
        if (newDur !== current.citaItem.durationMinutes) {
          void onResizeCita(current.citaItem.cita, endStr, newDur);
        }
      } else if (current.kind === 'create') {
        const targetCol = columns[current.colIndex];
        if (!targetCol) return;
        if (!current.dragged) {
          // Clic simple: agendar cita de 30 minutos redondeada al bloque de 30 min o 15 min
          onSlotSelect(
            targetCol.dateStr,
            minutesToTimeStr(current.anchorMin),
            30,
            targetCol.medico?.id
          );
        } else {
          const minM = Math.min(current.anchorMin, current.currentMin);
          const maxM = Math.max(current.anchorMin, current.currentMin) + 15;
          const rawDur = Math.max(15, maxM - minM);
          // Redondear a las duraciones clínicas soportadas (15, 20, 30, 45, 60, 90, 120)
          const supported = [15, 20, 30, 45, 60, 90, 120];
          const snappedDur = supported.reduce((best, cur) =>
            Math.abs(cur - rawDur) < Math.abs(best - rawDur) ? cur : best
          );
          onSlotSelect(
            targetCol.dateStr,
            minutesToTimeStr(minM),
            snappedDur,
            targetCol.medico?.id
          );
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [interaction, columns, startHour, endHour, hourHeightPx]);

  // Posiciones e intervalos libres entre citas calculados por columna
  const positionedByColumn = useMemo(() => {
    return columns.map((col) => {
      const colItems = items.filter((it) => {
        if (it.dateStr !== col.dateStr) return false;
        if (col.medico) {
          const itemMedId = it.kind === 'cita' ? it.cita.medico_id : it.bloqueo.medico_id;
          return itemMedId === col.medico.id;
        }
        return true;
      });
      return {
        col,
        rawCount: colItems.filter((i) => i.kind === 'cita').length,
        positioned: computeDayColumnPositions(colItems, startHour, hourHeightPx),
        freeGaps: computeColumnFreeGaps(colItems, startHour, hourHeightPx),
      };
    });
  }, [columns, items, startHour, hourHeightPx]);

  const nowTopPx =
    nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60
      ? ((nowMinutes - startHour * 60) / 60) * hourHeightPx
      : null;

  return (
    <div className="relative flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background">
      {/* ══ CABECERA STICKY DE COLUMNAS (Días o Especialistas) ══ */}
      <div className="flex shrink-0 border-b border-border/80 bg-card/85 backdrop-blur-md z-20">
        {/* Esquina superior del eje de horas */}
        <div className="w-14 sm:w-16 shrink-0 border-r border-border/70 flex flex-col items-center justify-center py-2 text-[9.5px] font-mono font-bold text-muted-foreground uppercase">
          <MdiIcon icon="mdi:clock-outline" className="size-3.5 text-primary/80 mb-0.5" />
          <span>Hora</span>
        </div>

        {/* Cabeceras de cada columna */}
        <div
          className={cn(
            'grid flex-1 min-w-0 divide-x divide-border/70',
            columns.length === 1 && 'grid-cols-1',
            columns.length === 2 && 'grid-cols-2',
            columns.length === 3 && 'grid-cols-3',
            columns.length === 4 && 'grid-cols-4',
            columns.length === 5 && 'grid-cols-5',
            columns.length === 6 && 'grid-cols-6',
            columns.length === 7 && 'grid-cols-7'
          )}
        >
          {positionedByColumn.map(({ col, rawCount }) => {
            const isToday = isSameLocalDay(col.date, now);
            const isSelectedDay = isSameLocalDay(col.date, date);
            const weekdayIdx = getMondayWeekdayIndex(col.date);

            // Cabecera de Especialista cuando estamos en modo Columnas por Médico
            if (col.medico) {
              const med = col.medico;
              return (
                <div
                  key={col.key}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-b from-primary/[0.04] to-transparent min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: med.color || '#0d9488' }}
                    >
                      {getInitials(`${med.nombres} ${med.apellidos}`)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate leading-tight">
                        Dr(a). {med.nombres} {med.apellidos}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {med.especialidad_nombre || 'Especialista'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {rawCount}
                  </span>
                </div>
              );
            }

            // Cabecera de Día (Vista Día Individual o 7 Columnas de Semana)
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => onSelectDateAndDayMode(col.date)}
                className={cn(
                  'group flex items-center justify-center sm:justify-between gap-1.5 px-2 sm:px-3 py-2 transition-colors cursor-pointer min-w-0',
                  isToday
                    ? 'bg-primary/[0.06]'
                    : 'hover:bg-muted/50',
                  mode === 'day' && 'justify-between px-4'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'flex size-7 sm:size-7.5 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-extrabold transition-all',
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 scale-105'
                        : isSelectedDay && mode === 'week'
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                        : 'text-foreground group-hover:bg-accent'
                    )}
                  >
                    {col.date.getDate()}
                  </span>
                  <div className="flex flex-col text-left min-w-0">
                    <span
                      className={cn(
                        'text-[11px] sm:text-xs font-bold uppercase tracking-wide truncate',
                        isToday ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    >
                      {mode === 'day'
                        ? DIAS_SEMANA_LARGOS[weekdayIdx]
                        : DIAS_SEMANA_CORTOS[weekdayIdx]}
                    </span>
                    {mode === 'day' && (
                      <span className="text-[10.5px] text-muted-foreground">
                        {isToday ? 'Jornada clínica en curso' : 'Vista detallada por bloque horario'}
                      </span>
                    )}
                  </div>
                </div>

                {rawCount > 0 && (
                  <span
                    className={cn(
                      'hidden sm:inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0',
                      isToday
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {rawCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ ÁREA SCROLLABLE DE LA GRILLA HORARIA ══ */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden select-none"
      >
        <div
          className="relative flex min-w-0"
          style={{ height: `${totalGridHeightPx}px` }}
        >
          {/* Columna Izquierda Sticky de Horas */}
          <div className="sticky left-0 z-20 w-14 sm:w-16 shrink-0 border-r border-border/70 bg-background/95 backdrop-blur-xs">
            {hours.map((hour, idx) => (
              <div
                key={hour}
                style={{ height: `${hourHeightPx}px` }}
                className="relative border-b border-border/40"
              >
                <span
                  className={cn(
                    'absolute right-2 text-[10.5px] font-mono font-semibold text-muted-foreground',
                    idx === 0 ? 'top-1' : '-top-2'
                  )}
                >
                  {formatHourAxisLabel(hour)}
                </span>
                {/* Marca de media hora (:30) y cuartos (:15 / :45) */}
                {hourHeightPx >= 88 && (
                  <span
                    style={{ top: `${hourHeightPx / 2 - 6}px` }}
                    className="absolute right-2 text-[9px] font-mono font-medium text-muted-foreground/60"
                  >
                    :30
                  </span>
                )}
                {hourHeightPx >= 150 && (
                  <>
                    <span
                      style={{ top: `${hourHeightPx * 0.25 - 5}px` }}
                      className="absolute right-2 text-[8.5px] font-mono text-muted-foreground/35"
                    >
                      :15
                    </span>
                    <span
                      style={{ top: `${hourHeightPx * 0.75 - 5}px` }}
                      className="absolute right-2 text-[8.5px] font-mono text-muted-foreground/35"
                    >
                      :45
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Contenedor de Columnas Interactivas */}
          <div
            ref={columnsWrapperRef}
            onPointerLeave={() => setHoverSlot(null)}
            className={cn(
              'relative grid flex-1 min-w-0 divide-x divide-border/70',
              columns.length === 1 && 'grid-cols-1',
              columns.length === 2 && 'grid-cols-2',
              columns.length === 3 && 'grid-cols-3',
              columns.length === 4 && 'grid-cols-4',
              columns.length === 5 && 'grid-cols-5',
              columns.length === 6 && 'grid-cols-6',
              columns.length === 7 && 'grid-cols-7'
            )}
          >
            {positionedByColumn.map(({ col, positioned, freeGaps }, colIdx) => {
              const isTodayCol = col.dateStr === todayStr;
              const isPastDateCol = col.dateStr < todayStr;

              // Calcular zona horaria ya transcurrida para sombrearla sutilmente
              const pastZoneHeightPx = isPastDateCol
                ? totalGridHeightPx
                : isTodayCol && nowTopPx !== null
                ? Math.max(0, Math.min(totalGridHeightPx, nowTopPx))
                : isTodayCol && nowMinutes > endHour * 60
                ? totalGridHeightPx
                : 0;

              return (
                <div
                  key={col.key}
                  onPointerMove={(e) => {
                    if (interaction) return;
                    if (
                      (e.target as HTMLElement).closest(
                        '.ms-cal-event, .ms-cal-bloqueo, [data-gap-slot]'
                      )
                    ) {
                      setHoverSlot(null);
                      return;
                    }
                    const snapped = clientYToMinutes(e.clientY, 30);
                    setHoverSlot({ colIndex: colIdx, snappedMin: snapped });
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if (
                      (e.target as HTMLElement).closest(
                        '.ms-cal-event, .ms-cal-bloqueo, [data-gap-slot]'
                      )
                    ) {
                      return;
                    }
                    const anchor = clientYToMinutes(e.clientY, 30);
                    setInteraction({
                      kind: 'create',
                      colIndex: colIdx,
                      originY: e.clientY,
                      anchorMin: anchor,
                      currentMin: anchor,
                      dragged: false,
                    });
                  }}
                  className={cn(
                    'relative h-full transition-colors',
                    isTodayCol && 'bg-primary/[0.02]'
                  )}
                >
                  {/* Líneas Horizontales de Hora, Media Hora (:30) y Cuartos (:15 / :45) */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${hourHeightPx}px` }}
                      className="relative border-b border-border/55 pointer-events-none"
                    >
                      {hourHeightPx >= 120 && (
                        <div
                          style={{ top: `${hourHeightPx * 0.25}px` }}
                          className="absolute inset-x-0 border-t border-dotted border-border/25"
                        />
                      )}
                      <div
                        style={{ top: `${hourHeightPx / 2}px` }}
                        className="absolute inset-x-0 border-t border-dashed border-border/40"
                      />
                      {hourHeightPx >= 120 && (
                        <div
                          style={{ top: `${hourHeightPx * 0.75}px` }}
                          className="absolute inset-x-0 border-t border-dotted border-border/25"
                        />
                      )}
                    </div>
                  ))}

                  {/* Sombreado arquitectónico sutil de horas ya transcurridas */}
                  {pastZoneHeightPx > 0 && (
                    <div
                      style={{ height: `${pastZoneHeightPx}px` }}
                      className="ms-cal-past-zone pointer-events-none absolute inset-x-0 top-0 z-[1]"
                    />
                  )}

                  {/* ── INDICADORES DE DURACIÓN LIBRE ENTRE CITAS CONSECUTIVAS ── */}
                  {!interaction &&
                    freeGaps.map((gap) => {
                      const isGapPast =
                        isPastDateCol || (isTodayCol && gap.startMinutes < nowMinutes);
                      const gapStartStr = minutesToTimeStr(gap.startMinutes);
                      const gapEndStr = minutesToTimeStr(gap.endMinutes);
                      const fittingDurations = [15, 20, 30, 45, 60].filter(
                        (d) => d <= gap.gapMinutes
                      );
                      const targetDur =
                        fittingDurations.length > 0
                          ? fittingDurations[fittingDurations.length - 1]
                          : 15;

                      return (
                        <div
                          key={`gap_${gap.startMinutes}_${gap.endMinutes}`}
                          style={{
                            top: `${gap.topPx + 2}px`,
                            height: `${Math.max(16, gap.heightPx - 4)}px`,
                          }}
                          className="pointer-events-none absolute inset-x-2 z-[6] flex items-center justify-center"
                        >
                          {/* Conector vertical punteado sutil que mide la distancia entre ambas citas */}
                          <span className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-primary/25" />

                          {isGapPast ? (
                            <span className="relative inline-flex items-center gap-1 rounded-full border border-border/65 bg-background/85 px-2 py-0.5 text-[9.5px] font-mono font-semibold text-muted-foreground/80 backdrop-blur-xs">
                              <MdiIcon icon="mdi:arrow-expand-vertical" className="size-3 shrink-0" />
                              <span>
                                {columns.length <= 3
                                  ? `${formatDurationBadge(gap.gapMinutes)} entre citas`
                                  : formatDurationShort(gap.gapMinutes)}
                              </span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              data-gap-slot="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSlotSelect(
                                  col.dateStr,
                                  gapStartStr,
                                  targetDur,
                                  col.medico?.id
                                );
                              }}
                              title={`Espacio disponible de ${formatDurationBadge(
                                gap.gapMinutes
                              )} (${format12Hour(gapStartStr)} – ${format12Hour(
                                gapEndStr
                              )}) — Clic para agendar`}
                              className="pointer-events-auto group/gap relative inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-background/92 hover:bg-primary hover:text-primary-foreground hover:border-primary px-2.5 py-0.5 text-[10px] font-bold text-primary shadow-2xs backdrop-blur-xs transition-all cursor-pointer"
                            >
                              <MdiIcon
                                icon="mdi:arrow-expand-vertical"
                                className="size-3 shrink-0"
                              />
                              <span className="font-mono font-extrabold">
                                {columns.length <= 3
                                  ? `${formatDurationBadge(gap.gapMinutes)} libres entre citas`
                                  : `${formatDurationShort(gap.gapMinutes)} libre`}
                              </span>
                              {columns.length <= 2 && (
                                <span className="hidden md:inline font-mono text-[9.5px] opacity-80">
                                  ({format12Hour(gapStartStr)} – {format12Hour(gapEndStr)})
                                </span>
                              )}
                              {columns.length <= 3 && (
                                <span className="hidden lg:inline-flex items-center gap-0.5 text-[9.5px] font-extrabold opacity-0 group-hover/gap:opacity-100 transition-opacity">
                                  • <MdiIcon icon="mdi:plus" className="size-3" /> Agendar
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {/* ── SLOT FANTASMA MAGNÉTICO AL PASAR EL CURSOR ── */}
                  {!interaction &&
                    hoverSlot &&
                    hoverSlot.colIndex === colIdx && (() => {
                      const slotTop =
                        ((hoverSlot.snappedMin - startHour * 60) / 60) * hourHeightPx;
                      const slotH = (30 / 60) * hourHeightPx;
                      const isSlotPast =
                        isPastDateCol || (isTodayCol && hoverSlot.snappedMin < nowMinutes);

                      return (
                        <div
                          style={{ top: `${slotTop + 1}px`, height: `${slotH - 2}px` }}
                          className={cn(
                            'pointer-events-none absolute inset-x-1.5 z-[5] flex items-center justify-between rounded-lg border border-dashed px-2.5 text-[10.5px] font-semibold transition-all duration-100',
                            isSlotPast
                              ? 'border-muted-foreground/25 bg-muted/30 text-muted-foreground/65'
                              : 'border-primary/45 bg-primary/8 text-primary'
                          )}
                        >
                          <span className="flex items-center gap-1 truncate">
                            <MdiIcon
                              icon={
                                isSlotPast
                                  ? 'mdi:clock-alert-outline'
                                  : 'mdi:plus-circle-outline'
                              }
                              className="size-3.5 shrink-0"
                            />
                            <span className="font-mono font-bold">
                              {format12Hour(minutesToTimeStr(hoverSlot.snappedMin))}
                            </span>
                            {columns.length <= 3 && (
                              <span className="truncate opacity-85">
                                {isSlotPast ? '• Horario pasado' : '• Agendar cita (arrastre para fijar duración)'}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })()}

                  {/* ── SELECCIÓN DE RANGO POR ARRASTRE (Click & Drag Create) ── */}
                  {interaction?.kind === 'create' &&
                    interaction.colIndex === colIdx && (() => {
                      const minM = Math.min(interaction.anchorMin, interaction.currentMin);
                      const maxM = interaction.dragged
                        ? Math.max(interaction.anchorMin, interaction.currentMin) + 15
                        : minM + 30;
                      const top = ((minM - startHour * 60) / 60) * hourHeightPx;
                      const height = Math.max(22, ((maxM - minM) / 60) * hourHeightPx);

                      return (
                        <div
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className="pointer-events-none absolute inset-x-1.5 z-30 flex flex-col justify-between rounded-xl border-2 border-primary bg-primary/18 px-2.5 py-1 text-primary shadow-lg backdrop-blur-xs"
                        >
                          <div className="flex items-center justify-between gap-1 text-[11px] font-extrabold">
                            <span className="flex items-center gap-1">
                              <MdiIcon icon="mdi:calendar-plus" className="size-3.5" />
                              Nueva Consulta
                            </span>
                            <span className="rounded-full bg-primary text-primary-foreground px-2 py-0 text-[10px] font-mono">
                              {formatDurationBadge(maxM - minM)}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] font-bold">
                            {format12Hour(minutesToTimeStr(minM))} –{' '}
                            {format12Hour(minutesToTimeStr(maxM))}
                          </span>
                        </div>
                      );
                    })()}

                  {/* ── TARJETAS DE EVENTOS POSICIONADAS (Citas & Bloqueos) ── */}
                  {positioned.map((pos) => {
                    const isMovingThis =
                      interaction?.kind === 'move' &&
                      interaction.active &&
                      interaction.citaItem.id === pos.item.id;

                    const isResizingThis =
                      interaction?.kind === 'resize' &&
                      interaction.active &&
                      interaction.citaItem.id === pos.item.id;

                    const effectiveHeightPx = isResizingThis
                      ? Math.max(
                          22,
                          ((interaction.snappedEndMin - interaction.citaItem.startMinutes) / 60) *
                            hourHeightPx -
                            2
                        )
                      : pos.heightPx;

                    return (
                      <CalendarEventCard
                        key={pos.item.id}
                        item={pos.item}
                        variant="timegrid"
                        topPx={pos.topPx}
                        heightPx={effectiveHeightPx}
                        leftPct={pos.leftPct}
                        widthPct={pos.widthPct}
                        liveEndMinutes={isResizingThis ? interaction.snappedEndMin : undefined}
                        isDragging={isMovingThis}
                        onSelectCita={onSelectCita}
                        onQuickStatusCita={onQuickStatusCita}
                        onDirectChangeEstado={onDirectChangeEstado}
                        onOpenPatientRecord={onOpenPatientRecord}
                        onSelectBloqueo={onSelectBloqueo}
                        onPointerDownMove={(e, calItem) => {
                          if (calItem.kind !== 'cita') return;
                          const pointerMin = clientYToMinutes(e.clientY, 5);
                          setInteraction({
                            kind: 'move',
                            citaItem: calItem,
                            originX: e.clientX,
                            originY: e.clientY,
                            grabOffsetMinutes: Math.max(
                              0,
                              pointerMin - calItem.startMinutes
                            ),
                            active: false,
                            targetColIndex: colIdx,
                            snappedStartMin: calItem.startMinutes,
                          });
                        }}
                        onPointerDownResize={(e, calItem) => {
                          if (calItem.kind !== 'cita') return;
                          setInteraction({
                            kind: 'resize',
                            citaItem: calItem,
                            originY: e.clientY,
                            active: true,
                            snappedEndMin: calItem.endMinutes,
                          });
                        }}
                      />
                    );
                  })}

                  {/* ── FANTASMA EN VIVO AL ARRASTRAR UNA CITA A ESTE HORARIO/DÍA ── */}
                  {interaction?.kind === 'move' &&
                    interaction.active &&
                    interaction.targetColIndex === colIdx && (() => {
                      const ghostTop =
                        ((interaction.snappedStartMin - startHour * 60) / 60) * hourHeightPx;
                      const ghostHeight = Math.max(
                        28,
                        (interaction.citaItem.durationMinutes / 60) * hourHeightPx - 2
                      );
                      const newStartStr = minutesToTimeStr(interaction.snappedStartMin);
                      const newEndStr = minutesToTimeStr(
                        interaction.snappedStartMin + interaction.citaItem.durationMinutes
                      );

                      return (
                        <div
                          style={{ top: `${ghostTop}px`, height: `${ghostHeight}px` }}
                          className="pointer-events-none absolute inset-x-1.5 z-40 flex flex-col justify-between rounded-xl border-2 border-primary bg-primary/22 px-2.5 py-1.5 shadow-xl backdrop-blur-md"
                        >
                          <div className="flex items-center justify-between gap-1 text-xs font-extrabold text-foreground">
                            <span className="truncate">
                              {interaction.citaItem.cita.paciente_nombre}
                            </span>
                            <span className="rounded bg-primary px-1.5 py-0.5 text-[9.5px] font-mono text-primary-foreground shrink-0">
                              Reprogramar
                            </span>
                          </div>
                          <span className="font-mono text-[10.5px] font-bold text-primary flex items-center gap-1">
                            <MdiIcon icon="mdi:calendar-sync" className="size-3.5" />
                            {format12Hour(newStartStr)} – {format12Hour(newEndStr)}
                          </span>
                        </div>
                      );
                    })()}

                  {/* ── LÍNEA LÁSER DE HORA ACTUAL EN VIVO ── */}
                  {isTodayCol && nowTopPx !== null && (
                    <div
                      style={{ top: `${nowTopPx}px` }}
                      className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                    >
                      <span className="relative -ml-1.5 flex size-3 shrink-0 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
                      </span>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-rose-500 via-rose-500/85 to-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.75)]" />
                      {(columns.length === 1 || colIdx === 0 || isTodayCol) && (
                        <span className="mr-2 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase shadow-md flex items-center gap-1">
                          <MdiIcon icon="mdi:clock-fast" className="size-3" />
                          {format12Hour(
                            `${String(now.getHours()).padStart(2, '0')}:${String(
                              now.getMinutes()
                            ).padStart(2, '0')}`
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botón flotante sutil para centrar la hora en curso */}
      {nowTopPx !== null && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            scrollContainerRef.current?.scrollTo({
              top: Math.max(0, nowTopPx - 140),
              behavior: 'smooth',
            });
          }}
          title="Centrar vista en la hora actual"
          className="absolute bottom-3 left-18 z-30 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-2.5 py-1 text-[10.5px] font-bold text-foreground shadow-md backdrop-blur-md hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
          <MdiIcon icon="mdi:target" className="size-3.5 text-primary" />
          <span>Ahora</span>
        </motion.button>
      )}
    </div>
  );
};

export default CalendarTimeGrid;

