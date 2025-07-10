import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState } from 'react';

const SUPABASE_STORAGE_URL = "https://odnnuqgkkzhmkxfafzhp.supabase.co/storage/v1/object/public/items.icons";

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

  // Heuristique simple : si le nom contient un point, c'est un fichier.
  const isFile = iconName.includes('.');

  if (isFile) {
    const imageUrl = `${SUPABASE_STORAGE_URL}/${iconName}`;
    return (
      <img
        src={imageUrl}
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