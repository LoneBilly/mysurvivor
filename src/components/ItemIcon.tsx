import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState } from 'react';
import { getPublicIconUrl } from '@/utils/imageUrls'; // Import the utility function

interface ItemIconProps {
  iconName: string | null;
  alt: string;
  className?: string;
}

const ItemIcon = ({ iconName, alt, className }: ItemIconProps) => {
  const [error, setError] = useState(false);

  const fallbackIcon = (
    <div className="absolute inset-0 flex items-center justify-center p-1 pointer-events-none">
      <LucideIcons.Package className={cn("w-full h-full text-gray-400", className)} />
    </div>
  );

  if (!iconName || error) {
    return fallbackIcon;
  }

  // Use the utility function to get the public URL
  const imageUrl = getPublicIconUrl(iconName);

  if (imageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-1 pointer-events-none">
        <img
          src={imageUrl}
          alt={alt}
          className={cn("w-full h-full object-contain", className)}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // Fallback to LucideIcons if it's not a URL or URL failed
  const LucideIcon = (LucideIcons as any)[iconName];
  if (LucideIcon) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-1 pointer-events-none">
        <LucideIcon className={cn("w-full h-full", className)} />
      </div>
    );
  }

  return fallbackIcon;
};

export default ItemIcon;