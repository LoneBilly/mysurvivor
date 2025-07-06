import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2, Home, User } from "lucide-react";

interface GameGridProps {
  onCellSelect: (cell: MapCell) => void;
  discoveredZoneIds: number[];
  currentZoneId: number | null;
  baseZoneId: number | null;
}

const GameGrid = ({ onCellSelect, discoveredZoneIds, currentZoneId, baseZoneId }: GameGridProps) => {
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapLayout = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
      } else {
        setMapLayout(data as MapCell[]);
      }
      setLoading(false);
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
    if (!cell || !cell.discovered) return "?";
    switch (cell.type) {
      case 'foret': return "🌲";
      case 'plage': return "🏖️";
      default: return "❓";
    }
  };

  const getCellStyle = (cell: MapCell & { discovered: boolean }) => {
    if (!cell || !cell.discovered) {
      return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
    switch (cell.type) {
      case 'foret': return "bg-green-200 hover:bg-green-300 text-green-800 cursor-pointer border-green-400";
      case 'plage': return "bg-yellow-200 hover:bg-yellow-300 text-yellow-800 cursor-pointer border-yellow-400";
      default: return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
  };

  return (
    <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg flex items-center justify-center max-h-[calc(100%-20px)] max-w-[calc(100%-20px)] aspect-square">
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin text-white" />
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
                {currentZoneId === cell?.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30 rounded">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
                {baseZoneId === cell?.id && (
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