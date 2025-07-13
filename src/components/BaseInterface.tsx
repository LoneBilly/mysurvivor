import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Plus, Loader2, LocateFixed, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { BaseConstruction, ConstructionJob } from "@/types/game";

interface BaseCell {
  x: number;
  y: number;
  type: 'campfire' | 'foundation' | 'empty' | 'in_progress';
  canBuild?: boolean;
  ends_at?: string;
}

const GRID_SIZE = 31;
const CELL_SIZE_PX = 60;
const CELL_GAP = 4;

const Countdown = ({ endsAt, onComplete }: { endsAt: string; onComplete: () => void }) => {
  const calculateRemaining = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) {
      return { totalSeconds: 0, formatted: 'Terminé' };
    }
    
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return { totalSeconds, formatted: `${days}j` };
    if (hours > 0) return { totalSeconds, formatted: `${hours}h ${minutes}m` };
    if (minutes > 0) return { totalSeconds, formatted: `${minutes}m ${seconds}s` };
    return { totalSeconds, formatted: `${seconds}s` };
  }, [endsAt]);

  const [remaining, setRemaining] = useState(calculateRemaining());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (remaining.totalSeconds <= 0) {
      setTimeout(() => onCompleteRef.current(), 1000);
      return;
    }
    const timer = setInterval(() => {
      setRemaining(calculateRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining.totalSeconds, calculateRemaining]);

  return <span className="text-xs font-mono">{remaining.formatted}</span>;
};

interface BaseInterfaceProps {
  isActive: boolean;
  initialConstructions: BaseConstruction[];
  initialConstructionJobs: ConstructionJob[];
  onUpdate: () => Promise<void>;
}

const BaseInterface = ({ isActive, initialConstructions, initialConstructionJobs, onUpdate }: BaseInterfaceProps) => {
  const { user } = useAuth();
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasCentered = useRef(false);
  const [campfirePosition, setCampfirePosition] = useState<{ x: number; y: number } | null>(null);
  const [buildTime, setBuildTime] = useState(0);

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

  const initializeGrid = useCallback(async (constructions: BaseConstruction[], jobs: ConstructionJob[]) => {
    if (!user) return;
    setLoading(true);
    hasCentered.current = false;

    let currentConstructions = [...constructions];
    const campfire = currentConstructions.find(c => c.type === 'campfire');
    const isCampfireInvalid = !campfire || campfire.x >= GRID_SIZE || campfire.y >= GRID_SIZE;

    if (isCampfireInvalid && currentConstructions.length > 0) {
      await supabase.from('base_constructions').delete().eq('player_id', user.id);
      currentConstructions = [];
    }

    let newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'empty', canBuild: false }))
    );

    let campPos: { x: number; y: number } | null = null;

    if (currentConstructions.length === 0 && jobs.length === 0) {
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
      currentConstructions.forEach((c: BaseConstruction) => {
        if (newGrid[c.y]?.[c.x]) {
          newGrid[c.y][c.x].type = c.type as 'campfire' | 'foundation';
          if (c.type === 'campfire') {
            campPos = { x: c.x, y: c.y };
          }
        }
      });
      jobs.forEach((job: ConstructionJob) => {
        if (newGrid[job.y]?.[job.x]) {
          newGrid[job.y][job.x].type = 'in_progress';
          newGrid[job.y][job.x].ends_at = job.ends_at;
        }
      });
    }

    const finalGrid = updateCanBuild(newGrid);
    setGridData(finalGrid);
    setCampfirePosition(campPos);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (initialConstructions) {
      initializeGrid(initialConstructions, initialConstructionJobs);
      const foundationCount = initialConstructions.filter(c => c.type === 'foundation').length;
      if (foundationCount === 0) {
        setBuildTime(15);
      } else {
        setBuildTime(2 * (foundationCount ** 2) + 3 * foundationCount + 10);
      }
    }
  }, [initialConstructions, initialConstructionJobs, initializeGrid]);

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
    if (isActive && !loading && gridData && campfirePosition && viewportRef.current && !hasCentered.current) {
      centerViewport(campfirePosition.x, campfirePosition.y, false);
      hasCentered.current = true;
    }
  }, [isActive, loading, gridData, campfirePosition, centerViewport]);

  const handleCellClick = async (x: number, y: number) => {
    if (!gridData || !user) return;

    const cell = gridData[y][x];
    if (!cell.canBuild || cell.type !== 'empty') return;

    const { error } = await supabase.rpc('start_foundation_construction', { p_x: x, p_y: y });

    if (error) {
      showError(error.message || "Erreur lors de la construction.");
    } else {
      showSuccess("Construction de la fondation démarrée !");
      onUpdate();
    }
  };

  const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    if (totalSeconds < 3600) return `${Math.round(totalSeconds / 60)}m`;
    if (totalSeconds < 86400) return `${Math.round(totalSeconds / 3600)}h`;
    return `${Math.round(totalSeconds / 86400)}j`;
  };

  const getCellContent = (cell: BaseCell) => {
    if (cell.type === 'campfire') return "🔥";
    if (cell.type === 'foundation') return "";
    if (cell.type === 'in_progress' && cell.ends_at) {
      return (
        <div className="flex flex-col items-center justify-center text-white gap-1">
          <Loader2 className="w-5 h-5 animate-spin" />
          <Countdown endsAt={cell.ends_at} onComplete={onUpdate} />
        </div>
      );
    }
    if (cell.canBuild) {
      return (
        <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
          <Plus className="w-6 h-6" />
          <div className="flex items-center gap-1 text-xs font-mono">
            <Zap size={12} className="text-yellow-400" /> 5
          </div>
          <div className="flex items-center gap-1 text-xs font-mono">
            <Clock size={12} /> {formatDuration(buildTime)}
          </div>
        </div>
      );
    }
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-400/20 border-orange-400/30";
      case 'foundation': return "bg-white/20 border-white/30";
      case 'in_progress': return "bg-yellow-500/20 border-yellow-500/30 animate-pulse";
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