import type {
  CitaMedica,
  CitaEstado,
  CitaEstadoPago,
  BloqueoAgenda,
  BloqueoTipo,
} from '../../../types';
import { evaluarPuntualidadCita, type EvaluacionPuntualidad } from '../../../utils/punctuality';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';
export type CalendarColorMode = 'especialidad' | 'medico' | 'estado' | 'tema';
export type CalendarGridDensity = 'compact' | 'comfortable' | 'spacious';
export type CalendarHoursRange = 'clinical' | 'full24';

export const DENSITY_HOUR_HEIGHT: Record<CalendarGridDensity, number> = {
  compact: 96,
  comfortable: 136,
  spacious: 184,
};

export const WORKFLOW_PIPELINE_STEPS: CitaEstado[] = [
  'programada',
  'confirmada',
  'sala_espera',
  'en_consulta',
  'atendida',
];

export interface NextClinicalStepInfo {
  nextState: CitaEstado;
  label: string;
  shortLabel: string;
  icon: string;
  buttonClass: string;
}

export function getNextClinicalStep(estado: CitaEstado): NextClinicalStepInfo | null {
  switch (estado) {
    case 'programada':
      return {
        nextState: 'confirmada',
        label: 'Confirmar Cita',
        shortLabel: 'Confirmar',
        icon: 'mdi:calendar-check',
        buttonClass:
          'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700/50 shadow-2xs',
      };
    case 'confirmada':
      return {
        nextState: 'sala_espera',
        label: 'Pasar a Sala',
        shortLabel: 'En Sala',
        icon: 'mdi:seat-passenger',
        buttonClass:
          'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600/50 shadow-2xs',
      };
    case 'sala_espera':
      return {
        nextState: 'en_consulta',
        label: 'Pasar a Consulta',
        shortLabel: 'A Consulta',
        icon: 'mdi:stethoscope',
        buttonClass:
          'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700/50 shadow-2xs',
      };
    case 'en_consulta':
      return {
        nextState: 'atendida',
        label: 'Finalizar Atención',
        shortLabel: 'Atendida',
        icon: 'mdi:check-decagram',
        buttonClass:
          'bg-primary hover:bg-primary/90 text-primary-foreground border-primary/50 shadow-2xs',
      };
    default:
      return null;
  }
}

export function formatDurationBadge(minutes: number): string {
  const m = Math.max(5, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}

export function formatDurationShort(minutes: number): string {
  const m = Math.max(5, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h${rem}m`;
}

export const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MESES_CORTOS_ES = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

export const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_SEMANA_MIN = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DIAS_SEMANA_LARGOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export interface EstadoClinicoMeta {
  label: string;
  shortLabel: string;
  icon: string;
  accentHex: string;
  dotClass: string;
  badgeClass: string;
  pulse?: boolean;
}

export const CITA_ESTADO_META: Record<CitaEstado, EstadoClinicoMeta> = {
  programada: {
    label: 'Por Llegar',
    shortLabel: 'Programada',
    icon: 'mdi:calendar-clock',
    accentHex: '#3b82f6',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  confirmada: {
    label: 'Confirmada',
    shortLabel: 'Confirmada',
    icon: 'mdi:calendar-check',
    accentHex: '#6366f1',
    dotClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  sala_espera: {
    label: 'En Sala de Espera',
    shortLabel: 'En Sala',
    icon: 'mdi:seat-passenger',
    accentHex: '#f59e0b',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/18 text-amber-800 dark:text-amber-300 border-amber-500/35',
    pulse: true,
  },
  en_consulta: {
    label: 'En Consulta',
    shortLabel: 'En Consulta',
    icon: 'mdi:stethoscope',
    accentHex: '#10b981',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/18 text-emerald-800 dark:text-emerald-300 border-emerald-500/35',
    pulse: true,
  },
  atendida: {
    label: 'Atendida',
    shortLabel: 'Atendida',
    icon: 'mdi:check-decagram',
    accentHex: '#059669',
    dotClass: 'bg-emerald-600',
    badgeClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  cancelada: {
    label: 'Cancelada',
    shortLabel: 'Cancelada',
    icon: 'mdi:calendar-remove',
    accentHex: '#ef4444',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
  no_asistio: {
    label: 'No Asistió',
    shortLabel: 'Ausente',
    icon: 'mdi:account-cancel-outline',
    accentHex: '#64748b',
    dotClass: 'bg-slate-500',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  },
};

export interface PagoEstadoMeta {
  label: string;
  shortLabel: string;
  icon: string;
  pillClass: string;
}

export const PAGO_ESTADO_META: Record<CitaEstadoPago, PagoEstadoMeta> = {
  pagado: {
    label: 'Pagado',
    shortLabel: 'Pagado',
    icon: 'mdi:cash-check',
    pillClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  pendiente: {
    label: 'Cobro Pendiente',
    shortLabel: 'Pendiente',
    icon: 'mdi:cash-clock',
    pillClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  aseguradora: {
    label: 'Póliza / Seguro',
    shortLabel: 'Seguro',
    icon: 'mdi:shield-check-outline',
    pillClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  exonerado: {
    label: 'Cortesía / Exonerado',
    shortLabel: 'Cortesía',
    icon: 'mdi:gift-outline',
    pillClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
};

export interface BloqueoTipoMeta {
  label: string;
  icon: string;
  accentHex: string;
}

export const BLOQUEO_TIPO_META: Record<BloqueoTipo, BloqueoTipoMeta> = {
  almuerzo: {
    label: 'Almuerzo / Descanso',
    icon: 'mdi:silverware-fork-knife',
    accentHex: '#f59e0b',
  },
  cirugia: {
    label: 'Quirófano / Cirugía',
    icon: 'mdi:hospital-box',
    accentHex: '#ef4444',
  },
  reunion: {
    label: 'Comité / Reunión',
    icon: 'mdi:account-group',
    accentHex: '#6366f1',
  },
  personal: {
    label: 'Reserva Personal',
    icon: 'mdi:shield-lock-outline',
    accentHex: '#64748b',
  },
  vacaciones: {
    label: 'Vacaciones / Permiso',
    icon: 'mdi:beach',
    accentHex: '#0ea5e9',
  },
};

export interface CitaCalendarItem {
  kind: 'cita';
  id: string;
  numericId: number;
  dateStr: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  accentColor: string;
  cita: CitaMedica;
  puntualidad: EvaluacionPuntualidad;
}

export interface BloqueoCalendarItem {
  kind: 'bloqueo';
  id: string;
  numericId: number;
  dateStr: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  accentColor: string;
  bloqueo: BloqueoAgenda;
}

export type ClinicalCalendarItem = CitaCalendarItem | BloqueoCalendarItem;

export interface PositionedCalendarItem {
  item: ClinicalCalendarItem;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  colIndex: number;
  totalCols: number;
}

// ── UTILIDADES DE FECHA Y HORA LOCAL (SIN DESFASE UTC) ───────────────────

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameLocalMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addDaysLocal(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0, 0);
  return next;
}

export function addWeeksLocal(date: Date, weeks: number): Date {
  return addDaysLocal(date, weeks * 7);
}

export function addMonthsLocal(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const firstOfTarget = new Date(date.getFullYear(), targetMonth, 1, 12, 0, 0, 0);
  const maxDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  return new Date(
    firstOfTarget.getFullYear(),
    firstOfTarget.getMonth(),
    Math.min(date.getDate(), maxDay),
    12,
    0,
    0,
    0
  );
}

/** Lunes = índice 0, Domingo = índice 6 */
export function getMondayWeekdayIndex(date: Date): number {
  const jsDay = date.getDay(); // 0 = Sun ... 6 = Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function startOfWeekMonday(date: Date): Date {
  const diff = getMondayWeekdayIndex(date);
  return addDaysLocal(date, -diff);
}

export function endOfWeekSunday(date: Date): Date {
  const start = startOfWeekMonday(date);
  return addDaysLocal(start, 6);
}

export function getWeekDaysMonday(date: Date): Date[] {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, i) => addDaysLocal(start, i));
}

export function getMonthCalendarGridDays(date: Date): Date[] {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0);
  const start = startOfWeekMonday(firstDay);
  const end = endOfWeekSunday(lastDay);

  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDaysLocal(cursor, 1);
    if (days.length > 42) break;
  }
  return days;
}

export function getISOWeekNumber(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function timeStrToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 480;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export function minutesToTimeStr(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function format12Hour(time24?: string | null): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${(mStr || '00').substring(0, 2)} ${ampm}`;
}

export function formatHourAxisLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

export function formatActivePeriodSubtitle(date: Date, mode: CalendarViewMode): string {
  if (mode === 'day') {
    const dayName = DIAS_SEMANA_LARGOS[getMondayWeekdayIndex(date)];
    return `${dayName}, ${date.getDate()} de ${MESES_ES[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (mode === 'week') {
    const start = startOfWeekMonday(date);
    const end = endOfWeekSunday(date);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${MESES_CORTOS_ES[start.getMonth()]} ${end.getFullYear()}`;
    }
    return `${start.getDate()} ${MESES_CORTOS_ES[start.getMonth()]} – ${end.getDate()} ${MESES_CORTOS_ES[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `Semana ${getISOWeekNumber(date)} • ${MESES_ES[date.getMonth()]} ${date.getFullYear()}`;
}

// ── RESOLUCIÓN DINÁMICA DE COLOR SEGÚN MODO Y TEMPLATE CUSTOMIZER ────────

export function resolveCitaAccentColor(cita: CitaMedica, colorMode: CalendarColorMode): string {
  if (colorMode === 'tema') {
    return 'var(--primary)';
  }
  if (colorMode === 'medico') {
    return cita.medico_color || 'var(--primary)';
  }
  if (colorMode === 'estado') {
    const meta = CITA_ESTADO_META[cita.estado];
    return meta ? meta.accentHex : 'var(--primary)';
  }
  // Por defecto: especialidad
  return cita.especialidad_color || cita.medico_color || 'var(--primary)';
}

export function buildCalendarItems(
  citas: CitaMedica[],
  bloqueos: BloqueoAgenda[],
  colorMode: CalendarColorMode,
  now: Date
): ClinicalCalendarItem[] {
  const citaItems: CitaCalendarItem[] = citas.map((c) => {
    const startMin = timeStrToMinutes(c.hora_inicio);
    const rawEnd = timeStrToMinutes(c.hora_fin);
    const endMin = rawEnd > startMin ? rawEnd : startMin + (c.duracion_minutos || 30);
    return {
      kind: 'cita',
      id: `cita_${c.id}`,
      numericId: c.id,
      dateStr: c.fecha,
      startMinutes: startMin,
      endMinutes: endMin,
      durationMinutes: Math.max(10, endMin - startMin),
      accentColor: resolveCitaAccentColor(c, colorMode),
      cita: c,
      puntualidad: evaluarPuntualidadCita(c, now),
    };
  });

  const bloqueoItems: BloqueoCalendarItem[] = bloqueos.map((b) => {
    const startMin = timeStrToMinutes(b.hora_inicio);
    const rawEnd = timeStrToMinutes(b.hora_fin);
    const endMin = rawEnd > startMin ? rawEnd : startMin + 60;
    const meta = BLOQUEO_TIPO_META[b.tipo] || BLOQUEO_TIPO_META.personal;
    return {
      kind: 'bloqueo',
      id: `bloqueo_${b.id}`,
      numericId: b.id,
      dateStr: b.fecha,
      startMinutes: startMin,
      endMinutes: endMin,
      durationMinutes: Math.max(10, endMin - startMin),
      accentColor: meta.accentHex,
      bloqueo: b,
    };
  });

  return [...citaItems, ...bloqueoItems].sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.durationMinutes - a.durationMinutes;
  });
}

// ── ALGORITMO SWEEP-LINE DE CLUSTERS CONECTADOS PARA EVENTOS SOLAPADOS ───

export function computeDayColumnPositions(
  items: ClinicalCalendarItem[],
  startHour: number,
  hourHeightPx: number
): PositionedCalendarItem[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.endMinutes - a.endMinutes;
  });

  // Agrupar en clusters transitivamente solapados
  const clusters: ClinicalCalendarItem[][] = [];
  let currentCluster: ClinicalCalendarItem[] = [];
  let clusterMaxEnd = -1;

  for (const item of sorted) {
    const visualEnd = Math.max(item.endMinutes, item.startMinutes + 15);
    if (currentCluster.length === 0 || item.startMinutes < clusterMaxEnd) {
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, visualEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = visualEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const results: PositionedCalendarItem[] = [];
  const originMinutes = startHour * 60;

  for (const cluster of clusters) {
    const colEndMinutes: number[] = [];
    const assignedCols: { item: ClinicalCalendarItem; colIndex: number }[] = [];

    for (const item of cluster) {
      const visualEnd = Math.max(item.endMinutes, item.startMinutes + 15);
      let placedCol = -1;
      for (let c = 0; c < colEndMinutes.length; c++) {
        if (colEndMinutes[c] <= item.startMinutes) {
          placedCol = c;
          colEndMinutes[c] = visualEnd;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEndMinutes.length;
        colEndMinutes.push(visualEnd);
      }
      assignedCols.push({ item, colIndex: placedCol });
    }

    const totalCols = Math.max(1, colEndMinutes.length);
    for (const { item, colIndex } of assignedCols) {
      const offsetMinutes = item.startMinutes - originMinutes;
      const topPx = (offsetMinutes / 60) * hourHeightPx;
      const rawHeight = (item.durationMinutes / 60) * hourHeightPx;
      const heightPx = Math.max(20, rawHeight - 2);
      const widthPct = 100 / totalCols;
      const leftPct = colIndex * widthPct;

      results.push({
        item,
        topPx,
        heightPx,
        leftPct,
        widthPct,
        colIndex,
        totalCols,
      });
    }
  }

  return results;
}

export interface FreeGapSlot {
  startMinutes: number;
  endMinutes: number;
  gapMinutes: number;
  topPx: number;
  heightPx: number;
}

/**
 * Calcula los intervalos libres entre citas consecutivas del mismo día/columna
 * para que recepción identifique al instante cuánto tiempo existe entre cada consulta.
 */
export function computeColumnFreeGaps(
  items: ClinicalCalendarItem[],
  startHour: number,
  hourHeightPx: number
): FreeGapSlot[] {
  const active = items
    .filter((it) => !(it.kind === 'cita' && it.cita.estado === 'cancelada'))
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (active.length < 2) return [];

  // Fusionar intervalos ocupados solapados
  const merged: { start: number; end: number }[] = [];
  for (const it of active) {
    if (merged.length === 0 || it.startMinutes > merged[merged.length - 1].end) {
      merged.push({ start: it.startMinutes, end: it.endMinutes });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, it.endMinutes);
    }
  }

  const originMinutes = startHour * 60;
  const gaps: FreeGapSlot[] = [];

  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].end;
    const gapEnd = merged[i + 1].start;
    const gapMin = gapEnd - gapStart;
    // Mostrar huecos clínicos útiles entre citas consecutivas (de 10 min hasta 3 horas)
    if (gapMin >= 10 && gapMin <= 180) {
      const topPx = ((gapStart - originMinutes) / 60) * hourHeightPx;
      const heightPx = (gapMin / 60) * hourHeightPx;
      if (heightPx >= 18) {
        gaps.push({
          startMinutes: gapStart,
          endMinutes: gapEnd,
          gapMinutes: gapMin,
          topPx,
          heightPx,
        });
      }
    }
  }

  return gaps;
}

