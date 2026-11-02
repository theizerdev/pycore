import React from 'react';
import { Icon, addCollection, type IconProps } from '@iconify/react';
import mdiSubset from './mdi-subset.json';

// Pre-registra los iconos MDI clínicos para renderizado en 0ms sin parpadeos de red
addCollection(mdiSubset);

export interface MdiIconProps extends Omit<IconProps, 'icon'> {
  icon: string;
}

export const MdiIcon: React.FC<MdiIconProps> = ({ icon, className, ...props }) => {
  const normalized = icon.startsWith('mdi:') ? icon : `mdi:${icon}`;
  return <Icon icon={normalized} className={className} {...props} />;
};

export default MdiIcon;

