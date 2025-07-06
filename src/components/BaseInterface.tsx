import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
}

const BaseInterface = () => {
  const [baseGrid, setBaseGrid] = useState<Map<string, BaseCell>>(new Map());
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });

  // State for panning
  const [isDragging, setIsDragging] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Size of the rendered grid (larger than viewport for smooth panning)
  const RENDER_GRID_SIZE = 15;
  const RENDER_CENTER = Math.floor(RENDER_GRID_SIZE / 2);

  // Initialiser la base avec le feu de camp au centre
  useEffect(() => {
    const initialGrid = new Map<string, BaseCell>();
    const campfireKey = `0,0`;
    initialGrid.set(campfireKey, { x: 0, y: 0, type: 'campfire' });

    const adjacentPositions = [
      { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
    ];

    adjacentPositions.forEach(pos => {
      const key = `${pos.x},${pos.y}`;
      initialGrid.set(key, { ...pos, type: 'empty', canBuild: true });
    });

    setBaseGrid(initialGrid);
  }, []);

  const getCellKey = (x: number, y: number) => `${x},${y}`;

  const getCell = (x: number, y: number): BaseCell => {
    const key = getCellKey(x, y);
    return baseGrid.get(key) || { x, y, type: 'empty', canBuild: false };
  };

  const addFoundation = (x: number, y: number) => {
    const newGrid = new Map(baseGrid);
    const foundationKey = getCellKey(x, y);
    newGrid.set(foundationKey, { x, y, type: 'foundation' });

    const currentCell = newGrid.get(foundationKey);
    if (currentCell) currentCell.canBuild = false;

    const adjacentPositions = [
      { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
    ];

    adjacentPositions.forEach(pos => {
      const key = getCellKey(pos.x, pos.y);
      const existingCell = newGrid.get(key);
      if (!existingCell || existingCell.type === 'empty') {
        newGrid.set(key, { ...pos, type: 'empty', canBuild: true });
      }
    });

    setBaseGrid(newGrid);
  };

  const getCellContent = (cell: BaseCell) => {
    if (cell.type === 'campfire') return "🔥";
    if (cell.type === 'foundation') return "🏗️";
    if (cell.canBuild) return <Plus className="w-4 h-4 text-gray-400" />;
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-200 border-orange-400 text-orange-800";
      case 'foundation': return "bg-stone-200 border-stone-400 text-stone-800";
      case 'empty':
        if (cell.canBuild) return "bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer border-dashed";
        return "bg-gray-600 border-gray-500";
      default: return "bg-gray-600 border-gray-500";
    }
  };

  const handleCellClick = (x: number, y: number) => {
    const cell = getCell(x, y);
    if (cell.canBuild && cell.type === 'empty') {
      addFoundation(x, y);
    }
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (viewportRef.current) viewportRef.current.style.cursor = 'grab';

    if (!viewportRef.current) return;
    const { width } = viewportRef.current.getBoundingClientRect();
    const cellWidth = (width * 1.5) / RENDER_GRID_SIZE;

    const dxCells = Math.round(panOffset.x / cellWidth);
    const dyCells = Math.round(panOffset.y / cellWidth);

    setViewOffset(prev => ({ x: prev.x - dxCells, y: prev.y - dyCells }));
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseLeave = () => {
    if (isDragging) handleMouseUp();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isDragging) return;
      const keyMap: { [key: string]: { x: number, y: number } } = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      };
      if (keyMap[e.key]) {
        setViewOffset(prev => ({ x: prev.x + keyMap[e.key].x, y: prev.y + keyMap[e.key].y }));
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDragging]);

  return (
    <div
      ref={viewportRef}
      className="bg-gray-900 w-full h-full flex items-center justify-center overflow-hidden relative cursor-grab select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="grid gap-1 md:gap-2"
        style={{
          gridTemplateColumns: `repeat(${RENDER_GRID_SIZE}, 1fr)`,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          width: '150%',
          height: '150%',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {Array.from({ length: RENDER_GRID_SIZE }, (_, row) =>
          Array.from({ length: RENDER_GRID_SIZE }, (_, col) => {
            const realX = col - RENDER_CENTER + viewOffset.x;
            const realY = row - RENDER_CENTER + viewOffset.y;
            const cell = getCell(realX, realY);
            
            return (
              <button
                key={`${realX}-${realY}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => handleCellClick(realX, realY)}
                className={cn(
                  "relative aspect-square flex items-center justify-center text-lg md:text-xl font-bold rounded border-2",
                  getCellStyle(cell)
                )}
                disabled={!cell.canBuild || cell.type !== 'empty'}
              >
                {getCellContent(cell)}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BaseInterface;