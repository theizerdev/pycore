import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { cn, getInitials } from '../../../lib/utils';
import type { BloqueoAgenda, CitaEstado, CitaMedica } from '../../../types';
import { Button } from '../../ui/button';
import MdiIcon from './calendar-mdi';
import {
  BLOQUEO_TIPO_META,
  CITA_ESTADO_META,
  DIAS_SEMANA_LARGOS,
  MESES_ES,
  PAGO_ESTADO_META,
  endOfWeekSunday,
  format12Hour,
  formatDurationBadge,
  getMondayWeekdayIndex,
  getNextClinicalStep,
  isSameLocalMonth,
  parseDateKey,
  startOfWeekMonday,
  toDateKey,
  type ClinicalCalendarItem,
} from './calendar-types';

interface CalendarAgendaTimelineProps {
  date: Date;
  now: Date;
  items: ClinicalCalendarItem[];
  onSelectDateAndDayMode: (d: Date) => void;
  onSelectCita: (cita: CitaMedica) => void;
  onQuickStatusCita: (cita: CitaMedica) => void;
  onDirectChangeEstado?: (cita: CitaMedica, nuevoEstado: CitaEstado) => void;
  onSelectBloqueo: (bloqueo: BloqueoAgenda) => void;
  onLlamarAConsulta: (citaId: number) => void;
  onOpenPatientRecord: (pacienteId: number) => void;
  onOpenNewCita: () => void;
}

type AgendaScope = 'week' | 'month' | 'upcoming';

export const CalendarAgendaTimeline: React.FC<CalendarAgendaTimelineProps> = ({
  date,
  now,
  items,
  onSelectDateAndDayMode,
  onSelectCita,
  onQuickStatusCita,
  onDirectChangeEstado,
  onSelectBloqueo,
  onLlamarAConsulta,
  onOpenPatientRecord,
  onOpenNewCita,
}) => {
  const [scope, setScope] = useState<AgendaScope>('month');
  const todayStr = toDateKey(now);

  const scopedItems = useMemo(() => {
    if (scope === 'upcoming') {
      return items.filter((it) => it.dateStr >= todayStr);
    }
    if (scope === 'week') {
      const startStr = toDateKey(startOfWeekMonday(date));
      const endStr = toDateKey(endOfWeekSunday(date));
      return items.filter((it) => it.dateStr >= startStr && it.dateStr <= endStr);
    }
    return items.filter((it) => isSameLocalMonth(parseDateKey(it.dateStr), date));
  }, [items, scope, date, todayStr]);

  // Agrupar cronológicamente por día
  const groupedDays = useMemo(() => {
    const groups: {
      dateStr: string;
      dateObj: Date;
      dayItems: ClinicalCalendarItem[];
    }[] = [];
    const map = new Map<string, ClinicalCalendarItem[]>();
    for (const it of scopedItems) {
      const arr = map.get(it.dateStr);
      if (arr) arr.push(it);
      else map.set(it.dateStr, [it]);
    }
    for (const [ds, dayItems] of map.entries()) {
      groups.push({
        dateStr: ds,
        dateObj: parseDateKey(ds),
        dayItems,
      });
    }
    return groups.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [scopedItems]);

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background">
      {/* Sub-barra de alcance del cronograma */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border/70 bg-card/60 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <MdiIcon icon="mdi:timeline-clock-outline" className="size-4 text-primary" />
          <span className="font-bold text-foreground">Cronograma Clínico Detallado</span>
          <span className="text-muted-foreground hidden sm:inline">
            • {scopedItems.length} registros encontrados
          </span>
        </div>

        <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/50 p-0.5 text-xs">
          {(
            [
              { id: 'week', label: 'Semana Activa' },
              { id: 'month', label: 'Mes Activo' },
              { id: 'upcoming', label: 'Próximas' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScope(opt.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer',
                scope === opt.id
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Cronológica Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-6">
        {groupedDays.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center p-6">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-3">
              <MdiIcon icon="mdi:calendar-blank-outline" className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              Sin citas ni bloqueos en este periodo
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Puedes cambiar el alcance a &ldquo;Próximas&rdquo;, ajustar los filtros activos o
              programar un nuevo turno asistencial.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onOpenNewCita}
              className="mt-4 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 cursor-pointer"
            >
              <MdiIcon icon="mdi:calendar-plus" className="size-4" />
              Agendar Nueva Cita
            </Button>
          </div>
        ) : (
          groupedDays.map(({ dateStr, dateObj, dayItems }) => {
            const isToday = dateStr === todayStr;
            const weekdayName = DIAS_SEMANA_LARGOS[getMondayWeekdayIndex(dateObj)];
            const citasCount = dayItems.filter((d) => d.kind === 'cita').length;
            const atendidasCount = dayItems.filter(
              (d) => d.kind === 'cita' && d.cita.estado === 'atendida'
            ).length;

            return (
              <section key={dateStr} className="space-y-2.5">
                {/* Cabecera Sticky de Día */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-2xs backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => onSelectDateAndDayMode(dateObj)}
                    className="flex items-center gap-2.5 text-left group cursor-pointer"
                  >
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg text-xs font-extrabold transition-transform group-hover:scale-105',
                        isToday
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {dateObj.getDate()}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">
                          {weekdayName}, {dateObj.getDate()} de {MESES_ES[dateObj.getMonth()]}
                        </span>
                        {isToday && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-primary">
                            Hoy
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">
                        {citasCount} {citasCount === 1 ? 'cita médica' : 'citas médicas'}
                        {atendidasCount > 0 ? ` • ${atendidasCount} atendidas` : ''}
                      </p>
                    </div>
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectDateAndDayMode(dateObj)}
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-primary cursor-pointer"
                  >
                    <span>Ver grilla</span>
                    <MdiIcon icon="mdi:arrow-right" className="size-3.5" />
                  </Button>
                </div>

                {/* Riel de Tiempo y Tarjetas del Día */}
                <div className="relative pl-4 sm:pl-6 space-y-2 before:absolute before:left-1.5 sm:before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/70">
                  {dayItems.map((it) => {
                    if (it.kind === 'bloqueo') {
                      const meta =
                        BLOQUEO_TIPO_META[it.bloqueo.tipo] || BLOQUEO_TIPO_META.personal;
                      return (
                        <motion.div
                          key={it.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{ '--event-accent': it.accentColor } as React.CSSProperties}
                          onClick={() => onSelectBloqueo(it.bloqueo)}
                          className="ms-cal-bloqueo relative flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 cursor-pointer hover:shadow-sm transition-shadow"
                        >
                          <span
                            className="absolute -left-[15px] sm:-left-[19px] size-2.5 rounded-full ring-4 ring-background"
                            style={{ backgroundColor: it.accentColor }}
                          />
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold text-foreground shrink-0">
                              {format12Hour(it.bloqueo.hora_inicio)} –{' '}
                              {format12Hour(it.bloqueo.hora_fin)}
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MdiIcon
                                icon={meta.icon}
                                className="size-4 shrink-0 ms-cal-event-accent-text"
                              />
                              <span className="text-xs font-bold text-foreground truncate">
                                {meta.label}: {it.bloqueo.motivo}
                              </span>
                              <span className="text-[11px] text-muted-foreground hidden md:inline">
                                ({it.bloqueo.medico_nombre || 'Especialista'})
                              </span>
                            </div>
                          </div>
                          <span className="ms-cal-event-pill-tint rounded-full px-2 py-0.5 text-[10px] font-bold">
                            Bloqueo Operativo
                          </span>
                        </motion.div>
                      );
                    }

                    const { cita, puntualidad } = it;
                    const estadoMeta =
                      CITA_ESTADO_META[cita.estado] || CITA_ESTADO_META.programada;
                    const nextStep = getNextClinicalStep(cita.estado);
                    const pagoMeta = PAGO_ESTADO_META[cita.estado_pago || 'pendiente'];
                    const doctorLabel = cita.medico_nombre.startsWith('Dr')
                      ? cita.medico_nombre
                      : `Dr(a). ${cita.medico_nombre}`;

                    return (
                      <motion.div
                        key={it.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ '--event-accent': it.accentColor } as React.CSSProperties}
                        onClick={() => onSelectCita(cita)}
                        className={cn(
                          'ms-cal-event relative flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 cursor-pointer',
                          cita.estado === 'cancelada' && 'opacity-60'
                        )}
                      >
                        {/* Nodo en el riel */}
                        <span
                          className={cn(
                            'absolute -left-[15px] sm:-left-[19px] size-2.5 rounded-full ring-4 ring-background',
                            estadoMeta.dotClass
                          )}
                        />

                        {/* Bloque Izquierdo: Cápsula de Duración + Paciente + Médico */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          <div className="ms-cal-time-capsule rounded-lg px-2.5 py-1.5 w-26 sm:w-28 shrink-0 text-center">
                            <p className="font-mono text-xs font-extrabold text-foreground leading-tight">
                              {format12Hour(cita.hora_inicio)}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground leading-tight">
                              a {format12Hour(cita.hora_fin)}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0 text-[9.5px] font-mono font-extrabold text-primary">
                              <MdiIcon icon="mdi:timer-outline" className="size-2.5" />
                              {formatDurationBadge(it.durationMinutes)}
                            </span>
                          </div>

                          <div className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary text-xs font-extrabold border border-primary/20">
                            {getInitials(cita.paciente_nombre)}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={cn(
                                  'text-xs sm:text-sm font-extrabold text-foreground truncate',
                                  cita.estado === 'cancelada' && 'line-through'
                                )}
                              >
                                {cita.paciente_nombre}
                              </span>
                              {cita.paciente_documento && (
                                <span className="rounded bg-background/85 border border-border/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground/85">
                                  Doc: {cita.paciente_documento}
                                </span>
                              )}
                              {cita.paciente_telefono && (
                                <span className="hidden md:inline-flex items-center gap-1 rounded bg-background/80 border border-border/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground/80">
                                  <MdiIcon icon="mdi:phone-outline" className="size-3 text-primary" />
                                  {cita.paciente_telefono}
                                </span>
                              )}
                              <span className="ms-cal-event-pill-tint rounded px-1.5 py-0.5 text-[10px] font-extrabold">
                                {cita.especialidad_nombre}
                              </span>
                              {cita.es_sobreturno && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9.5px] font-extrabold text-amber-800 dark:text-amber-300">
                                  <MdiIcon icon="mdi:flash" className="size-3" />
                                  Sobreturno
                                </span>
                              )}
                              {puntualidad.tipo !== 'a_tiempo' && puntualidad.badgeLabel && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold',
                                    puntualidad.badgeClass
                                  )}
                                >
                                  {puntualidad.badgeLabel}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                              <span className="inline-flex items-center gap-1 font-bold text-foreground/90">
                                <MdiIcon icon="mdi:doctor" className="size-3.5 text-primary" />
                                {doctorLabel}
                              </span>
                              {cita.motivo && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="truncate max-w-md text-foreground/80">
                                    <strong>Motivo:</strong> {cita.motivo}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bloque Derecho: Estado de Pago + Avance Directo de Estado */}
                        <div
                          className="flex items-center justify-end gap-2 shrink-0 flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pagoMeta && (
                            <button
                              type="button"
                              onClick={() => onQuickStatusCita(cita)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-extrabold bg-background/90 hover:brightness-95 cursor-pointer',
                                pagoMeta.pillClass
                              )}
                            >
                              <MdiIcon icon={pagoMeta.icon} className="size-3" />
                              <span>
                                {cita.precio_estimado && Number(cita.precio_estimado) > 0
                                  ? `$${cita.precio_estimado} • ${pagoMeta.shortLabel}`
                                  : pagoMeta.shortLabel}
                              </span>
                            </button>
                          )}

                          {nextStep && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onDirectChangeEstado) {
                                  onDirectChangeEstado(cita, nextStep.nextState);
                                } else if (nextStep.nextState === 'en_consulta') {
                                  onLlamarAConsulta(cita.id);
                                } else {
                                  onQuickStatusCita(cita);
                                }
                              }}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10.5px] font-extrabold transition-all cursor-pointer',
                                nextStep.buttonClass
                              )}
                            >
                              <MdiIcon icon={nextStep.icon} className="size-3.5" />
                              <span>{nextStep.label}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onQuickStatusCita(cita)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-extrabold bg-background/90 transition-all cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary',
                              estadoMeta.badgeClass
                            )}
                          >
                            <MdiIcon icon={estadoMeta.icon} className="size-3.5" />
                            <span>{estadoMeta.shortLabel}</span>
                            <MdiIcon icon="mdi:chevron-down" className="size-3 opacity-75" />
                          </button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onOpenPatientRecord(cita.paciente_id)}
                            title="Abrir expediente clínico del paciente"
                            className="h-7 w-7 rounded-lg bg-background/90 cursor-pointer"
                          >
                            <MdiIcon icon="mdi:folder-account-outline" className="size-3.5 text-primary" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CalendarAgendaTimeline;

