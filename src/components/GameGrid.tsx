import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2, Home } from "lucide-react";

interface GameGridProps {
  onCellSelect: (cell: MapCell) => void;
  discoveredZoneIds: number[];
  playerPosition: { x: number; y: number };
  basePosition: { x: number; y: number } | null;
  className?: string; // Ajout de la prop className
}

const GameGrid = ({ onCellSelect, discoveredZoneIds, playerPosition, basePosition, className }: GameGridProps) => {
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);

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

    mapLayout.forEach(cell => {
      if (!grid[cell.y]) grid[cell.y] = [];
      grid[cell.y][cell.x] = {
        ...cell,
        discovered: discoveredZoneIds.includes(cell.id),
      };
    });
    return grid;
  };

  const grid = generateGrid();

  const getCellContent = (cell: MapCell & { discovered: boolean }) => {
    if (!cell) return "?";
    if (!cell.discovered) return "?";
    
    switch (cell.type) {
      case 'foret':
        return "🌲";
      case 'plage':
        return "🏖️";
      default:
        return "?";
    }
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }) => {
    if (!cell) return "bg-gray-400";
    const isDefinedZone = cell.type === 'foret' || cell.type === 'plage';

    if (!cell.discovered || !isDefinedZone) {
      return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
    
    switch (cell.type) {
      case 'foret':
        return "bg-green-200 hover:bg-green-300 text-green-800 cursor-pointer border-green-400";
      case 'plage':
        return "bg-yellow-200 hover:bg-yellow-300 text-yellow-800 cursor-pointer border-yellow-400";
      default:
        return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
  };

  return (
    <div className={cn("bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg flex items-center justify-center w-full h-full aspect-square", className)}>
      {loading ? (
        <div className="flex items-center justify-center w-full h-full">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <div className="grid grid-cols-7 grid-rows-7 gap-1 md:gap-2 w-full h-full">
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                onClick={() => cell && onCellSelect(cell)}
                disabled={!cell}
                className={cn(
                  "relative w-full h-full flex items-center justify-center text-lg md:text-xl font-bold rounded border-2 transition-colors",
                  getCellStyle(cell)
                )}
              >
                {getCellContent(cell)}
                {playerPosition.x === x && playerPosition.y === y && (
                  <>
                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 animate-ping"></div>
                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500"></div>
                  </>
                )}
                {basePosition && basePosition.x === x && basePosition.y === y && (
                  <Home className="absolute bottom-1 left-1 h-4 w-4 text-indigo-600" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GameGrid;