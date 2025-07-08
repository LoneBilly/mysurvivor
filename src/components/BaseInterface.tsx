import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/utils/toast";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
}

interface BaseConstruction {
  x: number;
  y: number;
  type: string;
}

const GRID_SIZE = 100;
const CELL_SIZE_PX = 60;
const CELL_GAP = 4;

const BaseInterface = () => {
  const { user } = useAuth();
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastBuiltCell, setLastBuiltCell] = useState<{ x: number; y: number } | null>(null);

  const updateCanBuild = (grid: BaseCell[][]): BaseCell[][] => {
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, canBuild: false })));
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (newGrid[y][x].type === 'campfire' || newGrid[y][x].type === 'foundation') {
          const adjacentPositions = [
            { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
          ];
          adjacentPositions.forEach(pos => {
            if (newGrid[pos.y]?.[pos.x]?.type === 'empty') {
              newGrid[pos.y][pos.x].canBuild = true;
            }
          });
        }
      }
    }
    return newGrid;
  };

  const initializeGrid = useCallback(async () => {
    if (!user) return;

    setIsInitialized(false);

    const { data: constructions, error } = await supabase
      .from('base_constructions')
      .select('x, y, type')
      .eq('player_id', user.id);

    if (error) {
      showError("Erreur lors du chargement de la base.");
      console.error(error);
      return;
    }

    let newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({
        x,
        y,
        type: 'empty',
        canBuild: false,
      }))
    );

    let centerOnX = Math.floor(GRID_SIZE / 2);
    let centerOnY = Math.floor(GRID_SIZE / 2);

    if (constructions.length === 0) {
      // New base, create and save the initial campfire
      const campfire = {
        player_id: user.id,
        x: centerOnX,
        y: centerOnY,
        type: 'campfire'
      };
      const { error: insertError } = await supabase
        .from('base_constructions')
        .insert(campfire);
      
      if (insertError) {
        showError("Impossible de créer le campement initial.");
        console.error(insertError);
        return;
      }
      newGrid[centerOnY][centerOnX].type = 'campfire';
    } else {
      // Existing base, populate grid
      constructions.forEach((c: BaseConstruction) => {
        if (newGrid[c.y]?.[c.x]) {
          newGrid[c.y][c.x].type = c.type as 'campfire' | 'foundation';
          if (c.type === 'campfire') {
            centerOnX = c.x;
            centerOnY = c.y;
          }
        }
      });
    }

    const finalGrid = updateCanBuild(newGrid);
    setGridData(finalGrid);
    
    // Center viewport after grid is set
    setTimeout(() => {
      centerViewport(centerOnX, centerOnY, false);
      setIsInitialized(true);
    }, 0);

  }, [user]);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const centerViewport = (x: number, y: number, smooth: boolean = true) => {
    if (!viewportRef.current) return;
    
    const viewport = viewportRef.current;
    const cellCenterX = x * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    const cellCenterY = y * (CELL_SIZE_PX + CELL_GAP) + CELL_SIZE_PX / 2;
    
    const scrollLeft = cellCenterX - viewport.clientWidth / 2;
    const scrollTop = cellCenterY - viewport.clientHeight / 2;

    viewport.scrollTo({
      left: scrollLeft,
      top: scrollTop,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    if (lastBuiltCell) {
      centerViewport(lastBuiltCell.x, lastBuiltCell.y);
    }
  }, [lastBuiltCell]);

  const handleCellClick = async (x: number, y: number) => {
    if (!gridData || !user) return;

    const cell = gridData[y][x];
    if (!cell.canBuild || cell.type !== 'empty') return;

    // Optimistic UI update
    let newGrid = gridData.map(row => row.map(c => ({ ...c })));
    newGrid[y][x].type = 'foundation';
    newGrid[y][x].canBuild = false;
    newGrid = updateCanBuild(newGrid);
    setGridData(newGrid);
    setLastBuiltCell({ x, y });

    // Save to DB
    const newConstruction = {
      player_id: user.id,
      x,
      y,
      type: 'foundation'
    };

    const { error } = await supabase
      .from('base_constructions')
      .insert(newConstruction);

    if (error) {
      showError("Erreur lors de la construction.");
      console.error(error);
      // Revert UI change by reloading from DB
      initializeGrid();
    }
  };

  const getCellContent = (cell: BaseCell) => {
    if (cell.type === 'campfire') return "🔥";
    if (cell.type === 'foundation') return "";
    if (cell.canBuild) return <Plus className="w-6 h-6 text-gray-400" />;
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-200/10 border-orange-400/30";
      case 'foundation': return "bg-gray-600 border-gray-500";
      case 'empty':
        if (cell.canBuild) return "bg-gray-700/50 border-gray-600 hover:bg-gray-600/50 cursor-pointer border-dashed";
        return "bg-gray-800/50 border-gray-700/20";
      default: return "bg-gray-800/50 border-gray-700/20";
    }
  };

  if (!isInitialized || !gridData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Chargement de la base...</p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-auto bg-gray-900 no-scrollbar"
      style={{ opacity: isInitialized ? 1 : 0, transition: 'opacity 0.5s' }}
    >
      <div
        className="relative"
        style={{
          width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
          height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
        }}
      >
        {gridData.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              className={cn(
                "absolute flex items-center justify-center text-2xl font-bold rounded border transition-colors",
                getCellStyle(cell)
              )}
              style={{
                left: x * (CELL_SIZE_PX + CELL_GAP),
                top: y * (CELL_SIZE_PX + CELL_GAP),
                width: CELL_SIZE_PX,
                height: CELL_SIZE_PX,
              }}
              disabled={!cell.canBuild}
            >
              {getCellContent(cell)}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default BaseInterface;