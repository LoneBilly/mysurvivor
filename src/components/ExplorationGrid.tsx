import { useLayoutEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight } from "lucide-react";

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
  const [indicator, setIndicator] = useState({ visible: false, angle: 0 });

  const updateIndicator = useCallback(() => {
    if (!viewportRef.current) return;

    const viewport = viewportRef.current;
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = viewport;

    const exitPixelX = ENTRANCE_X * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const exitPixelY = ENTRANCE_Y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;

    const isVisible =
      exitPixelX >= scrollLeft &&
      exitPixelX <= scrollLeft + clientWidth &&
      exitPixelY >= scrollTop &&
      exitPixelY <= scrollTop + clientHeight;

    if (isVisible) {
      setIndicator(prev => prev.visible ? { visible: false, angle: 0 } : prev);
    } else {
      const viewportCenterX = scrollLeft + clientWidth / 2;
      const viewportCenterY = scrollTop + clientHeight / 2;

      const dx = exitPixelX - viewportCenterX;
      const dy = exitPixelY - viewportCenterY;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);

      setIndicator({ visible: true, angle: angleDeg });
    }
  }, []);

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
      
      setTimeout(updateIndicator, 100);
    }
  }, [playerPosition, updateIndicator]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={viewportRef}
        onScroll={updateIndicator}
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
                      ? "bg-gray-900/70 border-gray-700" 
                      : "bg-gray-800/50 border-gray-700/20",
                    isAdjacent && "border-dashed border-gray-500 hover:bg-gray-700/50 cursor-pointer",
                    canClickEntrance && "cursor-pointer hover:bg-gray-800/70"
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
                      <ArrowDown className="w-6 h-6 text-amber-300 animate-bounce" style={{ animationDuration: '2s' }} />
                    </div>
                  )}
                  {isPlayerOnCell && (
                    <div className="relative w-1/3 h-1/3 rounded-full bg-blue-500 shadow-lg"></div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div
        className="absolute z-20 text-amber-400 transition-opacity pointer-events-none"
        style={{
          opacity: indicator.visible ? 1 : 0,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${indicator.angle}deg) translate(clamp(100px, calc(min(45vh, 45vw) - 30px), 400px))`,
        }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
    </div>
  );
};

export default ExplorationGrid;