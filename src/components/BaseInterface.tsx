import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Plus, Loader2, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";

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

const GRID_SIZE = 31;
const CELL_SIZE_PX = 60;
const CELL_GAP = 4;

interface BaseInterfaceProps {
  isActive: boolean;
}

const BaseInterface = ({ isActive }: BaseInterfaceProps) => {
  const { user } = useAuth();
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasCentered = useRef(false);
  const [lastBuiltCell, setLastBuiltCell] = useState<{ x: number; y: number } | null>(null);
  const [campfirePosition, setCampfirePosition] = useState<{ x: number; y: number } | null>(null);

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
    setLoading(true);
    hasCentered.current = false;

    let { data: constructions, error } = await supabase
      .from('base_constructions')
      .select('x, y, type')
      .eq('player_id', user.id);

    if (error) {
      showError("Erreur lors du chargement de la base.");
      console.error(error);
      setLoading(false);
      return;
    }

    const campfire = constructions.find(c => c.type === 'campfire');
    const isCampfireInvalid = !campfire || campfire.x >= GRID_SIZE || campfire.y >= GRID_SIZE;

    if (isCampfireInvalid && constructions.length > 0) {
      await supabase.from('base_constructions').delete().eq('player_id', user.id);
      const { data: newConstructions } = await supabase.from('base_constructions').select('*').eq('player_id', user.id);
      constructions = newConstructions || [];
    }

    let newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'empty', canBuild: false }))
    );

    let campPos: { x: number; y: number } | null = null;

    if (constructions.length === 0) {
      const newCampX = Math.floor(GRID_SIZE / 2);
      const newCampY = Math.floor(GRID_SIZE / 2);
      
      const { error: insertError } = await supabase
        .from('base_constructions')
        .insert({ player_id: user.id, x: newCampX, y: newCampY, type: 'campfire' });
      
      if (insertError) {
        showError("Impossible de créer le campement initial.");
        setLoading(false);
        return;
      }
      
      newGrid[newCampY][newCampX].type = 'campfire';
      campPos = { x: newCampX, y: newCampY };
    } else {
      constructions.forEach((c: BaseConstruction) => {
        if (newGrid[c.y]?.[c.x]) {
          newGrid[c.y][c.x].type = c.type as 'campfire' | 'foundation';
          if (c.type === 'campfire') {
            campPos = { x: c.x, y: c.y };
          }
        }
      });
    }

    const finalGrid = updateCanBuild(newGrid);
    setGridData(finalGrid);
    setCampfirePosition(campPos);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isActive) {
      initializeGrid();
    }
  }, [isActive, initializeGrid]);

  const centerViewport = useCallback((x: number, y: number, smooth: boolean = true) => {
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
  }, []);

  useLayoutEffect(() => {
    if (!loading && gridData && campfirePosition && viewportRef.current && !hasCentered.current) {
      centerViewport(campfirePosition.x, campfirePosition.y, false);
      hasCentered.current = true;
    }
  }, [loading, gridData, campfirePosition, centerViewport]);

  useEffect(() => {
    if (lastBuiltCell) {
      centerViewport(lastBuiltCell.x, lastBuiltCell.y);
    }
  }, [lastBuiltCell, centerViewport]);

  const handleCellClick = async (x: number, y: number) => {
    if (!gridData || !user) return;

    const cell = gridData[y][x];
    if (!cell.canBuild || cell.type !== 'empty') return;

    let newGrid = gridData.map(row => row.map(c => ({ ...c })));
    newGrid[y][x].type = 'foundation';
    newGrid[y][x].canBuild = false;
    newGrid = updateCanBuild(newGrid);
    setGridData(newGrid);
    setLastBuiltCell({ x, y });

    const newConstruction = { player_id: user.id, x, y, type: 'foundation' };
    const { error } = await supabase.from('base_constructions').insert(newConstruction);

    if (error) {
      showError("Erreur lors de la construction.");
      console.error(error);
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
      case 'campfire': return "bg-orange-400/20 border-orange-400/30";
      case 'foundation': return "bg-white/20 border-white/30";
      case 'empty':
        if (cell.canBuild) return "bg-white/10 border-white/20 hover:bg-white/20 cursor-pointer border-dashed";
        return "bg-black/20 border-white/10";
      default: return "bg-black/20 border-white/10";
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Chargement de la base...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={viewportRef}
        className="w-full h-full overflow-auto no-scrollbar"
        style={{ opacity: gridData ? 1 : 0, transition: 'opacity 0.5s' }}
      >
        <div
          className="relative"
          style={{
            width: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
            height: GRID_SIZE * (CELL_SIZE_PX + CELL_GAP),
          }}
        >
          {gridData?.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                className={cn(
                  "absolute flex items-center justify-center text-2xl font-bold rounded-lg border transition-colors",
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
      <Button
        onClick={() => {
          if (campfirePosition) {
            centerViewport(campfirePosition.x, campfirePosition.y);
          } else {
            showError("Impossible de localiser le centre de la base.");
          }
        }}
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 z-10 rounded-full shadow-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white"
      >
        <LocateFixed className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default BaseInterface;