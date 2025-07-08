import { useState, useEffect, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty';
  canBuild?: boolean;
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

  // Chargement de la base depuis la BDD
  useEffect(() => {
    const loadBase = async () => {
      if (!user) return;

      const { data: constructions, error } = await supabase
        .from('base_constructions')
        .select('x, y, type')
        .eq('player_id', user.id);

      if (error) {
        showError("Impossible de charger votre base.");
        console.error("Base loading error:", error);
        return;
      }

      const newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
        Array.from({ length: GRID_SIZE }, (_, x) => ({
          x, y, type: 'empty', canBuild: false,
        }))
      );

      const structurePositions: { x: number, y: number }[] = [];
      const centerOfBase = { x: -1, y: -1 };

      constructions.forEach(c => {
        if (newGrid[c.y]?.[c.x]) {
          newGrid[c.y][c.x].type = c.type as 'campfire' | 'foundation';
          structurePositions.push({ x: c.x, y: c.y });
          if (c.type === 'campfire') {
            centerOfBase.x = c.x;
            centerOfBase.y = c.y;
          }
        }
      });

      structurePositions.forEach(pos => {
        const adjacent = [
          { x: pos.x - 1, y: pos.y }, { x: pos.x + 1, y: pos.y },
          { x: pos.x, y: pos.y - 1 }, { x: pos.x, y: pos.y + 1 },
        ];
        adjacent.forEach(adj => {
          if (newGrid[adj.y]?.[adj.x]?.type === 'empty') {
            newGrid[adj.y][adj.x].canBuild = true;
          }
        });
      });

      setGridData(newGrid);
      
      // Centrer la vue sur le feu de camp au chargement
      if (centerOfBase.x !== -1 && !isInitialized) {
        centerViewport(centerOfBase.x, centerOfBase.y, false);
        setIsInitialized(true);
      }
    };

    loadBase();
  }, [user, isInitialized]);

  // Fonction pour centrer la vue sur une cellule
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

  // Effet pour centrer la vue sur la dernière cellule construite (avec animation)
  useEffect(() => {
    if (lastBuiltCell) {
      centerViewport(lastBuiltCell.x, lastBuiltCell.y);
    }
  }, [lastBuiltCell]);

  // Gère le clic sur une cellule pour construire
  const handleCellClick = async (x: number, y: number) => {
    if (!gridData || !user) return;

    const cell = gridData[y][x];
    if (!cell.canBuild || cell.type !== 'empty') return;

    const originalGridData = JSON.parse(JSON.stringify(gridData)); // Deep copy for rollback

    // Optimistic UI update
    const newGrid = gridData.map(row => row.map(c => ({ ...c })));
    newGrid[y][x].type = 'foundation';
    newGrid[y][x].canBuild = false;

    const adjacentPositions = [
      { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 },
    ];
    adjacentPositions.forEach(pos => {
      if (newGrid[pos.y]?.[pos.x]?.type === 'empty') {
        newGrid[pos.y][pos.x].canBuild = true;
      }
    });

    setGridData(newGrid);
    setLastBuiltCell({ x, y });

    // Save to database
    const { error } = await supabase.from('base_constructions').insert({
      player_id: user.id,
      x,
      y,
      type: 'foundation'
    });

    if (error) {
      showError("La construction a échoué. Veuillez réessayer.");
      console.error("Construction error:", error);
      // Rollback UI on error
      setGridData(originalGridData);
      setLastBuiltCell(null);
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

  if (!gridData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Chargement de votre base...</p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-auto bg-gray-900 no-scrollbar"
      style={{ opacity: isInitialized ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
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