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
  const [isPanning, setIsPanning] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [currentTransform, setCurrentTransform] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const RENDER_GRID_SIZE = 15;
  const RENDER_CENTER = Math.floor(RENDER_GRID_SIZE / 2);

  useEffect(() => {
    const initialGrid = new Map<string, BaseCell>();
    initialGrid.set("0,0", { x: 0, y: 0, type: 'campfire' });
    const adjacentPositions = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
    adjacentPositions.forEach(pos => {
      initialGrid.set(`${pos.x},${pos.y}`, { ...pos, type: 'empty', canBuild: true });
    });
    setBaseGrid(initialGrid);
  }, []);

  const getCellKey = (x: number, y: number) => `${x},${y}`;
  const getCell = (x: number, y: number): BaseCell => baseGrid.get(getCellKey(x, y)) || { x, y, type: 'empty', canBuild: false };

  const addFoundation = (x: number, y: number) => {
    const newGrid = new Map(baseGrid);
    newGrid.set(getCellKey(x, y), { x, y, type: 'foundation' });
    const adjacentPositions = [{ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 }];
    adjacentPositions.forEach(pos => {
      const key = getCellKey(pos.x, pos.y);
      if (!newGrid.has(key)) {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setIsPanning(false);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (!isPanning) {
          setIsPanning(true);
          if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
        }
        setCurrentTransform({ x: dx, y: dy });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging, isPanning]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';

      if (isPanning) {
        if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const cellSize = Math.min(rect.width, rect.height) / RENDER_GRID_SIZE;
          const deltaXCells = Math.round(currentTransform.x / cellSize);
          const deltaYCells = Math.round(currentTransform.y / cellSize);
          setViewOffset(prev => ({ x: prev.x - deltaXCells, y: prev.y - deltaYCells }));
        }
      } else {
        const target = e.target as HTMLElement;
        const cellButton = target.closest('button[data-cell-pos]');
        if (cellButton) {
          const [x, y] = cellButton.getAttribute('data-cell-pos')!.split(',').map(Number);
          const cell = getCell(x, y);
          if (cell.canBuild && cell.type === 'empty') addFoundation(x, y);
        }
      }
      setIsDragging(false);
      setIsPanning(false);
      setCurrentTransform({ x: 0, y: 0 });
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, isPanning, currentTransform]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const keyMap: { [key: string]: { x: number, y: number } } = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      };
      if (keyMap[e.key]) {
        e.preventDefault();
        setViewOffset(prev => ({ x: prev.x + keyMap[e.key].x, y: prev.y + keyMap[e.key].y }));
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div
      ref={viewportRef}
      className="bg-gray-900 w-full h-full flex items-center justify-center overflow-hidden relative select-none"
      style={{ cursor: 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="grid gap-1 md:gap-2"
        style={{
          gridTemplateColumns: `repeat(${RENDER_GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${RENDER_GRID_SIZE}, 1fr)`,
          transform: `translate(${currentTransform.x}px, ${currentTransform.y}px)`,
          width: '90%',
          height: '90%',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {Array.from({ length: RENDER_GRID_SIZE * RENDER_GRID_SIZE }, (_, index) => {
          const row = Math.floor(index / RENDER_GRID_SIZE);
          const col = index % RENDER_GRID_SIZE;
          const realX = col - RENDER_CENTER + viewOffset.x;
          const realY = row - RENDER_CENTER + viewOffset.y;
          const cell = getCell(realX, realY);
          return (
            <button
              key={`${realX}-${realY}`}
              data-cell-pos={`${realX},${realY}`}
              className={cn(
                "relative aspect-square flex items-center justify-center text-lg md:text-xl font-bold rounded border-2 transition-colors",
                getCellStyle(cell),
                isPanning && "pointer-events-none"
              )}
            >
              {getCellContent(cell)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BaseInterface;