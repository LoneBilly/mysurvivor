import { GameGridCell } from "@/types/game";
import { cn } from "@/lib/utils";

interface GameGridProps {
  grid: GameGridCell[][];
  playerX: number;
  playerY: number;
  onCellSelect: (x: number, y: number) => void; // Added onCellSelect prop
}

const GameGrid = ({ grid, playerX, playerY, onCellSelect }: GameGridProps) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-blue-950">
      <div className="grid grid-cols-7 gap-1 md:gap-2 max-w-md md:max-w-lg lg:max-w-xl">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-sm cursor-pointer", // Added cursor-pointer
                cell.decouverte ? "bg-gray-600 border border-gray-500" : "bg-gray-800 border border-gray-700",
                playerX === x && playerY === y && "bg-yellow-400 border-yellow-300" // Player position
              )}
              onClick={() => onCellSelect(x, y)} // Added onClick handler
            >
              {playerX === x && playerY === y ? (
                <span role="img" aria-label="player" className="text-2xl">
                  👤
                </span>
              ) : cell.decouverte ? (
                <span className="text-xs text-gray-300">
                  {cell.type === "start" ? "Départ" : cell.type === "end" ? "Fin" : ""}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameGrid;