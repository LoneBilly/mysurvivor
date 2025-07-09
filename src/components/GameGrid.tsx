import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2, Lock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface GameGridProps {
  onCellSelect: (cell: MapCell) => void;
  discoveredZones: number[];
  playerPosition: { x: number; y: number };
  basePosition: { x: number; y: number } | null;
}

const GameGrid = ({ onCellSelect, discoveredZones, playerPosition, basePosition }: GameGridProps) => {
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const fetchMapLayout = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
        setLoading(false);
      } else {
        setMapLayout(data as MapCell[]);
        setLoading(false);
      }
    };
    fetchMapLayout();
  }, []);

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

  const grid = generateGrid();

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
      return "bg-black/50 border-transparent cursor-default";
    }

    if (!cell.discovered) {
      return cn(
        "bg-gray-800/80 border-gray-700/50 text-gray-400 cursor-pointer",
        !isMobile && "hover:border-sky-500 hover:bg-gray-800"
      );
    }
    
    let typeStyle;
    switch (cell.type) {
      default:
        typeStyle = "border-gray-500/50 text-gray-300 bg-gray-900/30";
    }
    return cn(
      typeStyle,
      "cursor-pointer",
      !isMobile && "hover:bg-gray-900/60 hover:border-sky-500"
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

  if (loading) {
    return (
      <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <>
      <div
        className="bg-gray-900/50 h-full aspect-square flex items-center justify-center bg-[radial-gradient(theme(colors.gray.800)_1px,transparent_1px)] [background-size:20px_20px]"
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
                  "relative aspect-square flex items-center justify-center font-bold rounded-md border-2 transition-all duration-200 w-full h-full",
                  getCellStyle(cell)
                )}
                onMouseEnter={(e) => cell && handleMouseEnter(e, cell)}
                onMouseLeave={handleMouseLeave}
              >
                {getCellContent(cell)}
                {playerPosition.x === x && playerPosition.y === y && (
                  <div className="absolute top-1 right-1 w-2 h-2">
                    <div className="w-full h-full rounded-full bg-blue-400 animate-ping absolute"></div>
                    <div className="w-full h-full rounded-full bg-blue-500 relative"></div>
                  </div>
                )}
                {basePosition && basePosition.x === x && basePosition.y === y && (
                  <div className="absolute inset-0 border-2 border-amber-400 rounded-md pointer-events-none"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
      {!isMobile && tooltip && tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 shadow-lg"
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