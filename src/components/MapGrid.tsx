import { cn } from "@/lib/utils";
import { MapCell } from "@/types";
import { User } from "lucide-react";
import ZoneIcon from "./ZoneIcon";

interface MapGridProps {
  layout: MapCell[];
  onCellClick: (cell: MapCell) => void;
  selectedCell?: MapCell | null;
  playerPositions?: { x: number; y: number; id: string }[];
  cellSize?: string;
  gridSize?: { width: number; height: number };
  discoveredZones?: number[] | null;
}

const MapGrid: React.FC<MapGridProps> = ({
  layout,
  onCellClick,
  selectedCell,
  playerPositions = [],
  cellSize = "w-16 h-16",
  gridSize,
  discoveredZones,
}) => {
  if (!layout.length && !gridSize) {
    return <div>Chargement de la carte...</div>;
  }

  const maxX = gridSize ? gridSize.width - 1 : Math.max(0, ...layout.map((c) => c.x));
  const maxY = gridSize ? gridSize.height - 1 : Math.max(0, ...layout.map((c) => c.y));

  const grid: (MapCell | null)[][] = Array(maxY + 1)
    .fill(null)
    .map(() => Array(maxX + 1).fill(null));

  layout.forEach((cell) => {
    if (cell.y >= 0 && cell.y <= maxY && cell.x >= 0 && cell.x <= maxX) {
      grid[cell.y][cell.x] = cell;
    }
  });

  return (
    <div className="inline-block bg-gray-900 p-1 rounded-md">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${maxX + 1}, minmax(0, 1fr))`,
          gap: "2px",
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const playerOnCell = playerPositions.find(
              (p) => p.x === x && p.y === y
            );
            
            const isDiscovered = discoveredZones == null || (cell && discoveredZones.includes(cell.id));

            return (
              <div
                key={`${x}-${y}`}
                onClick={() => cell && isDiscovered && onCellClick(cell)}
                className={cn(
                  "border flex items-center justify-center relative",
                  cellSize,
                  {
                    "cursor-pointer": !!cell && isDiscovered,
                    "bg-gray-700 border-gray-600": !cell,
                    "bg-gray-800 border-gray-600 text-transparent": cell && !isDiscovered,
                    "bg-gray-200 hover:bg-gray-300 border-gray-400": cell && isDiscovered,
                    "ring-2 ring-blue-500 z-10": selectedCell?.id === cell?.id,
                  }
                )}
              >
                {cell && isDiscovered ? (
                  <>
                    <ZoneIcon type={cell.type} icon={cell.icon} />
                    {playerOnCell && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <User className="w-3/4 h-3/4 text-red-500" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-1 h-1 text-transparent">.</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MapGrid;