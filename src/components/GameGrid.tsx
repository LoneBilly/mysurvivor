import { cn } from "@/lib/utils";
import { useState } from "react";
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
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  } | null>(null);

  const generateGrid = (): (MapCell & { discovered: boolean })[][] => {
    const grid: (MapCell & { discovered: boolean })[][] = Array(7).fill(null).map(() => []);
    if (!mapLayout.length) return grid;

    const discoveredSet = new Set(discoveredZones);

    mapLayout.forEach(cell => {
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
    if (!cell.discovered) return <Lock className="w-1/2 h-1/2 text-gray-500" />;
    
    const IconComponent = cell.icon ? (LucideIcons as any)[cell.icon] : LucideIcons.Building2;
    
    if (!IconComponent) {
      return <LucideIcons.Building2 className="w-1/2 h-1/2" />;
    }

    return <IconComponent className="w-1/2 h-1/2" />;
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }) => {
    if (!cell || cell.type === 'unknown') {
      return "bg-gray-200 border-transparent cursor-default";
    }

    if (!cell.discovered) {
      return cn(
        "bg-gray-300 border-black/50 text-gray-800 cursor-pointer",
        !isMobile && "hover:border-black hover:bg-gray-400"
      );
    }
    
    return cn(
      "bg-white border-black/80 text-black",
      "cursor-pointer",
      !isMobile && "hover:bg-gray-200 hover:border-black"
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
        className="bg-gray-200 h-full aspect-square flex items-center justify-center border-2 border-black shadow-[8px_8px_0px_#000]"
        onMouseMove={handleMouseMove}
      >
        <div className="grid grid-cols-7 gap-1 md:gap-1.5 w-full h-full p-2 md:p-3">
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                onClick={() => cell && cell.type !== 'unknown' && onCellSelect(cell)}
                disabled={!cell || cell.type === 'unknown'}
                className={cn(
                  "relative aspect-square flex items-center justify-center font-bold rounded-none border-2 transition-all duration-200 w-full h-full",
                  getCellStyle(cell)
                )}
                onMouseEnter={(e) => cell && handleMouseEnter(e, cell)}
                onMouseLeave={handleMouseLeave}
              >
                {getCellContent(cell)}
                {playerPosition.x === x && playerPosition.y === y && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5">
                    <div className="w-full h-full rounded-full bg-black animate-ping absolute"></div>
                    <div className="w-full h-full rounded-full bg-black relative border-2 border-white"></div>
                  </div>
                )}
                {basePosition && basePosition.x === x && basePosition.y === y && (
                  <div className="absolute inset-0 border-2 border-dashed border-black pointer-events-none"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
      {!isMobile && tooltip && tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-none bg-white border-2 border-black px-3 py-1.5 text-sm text-black shadow-[2px_2px_0px_#000]"
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