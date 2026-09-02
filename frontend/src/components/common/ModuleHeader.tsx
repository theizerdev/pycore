import React from 'react';
import { cn } from '../../lib/utils';

export interface ModuleHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  colorClassName?: string;
  className?: string;
}

export function ModuleHeader({
  icon,
  title,
  description,
  children,
  colorClassName = 'bg-teal-600 dark:bg-teal-700',
  className,
}: ModuleHeaderProps) {
  return (
    <div className={cn('p-4 rounded-lg text-white shadow-xs', colorClassName, className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sección izquierda: Ícono y texto */}
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-black/15 rounded-lg flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h1>
            <p className="text-sm text-white/90">{description}</p>
          </div>
        </div>

        {/* Sección derecha: para botones de acción */}
        {children && <div className="flex items-center gap-2 self-start sm:self-auto">{children}</div>}
      </div>
    </div>
  );
}
