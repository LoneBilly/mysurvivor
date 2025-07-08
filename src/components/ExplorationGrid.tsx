import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight } from "lucide-react";

const GRID_SIZE = 51;
const CELL_SIZE_PX = 40;
const CELL_GAP = 4;
const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;
const ORBIT_RADIUS_PX = 40;

interface ExplorationGridProps {
  playerPosition: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
  path: { x: number; y: number }[] | null;
}

const ExplorationGrid = ({ playerPosition, onCellClick, onCellHover, path }: ExplorationGridProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [exitIndicator, setExitIndicator] = useState({ visible: false, angle: 0, x: 0, y: 0 });
  const [playerIndicator, setPlayerIndicator] = useState({ visible: false, angle: 0 });

  const updateIndicators = useCallback(() => {
    if (!viewportRef.current || !playerPosition) {
      setExitIndicator({ visible: false, angle: 0, x: 0, y: 0 });
      setPlayerIndicator({ visible: false, angle: 0 });
      return;
    }

    const viewport = viewportRef.current;
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = viewport;

    const playerPixelX = playerPosition.x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const playerPixelY = playerPosition.y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;

    const exitPixelX = ENTRANCE_X * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const exitPixelY = ENTRANCE_Y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const isExitVisible = exitPixelX >= scrollLeft && exitPixelX <= scrollLeft + clientWidth && exitPixelY >= scrollTop && exitPixelY <= scrollTop + clientHeight;
    
    if (isExitVisible) {
      setExitIndicator(prev => (prev.visible ? { ...prev, visible: false } : prev));
    } else {
      const playerScreenX = playerPixelX - scrollLeft;
      const playerScreenY = playerPixelY - scrollTop;
      const dx = exitPixelX - playerPixelX;
      const dy = exitPixelY - playerPixelY;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);
      setExitIndicator({ visible: true, angle: angleDeg, x: playerScreenX, y: playerScreenY });
    }

    const isPlayerVisible = playerPixelX >= scrollLeft && playerPixelX <= scrollLeft + clientWidth && playerPixelY >= scrollTop && playerPixelY <= scrollTop + clientHeight;
    if (isPlayerVisible) {
      setPlayerIndicator(prev => (prev.visible ? { ...prev, visible: false } : prev));
    } else {
      const viewportCenterX = scrollLeft + clientWidth / 2;
      const viewportCenterY = scrollTop + clientHeight / 2;
      const dx = playerPixelX - viewportCenterX;
      const dy = playerPixelY - viewportCenterY;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);
      setPlayerIndicator({ visible: true, angle: angleDeg });
    }
  }, [playerPosition]);

  // Center on mount only
  useLayoutEffect(() => {
    if (viewportRef.current && playerPosition) {
      const viewport = viewportRef.current;
      const cellCenterX = playerPosition.x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      const cellCenterY = playerPosition.y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      
      const scrollLeft = cellCenterX - viewport.clientWidth / 2;
      const scrollTop = cellCenterY - viewport.clientHeight / 2;

      viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'auto' });
      setTimeout(updateIndicators, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update indicators when player moves
  useEffect(() => {
    updateIndicators();
  }, [playerPosition, updateIndicators]);

  return (
    <div className="relative w-full h-full" onMouseLeave={() => onCellHover(-1, -1)}>
      <div
        ref={viewportRef}
        onScroll={updateIndicators}
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
              
              const isPath = path?.some(p => p.x === x && p.y === y);
              const isTarget = path && path[path.length - 1].x === x && path[path.length - 1].y === y;

              const canClickEntrance = isEntrance && playerPosition && (
                isPlayerOnCell || 
                (Math.abs(playerPosition.x - ENTRANCE_X) + Math.abs(playerPosition.y - ENTRANCE_Y) === 1)
              );
              
              const isClickable = isTarget || canClickEntrance;

              return (
                <button
                  key={`${x}-${y}`}
                  onMouseEnter={() => onCellHover(x, y)}
                  onClick={() => isClickable && onCellClick(x, y)}
                  className={cn(
                    "absolute flex items-center justify-center rounded border transition-all duration-100",
                    isEntrance 
                      ? "bg-gray-900/70 border-gray-700" 
                      : "bg-gray-800/50 border-gray-700/20",
                    isPath && "bg-blue-500/20 border-blue-400/30",
                    isTarget && "bg-blue-500/40 border-blue-400/50",
                    isClickable ? "cursor-pointer" : "cursor-default",
                    canClickEntrance && "hover:bg-gray-800/70"
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
                    <div className="relative w-1/4 h-1/4 rounded-full bg-blue-500 shadow-lg"></div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
      {/* Exit Indicator */}
      <div
        className="absolute z-20 text-amber-400 transition-opacity pointer-events-none"
        style={{
          opacity: exitIndicator.visible ? 1 : 0,
          top: `${exitIndicator.y}px`,
          left: `${exitIndicator.x}px`,
          transform: `translate(-50%, -50%) rotate(${exitIndicator.angle}deg) translate(${ORBIT_RADIUS_PX}px)`,
        }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
      {/* Player Indicator */}
      <div
        className="absolute z-20 text-blue-400 transition-opacity pointer-events-none"
        style={{
          opacity: playerIndicator.visible ? 1 : 0,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${playerIndicator.angle}deg) translate(clamp(40px, calc(min(25vh, 25vw) - 20px), 150px))`,
        }}
      >
        <ArrowRight className="w-6 h-6" />
      </div>
    </div>
  );
};

export default ExplorationGrid;