import React from 'react';
import { Button } from '../ui/button';
import { type LucideIcon, Inbox, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title = 'No hay datos registrados',
  description = 'No se encontraron registros que coincidan con la búsqueda o todavía no se han creado elementos.',
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-border/80 bg-slate-50/50 dark:bg-slate-900/30',
        className
      )}
    >
      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-xs">
        <Icon className="size-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="gap-2 shadow-xs">
          <ActionIcon className="size-3.5" />
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
