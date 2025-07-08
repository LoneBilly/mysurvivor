import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const GRID_SIZE = 100;
const CELL_SIZE_PX = 60;
const CELL_GAP = 4;

const ExplorationGrid = () => {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Center the view on component mount
  useLayoutEffect(() => {
    if (viewportRef.current) {
      const viewport = viewportRef.current;
      const scrollLeft = (GRID_SIZE * (CELL_SIZE_PX + CELL_GAP)) / 2 - viewport.clientWidth / 2;
      const scrollTop = (GRID_SIZE * (CELL_SIZE_PX + CELL_GAP)) / 2 - viewport.clientHeight / 2;
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
            Array.from({ length: GRID_SIZE }).map((_, x) => (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "absolute flex items-center justify-center rounded border",
                  "bg-gray-800/50 border-gray-700/20"
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorationGrid;