import React from 'react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

export interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5', className)}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <Card className={cn('p-4 border bg-card text-card-foreground shadow-xs', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {children}
      </div>
    </Card>
  );
}
