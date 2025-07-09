import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AnimatedBorderButton = ({ children, className, ...props }: AnimatedBorderButtonProps) => {
  return (
    <button
      className={cn(
        "relative group inline-flex items-center justify-center rounded-lg bg-black p-[2px] font-bold text-white overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50",
        className
      )}
      {...props}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#a855f7_0%,#3b82f6_50%,#a855f7_100%)]" />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-black px-8 py-3 text-lg backdrop-blur-3xl">
        {children}
      </span>
    </button>
  );
};

export default AnimatedBorderButton;