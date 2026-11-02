import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, AlertTriangle, ArrowRight, X, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export const SubscriptionAlertBanner: React.FC = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('dismiss_sub_alert_banner') === 'true';
  });

  if (dismissed || !user || user.es_superadmin || user.empresa_id === 1) {
    return null;
  }

  const empresa = user.empresa;
  if (!empresa || !empresa.plan_vencimiento) {
    return null;
  }

  const now = new Date();
  const vencimiento = new Date(empresa.plan_vencimiento);
  const diffTime = vencimiento.getTime() - now.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isTrial = empresa.plan_estado === 'prueba';
  const isDoctor = empresa.tipo_entidad === 'medico_independiente';
  const isExpired = diasRestantes < 0 || empresa.plan_estado === 'vencido';

  // Mostrar si está en prueba (<= 7 días), si faltan <= 5 días en plan activo, o si está vencido
  const maxDiasAlerta = isTrial ? 7 : 5;
  if (!isExpired && diasRestantes > maxDiasAlerta) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('dismiss_sub_alert_banner', 'true');
  };

  const fechaFmt = vencimiento.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const tiempoTexto =
    diasRestantes === 0
      ? '¡Vence Hoy!'
      : diasRestantes === 1
      ? '1 día restante (mañana)'
      : `${diasRestantes} días restantes`;

  return (
    <div
      className={cn(
        "relative isolate flex items-center justify-between gap-x-4 overflow-hidden px-4 py-2 sm:px-6 border-b transition-colors",
        isExpired
          ? "bg-gradient-to-r from-rose-500/20 via-rose-500/15 to-red-500/20 border-rose-500/40 text-rose-950 dark:text-rose-200"
          : "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200"
      )}
    >
      <div className="flex items-center gap-x-3 text-xs font-medium">
        <div
          className={cn(
            "size-6 rounded-full flex items-center justify-center shrink-0",
            isExpired
              ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
              : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          )}
        >
          {isExpired || diasRestantes <= 1 ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase font-bold px-1.5 py-0",
              isExpired
                ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            )}
          >
            {isExpired ? 'Vencido' : isTrial ? 'Prueba Gratuita' : 'Suscripción'}
          </Badge>
          <span>
            {isExpired ? (
              isDoctor
                ? 'Estimado(a) Dr(a)., el periodo de su plan ha vencido. Renueve su suscripción para reactivar el acceso completo.'
                : 'La suscripción de su centro médico ha vencido. Por favor reporte su pago para reactivar las operaciones.'
            ) : (
              <>
                {isDoctor
                  ? `Estimado(a) Dr(a)., su ${isTrial ? 'periodo de prueba' : 'suscripción'} del consultorio finaliza en `
                  : `La ${isTrial ? 'prueba gratuita' : 'suscripción'} de su institución médica finaliza en `}
                <strong className="font-bold underline decoration-amber-500 decoration-2 underline-offset-2">
                  {tiempoTexto}
                </strong>{' '}
                ({fechaFmt}).
              </>
            )}
          </span>
          <span className="hidden md:inline text-muted-foreground text-[11px]">
            {isExpired
              ? 'Todos sus datos, pacientes e historias médicas se mantienen a salvo y listos para ser reactivados.'
              : 'Active o renueve su plan para garantizar la continuidad ininterrumpida de sus consultas e historias médicas.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          asChild
          size="sm"
          className={cn(
            "h-7 text-xs font-bold text-white shadow-xs rounded-lg px-2.5 cursor-pointer",
            isExpired ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
          )}
        >
          <Link to="/saas/suscripciones" className="flex items-center gap-1">
            <Sparkles className="size-3" />
            <span>{isExpired ? 'Reactivar Plan' : isTrial ? 'Activar Plan' : 'Renovar Ahora'}</span>
            <ArrowRight className="size-3" />
          </Link>
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="size-6 flex items-center justify-center rounded-md text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
          title="Ocultar recordatorio"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
};
