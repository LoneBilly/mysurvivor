import React from 'react';
import { cn } from "@/lib/utils";
import { ArrowDown, Zap } from "lucide-react";

interface ExplorationCellProps {
  x: number;
  y: number;
  isEntrance: boolean;
  isPlayerOnCell: boolean;
  isPath: boolean;
  isAffordable: boolean;
  isTarget: boolean;
  canAffordMove: boolean;
  isClickable: boolean;
  canClickEntrance: boolean;
  energyCost: number;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
}

const CELL_SIZE_PX = 40;
const CELL_GAP = 4;

const ExplorationCell = ({
  x, y, isEntrance, isPlayerOnCell, isPath, isAffordable, isTarget,
  canAffordMove, isClickable, canClickEntrance, energyCost,
  onCellClick, onCellHover,
}: ExplorationCellProps) => {
  const isAffordablePath = isPath && isAffordable;
  const isUnaffordablePath = isPath && !isAffordable;

  return (
    <button
      onMouseEnter={() => onCellHover(x, y)}
      onClick={() => onCellClick(x, y)}
      disabled={!isClickable}
      className={cn(
        "absolute flex items-center justify-center rounded-lg border transition-all duration-100",
        isEntrance ? "bg-white/20 border-white/30" : "bg-white/10 border-white/20",
        isAffordablePath && !isTarget && "bg-sky-400/30 border-sky-400/50",
        isUnaffordablePath && !isTarget && "bg-amber-500/30 border-amber-500/50",
        isTarget && canAffordMove && "bg-sky-400/40 border-sky-400/60 ring-2 ring-sky-400/80",
        isTarget && !canAffordMove && "bg-amber-500/40 border-amber-500/60 ring-2 ring-amber-500/80",
        isClickable ? "cursor-pointer" : "cursor-default",
        canClickEntrance && "hover:bg-white/30"
      )}
      style={{
        left: x * (CELL_SIZE_PX + CELL_GAP),
        top: y * (CELL_SIZE_PX + CELL_GAP),
        width: CELL_SIZE_PX,
        height: CELL_SIZE_PX,
      }}
    >
      {isEntrance && !isPlayerOnCell && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ArrowDown className="w-6 h-6 text-white animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
      )}
      {isPlayerOnCell && (
        <div className="relative w-1/2 h-1/2 rounded-full bg-sky-400 shadow-lg"></div>
      )}
      {isAffordablePath && !isPlayerOnCell && !isEntrance && !isTarget && (
        <div className="w-1.5 h-1.5 rounded-full bg-sky-300/70"></div>
      )}
      {isUnaffordablePath && !isPlayerOnCell && !isEntrance && !isTarget && (
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70"></div>
      )}
      {isTarget && energyCost > 0 && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className={cn(
            "flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm border border-white/20 rounded-full px-2 py-0.5 text-xs font-bold",
            canAffordMove ? "text-white" : "text-red-400"
          )}>
            <Zap size={12} />
            <span>{energyCost}</span>
          </div>
        </div>
      )}
    </button>
  );
};

export default React.memo(ExplorationCell);