import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { CitaMedica, CitaEstado, BloqueoAgenda } from '../../../types';
import MdiIcon from './calendar-mdi';
import {
  BLOQUEO_TIPO_META,
  CITA_ESTADO_META,
  PAGO_ESTADO_META,
  WORKFLOW_PIPELINE_STEPS,
  format12Hour,
  formatDurationBadge,
  formatDurationShort,
  getNextClinicalStep,
  minutesToTimeStr,
  type ClinicalCalendarItem,
} from './calendar-types';

interface CalendarEventCardProps {
  item: ClinicalCalendarItem;
  variant: 'timegrid' | 'month';
  topPx?: number;
  heightPx?: number;
  leftPct?: number;
  widthPct?: number;
  liveEndMinutes?: number;
  isDragging?: boolean;
  onSelectCita: (cita: CitaMedica) => void;
  onQuickStatusCita: (cita: CitaMedica) => void;
  onDirectChangeEstado?: (cita: CitaMedica, nuevoEstado: CitaEstado) => void;
  onOpenPatientRecord?: (pacienteId: number) => void;
  onSelectBloqueo: (bloqueo: BloqueoAgenda) => void;
  onPointerDownMove?: (e: React.PointerEvent, item: ClinicalCalendarItem) => void;
  onPointerDownResize?: (e: React.PointerEvent, item: ClinicalCalendarItem) => void;
  onMonthDragStart?: (e: React.DragEvent, cita: CitaMedica) => void;
}

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  item,
  variant,
  topPx = 0,
  heightPx = 66,
  leftPct = 0,
  widthPct = 100,
  liveEndMinutes,
  isDragging = false,
  onSelectCita,
  onQuickStatusCita,
  onDirectChangeEstado,
  onOpenPatientRecord,
  onSelectBloqueo,
  onPointerDownMove,
  onPointerDownResize,
  onMonthDragStart,
}) => {
  // ── RENDERIZADO DE BLOQUEO OPERATIVO DE AGENDA ─────────────────────────
  if (item.kind === 'bloqueo') {
    const { bloqueo } = item;
    const meta = BLOQUEO_TIPO_META[bloqueo.tipo] || BLOQUEO_TIPO_META.personal;
    const cssVars = { '--event-accent': item.accentColor } as React.CSSProperties;
    const blockDurationLabel = formatDurationBadge(item.durationMinutes);

    if (variant === 'month') {
      return (
        <button
          type="button"
          style={cssVars}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBloqueo(bloqueo);
          }}
          className="ms-cal-bloqueo group flex w-full items-center justify-between gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[10.5px] transition-all hover:brightness-105 cursor-pointer overflow-hidden"
        >
          <div className="flex items-center gap-1 min-w-0 truncate">
            <MdiIcon icon={meta.icon} className="size-3 shrink-0 ms-cal-event-accent-text" />
            <span className="font-mono text-[9.5px] font-bold text-foreground/80 shrink-0">
              {bloqueo.hora_inicio}
            </span>
            <span className="truncate font-semibold text-foreground/90">{bloqueo.motivo}</span>
          </div>
          <span className="font-mono text-[9px] font-bold text-muted-foreground shrink-0">
            {formatDurationShort(item.durationMinutes)}
          </span>
        </button>
      );
    }

    const isCompactBlock = heightPx < 48;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        style={{
          ...cssVars,
          top: `${topPx}px`,
          height: `${heightPx}px`,
          left: `calc(${leftPct}% + 2px)`,
          width: `calc(${widthPct}% - 4px)`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBloqueo(bloqueo);
        }}
        className={cn(
          'ms-cal-bloqueo @container absolute z-10 flex rounded-xl select-none overflow-hidden cursor-pointer hover:z-20 transition-shadow hover:shadow-md',
          isCompactBlock
            ? 'flex-row items-center justify-between px-2.5 py-0.5'
            : 'flex-col justify-between px-3 py-1.5'
        )}
      >
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <MdiIcon icon={meta.icon} className="size-3.5 shrink-0 ms-cal-event-accent-text" />
            <span className="text-xs font-extrabold text-foreground truncate">
              {meta.label}: {bloqueo.motivo}
            </span>
            <span className="hidden @md:inline-flex items-center gap-1 rounded-full bg-background/80 border border-border/70 px-2 py-0 text-[10px] font-mono font-bold text-foreground/85 shrink-0">
              <MdiIcon icon="mdi:timer-outline" className="size-2.5 ms-cal-event-accent-text" />
              {blockDurationLabel}
            </span>
          </div>
          <span className="ms-cal-event-pill-tint shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            <MdiIcon icon="mdi:lock-outline" className="size-2.5" />
            <span className="hidden @xs:inline">Bloqueado</span>
          </span>
        </div>

        {!isCompactBlock && (
          <div className="flex items-center justify-between gap-2 text-[10.5px] text-foreground/80">
            <span className="truncate font-semibold flex items-center gap-1">
              <MdiIcon icon="mdi:doctor" className="size-3 ms-cal-event-accent-text shrink-0" />
              {bloqueo.medico_nombre || 'Especialista'}
            </span>
            <span className="font-mono font-bold shrink-0 text-foreground/90">
              {format12Hour(bloqueo.hora_inicio)} – {format12Hour(bloqueo.hora_fin)} (
              {blockDurationLabel})
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  // ── RENDERIZADO DE CITA MÉDICA ASISTENCIAL (ADAPTABLE AL TIEMPO Y ANCHO) ─
  const { cita, puntualidad } = item;
  const effectiveEndMin = liveEndMinutes ?? item.endMinutes;
  const effectiveDurationMin = Math.max(10, effectiveEndMin - item.startMinutes);
  const effectiveEndStr =
    liveEndMinutes !== undefined ? minutesToTimeStr(liveEndMinutes) : cita.hora_fin;

  const durationBadge = formatDurationBadge(effectiveDurationMin);
  const durationShort = formatDurationShort(effectiveDurationMin);

  const estadoMeta = CITA_ESTADO_META[cita.estado] || CITA_ESTADO_META.programada;
  const nextStep = getNextClinicalStep(cita.estado);
  const pagoMeta = PAGO_ESTADO_META[cita.estado_pago || 'pendiente'] || PAGO_ESTADO_META.pendiente;

  const isCancelled = cita.estado === 'cancelada';
  const isNoShow = cita.estado === 'no_asistio';
  const isInactive = isCancelled || isNoShow;
  const isLiveConsult = cita.estado === 'en_consulta';
  const isWaiting = cita.estado === 'sala_espera';
  const hasWhatsApp = Boolean(cita.recordatorio_enviado || cita.whatsapp_notificado);

  const doctorLabel = cita.medico_nombre.startsWith('Dr')
    ? cita.medico_nombre
    : `Dr(a). ${cita.medico_nombre}`;

  const start12h = format12Hour(cita.hora_inicio);
  const end12h = format12Hour(effectiveEndStr);
  const timeRange = `${start12h} – ${end12h}`;

  const formattedPrice =
    cita.precio_estimado != null && Number(cita.precio_estimado) > 0
      ? `$${Number(cita.precio_estimado).toLocaleString('es-VE', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`
      : null;

  const currentPipelineIdx = WORKFLOW_PIPELINE_STEPS.indexOf(cita.estado);
  const cssVars = { '--event-accent': item.accentColor } as React.CSSProperties;

  const triggerNextStep = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStep) return;
    if (onDirectChangeEstado) {
      onDirectChangeEstado(cita, nextStep.nextState);
    } else {
      onQuickStatusCita(cita);
    }
  };

  const triggerSpecificState = (e: React.MouseEvent, targetState: CitaEstado) => {
    e.stopPropagation();
    if (targetState === cita.estado) {
      onQuickStatusCita(cita);
      return;
    }
    if (onDirectChangeEstado && targetState !== 'cancelada') {
      onDirectChangeEstado(cita, targetState);
    } else {
      onQuickStatusCita(cita);
    }
  };

  // Tooltip Clínico Completo para Recepción (Portalizado sin recortes)
  const renderTooltipPortal = () => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={14}
        className="z-[100] w-80 rounded-xl border border-border/90 bg-popover/98 p-3.5 text-popover-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 pointer-events-none"
      >
        {/* Cabecera del Paciente */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/70">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cita.especialidad_color || '#0d9488' }}
              />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary truncate">
                {cita.especialidad_nombre}
              </span>
            </div>
            <p className="text-[13px] font-extrabold text-foreground mt-0.5 leading-snug">
              {cita.paciente_nombre}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10.5px] text-muted-foreground font-mono">
              <span>Doc: {cita.paciente_documento}</span>
              {cita.paciente_telefono && <span>• Tel: {cita.paciente_telefono}</span>}
            </div>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold shrink-0',
              estadoMeta.badgeClass
            )}
          >
            <MdiIcon icon={estadoMeta.icon} className="size-3" />
            {estadoMeta.shortLabel}
          </span>
        </div>

        {/* Detalles Operativos de Recepción */}
        <div className="py-2.5 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2 text-foreground">
            <span className="flex items-center gap-1.5 font-mono font-bold">
              <MdiIcon icon="mdi:clock-outline" className="size-3.5 text-primary shrink-0" />
              {timeRange}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
              <MdiIcon icon="mdi:timer-outline" className="size-3" />
              Duración: {durationBadge}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-foreground/90">
            <MdiIcon icon="mdi:doctor" className="size-3.5 text-primary shrink-0" />
            <span className="font-bold truncate">{doctorLabel}</span>
          </div>

          {(cita.servicio_nombre || cita.sucursal_nombre) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MdiIcon icon="mdi:hospital-building" className="size-3.5 shrink-0" />
              <span className="truncate">
                {[cita.servicio_nombre, cita.sucursal_nombre].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}

          {cita.motivo && (
            <div className="flex items-start gap-1.5 pt-0.5 text-foreground/85">
              <MdiIcon
                icon="mdi:clipboard-pulse-outline"
                className="size-3.5 mt-0.5 text-primary shrink-0"
              />
              <span className="line-clamp-2 leading-tight">
                <strong className="font-semibold text-muted-foreground">Motivo:</strong>{' '}
                {cita.motivo}
              </span>
            </div>
          )}
        </div>

        {/* Pie Financiero y Alertas */}
        <div className="pt-2 border-t border-border/70 flex flex-wrap items-center justify-between gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold',
              pagoMeta.pillClass
            )}
          >
            <MdiIcon icon={pagoMeta.icon} className="size-3" />
            {formattedPrice ? `${formattedPrice} • ${pagoMeta.label}` : pagoMeta.label}
          </span>

          <div className="flex items-center gap-1">
            {hasWhatsApp && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300">
                <MdiIcon icon="mdi:whatsapp" className="size-3" />
                WA
              </span>
            )}
            {cita.es_sobreturno && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
                <MdiIcon icon="mdi:flash" className="size-3" />
                Sobreturno
              </span>
            )}
            {puntualidad.tipo !== 'a_tiempo' && puntualidad.badgeShortLabel && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold',
                  puntualidad.badgeClass
                )}
              >
                {puntualidad.badgeShortLabel}
              </span>
            )}
          </div>
        </div>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );

  // ── VARIANTE MENSUAL (Píldora Compacta con Duración y Acción de Estado) ─
  if (variant === 'month') {
    return (
      <TooltipPrimitive.Root delayDuration={240}>
        <TooltipPrimitive.Trigger asChild>
          <div
            draggable={!isCancelled}
            onDragStart={(e) => {
              if (onMonthDragStart && !isCancelled) {
                onMonthDragStart(e, cita);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCita(cita);
            }}
            style={cssVars}
            className={cn(
              'ms-cal-event group/mpill relative flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[10.5px] leading-none cursor-pointer select-none overflow-hidden',
              isCancelled && 'opacity-55',
              isLiveConsult && 'ring-1 ring-emerald-500/60'
            )}
          >
            <div className="flex items-center gap-1 min-w-0 truncate">
              <span
                className={cn(
                  'size-1.5 rounded-full shrink-0',
                  estadoMeta.dotClass,
                  estadoMeta.pulse && 'animate-pulse'
                )}
              />
              <span className="font-mono text-[9.5px] font-extrabold text-foreground/90 shrink-0">
                {cita.hora_inicio}
              </span>
              <span
                className={cn(
                  'font-bold text-foreground truncate',
                  isCancelled && 'line-through text-muted-foreground'
                )}
              >
                {cita.paciente_nombre}
              </span>
              {cita.es_sobreturno && (
                <MdiIcon icon="mdi:flash" className="size-3 text-amber-500 shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="hidden xl:inline font-mono text-[9px] font-bold ms-cal-event-accent-text">
                {durationShort}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatusCita(cita);
                }}
                title={`Estado actual: ${estadoMeta.label} — Clic para cambiar estado o cobro`}
                className={cn(
                  'shrink-0 flex items-center justify-center rounded-full px-1 py-0.5 border transition-colors cursor-pointer bg-background/85 hover:bg-primary hover:text-primary-foreground hover:border-primary',
                  estadoMeta.badgeClass
                )}
              >
                <MdiIcon icon={estadoMeta.icon} className="size-2.5" />
              </button>
            </div>
          </div>
        </TooltipPrimitive.Trigger>
        {renderTooltipPortal()}
      </TooltipPrimitive.Root>
    );
  }

  // ── VARIANTE GRILLA HORARIA (DÍA / SEMANA / MULTI-MÉDICO) ───────────────
  // 4 niveles estrictos de altura para garantizar 0% recorte vertical y 100% adaptabilidad:
  //   Tier XS: heightPx < 42   (citas de 10-15 min)
  //   Tier SM: 42 <= heightPx < 66  (citas de 20 min, o 30 min en modo compacto)
  //   Tier MD: 66 <= heightPx < 118 (citas de 30-45 min en modo cómodo, o 60 min compacto)
  //   Tier LG: heightPx >= 118 (citas de 60, 90, 120 min con barra interactiva de 5 estados)
  const tier: 'xs' | 'sm' | 'md' | 'lg' =
    heightPx < 42 ? 'xs' : heightPx < 66 ? 'sm' : heightPx < 118 ? 'md' : 'lg';

  return (
    <TooltipPrimitive.Root delayDuration={380}>
      <TooltipPrimitive.Trigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 2, scale: 0.99 }}
          animate={{
            opacity: isDragging ? 0.45 : isInactive ? 0.65 : 1,
            y: 0,
            scale: 1,
          }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...cssVars,
            top: `${topPx}px`,
            height: `${heightPx}px`,
            left: `calc(${leftPct}% + 2px)`,
            width: `calc(${widthPct}% - 4px)`,
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button, [data-resize-handle]')) return;
            if (onPointerDownMove && !isCancelled) {
              onPointerDownMove(e, item);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectCita(cita);
          }}
          className={cn(
            'ms-cal-event @container group/card absolute z-10 rounded-xl select-none overflow-hidden cursor-pointer hover:z-30',
            tier === 'xs' && 'px-2 py-0 flex items-center',
            tier === 'sm' && 'px-2 py-1 @sm:px-2.5 flex items-center',
            tier === 'md' && 'px-2.5 py-1.5 flex flex-col justify-center',
            tier === 'lg' && 'px-2.5 py-1.5 @sm:px-3 @sm:py-2 flex flex-col justify-between',
            isLiveConsult && 'ring-2 ring-emerald-500/65 shadow-md shadow-emerald-500/15',
            isWaiting && 'ring-1.5 ring-amber-500/55',
            puntualidad.severidad === 'critica' &&
              puntualidad.tipo !== 'no_asistio' &&
              'ring-1.5 ring-rose-500/65'
          )}
        >
          {/* Indicador luminoso superior cuando el paciente está en consulta activa */}
          {isLiveConsult && (
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-emerald-400 via-primary to-emerald-400 animate-pulse" />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TIER XS (< 42px): Barra horizontal ultra-nítida (10 - 15 min)
          ══════════════════════════════════════════════════════════════════ */}
          {tier === 'xs' && (
            <div className="flex w-full items-center justify-between gap-1.5 min-w-0 leading-none">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0',
                    estadoMeta.dotClass,
                    estadoMeta.pulse && 'animate-pulse'
                  )}
                />
                <span className="font-mono text-[10px] font-extrabold text-foreground shrink-0">
                  <span className="@md:hidden">{cita.hora_inicio}</span>
                  <span className="hidden @md:inline">{timeRange}</span>
                </span>
                <span className="rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] font-extrabold text-primary shrink-0">
                  {durationShort}
                </span>
                <span
                  className={cn(
                    'text-[11.5px] font-extrabold text-foreground truncate',
                    isCancelled && 'line-through text-muted-foreground'
                  )}
                >
                  {cita.paciente_nombre}
                </span>
                {cita.es_sobreturno && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-500/40 px-1 py-0.5 text-[8.5px] font-extrabold text-amber-800 dark:text-amber-300 shrink-0">
                    <MdiIcon icon="mdi:flash" className="size-2.5" />
                    ST
                  </span>
                )}
                {cita.paciente_documento && (
                  <span className="hidden @md:inline font-mono text-[10px] font-semibold text-muted-foreground shrink-0">
                    • Doc: {cita.paciente_documento}
                  </span>
                )}
                <span className="hidden @lg:inline text-[10.5px] font-semibold text-foreground/80 truncate">
                  • {doctorLabel}
                </span>
                {puntualidad.tipo !== 'a_tiempo' && puntualidad.badgeShortLabel && (
                  <span
                    className={cn(
                      'hidden @xl:inline-flex items-center rounded border px-1 py-0.5 text-[8.5px] font-extrabold shrink-0',
                      puntualidad.badgeClass
                    )}
                  >
                    {puntualidad.badgeShortLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatusCita(cita);
                  }}
                  title="Gestionar cobro y estado"
                  className={cn(
                    'hidden @lg:inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold bg-background/85 hover:brightness-95 transition-all cursor-pointer',
                    pagoMeta.pillClass
                  )}
                >
                  <MdiIcon icon={pagoMeta.icon} className="size-2.5" />
                  <span>{formattedPrice || pagoMeta.shortLabel}</span>
                </button>

                {nextStep && (
                  <button
                    type="button"
                    onClick={triggerNextStep}
                    title={`Avanzar a: ${nextStep.label}`}
                    className={cn(
                      'hidden @sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold transition-all cursor-pointer',
                      nextStep.buttonClass
                    )}
                  >
                    <MdiIcon icon={nextStep.icon} className="size-2.5" />
                    <span>{nextStep.shortLabel}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatusCita(cita);
                  }}
                  title={`Estado actual: ${estadoMeta.label} (clic para opciones)`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold bg-background/90 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer',
                    estadoMeta.badgeClass
                  )}
                >
                  <MdiIcon icon={estadoMeta.icon} className="size-2.5" />
                  <span className="hidden @md:inline">{estadoMeta.shortLabel}</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TIER SM (42px - 65px): 2 líneas compactas sin recorte (20-30 min)
          ══════════════════════════════════════════════════════════════════ */}
          {tier === 'sm' && (
            <>
              {/* Vista estrecha (< 384px: Semana o solapadas) */}
              <div className="flex @sm:hidden w-full flex-col justify-center gap-0.5 min-w-0">
                <div className="flex items-center justify-between gap-1 leading-tight min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={cn(
                        'size-1.5 rounded-full shrink-0',
                        estadoMeta.dotClass,
                        estadoMeta.pulse && 'animate-pulse'
                      )}
                    />
                    <span className="font-mono text-[10px] font-extrabold text-foreground shrink-0">
                      {cita.hora_inicio}
                    </span>
                    <span className="rounded bg-primary/15 px-1 py-0 font-mono text-[8.5px] font-extrabold text-primary shrink-0">
                      {durationShort}
                    </span>
                    <span
                      className={cn(
                        'text-[11.5px] font-extrabold text-foreground truncate',
                        isCancelled && 'line-through text-muted-foreground'
                      )}
                    >
                      {cita.paciente_nombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {nextStep && (
                      <button
                        type="button"
                        onClick={triggerNextStep}
                        title={nextStep.label}
                        className={cn(
                          'flex size-4.5 items-center justify-center rounded-full border transition-all cursor-pointer',
                          nextStep.buttonClass
                        )}
                      >
                        <MdiIcon icon={nextStep.icon} className="size-2.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(cita);
                      }}
                      title={`Estado: ${estadoMeta.label}`}
                      className={cn(
                        'flex size-4.5 items-center justify-center rounded-full border bg-background/90 cursor-pointer',
                        estadoMeta.badgeClass
                      )}
                    >
                      <MdiIcon icon={estadoMeta.icon} className="size-2.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 text-[10px] leading-tight text-foreground/80 min-w-0">
                  <span className="truncate font-semibold">{doctorLabel}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {cita.es_sobreturno && (
                      <MdiIcon icon="mdi:flash" className="size-3 text-amber-500" />
                    )}
                    <MdiIcon icon={pagoMeta.icon} className="size-3 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Vista ancha (>= 384px: Día / Columnas por médico) */}
              <div className="hidden @sm:flex w-full items-center justify-between gap-2.5 min-w-0">
                {/* Cápsula de Hora + Duración */}
                <div className="ms-cal-time-capsule flex flex-col items-center justify-center rounded-lg px-2 py-0.5 shrink-0 min-w-[78px]">
                  <span className="font-mono text-[10px] font-extrabold text-foreground leading-tight">
                    {start12h}
                  </span>
                  <span className="font-mono text-[9px] font-extrabold ms-cal-event-accent-text leading-tight flex items-center gap-0.5">
                    <MdiIcon icon="mdi:timer-outline" className="size-2.5" />
                    {durationBadge}
                  </span>
                </div>

                {/* Datos de Recepción */}
                <div className="flex flex-col justify-center min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-1.5 leading-tight min-w-0">
                    <span
                      className={cn(
                        'text-xs font-extrabold text-foreground truncate',
                        isCancelled && 'line-through text-muted-foreground'
                      )}
                    >
                      {cita.paciente_nombre}
                    </span>
                    {cita.es_sobreturno && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-500/40 px-1 py-0 text-[8.5px] font-extrabold text-amber-800 dark:text-amber-300 shrink-0">
                        <MdiIcon icon="mdi:flash" className="size-2.5" />
                        Sobreturno
                      </span>
                    )}
                    {cita.paciente_documento && (
                      <span className="hidden @md:inline-flex items-center gap-0.5 rounded bg-background/80 border border-border/70 px-1.5 py-0 font-mono text-[9.5px] font-bold text-foreground/85 shrink-0">
                        Doc: {cita.paciente_documento}
                      </span>
                    )}
                    {cita.paciente_telefono && (
                      <span className="hidden @xl:inline-flex items-center gap-0.5 font-mono text-[9.5px] font-semibold text-muted-foreground shrink-0">
                        <MdiIcon icon="mdi:phone-outline" className="size-2.5" />
                        {cita.paciente_telefono}
                      </span>
                    )}
                    {hasWhatsApp && (
                      <MdiIcon
                        icon="mdi:whatsapp"
                        className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0"
                      />
                    )}
                    {puntualidad.tipo !== 'a_tiempo' && puntualidad.badgeShortLabel && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[9px] font-extrabold shrink-0',
                          puntualidad.badgeClass
                        )}
                      >
                        {puntualidad.badgeShortLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10.5px] leading-tight text-foreground/85 min-w-0 truncate">
                    <MdiIcon
                      icon="mdi:doctor"
                      className="size-3 shrink-0 ms-cal-event-accent-text"
                    />
                    <span className="font-bold truncate">{doctorLabel}</span>
                    {cita.especialidad_nombre && (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="font-bold ms-cal-event-accent-text truncate">
                          {cita.especialidad_nombre}
                        </span>
                      </>
                    )}
                    {cita.motivo && (
                      <span className="hidden @xl:inline text-muted-foreground truncate">
                        • Motivo: {cita.motivo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Controles Adaptables de Estado y Cobro */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickStatusCita(cita);
                    }}
                    title="Estado de cobro (clic para gestionar pago)"
                    className={cn(
                      'hidden @lg:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold bg-background/90 hover:brightness-95 transition-all cursor-pointer',
                      pagoMeta.pillClass
                    )}
                  >
                    <MdiIcon icon={pagoMeta.icon} className="size-3" />
                    <span>
                      {formattedPrice
                        ? `${formattedPrice} • ${pagoMeta.shortLabel}`
                        : pagoMeta.shortLabel}
                    </span>
                  </button>

                  {onOpenPatientRecord && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPatientRecord(cita.paciente_id);
                      }}
                      title="Abrir ficha clínica del paciente"
                      className="hidden @md:flex size-6 items-center justify-center rounded-full border border-border/80 bg-background/85 text-foreground/80 hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                    >
                      <MdiIcon icon="mdi:folder-account-outline" className="size-3.5" />
                    </button>
                  )}

                  {nextStep && (
                    <button
                      type="button"
                      onClick={triggerNextStep}
                      title={`Cambio rápido a: ${nextStep.label}`}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold transition-all cursor-pointer',
                        nextStep.buttonClass
                      )}
                    >
                      <MdiIcon icon={nextStep.icon} className="size-3" />
                      <span>{nextStep.shortLabel}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickStatusCita(cita);
                    }}
                    title="Abrir selector completo de estado y cobro"
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold bg-background/90 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer',
                      estadoMeta.badgeClass
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full shrink-0',
                        estadoMeta.dotClass,
                        estadoMeta.pulse && 'animate-ping'
                      )}
                    />
                    <span>{estadoMeta.shortLabel}</span>
                    <MdiIcon icon="mdi:chevron-down" className="size-3 opacity-75" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TIER MD (66px - 117px): Ficha de Recepción de 3 Zonas (30-45 min)
          ══════════════════════════════════════════════════════════════════ */}
          {tier === 'md' && (
            <>
              {/* Vista estrecha (< 384px: Columnas de Semana) */}
              <div className="flex @sm:hidden w-full h-full flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={cn(
                        'size-2 rounded-full shrink-0',
                        estadoMeta.dotClass,
                        estadoMeta.pulse && 'animate-pulse'
                      )}
                    />
                    <span className="font-mono text-[10px] font-extrabold text-foreground shrink-0">
                      {cita.hora_inicio}
                    </span>
                    <span className="rounded-full bg-primary/15 px-1.5 py-0 font-mono text-[9px] font-extrabold text-primary shrink-0">
                      {durationBadge}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickStatusCita(cita);
                    }}
                    title={`Estado: ${estadoMeta.label}`}
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[9px] font-extrabold bg-background/90 shrink-0 cursor-pointer',
                      estadoMeta.badgeClass
                    )}
                  >
                    <MdiIcon icon={estadoMeta.icon} className="size-2.5" />
                    <span className="max-w-[54px] truncate">{estadoMeta.shortLabel}</span>
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <p
                      className={cn(
                        'text-xs font-extrabold text-foreground leading-tight truncate',
                        isCancelled && 'line-through text-muted-foreground'
                      )}
                    >
                      {cita.paciente_nombre}
                    </p>
                    {cita.es_sobreturno && (
                      <MdiIcon icon="mdi:flash" className="size-3 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10.5px] font-semibold text-foreground/80 leading-tight truncate">
                    {doctorLabel}
                  </p>
                </div>

                {heightPx >= 84 && (
                  <div className="flex items-center justify-between gap-1 pt-0.5 min-w-0">
                    {nextStep ? (
                      <button
                        type="button"
                        onClick={triggerNextStep}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-extrabold transition-all cursor-pointer truncate',
                          nextStep.buttonClass
                        )}
                      >
                        <MdiIcon icon={nextStep.icon} className="size-2.5 shrink-0" />
                        <span className="truncate">{nextStep.shortLabel}</span>
                      </button>
                    ) : (
                      <span className="font-mono text-[9.5px] text-muted-foreground truncate">
                        {cita.especialidad_nombre}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(cita);
                      }}
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[9px] font-bold bg-background/85 shrink-0 cursor-pointer',
                        pagoMeta.pillClass
                      )}
                    >
                      <MdiIcon icon={pagoMeta.icon} className="size-2.5" />
                      <span>{formattedPrice || pagoMeta.shortLabel}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Vista ancha (>= 384px: Día / Columnas por Especialista) */}
              <div className="hidden @sm:flex w-full h-full items-stretch justify-between gap-3 min-w-0">
                {/* Columna 1: Cápsula de Rango Horario + Duración Exacta */}
                <div className="ms-cal-time-capsule flex flex-col items-center justify-center rounded-lg px-2.5 py-1 shrink-0 min-w-[90px]">
                  <span className="font-mono text-[11px] font-extrabold text-foreground leading-none">
                    {start12h}
                  </span>
                  <span className="font-mono text-[9.5px] font-semibold text-muted-foreground leading-tight mt-0.5">
                    a {end12h}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9.5px] font-extrabold text-primary leading-none">
                    <MdiIcon icon="mdi:timer-outline" className="size-2.5" />
                    {durationBadge}
                  </span>
                </div>

                {/* Columna 2: Ficha Completa del Paciente para Recepción */}
                <div className="flex flex-col justify-center min-w-0 flex-1 gap-1">
                  <div className="flex items-center gap-1.5 min-w-0 leading-tight">
                    <span
                      className={cn(
                        'text-[13px] font-extrabold text-foreground tracking-tight truncate',
                        isCancelled && 'line-through text-muted-foreground'
                      )}
                    >
                      {cita.paciente_nombre}
                    </span>

                    {cita.es_sobreturno && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 px-1.5 py-0 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 shrink-0">
                        <MdiIcon icon="mdi:flash" className="size-2.5" />
                        Sobreturno
                      </span>
                    )}

                    {cita.paciente_documento && (
                      <span className="hidden @md:inline-flex items-center gap-1 rounded-md bg-background/85 border border-border/75 px-1.5 py-0 font-mono text-[10px] font-bold text-foreground/90 shrink-0">
                        <MdiIcon
                          icon="mdi:card-account-details-outline"
                          className="size-3 text-muted-foreground"
                        />
                        {cita.paciente_documento}
                      </span>
                    )}

                    {cita.paciente_telefono && (
                      <span className="hidden @lg:inline-flex items-center gap-1 rounded-md bg-background/80 border border-border/70 px-1.5 py-0 font-mono text-[10px] font-semibold text-foreground/80 shrink-0">
                        <MdiIcon icon="mdi:phone-outline" className="size-2.5 text-primary" />
                        {cita.paciente_telefono}
                      </span>
                    )}

                    {hasWhatsApp && (
                      <span
                        title="Paciente notificado por WhatsApp"
                        className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0"
                      >
                        <MdiIcon icon="mdi:whatsapp" className="size-2.5" />
                        <span className="hidden @xl:inline">WA</span>
                      </span>
                    )}

                    {puntualidad.tipo !== 'a_tiempo' && puntualidad.badgeShortLabel && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0 text-[9.5px] font-extrabold shrink-0',
                          puntualidad.badgeClass
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full', puntualidad.dotClass)} />
                        <span className="hidden @xl:inline">{puntualidad.badgeLabel}</span>
                        <span className="@xl:hidden">{puntualidad.badgeShortLabel}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] leading-tight text-foreground/90 min-w-0 truncate">
                    <MdiIcon
                      icon="mdi:doctor"
                      className="size-3.5 shrink-0 ms-cal-event-accent-text"
                    />
                    <span className="font-bold truncate">{doctorLabel}</span>
                    {cita.especialidad_nombre && (
                      <span className="ms-cal-event-pill-tint inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-extrabold truncate shrink-0">
                        {cita.especialidad_nombre}
                      </span>
                    )}
                    {cita.servicio_nombre && (
                      <span className="hidden @xl:inline-flex items-center gap-1 text-[10.5px] font-semibold text-foreground/75 truncate">
                        • <MdiIcon icon="mdi:medical-bag" className="size-3 shrink-0" />
                        {cita.servicio_nombre}
                      </span>
                    )}
                    {heightPx < 82 && cita.motivo && (
                      <span className="hidden @2xl:inline text-[10.5px] text-muted-foreground truncate">
                        • Motivo: {cita.motivo}
                      </span>
                    )}
                  </div>

                  {heightPx >= 82 && (cita.motivo || cita.sucursal_nombre) && (
                    <div className="flex items-center gap-2 text-[10.5px] leading-tight text-foreground/80 min-w-0 truncate">
                      {cita.motivo && (
                        <span className="flex items-center gap-1 truncate">
                          <MdiIcon
                            icon="mdi:clipboard-pulse-outline"
                            className="size-3 shrink-0 ms-cal-event-accent-text"
                          />
                          <strong className="font-semibold text-muted-foreground">Motivo:</strong>
                          <span className="truncate font-medium">{cita.motivo}</span>
                        </span>
                      )}
                      {cita.sucursal_nombre && (
                        <span className="hidden @xl:inline-flex items-center gap-1 text-muted-foreground shrink-0">
                          • <MdiIcon icon="mdi:hospital-building" className="size-3" />
                          {cita.sucursal_nombre}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Columna 3: Botonera Adaptable de Cambio de Estado y Cobro */}
                <div className="flex flex-col items-end justify-between shrink-0 gap-1">
                  <div className="flex items-center gap-1.5">
                    {nextStep && (
                      <button
                        type="button"
                        onClick={triggerNextStep}
                        title={`Avanzar cita al siguiente paso: ${nextStep.label}`}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-extrabold transition-all cursor-pointer',
                          nextStep.buttonClass
                        )}
                      >
                        <MdiIcon icon={nextStep.icon} className="size-3.5" />
                        <span className="hidden @xl:inline">{nextStep.label}</span>
                        <span className="@xl:hidden">{nextStep.shortLabel}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(cita);
                      }}
                      title="Cambiar a cualquier estado o registrar cobro"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-extrabold bg-background/92 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-2xs transition-all cursor-pointer',
                        estadoMeta.badgeClass
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full shrink-0',
                          estadoMeta.dotClass,
                          estadoMeta.pulse && 'animate-ping'
                        )}
                      />
                      <MdiIcon icon={estadoMeta.icon} className="size-3" />
                      <span>{estadoMeta.shortLabel}</span>
                      <MdiIcon icon="mdi:chevron-down" className="size-3 opacity-75" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(cita);
                      }}
                      title="Gestionar cobro y método de pago"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold bg-background/90 hover:brightness-95 transition-all cursor-pointer',
                        pagoMeta.pillClass
                      )}
                    >
                      <MdiIcon icon={pagoMeta.icon} className="size-3" />
                      <span className="hidden @lg:inline">
                        {formattedPrice
                          ? `${formattedPrice} • ${pagoMeta.label}`
                          : pagoMeta.label}
                      </span>
                      <span className="@lg:hidden">
                        {formattedPrice
                          ? `${formattedPrice} • ${pagoMeta.shortLabel}`
                          : pagoMeta.shortLabel}
                      </span>
                    </button>

                    {onOpenPatientRecord && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPatientRecord(cita.paciente_id);
                        }}
                        title="Ver expediente clínico del paciente"
                        className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-foreground/85 hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                      >
                        <MdiIcon icon="mdi:folder-account-outline" className="size-3 text-primary" />
                        <span className="hidden @xl:inline">Ficha</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TIER LG (>= 118px): Panel Completo de Recepción + Pipeline de 5 Estados
          ══════════════════════════════════════════════════════════════════ */}
          {tier === 'lg' && (
            <>
              {/* Vista estrecha (< 384px: Semana con citas largas de 60-120 min) */}
              <div className="flex @sm:hidden w-full h-full flex-col justify-between min-w-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold text-primary">
                      <MdiIcon icon="mdi:timer-outline" className="size-2.5" />
                      {cita.hora_inicio} • {durationBadge}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(cita);
                      }}
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold bg-background/90 cursor-pointer',
                        estadoMeta.badgeClass
                      )}
                    >
                      <MdiIcon icon={estadoMeta.icon} className="size-2.5" />
                      <span>{estadoMeta.shortLabel}</span>
                    </button>
                  </div>

                  <p
                    className={cn(
                      'text-xs font-extrabold text-foreground leading-snug truncate',
                      isCancelled && 'line-through text-muted-foreground'
                    )}
                  >
                    {cita.paciente_nombre}
                  </p>
                  <p className="text-[10.5px] font-bold text-foreground/85 truncate">
                    {doctorLabel}
                  </p>
                  <p className="text-[10px] font-semibold ms-cal-event-accent-text truncate">
                    {cita.especialidad_nombre}
                  </p>
                  {heightPx >= 136 && cita.motivo && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight pt-0.5">
                      {cita.motivo}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/50">
                  {nextStep ? (
                    <button
                      type="button"
                      onClick={triggerNextStep}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold transition-all cursor-pointer truncate',
                        nextStep.buttonClass
                      )}
                    >
                      <MdiIcon icon={nextStep.icon} className="size-3 shrink-0" />
                      <span className="truncate">{nextStep.shortLabel}</span>
                    </button>
                  ) : (
                    <span className="text-[9.5px] font-mono font-bold text-muted-foreground">
                      {end12h}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickStatusCita(cita);
                    }}
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold bg-background/90 shrink-0 cursor-pointer',
                      pagoMeta.pillClass
                    )}
                  >
                    <MdiIcon icon={pagoMeta.icon} className="size-2.5" />
                    <span>{formattedPrice || pagoMeta.shortLabel}</span>
                  </button>
                </div>
              </div>

              {/* Vista ancha (>= 384px: Cabina Integral de Recepción + Pipeline de Estados) */}
              <div className="hidden @sm:flex w-full h-full flex-col justify-between gap-1.5 min-w-0">
                {/* Bloque Superior: Cápsula de Duración + Dossier Paciente + Acciones Principales */}
                <div className="flex items-stretch justify-between gap-3 flex-1 min-h-0 min-w-0">
                  {/* Torre Izquierda de Tiempo y Duración */}
                  <div className="ms-cal-time-capsule flex flex-col items-center justify-center rounded-xl px-3 py-1 shrink-0 min-w-[98px]">
                    <span className="font-mono text-xs font-extrabold text-foreground leading-none">
                      {start12h}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground mt-0.5">
                      a {end12h}
                    </span>
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary leading-none">
                      <MdiIcon icon="mdi:timer-outline" className="size-3" />
                      {durationBadge}
                    </span>
                  </div>

                  {/* Centro: Visibilidad Total de Datos para Recepción */}
                  <div className="flex flex-col justify-center min-w-0 flex-1 gap-1">
                    {/* Identidad, Documento, Teléfono, Sobreturno y Alertas */}
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 leading-tight">
                      <span
                        className={cn(
                          'text-sm font-extrabold text-foreground tracking-tight truncate max-w-full',
                          isCancelled && 'line-through text-muted-foreground'
                        )}
                      >
                        {cita.paciente_nombre}
                      </span>

                      {cita.es_sobreturno && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 border border-amber-500/45 px-1.5 py-0.5 text-[9.5px] font-extrabold text-amber-800 dark:text-amber-300 shrink-0">
                          <MdiIcon icon="mdi:flash" className="size-3" />
                          Sobreturno
                        </span>
                      )}

                      {cita.paciente_documento && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-background/85 border border-border/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground/90 shrink-0">
                          <MdiIcon
                            icon="mdi:card-account-details-outline"
                            className="size-3 text-muted-foreground"
                          />
                          Doc: {cita.paciente_documento}
                        </span>
                      )}

                      {cita.paciente_telefono && (
                        <span className="hidden @md:inline-flex items-center gap-1 rounded-md bg-background/85 border border-border/75 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground/85 shrink-0">
                          <MdiIcon icon="mdi:phone-outline" className="size-3 text-primary" />
                          {cita.paciente_telefono}
                        </span>
                      )}

                      {hasWhatsApp && (
                        <span className="hidden @lg:inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          <MdiIcon icon="mdi:whatsapp" className="size-3" />
                          WhatsApp OK
                        </span>
                      )}

                      {puntualidad.tipo !== 'a_tiempo' && puntualidad.badgeShortLabel && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9.5px] font-extrabold shrink-0',
                            puntualidad.badgeClass
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', puntualidad.dotClass)} />
                          {puntualidad.badgeLabel}
                        </span>
                      )}
                    </div>

                    {/* Médico, Especialidad, Servicio y Sede */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] leading-tight text-foreground/90 min-w-0">
                      <span className="inline-flex items-center gap-1 font-bold truncate">
                        <MdiIcon
                          icon="mdi:doctor"
                          className="size-3.5 shrink-0 ms-cal-event-accent-text"
                        />
                        {doctorLabel}
                      </span>

                      {cita.especialidad_nombre && (
                        <span className="ms-cal-event-pill-tint inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold shrink-0">
                          {cita.especialidad_nombre}
                        </span>
                      )}

                      {cita.servicio_nombre && (
                        <span className="hidden @lg:inline-flex items-center gap-1 rounded-md bg-background/70 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80 truncate">
                          <MdiIcon icon="mdi:medical-bag" className="size-3 text-primary shrink-0" />
                          {cita.servicio_nombre}
                        </span>
                      )}

                      {cita.sucursal_nombre && (
                        <span className="hidden @xl:inline-flex items-center gap-1 text-[10.5px] text-muted-foreground truncate">
                          • <MdiIcon icon="mdi:hospital-building" className="size-3 shrink-0" />
                          {cita.sucursal_nombre}
                        </span>
                      )}

                      {heightPx < 126 && cita.motivo && (
                        <span className="hidden @xl:inline text-[10.5px] text-muted-foreground truncate">
                          • Motivo: {cita.motivo}
                        </span>
                      )}
                    </div>

                    {/* Franja Destacada de Motivo Clínico / Notas (cuando hay espacio vertical >= 126px) */}
                    {heightPx >= 126 && (cita.motivo || cita.notas) && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-background/70 border border-border/65 px-2 py-1 text-[11px] text-foreground/85 min-w-0">
                        <MdiIcon
                          icon="mdi:clipboard-pulse-outline"
                          className="size-3.5 shrink-0 ms-cal-event-accent-text"
                        />
                        <span className="font-bold text-muted-foreground shrink-0">Motivo:</span>
                        <span className="truncate font-medium">
                          {cita.motivo || cita.notas}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Derecha: Acción Directa Siguiente Estado + Cobro + Ficha */}
                  <div className="flex flex-col items-end justify-between shrink-0 gap-1">
                    <div className="flex items-center gap-1.5">
                      {nextStep && (
                        <button
                          type="button"
                          onClick={triggerNextStep}
                          title={`Avanzar directamente a: ${nextStep.label}`}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-extrabold transition-all cursor-pointer',
                            nextStep.buttonClass
                          )}
                        >
                          <MdiIcon icon={nextStep.icon} className="size-3.5" />
                          <span>{nextStep.label}</span>
                        </button>
                      )}

                      {onOpenPatientRecord && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPatientRecord(cita.paciente_id);
                          }}
                          title="Abrir expediente clínico del paciente"
                          className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/90 px-2 py-1 text-[10.5px] font-bold text-foreground/90 hover:bg-accent transition-colors cursor-pointer"
                        >
                          <MdiIcon
                            icon="mdi:folder-account-outline"
                            className="size-3.5 text-primary"
                          />
                          <span className="hidden @xl:inline">Expediente</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatusCita(cita);
                      }}
                      title="Registrar cobro, método de pago o cambiar estado"
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-extrabold bg-background/92 hover:brightness-95 transition-all cursor-pointer',
                        pagoMeta.pillClass
                      )}
                    >
                      <MdiIcon icon={pagoMeta.icon} className="size-3.5" />
                      <span>
                        {formattedPrice
                          ? `${formattedPrice} • ${pagoMeta.label}`
                          : pagoMeta.label}
                      </span>
                      {cita.metodo_pago && (
                        <span className="hidden @2xl:inline opacity-75 uppercase text-[9px]">
                          ({cita.metodo_pago})
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Barra Inferior Interactiva de Cambio de Estado (Pipeline de 5 Pasos Clínicos) */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/55 shrink-0 min-w-0">
                  <div className="hidden @md:flex items-center gap-1 flex-1 min-w-0">
                    <span className="hidden @2xl:inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
                      <MdiIcon icon="mdi:timeline-clock-outline" className="size-3 text-primary" />
                      Estado:
                    </span>

                    {WORKFLOW_PIPELINE_STEPS.map((stepKey, idx) => {
                      const stepMeta = CITA_ESTADO_META[stepKey];
                      const isActiveStep = cita.estado === stepKey;
                      const isCompletedStep =
                        currentPipelineIdx > -1 && idx < currentPipelineIdx && !isInactive;

                      return (
                        <React.Fragment key={stepKey}>
                          <button
                            type="button"
                            onClick={(e) => triggerSpecificState(e, stepKey)}
                            title={`Cambiar estado a: ${stepMeta.label}`}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] transition-all cursor-pointer truncate',
                              isActiveStep
                                ? cn('font-extrabold shadow-2xs bg-background/95', stepMeta.badgeClass)
                                : isCompletedStep
                                ? 'font-bold bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/22'
                                : 'font-semibold bg-background/65 text-muted-foreground border-border/70 hover:bg-background hover:text-foreground'
                            )}
                          >
                            <MdiIcon
                              icon={isCompletedStep ? 'mdi:check-circle' : stepMeta.icon}
                              className="size-3 shrink-0"
                            />
                            <span className="truncate">{stepMeta.shortLabel}</span>
                          </button>

                          {idx < WORKFLOW_PIPELINE_STEPS.length - 1 && (
                            <MdiIcon
                              icon="mdi:chevron-right"
                              className="hidden @xl:inline size-3 text-muted-foreground/45 shrink-0"
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Fallback entre 384px y 448px (@sm pero menor a @md) */}
                  <div className="flex @md:hidden items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold bg-background/90',
                        estadoMeta.badgeClass
                      )}
                    >
                      <MdiIcon icon={estadoMeta.icon} className="size-3" />
                      {estadoMeta.label}
                    </span>
                  </div>

                  {/* Botón Opciones / Estados Especiales (Ausente, Cancelar, Cobro) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickStatusCita(cita);
                    }}
                    title="Abrir panel de estados especiales (No asistió, Cancelar) y cobro"
                    className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/85 hover:bg-primary hover:text-primary-foreground hover:border-primary px-2 py-0.5 text-[10px] font-bold text-foreground/85 transition-colors shrink-0 cursor-pointer"
                  >
                    <MdiIcon icon="mdi:tune-variant" className="size-3" />
                    <span className="hidden @lg:inline">Cobro / Más estados</span>
                    <span className="@lg:hidden">Opciones</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Asa Inferior para Estirar / Ajustar Duración de Consulta en Vivo */}
          {!isCancelled && onPointerDownResize && (
            <div
              data-resize-handle="true"
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDownResize(e, item);
              }}
              onClick={(e) => e.stopPropagation()}
              title="Arrastrar borde inferior para adaptar el tiempo de consulta"
              className="absolute inset-x-0 bottom-0 h-2.5 flex items-end justify-center cursor-ns-resize opacity-0 group-hover/card:opacity-100 transition-opacity z-20"
            >
              <span className="mb-0.5 h-1 w-10 rounded-full bg-foreground/30 group-hover/card:bg-primary transition-colors" />
            </div>
          )}
        </motion.div>
      </TooltipPrimitive.Trigger>
      {renderTooltipPortal()}
    </TooltipPrimitive.Root>
  );
};

export default CalendarEventCard;
