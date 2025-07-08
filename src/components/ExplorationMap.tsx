import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User } from 'lucide-react';
import { GameState, MapCell } from '@/types/game';
import { cn } from '@/lib/utils';
import ZoneIcon from './ZoneIcon';

const GRID_SIZE = 100;
const CELL_SIZE_PX = 40; // Cellules plus petites
const CELL_GAP = 2;

interface ExplorationMapProps {
  gameState: GameState;
}

const ExplorationMap: React.FC<ExplorationMapProps> = ({ gameState }) => {
  const [layout, setLayout] = useState<MapCell[]>([]);
  const [grid, setGrid] = useState<(MapCell | null)[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMapLayout = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*');
      if (error) {
        console.error("Error fetching map layout:", error);
      } else {
        setLayout(data as MapCell[]);
      }
      setIsLoading(false);
    };
    fetchMapLayout();
  }, []);

  useEffect(() => {
    if (layout.length > 0) {
      const newGrid: (MapCell | null)[][] = Array.from({ length: GRID_SIZE }, () =>
        Array.from({ length: GRID_SIZE }, () => null)
      );
      layout.forEach(cell => {
        if (cell.y >= 0 && cell.y < GRID_SIZE && cell.x >= 0 && cell.x < GRID_SIZE) {
          newGrid[cell.y][cell.x] = cell;
        }
      });
      setGrid(newGrid);
    }
  }, [layout]);

  useLayoutEffect(() => {
    if (grid.length > 0 && viewportRef.current) {
      const viewport = viewportRef.current;
      const cellCenterX = gameState.position_x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      const cellCenterY = gameState.position_y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
      
      const scrollLeft = cellCenterX - viewport.clientWidth / 2;
      const scrollTop = cellCenterY - viewport.clientHeight / 2;

      viewport.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'auto',
      });
    }
  }, [grid, gameState.position_x, gameState.position_y]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const discoveredSet = new Set(gameState.zones_decouvertes);

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-auto bg-gray-900 no-scrollbar"
    >
      <div
        className="relative"
        style={{
          width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
          height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isDiscovered = cell ? discoveredSet.has(cell.id) : false;
            const isPlayerPosition = gameState.position_x === x && gameState.position_y === y;
            const isBasePosition = gameState.base_position_x === x && gameState.base_position_y === y;

            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "absolute flex items-center justify-center rounded border",
                  isDiscovered ? "bg-gray-700/50 border-gray-600" : "bg-gray-800/50 border-gray-700/20"
                )}
                style={{
                  left: x * (CELL_SIZE_PX + CELL_GAP),
                  top: y * (CELL_SIZE_PX + CELL_GAP),
                  width: CELL_SIZE_PX,
                  height: CELL_SIZE_PX,
                }}
              >
                {isDiscovered && cell && <ZoneIcon type={cell.type} icon={cell.icon} className="w-1/2 h-1/2 text-gray-300" />}
                {isPlayerPosition && <User className="w-3/4 h-3/4 text-blue-400 absolute" />}
                {isBasePosition && <div className="absolute inset-0 border-2 border-amber-400 rounded-md pointer-events-none"></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExplorationMap;