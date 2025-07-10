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
    return <LucideIcons.Package className={cn("w-1/2 h-1/2 text-gray-400", className)} />;
  }

  const isUrl = iconName.startsWith('http');

  if (isUrl) {
    return (
      <img
        src={iconName}
        alt={alt}
        className={cn("w-1/2 h-1/2 object-contain", className)}
        onError={() => setError(true)}
      />
    );
  }

  const LucideIcon = (LucideIcons as any)[iconName];
  if (LucideIcon) {
    return <LucideIcon className={cn("w-1/2 h-1/2", className)} />;
  }

  return <LucideIcons.HelpCircle className={cn("w-1/2 h-1/2 text-gray-400", className)} />;
};

export default ItemIcon;