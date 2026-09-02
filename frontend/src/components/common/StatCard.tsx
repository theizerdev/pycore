import React from 'react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  colorClassName: string;
  className?: string;
  description?: string;
}

export function StatCard({
  icon,
  title,
  value,
  colorClassName,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-4 border bg-card text-card-foreground shadow-xs', className)}>
      <div className="flex items-center space-x-4">
        {/* Contenedor del ícono con color de fondo personalizable */}
        <div className={cn('rounded-lg p-3 shrink-0 flex items-center justify-center', colorClassName)}>
          {icon}
        </div>
        {/* Contenedor para el título y el valor */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </span>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </span>
        </div>
      </div>
    </Card>
  );
}
