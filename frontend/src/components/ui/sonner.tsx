import React from 'react';
import { Toaster as Sonner } from 'sonner';
import { useTemplateSettings } from '../../context/TemplateSettingsContext';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const Toaster: React.FC<ToasterProps> = ({ ...props }) => {
  const { resolvedAppearance } = useTemplateSettings();

  return (
    <Sonner
      theme={resolvedAppearance as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans text-sm',
          description: 'group-[.toast]:text-muted-foreground text-xs',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      richColors
      closeButton
      position="top-right"
      {...props}
    />
  );
};

export default Toaster;
