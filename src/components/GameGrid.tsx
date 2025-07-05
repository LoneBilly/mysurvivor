import { cn } from "@/lib/utils";

interface GridCellData {
  x: number;
  y: number;
  discovered: boolean;
  type: 'unknown' | 'foret' | 'plage';
}

interface GameGridProps {
  onCellSelect: (x: number, y: number) => void;
  discoveredGrid: boolean[][];
}

const GameGrid = ({ onCellSelect, discoveredGrid }: GameGridProps) => {
  // Générer la grille basée sur les données Supabase
  const generateGrid = (): GridCellData[][] => {
    const grid: GridCellData[][] = [];
    for (let y = 0; y < 7; y++) {
      const row: GridCellData[] = [];
      for (let x = 0; x < 7; x++) {
        let type: 'unknown' | 'foret' | 'plage' = 'unknown';
        const discovered = discoveredGrid[y] && discoveredGrid[y][x] || false;
        
        // Définir les types de terrain fixes
        if (x === 1 && y === 1) {
          type = 'foret';
        } else if (x === 5 && y === 5) {
          type = 'plage';
        }
        
        row.push({ x, y, discovered, type });
      }
      grid.push(row);
    }
    return grid;
  };

  const grid = generateGrid();

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
        return "🌿"; // Terrain normal découvert
    }
  };

  const getCellStyle = (cell: GridCellData) => {
    if (!cell.discovered) {
      return "bg-gray-400 hover:bg-gray-300 text-gray-700 cursor-pointer border-gray-500";
    }
    
    switch (cell.type) {
      case 'foret':
        return "bg-green-200 hover:bg-green-300 text-green-800 cursor-pointer border-green-400";
      case 'plage':
        return "bg-yellow-200 hover:bg-yellow-300 text-yellow-800 cursor-pointer border-yellow-400";
      default:
        return "bg-gray-200 hover:bg-gray-100 text-gray-700 cursor-pointer border-gray-400";
    }
  };

  return (
    <div className="w-full h-full max-w-[90vmin] max-h-[90vmin] aspect-square">
      <div className="grid grid-cols-7 gap-1 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              className={cn(
                "aspect-square flex items-center justify-center text-lg md:text-xl lg:text-2xl font-bold rounded border-2 transition-colors",
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