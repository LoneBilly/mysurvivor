"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile"; // Corrected import path

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean;
  children?: React.ReactNode;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, isCollapsed, children, ...props }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full flex-col border-r bg-sidebar-background",
          isCollapsed ? "w-[50px]" : "w-[280px]",
          isMobile && "fixed inset-y-0 left-0 z-50 w-full",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Sidebar.displayName = "Sidebar";

export { Sidebar };