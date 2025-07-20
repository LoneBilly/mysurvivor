import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Book } from 'lucide-react';

type DynamicIconProps = {
  name: string | null | undefined;
  className?: string;
  fallback?: React.ElementType;
};

const DynamicIcon = ({ name, className, fallback: Fallback = Book }: DynamicIconProps) => {
  if (!name) {
    return <Fallback className={className} />;
  }

  const IconComponent = (LucideIcons as any)[name];

  if (!IconComponent) {
    return <Fallback className={className} />;
  }

  return <IconComponent className={className} />;
};

export default DynamicIcon;