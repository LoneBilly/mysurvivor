import { useState, useEffect, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
}

const GRID_SIZE = 100;
const CELL_SIZE_PX = 60;
const CELL_GAP = 4;

const BaseInterface = () => {
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({
        x,
        y,
        type: 'empty',
        canBuild: false,
      }))
    );

    const center = Math.floor(GRID_SIZE / 2);
    newGrid[center][center].type = 'campfire';

    const adjacentPositions = [
      { x: center - 1, y: center }, { x: center + 1, y: center },
      { x: center, y: center - 1 }, { x: center, y: center + 1 },
    ];
    adjacentPositions.forEach(pos => {
      if (newGrid[pos.y] && newGrid[pos.y][pos.x]) {
        newGrid[pos.y][pos.x].canBuild = true;
      }
    });

    setGridData(newGrid);
  }, []);

  const centerViewport = (x: number, y: number) => {
    if (!viewportRef.current) return;
    
    const viewport = viewportRef.current;
    const cellCenterX = x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const cellCenterY = y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    
    const scrollLeft = cellCenterX - viewport.clientWidth / 2;
    const scrollTop = cellCenterY - viewport.clientHeight / 2;

    viewport.scrollTo({
      left: scrollLeft,
      top: scrollTop,
    });
  };

  useEffect(() => {
    if (gridData && !isInitialized && viewportRef.current) {
      const center = Math.floor(GRID_SIZE / 2);
      // On centre immédiatement sans animation
      centerViewport(center, center);
      setIsInitialized(true);
    }
  }, [gridData, isInitialized]);

  const handleCellClick = (x: number, y: number) => {
    if (!gridData) return;

    const cell = gridData[y][x];
    if (!cell.canBuild || cell.type !== 'empty') return;

    const newGrid = gridData.map(row => row.map(c => ({ ...c })));

    newGrid[y][x].type = 'foundation';
    newGrid[y][x].canBuild = false;

    const adjacentPositions = [
      { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
    ];
    adjacentPositions.forEach(pos => {
      if (newGrid[pos.y] && newGrid[pos.y][pos.x] && newGrid[pos.y][pos.x].type === 'empty') {
        newGrid[pos.y][pos.x].canBuild = true;
      }
    });

    setGridData(newGrid);
    setTimeout(() => centerViewport(x, y), 10);
  };

  const getCellContent = (cell: BaseCell) => {
    if (cell.type === 'campfire') return "🔥";
    if (cell.type === 'foundation') return "";
    if (cell.canBuild) return <Plus className="w-6 h-6 text-gray-400" />;
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-200/10 border-orange-400/30";
      case 'foundation': return "bg-gray-600 border-gray-500";
      case 'empty':
        if (cell.canBuild) return "bg-gray-700/50 border-gray-600 hover:bg-gray-600/50 cursor-pointer border-dashed";
        return "bg-gray-800/50 border-gray-700/20";
      default: return "bg-gray-800/50 border-gray-700/20";
    }
  };

  if (!gridData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Génération de la base...</p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-auto bg-gray-900 no-scrollbar"
      style={{ opacity: isInitialized ? 1 : 0 }} // Cache pendant l'initialisation
    >
      <div
        className="relative"
        style={{
          width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
          height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
        }}
      >
        {gridData.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              className={cn(
                "absolute flex items-center justify-center text-2xl font-bold rounded border transition-colors",
                getCellStyle(cell)
              )}
              style={{
                left: x * (CELL_SIZE_PX + CELL_GAP),
                top: y * (CELL_SIZE_PX + CELL_GAP),
                width: CELL_SIZE_PX,
                height: CELL_SIZE_PX,
              }}
              disabled={!cell.canBuild}
            >
              {getCellContent(cell)}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default BaseInterface;