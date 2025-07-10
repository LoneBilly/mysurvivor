import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AStar } from 'tiny-based-pathfinding';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getIconForZone } from '@/lib/zoneIcons';

// Constants
const CELL_SIZE_PX = 48;
const CELL_GAP = 4;
const GRID_SIZE = 20;

interface Zone {
  id: number;
  x: number;
  y: number;
  type: string;
  icon?: string;
}

interface PlayerPosition {
  x: number;
  y: number;
}

interface ExplorationGridProps {
  mapLayout: Zone[];
  discoveredZones: number[];
  playerPosition: PlayerPosition;
  onCellClick: (zone: Zone) => void;
  isMoving: boolean;
}

const ExplorationGrid: React.FC<ExplorationGridProps> = ({
  mapLayout,
  discoveredZones,
  playerPosition,
  onCellClick,
  isMoving,
}) => {
  const [hoveredCell, setHoveredCell] = useState<Zone | null>(null);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pathfindingGrid = useMemo(() => {
    const grid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(1)); // Default to unwalkable
    
    mapLayout.forEach((zone) => {
      if (zone.x < GRID_SIZE && zone.y < GRID_SIZE) {
        if (discoveredZones.includes(zone.id)) {
          grid[zone.y][zone.x] = 0; // Walkable
        }
      }
    });
    
    if (playerPosition.y < GRID_SIZE && playerPosition.x < GRID_SIZE) {
      grid[playerPosition.y][playerPosition.x] = 0;
    }

    return grid;
  }, [mapLayout, discoveredZones, playerPosition]);

  useEffect(() => {
    if (hoveredCell && !isMoving && discoveredZones.includes(hoveredCell.id)) {
      const astar = new AStar(pathfindingGrid);
      const start = playerPosition;
      const end = { x: hoveredCell.x, y: hoveredCell.y };
      
      if (
        start.x >= 0 && start.x < GRID_SIZE && start.y >= 0 && start.y < GRID_SIZE &&
        end.x >= 0 && end.x < GRID_SIZE && end.y >= 0 && end.y < GRID_SIZE
      ) {
        const newPath = astar.search(start, end);
        setPath(newPath);
      } else {
        setPath([]);
      }
    } else {
      setPath([]);
    }
  }, [hoveredCell, playerPosition, pathfindingGrid, isMoving, discoveredZones]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (throttleTimeoutRef.current) {
      return;
    }

    throttleTimeoutRef.current = setTimeout(() => {
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellX = Math.floor(x / (CELL_SIZE_PX + CELL_GAP));
        const cellY = Math.floor(y / (CELL_SIZE_PX + CELL_GAP));

        if (cellX >= 0 && cellX < GRID_SIZE && cellY >= 0 && cellY < GRID_SIZE) {
          const cell = mapLayout.find((z) => z.x === cellX && z.y === cellY);
          if (cell && (cell.x !== hoveredCell?.x || cell.y !== hoveredCell?.y)) {
            setHoveredCell(cell);
          }
        } else {
          setHoveredCell(null);
        }
      }
      throttleTimeoutRef.current = null;
    }, 50);
  };

  const handleMouseLeave = () => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    setHoveredCell(null);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div
        ref={gridRef}
        className="relative"
        style={{
          width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP) - CELL_GAP,
          height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP) - CELL_GAP,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => hoveredCell && !isMoving && discoveredZones.includes(hoveredCell.id) && onCellClick(hoveredCell)}
      >
        <div
          className="grid bg-black/20 p-2 rounded-lg"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE_PX}px)`,
            gap: `${CELL_GAP}px`,
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const zone = mapLayout.find((z) => z.x === x && z.y === y);
            const isDiscovered = zone ? discoveredZones.includes(zone.id) : false;
            const isPlayerPosition = playerPosition.x === x && playerPosition.y === y;

            if (!zone) {
              return <div key={index} className="w-12 h-12 bg-gray-900/50 rounded-md" />;
            }

            const ZoneIcon = getIconForZone(zone.type);

            return (
              <Tooltip key={zone.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-md flex items-center justify-center transition-colors duration-300',
                      isDiscovered ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-800/30',
                      isPlayerPosition && 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-900'
                    )}
                  >
                    {isDiscovered && <ZoneIcon className="w-6 h-6 text-gray-400" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{zone.type}</p>
                  {isDiscovered ? <p>({zone.x}, {zone.y})</p> : <p>Inexploré</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="absolute top-2 left-2 pointer-events-none">
          {path.slice(1, -1).map((p, i) => (
            <motion.div
              key={`path-${p.x}-${p.y}`}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              style={{
                left: p.x * (CELL_SIZE_PX + CELL_GAP) + (CELL_SIZE_PX - 8) / 2,
                top: p.y * (CELL_SIZE_PX + CELL_GAP) + (CELL_SIZE_PX - 8) / 2,
              }}
            />
          ))}

          {hoveredCell && discoveredZones.includes(hoveredCell.id) && !isMoving && (
            <div
              className="absolute border-2 border-yellow-400 rounded-md"
              style={{
                width: CELL_SIZE_PX,
                height: CELL_SIZE_PX,
                left: hoveredCell.x * (CELL_SIZE_PX + CELL_GAP),
                top: hoveredCell.y * (CELL_SIZE_PX + CELL_GAP),
              }}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ExplorationGrid;