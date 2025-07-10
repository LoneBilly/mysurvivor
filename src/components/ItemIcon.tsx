import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState } from 'react';

interface ItemIconProps {
  iconName: string | null;
  alt: string;
  className?: string;
}

const ItemIcon = ({ iconName, alt, className }: ItemIconProps) => {
  const [error, setError] = useState(false);

  if (!iconName || error) {
    return <LucideIcons.Package className={cn("w-full h-full text-gray-400", className)} />;
  }

  // Si iconName est une URL complète, on l'utilise directement.
  const isUrl = iconName.startsWith('http');

  if (isUrl) {
    return (
      <img
        src={iconName}
        alt={alt}
        className={cn("w-full h-full object-contain p-1", className)}
        onError={() => setError(true)}
      />
    );
  }

  const LucideIcon = (LucideIcons as any)[iconName];
  if (LucideIcon) {
    return <LucideIcon className={cn("w-full h-full", className)} />;
  }

  // Icône de secours si l'icône Lucide n'est pas trouvée
  return <LucideIcons.HelpCircle className={cn("w-full h-full text-gray-400", className)} />;
};

export default ItemIcon;