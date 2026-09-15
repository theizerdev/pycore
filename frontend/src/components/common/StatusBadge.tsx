import React from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  Ban,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export type StatusType =
  | 'boolean'
  | 'appointment'
  | 'payment'
  | 'subscription'
  | 'custom';

export interface StatusBadgeProps {
  status?: string | boolean | null;
  type?: StatusType;
  label?: string;
  className?: string;
  showDot?: boolean;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'boolean',
  label,
  className,
  showDot = false,
  showIcon = false,
}) => {
  // Manejo de tipo boolean o activo/inactivo
  if (type === 'boolean' || typeof status === 'boolean') {
    const isActive = Boolean(status);
    const text = label || (isActive ? 'Activo' : 'Inactivo');
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 transition-colors',
          isActive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          className
        )}
      >
        {showDot && (
          <span
            className={cn(
              'size-1.5 rounded-full',
              isActive ? 'bg-emerald-500' : 'bg-slate-400'
            )}
          />
        )}
        {showIcon &&
          (isActive ? (
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="size-3 text-slate-400" />
          ))}
        <span>{text}</span>
      </Badge>
    );
  }

  // Manejo de estado de citas médicas
  if (type === 'appointment') {
    const s = String(status || '').toLowerCase().trim();
    let config = {
      text: label || 'Desconocido',
      classes:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dot: 'bg-slate-400',
      icon: Clock,
    };

    switch (s) {
      case 'programada':
      case 'pendiente':
        config = {
          text: label || 'Pendiente',
          classes:
            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500 animate-pulse',
          icon: Clock,
        };
        break;
      case 'confirmada':
        config = {
          text: label || 'Confirmada',
          classes:
            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500',
          icon: Check,
        };
        break;
      case 'en_espera':
      case 'espera':
        config = {
          text: label || 'En Espera',
          classes:
            'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          dot: 'bg-indigo-500 animate-pulse',
          icon: Clock,
        };
        break;
      case 'en_consulta':
      case 'atendiendo':
        config = {
          text: label || 'En Atención',
          classes:
            'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
          dot: 'bg-teal-500 animate-ping',
          icon: ShieldCheck,
        };
        break;
      case 'atendida':
      case 'completada':
      case 'finalizada':
        config = {
          text: label || 'Completada',
          classes:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
        };
        break;
      case 'cancelada':
        config = {
          text: label || 'Cancelada',
          classes:
            'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
          dot: 'bg-red-500',
          icon: Ban,
        };
        break;
      case 'no_asistio':
      case 'ausente':
        config = {
          text: label || 'No Asistió',
          classes:
            'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700',
          dot: 'bg-slate-400',
          icon: AlertCircle,
        };
        break;
    }

    const IconComp = config.icon;

    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5',
          config.classes,
          className
        )}
      >
        {showDot && <span className={cn('size-1.5 rounded-full', config.dot)} />}
        {showIcon && <IconComp className="size-3" />}
        <span>{config.text}</span>
      </Badge>
    );
  }

  // Manejo de estado de pagos / suscripciones
  if (type === 'payment' || type === 'subscription') {
    const s = String(status || '').toLowerCase().trim();
    const isPaid = s === 'pagado' || s === 'aprobado' || s === 'activa' || s === 'completado';
    const isPending = s === 'pendiente' || s === 'revision' || s === 'prueba';
    const isFailed = s === 'fallido' || s === 'rechazado' || s === 'vencida' || s === 'cancelada';

    let colorClass =
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (isPaid) {
      colorClass =
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    } else if (isPending) {
      colorClass =
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    } else if (isFailed) {
      colorClass =
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 capitalize',
          colorClass,
          className
        )}
      >
        {showIcon && <CreditCard className="size-3" />}
        <span>{label || String(status || '')}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', className)}>
      {label || String(status || '')}
    </Badge>
  );
};

export default StatusBadge;
