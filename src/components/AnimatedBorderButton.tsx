import React from 'react';
import { cn } from "@/lib/utils";

interface AnimatedBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AnimatedBorderButton = ({ children, className, ...props }: AnimatedBorderButtonProps) => {
  return (
    <button
      className={cn(
        "animated-border-btn w-full sm:w-auto rounded-none bg-black text-white font-bold text-lg",
        "shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 hover:scale-[1.02] hover:shadow-[6px_6px_0px_#000]",
        className
      )}
      {...props}
    >
      <span className="block px-10 py-6 bg-black rounded-none">
        {children}
      </span>
    </button>
  );
};

export default AnimatedBorderButton;