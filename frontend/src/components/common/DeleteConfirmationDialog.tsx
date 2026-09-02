import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

export interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isConfirming?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmas la eliminación?',
  description = 'Esta acción es permanente y no se podrá deshacer. Los registros asociados podrían verse afectados.',
  isConfirming = false,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-3xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 text-destructive mb-1">
            <div className="p-2 rounded-2xl bg-destructive/15">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-black text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose} disabled={isConfirming} className="rounded-xl">
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isConfirming}
              className="rounded-xl"
            >
              {isConfirming ? 'Eliminando...' : 'Sí, Eliminar Registro'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
