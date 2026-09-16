import type { CitaMedica } from '../types';

export type TipoPuntualidad =
  | 'a_tiempo'
  | 'paciente_retrasado'
  | 'doctor_retrasado'
  | 'consulta_prolongada'
  | 'no_asistio';

export type NivelSeveridad = 'normal' | 'alerta' | 'critica';

export interface EvaluacionPuntualidad {
  tipo: TipoPuntualidad;
  minutos: number;
  severidad: NivelSeveridad;
  badgeLabel: string;
  badgeShortLabel: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  textClass: string;
  explicacion: string;
  esHoy: boolean;
}

/**
 * Convierte "HH:MM" a minutos transcurridos desde las 00:00
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

/**
 * Evalúa la puntualidad de una cita médica en tiempo real respecto al reloj actual
 */
export function evaluarPuntualidadCita(
  cita: CitaMedica,
  now: Date = new Date()
): EvaluacionPuntualidad {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const esHoy = cita.fecha === todayStr;

  // Si no es hoy
  if (!esHoy) {
    if (cita.fecha < todayStr && (cita.estado === 'programada' || cita.estado === 'confirmada')) {
      return {
        tipo: 'no_asistio',
        minutos: 0,
        severidad: 'critica',
        badgeLabel: '⚠️ Paciente Faltó',
        badgeShortLabel: 'Faltó',
        badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dotClass: 'bg-rose-500',
        borderClass: 'border-l-4 border-l-rose-500',
        textClass: 'text-rose-600 dark:text-rose-400',
        explicacion: 'La fecha ya transcurrió y el paciente no se presentó en la clínica.',
        esHoy: false,
      };
    }
    return {
      tipo: 'a_tiempo',
      minutos: 0,
      severidad: 'normal',
      badgeLabel: '',
      badgeShortLabel: '',
      badgeClass: '',
      dotClass: '',
      borderClass: '',
      textClass: '',
      explicacion: 'Cita programada para otra fecha.',
      esHoy: false,
    };
  }

  // Citas canceladas, ausentes o atendidas no generan alerta activa
  if (cita.estado === 'cancelada') {
    return {
      tipo: 'a_tiempo',
      minutos: 0,
      severidad: 'normal',
      badgeLabel: 'Cancelada',
      badgeShortLabel: 'Cancelada',
      badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      dotClass: 'bg-slate-500',
      borderClass: '',
      textClass: 'text-slate-600 dark:text-slate-400',
      explicacion: cita.motivo_cancelacion || 'Cita cancelada.',
      esHoy: true,
    };
  }

  if (cita.estado === 'no_asistio') {
    return {
      tipo: 'no_asistio',
      minutos: 0,
      severidad: 'critica',
      badgeLabel: 'No asistió',
      badgeShortLabel: 'No asistió',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      dotClass: 'bg-rose-500',
      borderClass: 'border-l-4 border-l-rose-500',
      textClass: 'text-rose-600 dark:text-rose-400',
      explicacion: 'Paciente no acudió a la cita médica.',
      esHoy: true,
    };
  }

  if (cita.estado === 'atendida') {
    return {
      tipo: 'a_tiempo',
      minutos: 0,
      severidad: 'normal',
      badgeLabel: 'Atendida',
      badgeShortLabel: 'Atendida',
      badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      borderClass: '',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      explicacion: 'Consulta completada con éxito.',
      esHoy: true,
    };
  }

  // Cálculos de minutos respecto al reloj de hoy
  const startMin = timeStringToMinutes(cita.hora_inicio);
  const endMin = timeStringToMinutes(cita.hora_fin || '00:00');
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const diffFromStart = nowMin - startMin;
  const diffFromEnd = nowMin - endMin;

  // ── CASO 1: PACIENTE RETRASADO (Sin llegar a recepción) ────────────────
  if (cita.estado === 'programada' || cita.estado === 'confirmada') {
    // Margen de tolerancia: 5 minutos
    if (diffFromStart > 5) {
      const esCritico = diffFromStart > 15;
      return {
        tipo: 'paciente_retrasado',
        minutos: diffFromStart,
        severidad: esCritico ? 'critica' : 'alerta',
        badgeLabel: `⚠️ Paciente +${diffFromStart}m tarde`,
        badgeShortLabel: `⚠️ +${diffFromStart}m`,
        badgeClass: esCritico
          ? 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/50 animate-pulse font-bold'
          : 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 font-semibold',
        dotClass: esCritico ? 'bg-rose-500 animate-ping' : 'bg-amber-500',
        borderClass: esCritico ? 'border-l-4 border-l-rose-500 ring-1 ring-rose-500/30' : 'border-l-4 border-l-amber-500',
        textClass: esCritico ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300',
        explicacion: `El paciente tiene ${diffFromStart} min de retraso. Cita fijada para las ${cita.hora_inicio} y no se ha registrado en recepción.`,
        esHoy: true,
      };
    }

    return {
      tipo: 'a_tiempo',
      minutos: 0,
      severidad: 'normal',
      badgeLabel: diffFromStart >= 0 ? 'Por llegar (a tiempo)' : `En ${Math.abs(diffFromStart)} min`,
      badgeShortLabel: 'Puntual',
      badgeClass: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/25',
      dotClass: 'bg-blue-500',
      borderClass: '',
      textClass: 'text-blue-600 dark:text-blue-400',
      explicacion: `Cita a las ${cita.hora_inicio}. El paciente está dentro del horario previsto.`,
      esHoy: true,
    };
  }

  // ── CASO 2: DOCTOR DEMORADO (Paciente esperando en sala) ───────────────
  if (cita.estado === 'sala_espera') {
    // Calcular tiempo de espera efectivo
    let waitMinutes = 0;
    if (cita.llegada_at) {
      try {
        const arrivalTime = new Date(cita.llegada_at).getTime();
        waitMinutes = Math.max(0, Math.floor((now.getTime() - arrivalTime) / 60000));
      } catch {
        waitMinutes = Math.max(0, diffFromStart);
      }
    } else {
      waitMinutes = Math.max(0, diffFromStart);
    }

    // Se considera demora médica si ya pasaron 10 min de la hora fijada o si lleva > 15 min en sala
    if (diffFromStart > 10 || waitMinutes > 15) {
      const demora = Math.max(diffFromStart, waitMinutes);
      const esCritico = demora > 25;
      return {
        tipo: 'doctor_retrasado',
        minutos: demora,
        severidad: esCritico ? 'critica' : 'alerta',
        badgeLabel: `⏱️ Dr. demorado +${demora}m`,
        badgeShortLabel: `⏱️ +${demora}m sala`,
        badgeClass: esCritico
          ? 'bg-purple-500/20 text-purple-900 dark:text-purple-200 border-purple-500/50 animate-pulse font-bold'
          : 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border-indigo-500/40 font-semibold',
        dotClass: esCritico ? 'bg-purple-500 animate-ping' : 'bg-indigo-500',
        borderClass: esCritico ? 'border-l-4 border-l-purple-500 ring-1 ring-purple-500/30' : 'border-l-4 border-l-indigo-500',
        textClass: esCritico ? 'text-purple-700 dark:text-purple-300' : 'text-indigo-700 dark:text-indigo-300',
        explicacion: `El paciente está esperando en sala desde hace ${demora} min. El especialista no ha iniciado la consulta.`,
        esHoy: true,
      };
    }

    return {
      tipo: 'a_tiempo',
      minutos: waitMinutes,
      severidad: 'normal',
      badgeLabel: `⏳ En sala (${waitMinutes}m)`,
      badgeShortLabel: `${waitMinutes}m sala`,
      badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-500',
      borderClass: '',
      textClass: 'text-amber-600 dark:text-amber-400',
      explicacion: `El paciente llegó a recepción y espera turno (${waitMinutes} min).`,
      esHoy: true,
    };
  }

  // ── CASO 3: CONSULTA PROLONGADA (Médico excediendo tiempo previsto) ────
  if (cita.estado === 'en_consulta') {
    if (diffFromEnd > 5) {
      const esCritico = diffFromEnd > 15;
      return {
        tipo: 'consulta_prolongada',
        minutos: diffFromEnd,
        severidad: esCritico ? 'critica' : 'alerta',
        badgeLabel: `🩺 Sobretiempo +${diffFromEnd}m`,
        badgeShortLabel: `🩺 +${diffFromEnd}m`,
        badgeClass: esCritico
          ? 'bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-500/40 font-bold'
          : 'bg-teal-500/20 text-teal-900 dark:text-teal-200 border-teal-500/40 font-semibold',
        dotClass: 'bg-teal-500 animate-pulse',
        borderClass: 'border-l-4 border-l-teal-500',
        textClass: 'text-teal-700 dark:text-teal-300',
        explicacion: `La consulta médica ha superado el tiempo programado (${cita.duracion_minutos} min) por ${diffFromEnd} minutos adicionales.`,
        esHoy: true,
      };
    }

    return {
      tipo: 'a_tiempo',
      minutos: 0,
      severidad: 'normal',
      badgeLabel: '🩺 En consultorio',
      badgeShortLabel: 'En consulta',
      badgeClass: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30',
      dotClass: 'bg-teal-500',
      borderClass: '',
      textClass: 'text-teal-600 dark:text-teal-400',
      explicacion: 'Atención médica en desarrollo dentro del tiempo previsto.',
      esHoy: true,
    };
  }

  return {
    tipo: 'a_tiempo',
    minutos: 0,
    severidad: 'normal',
    badgeLabel: '',
    badgeShortLabel: '',
    badgeClass: '',
    dotClass: '',
    borderClass: '',
    textClass: '',
    explicacion: '',
    esHoy: true,
  };
}
