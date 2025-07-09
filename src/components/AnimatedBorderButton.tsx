import React from 'react';
import { cn } from "@/lib/utils";

interface AnimatedBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AnimatedBorderButton = ({ children, className, ...props }: AnimatedBorderButtonProps) => {
  return (
    <button
      className={cn(
        "animated-border-btn w-full sm:w-auto rounded-none bg-white font-bold text-lg text-black",
        "border-2 border-black",
        "shadow-[8px_8px_0px_#000] hover:shadow-[10px_10px_0px_#000]",
        "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
        "transition-all duration-150",
        "px-10 py-6",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default AnimatedBorderButton;