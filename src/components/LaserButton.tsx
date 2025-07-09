import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LaserButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
}

const LaserButton = ({ children, className, ...props }: LaserButtonProps) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-none",
      "border-2 border-black shadow-[4px_4px_0px_#000]", // Base styles from original button
      "transition-all duration-150", // Base transition from original button
      "hover:scale-[1.02] hover:shadow-[6px_6px_0px_#000]", // Hover styles from original button
      "laser-button-wrapper", // New class for laser effect
      className // Allow external classes to be passed
    )}>
      <Button
        className="relative z-10 w-full h-full rounded-none bg-black text-white hover:bg-gray-800 font-bold text-lg px-10 py-6"
        {...props}
      >
        {children}
      </Button>
    </div>
  );
};

export default LaserButton;