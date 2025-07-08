import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoneIconProps {
  type: string;
  icon: string | null;
  className?: string;
}

const ZoneIcon = ({ icon, className }: ZoneIconProps) => {
  const IconComponent = icon ? (LucideIcons as any)[icon] : LucideIcons.Building2;

  if (!IconComponent) {
    return <LucideIcons.HelpCircle className={cn("w-full h-full", className)} />;
  }

  return <IconComponent className={cn("w-full h-full", className)} />;
};

export default ZoneIcon;