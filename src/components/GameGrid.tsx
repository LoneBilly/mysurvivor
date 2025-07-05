import { useMemo } from "react";

interface GameGridProps {
  onCellSelect: (x: number, y: number) => void;
  discoveredGrid: boolean[][];
}

const GameGrid = ({ onCellSelect, discoveredGrid }: GameGridProps) => {
  const grid = useMemo(() => {
    return Array(7).fill(null).map((_, y) => 
      Array(7).fill(null).map((_, x) => ({
        discovered: discoveredGrid[y]?.[x] || false,
      }))
    );
  }, [discoveredGrid]);

  return (
    <div className="grid grid-cols-7 gap-1 md:gap-2 max-w-md md:max-w-lg lg:max-w-xl">
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <button
            key={`${x}-${y}`}
            onClick={() => onCellSelect(x, y)}
            className={`aspect-square rounded-md transition-colors duration-300 ${
              cell.discovered
                ? "bg-green-400 hover:bg-green-500"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            aria-label={`Case ${x}, ${y}`}
          >
            <span className="sr-only">
              {cell.discovered ? "Découverte" : "Non découverte"}
            </span>
          </button>
        ))
      )}
    </div>
  );
};

export default GameGrid;