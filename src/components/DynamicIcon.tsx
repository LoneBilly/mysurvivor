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

  // A more robust check for a valid React component, especially for forwardRef components like Lucide icons.
  if (!IconComponent || typeof IconComponent.render !== 'function') {
    return <Fallback className={className} />;
  }

  return <IconComponent className={className} />;
};

export default DynamicIcon;