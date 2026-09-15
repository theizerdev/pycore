import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ToggleRight,
  Eye,
} from 'lucide-react';

export interface TableRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  onView?: () => void;
  isActive?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  children?: React.ReactNode;
}

export const TableRowActions: React.FC<TableRowActionsProps> = ({
  onEdit,
  onDelete,
  onToggleStatus,
  onView,
  isActive = true,
  canEdit = true,
  canDelete = true,
  editLabel = 'Editar',
  deleteLabel = 'Eliminar',
  children,
}) => {
  const hasActions =
    (onEdit && canEdit) ||
    (onDelete && canDelete) ||
    onToggleStatus ||
    onView ||
    children;

  if (!hasActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <MoreVertical className="size-4" />
          <span className="sr-only">Abrir menú de acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onView && (
          <DropdownMenuItem onClick={onView} className="gap-2 cursor-pointer">
            <Eye className="size-3.5 text-slate-500" />
            <span>Ver Detalle</span>
          </DropdownMenuItem>
        )}

        {onEdit && canEdit && (
          <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
            <Pencil className="size-3.5 text-slate-500" />
            <span>{editLabel}</span>
          </DropdownMenuItem>
        )}

        {onToggleStatus && canEdit && (
          <DropdownMenuItem onClick={onToggleStatus} className="gap-2 cursor-pointer">
            <ToggleRight className="size-3.5 text-slate-500" />
            <span>{isActive ? 'Desactivar' : 'Activar'}</span>
          </DropdownMenuItem>
        )}

        {children}

        {onDelete && canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>{deleteLabel}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TableRowActions;
