import React from 'react';
import { cn } from "@/lib/utils";
import { Zone } from '@/types';
import { Home, User, Target } from 'lucide-react';

interface GridCellProps {
  zone: Zone | undefined;
  isPlayerHere: boolean;
  isBaseHere: boolean;
  isExplorationTarget: boolean;
  isDiscovered: boolean;
  onZoneClick: (zone: Zone) => void;
  style: React.CSSProperties;
}

const zoneBgClasses: { [key: string]: string } = {
  forest: 'bg-green-800 border-green-700 hover:bg-green-700',
  plains: 'bg-yellow-700 border-yellow-600 hover:bg-yellow-600',
  mountain: 'bg-gray-600 border-gray-500 hover:bg-gray-500',
  city: 'bg-slate-700 border-slate-600 hover:bg-slate-600',
  water: 'bg-blue-800 border-blue-700 hover:bg-blue-700',
  start: 'bg-indigo-800 border-indigo-700 hover:bg-indigo-700',
  default: 'bg-gray-900 border-gray-800',
};

const getZoneBgClass = (zoneType: string) => {
  return zoneBgClasses[zoneType] || zoneBgClasses.default;
};

const GridCell: React.FC<GridCellProps> = ({
  zone,
  isPlayerHere,
  isBaseHere,
  isExplorationTarget,
  isDiscovered,
  onZoneClick,
  style,
}) => {
  const handleClick = () => {
    if (zone && isDiscovered) {
      onZoneClick(zone);
    }
  };

  if (!isDiscovered) {
    return <div style={style} className="absolute bg-black border border-gray-800" />;
  }
  
  if (!zone) {
    return <div style={style} className="absolute bg-gray-900 border border-gray-800" />;
  }

  return (
    <div
      style={style}
      onClick={handleClick}
      className={cn(
        "absolute flex items-center justify-center transition-colors duration-200",
        getZoneBgClass(zone.type),
        isDiscovered ? 'cursor-pointer' : 'cursor-default',
        isExplorationTarget && "ring-4 ring-yellow-400 ring-inset z-30",
      )}
    >
      {isPlayerHere && (
        <User className="absolute w-8 h-8 text-white z-20 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
      )}
      {isBaseHere && !isPlayerHere && (
        <Home className="absolute w-7 h-7 text-cyan-300 z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
      )}
      {isExplorationTarget && !isPlayerHere && (
         <Target className="absolute w-6 h-6 text-yellow-300 z-10 opacity-75" />
      )}
    </div>
  );
};

export default React.memo(GridCell);