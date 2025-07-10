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

  const fallbackIcon = <LucideIcons.Package className={cn("w-full h-full text-gray-400", className)} />;

  if (!iconName || error) {
    return fallbackIcon;
  }

  const isUrl = iconName.startsWith('http');

  if (isUrl) {
    return (
      <div className="absolute inset-0 p-1 pointer-events-none">
        <img
          src={iconName}
          alt={alt}
          className={cn("w-full h-full object-contain", className)}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  const LucideIcon = (LucideIcons as any)[iconName];
  if (LucideIcon) {
    return (
      <div className="absolute inset-0 p-1 pointer-events-none">
        <LucideIcon className={cn("w-full h-full", className)} />
      </div>
    );
  }

  return fallbackIcon;
};

export default ItemIcon;