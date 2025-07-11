import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

const StatBar = ({ label, value, color }: StatBarProps) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs sm:text-sm font-medium text-gray-300">{label}</span>
        <span className="text-xs sm:text-sm font-bold text-white">{value}%</span>
      </div>
      <div className="w-full bg-gray-700/50 rounded-full h-2.5">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-300", color)}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StatBar;