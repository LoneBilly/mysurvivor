import React from 'react';
import SimpleBar from 'simplebar-react';
import type { SimpleBarProps } from 'simplebar-react';
import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef<
  SimpleBar,
  React.PropsWithChildren<SimpleBarProps>
>(({ children, className, ...props }, ref) => {
  return (
    <SimpleBar ref={ref} {...props} className={cn('h-full', className)}>
      {children}
    </SimpleBar>
  );
});

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };