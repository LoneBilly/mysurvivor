import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";

const GRID_SIZE = 51;
const CELL_SIZE_PX = 40;
const CELL_GAP = 4;
const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;

interface ExplorationGridProps {
  playerPosition: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
}

const ExplorationGrid = ({ playerPosition, onCellClick }: ExplorationGridProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (viewportRef.current && playerPosition) {
      const viewport = viewportRef.current;
      const cellCenterX = playerPosition.x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      const cellCenterY = playerPosition.y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      
      const scrollLeft = cellCenterX - viewport.clientWidth / 2;
      const scrollTop = cellCenterY - viewport.clientHeight / 2;

      viewport.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'auto',
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        ref={viewportRef}
        className="w-full h-full overflow-auto bg-gray-900 no-scrollbar"
      >
        <div
          className="relative"
          style={{
            width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
            height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
          }}
        >
          {Array.from({ length: GRID_SIZE }).map((_, y) =>
            Array.from({ length: GRID_SIZE }).map((_, x) => {
              const isEntrance = x === ENTRANCE_X && y === ENTRANCE_Y;
              const isPlayerOnCell = playerPosition && playerPosition.x === x && playerPosition.y === y;
              const isAdjacent = playerPosition && Math.abs(playerPosition.x - x) + Math.abs(playerPosition.y - y) === 1;
              
              const canClickEntrance = isEntrance && playerPosition && (
                isPlayerOnCell || 
                (Math.abs(playerPosition.x - ENTRANCE_X) + Math.abs(playerPosition.y - ENTRANCE_Y) === 1)
              );

              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => onCellClick(x, y)}
                  disabled={!isAdjacent && !canClickEntrance}
                  className={cn(
                    "absolute flex items-center justify-center rounded border transition-colors",
                    isEntrance 
                      ? "bg-amber-900/50 border-amber-700/50" 
                      : "bg-gray-800/50 border-gray-700/20",
                    isAdjacent && "border-dashed border-gray-500 hover:bg-gray-700/50 cursor-pointer",
                    canClickEntrance && "cursor-pointer hover:bg-amber-800/50"
                  )}
                  style={{
                    left: x * (CELL_SIZE_PX + CELL_GAP),
                    top: y * (CELL_SIZE_PX + CELL_GAP),
                    width: CELL_SIZE_PX,
                    height: CELL_SIZE_PX,
                  }}
                >
                  {isEntrance && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ArrowDown className="w-6 h-6 text-amber-300 animate-bounce" style={{ animationDuration: '2s' }} />
                    </div>
                  )}
                  {isPlayerOnCell && (
                    <div className="relative w-1/2 h-1/2 rounded-full bg-blue-500 shadow-lg"></div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorationGrid;