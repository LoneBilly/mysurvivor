import React from 'react';
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface InventorySlotProps extends ButtonProps {
  children: React.ReactNode;
  className?: string;
}

const InventorySlot = React.forwardRef<HTMLButtonElement, InventorySlotProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(
          "p-1 bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 hover:border-slate-600 aspect-square h-auto w-full flex flex-col items-center justify-center text-center text-white leading-tight",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

InventorySlot.displayName = "InventorySlot";

export default InventorySlot;