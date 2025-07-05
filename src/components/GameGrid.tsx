import { useState } from "react";
import { cn } from "@/lib/utils";

interface GridCellData {
  x: number;
  y: number;
  discovered: boolean;
  type: 'unknown' | 'foret' | 'plage';
}

interface GameGridProps {
  onCellSelect: (x: number, y: number) => void;
}

const GameGrid = ({ onCellSelect }: GameGridProps) => {
  // Initialisation de la grille 7x7 avec forêt et plage découvertes
  const [grid, setGrid] = useState<GridCellData[][]>(() => {
    const initialGrid: GridCellData[][] = [];
    for (let y = 0; y < 7; y++) {
      const row: GridCellData[] = [];
      for (let x = 0; x < 7; x++) {
        let type: 'unknown' | 'foret' | 'plage' = 'unknown';
        let discovered = false;
        
        // Forêt en position (1,1)
        if (x === 1 && y === 1) {
          type = 'foret';
          discovered = true;
        }
        // Plage en position (5,5)
        else if (x === 5 && y === 5) {
          type = 'plage';
          discovered = true;
        }
        
        row.push({ x, y, discovered, type });
      }
      initialGrid.push(row);
    }
    return initialGrid;
  });

  const handleCellClick = (x: number, y: number) => {
    onCellSelect(x, y);
  };

  const getCellContent = (cell: GridCellData) => {
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

  const getCellStyle = (cell: GridCellData) => {
    if (!cell.discovered) {
      return "bg-gray-300 hover:bg-gray-400 text-gray-600";
    }
    
    switch (cell.type) {
      case 'foret':
        return "bg-green-200 hover:bg-green-300 text-green-800";
      case 'plage':
        return "bg-yellow-200 hover:bg-yellow-300 text-yellow-800";
      default:
        return "bg-gray-200 hover:bg-gray-300 text-gray-600";
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="grid grid-cols-7 gap-1 md:gap-2 max-w-md md:max-w-lg lg:max-w-xl">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              className={cn(
                "aspect-square flex items-center justify-center text-lg md:text-xl font-bold rounded border-2 border-gray-400 transition-colors cursor-pointer",
                getCellStyle(cell)
              )}
            >
              {getCellContent(cell)}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default GameGrid;