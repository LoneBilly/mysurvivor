import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapCell } from "@/types/game";
import { Loader2 } from "lucide-react";

interface GameGridProps {
  onCellSelect: (x: number, y: number, type: MapCell['type']) => void;
  discoveredGrid: boolean[][];
  playerPosition: { x: number; y: number };
}

const GameGrid = ({ onCellSelect, discoveredGrid, playerPosition }: GameGridProps) => {
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
        discovered: discoveredGrid?.[cell.y]?.[cell.x] || false,
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

  if (loading) {
    return (
      <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-1 md:p-2 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
      <div className="grid grid-cols-7 gap-1 md:gap-2 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => onCellSelect(x, y, cell.type)}
              className={cn(
                "relative aspect-square flex items-center justify-center text-lg md:text-xl font-bold rounded border-2 transition-colors",
                getCellStyle(cell)
              )}
            >
              {getCellContent(cell)}
              {playerPosition.x === x && playerPosition.y === y && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping absolute"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full absolute"></div>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default GameGrid;