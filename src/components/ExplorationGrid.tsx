import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const GRID_SIZE = 51;
const CELL_SIZE_PX = 40;
const CELL_GAP = 4;
const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;

const ExplorationGrid = () => {
  const viewportRef = useRef<HTMLDivElement>(null);

  const centerViewportOnEntrance = () => {
    if (!viewportRef.current) return;
    
    const viewport = viewportRef.current;
    const cellCenterX = ENTRANCE_X * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const cellCenterY = ENTRANCE_Y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    
    const scrollLeft = cellCenterX - viewport.clientWidth / 2;
    const scrollTop = cellCenterY - viewport.clientHeight / 2;

    viewport.scrollTo({
      left: scrollLeft,
      top: scrollTop,
      behavior: 'auto',
    });
  };

  useLayoutEffect(() => {
    centerViewportOnEntrance();
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
              return (
                <div
                  key={`${x}-${y}`}
                  className={cn(
                    "absolute flex items-center justify-center rounded border",
                    isEntrance 
                      ? "bg-amber-900/50 border-amber-700/50" 
                      : "bg-gray-800/50 border-gray-700/20"
                  )}
                  style={{
                    left: x * (CELL_SIZE_PX + CELL_GAP),
                    top: y * (CELL_SIZE_PX + CELL_GAP),
                    width: CELL_SIZE_PX,
                    height: CELL_SIZE_PX,
                  }}
                >
                  {/* Cell content can be added here later */}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorationGrid;