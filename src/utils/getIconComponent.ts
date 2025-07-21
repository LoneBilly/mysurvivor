import { Home, Hammer, Box, Furnace, Shield, Crosshair, LucideIcon } from 'lucide-react';

const iconMap: { [key: string]: LucideIcon } = {
  campfire: Home,
  workbench: Hammer,
  chest: Box,
  furnace: Furnace,
  wall: Shield,
  crossbow_trap: Crosshair,
  default: Home,
};

export const getIconComponent = (iconName: string | null): LucideIcon => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  // Handle cases like 'crossbow' from your new definition
  const cleanIconName = iconName?.replace('.webp', '') || 'default';
  if (iconMap[cleanIconName]) {
    return iconMap[cleanIconName];
  }
  return iconMap.default;
};