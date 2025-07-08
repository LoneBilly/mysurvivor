import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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

              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => onCellClick(x, y)}
                  disabled={!isAdjacent && !isPlayerOnCell}
                  className={cn(
                    "absolute flex items-center justify-center rounded border transition-colors",
                    isEntrance 
                      ? "bg-amber-900/50 border-amber-700/50" 
                      : "bg-gray-800/50 border-gray-700/20",
                    (isAdjacent || (isEntrance && isPlayerOnCell)) && "cursor-pointer hover:bg-gray-700/50"
                  )}
                  style={{
                    left: x * (CELL_SIZE_PX + CELL_GAP),
                    top: y * (CELL_SIZE_PX + CELL_GAP),
                    width: CELL_SIZE_PX,
                    height: CELL_SIZE_PX,
                  }}
                >
                  {isPlayerOnCell && (
                    <div className="w-2/3 h-2/3 rounded-full bg-blue-500 shadow-lg animate-pulse"></div>
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