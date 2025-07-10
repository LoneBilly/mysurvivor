import React from 'react';
import { cn } from "@/lib/utils";
import { ArrowDown, Zap } from "lucide-react";

export interface ExplorationCellProps {
  x: number;
  y: number;
  isEntrance: boolean;
  isPlayerOnCell: boolean;
  canClickEntrance: boolean;
  isPathTarget: boolean;
  pathCost: number;
  canAffordPath: boolean;
  onMouseEnter: (x: number, y: number) => void;
  onClick: (x: number, y: number) => void;
  style: React.CSSProperties;
}

const ExplorationCell = ({
  x, y, isEntrance, isPlayerOnCell, canClickEntrance,
  isPathTarget, pathCost, canAffordPath,
  onMouseEnter, onClick, style
}: ExplorationCellProps) => {

  const handleClick = () => {
    if (isPathTarget || canClickEntrance) {
      onClick(x, y);
    }
  };

  return (
    <button
      onMouseEnter={() => onMouseEnter(x, y)}
      onClick={handleClick}
      className={cn(
        "absolute flex items-center justify-center rounded-lg border transition-colors duration-75",
        isEntrance ? "bg-white/20 border-white/30" : "bg-white/10 border-white/20",
        canClickEntrance && "cursor-pointer hover:bg-white/30",
        isPathTarget && "cursor-pointer",
        !canClickEntrance && !isPathTarget && "cursor-default",
        isPathTarget && (canAffordPath ? 'path-target-affordable' : 'path-target-unaffordable')
      )}
      style={style}
    >
      {isEntrance && !isPlayerOnCell && <ArrowDown className="w-6 h-6 text-white animate-bounce" style={{ animationDuration: '2s' }} />}
      {isPlayerOnCell && <div className="relative w-1/2 h-1/2 rounded-full bg-sky-400 shadow-lg"></div>}
      
      {isPathTarget && pathCost > 0 && (
        <div className="path-cost absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className={cn(
            "flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm border border-white/20 rounded-full px-2 py-0.5 text-xs font-bold text-white",
            !canAffordPath && "text-red-400"
          )}>
            <Zap size={12} />
            <span>{pathCost}</span>
          </div>
        </div>
      )}
    </button>
  );
};

export default React.memo(ExplorationCell);