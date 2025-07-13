import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { MapCell } from "@/types/game";
import { Lock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface GameGridProps {
  mapLayout: MapCell[];
  onCellSelect: (cell: MapCell) => void;
  discoveredZones: number[];
  playerPosition: { x: number; y: number };
  basePosition: { x: number; y: number } | null;
}

const GameGrid = ({ mapLayout, onCellSelect, discoveredZones, playerPosition, basePosition }: GameGridProps) => {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<number>(0);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  } | null>(null);

  // Recalculate container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const parentWidth = container.clientWidth;
      const parentHeight = container.clientHeight;
      
      // Use the smaller dimension to maintain aspect ratio
      const size = Math.min(parentWidth, parentHeight);
      setContainerSize(size);
    };

    // Initial calculation
    updateSize();
    
    // Add resize listener
    window.addEventListener('resize', updateSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const generateGrid = (): (MapCell & { discovered: boolean })[][] => {
    const grid: (MapCell & { discovered: boolean })[][] = Array(7).fill(null).map(() => []);
    if (!mapLayout.length) return grid;

    const discoveredSet = new Set(discoveredZones);

    mapLayout
      .filter(cell => cell.type !== 'unknown' && !(cell.x === 3 && cell.y === 1))
      .forEach(cell => {
        if (!grid[cell.y]) grid[cell.y] = [];
        grid[cell.y][cell.x] = {
          ...cell,
          discovered: discoveredSet.has(cell.id),
        };
      });
    return grid;
  };

  const getCellContent = (cell: MapCell & { discovered: boolean }) => {
    if (!cell || cell.type === 'unknown') return null;
    if (!cell.discovered) return <Lock className="w-1/2 h-1/2 text-gray-400" />;
    
    const IconComponent = cell.icon ? (LucideIcons as any)[cell.icon] : LucideIcons.Building2;
    
    if (!IconComponent) {
      return <LucideIcons.Building2 className="w-1/2 h-1/2" />;
    }

    return <IconComponent className="w-1/2 h-1/2" />;
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }) => {
    if (!cell || cell.type === 'unknown') {
      return "bg-black/20 border-transparent cursor-default";
    }

    if (!cell.discovered) {
      return cn(
        "bg-white/5 border-white/10 text-gray-300 cursor-pointer",
        !isMobile && "hover:border-white/30 hover:bg-white/10"
      );
    }
    
    return cn(
      "bg-white/10 border-white/20 text-white",
      "cursor-pointer",
      !isMobile && "hover:bg-white/20 hover:border-white/40"
    );
  };

  const formatZoneName = (name: string): string => {
    if (!name) return "Zone Inconnue";
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleMouseEnter = (e: React.MouseEvent, cell: MapCell & { discovered: boolean }) => {
    if (isMobile || !cell || cell.type === 'unknown') return;
    const content = cell.discovered ? formatZoneName(cell.type) : "Zone non découverte";
    setTooltip({
      visible: true,
      content: content,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !tooltip?.visible) return;
    setTooltip(prev => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setTooltip(null);
  };

  const grid = generateGrid();

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        onMouseMove={handleMouseMove}
      >
        <div 
          className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl"
          style={{
            width: `${containerSize}px`,
            height: `${containerSize}px`,
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div 
            className="grid grid-cols-7 gap-1 md:gap-1.5 p-2 md:p-3 w-full h-full"
          >
            {grid.map((row, y) =>
              row.map((cell, x) => (
                <button
                  key={`${x}-${y}`}
                  onClick={() => cell && cell.type !== 'unknown' && onCellSelect(cell)}
                  disabled={!cell || cell.type === 'unknown'}
                  className={cn(
                    "relative aspect-square flex items-center justify-center font-bold rounded-lg border transition-all duration-200 w-full h-full",
                    getCellStyle(cell)
                  )}
                  onMouseEnter={(e) => cell && handleMouseEnter(e, cell)}
                  onMouseLeave={handleMouseLeave}
                >
                  {getCellContent(cell)}
                  {playerPosition.x === x && playerPosition.y === y && (
                    <div className="absolute top-1 right-1 w-2.5 h-2.5">
                      <div className="w-full h-full rounded-full bg-sky-400 animate-ping absolute"></div>
                      <div className="w-full h-full rounded-full bg-sky-400 relative border-2 border-gray-900"></div>
                    </div>
                  )}
                  {basePosition && basePosition.x === x && basePosition.y === y && (
                    <div className="absolute inset-0 border-2 border-dashed border-green-400/80 pointer-events-none rounded-lg"></div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      {!isMobile && tooltip && tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-sm text-white shadow-lg"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y + 15}px`,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </>
  );
};

export default GameGrid;