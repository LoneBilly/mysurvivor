import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Plus, Loader2, LocateFixed, Zap, Clock, Hammer, Trash2, Box, BrickWall, TowerControl, AlertTriangle, CookingPot } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { BaseConstruction, ConstructionJob } from "@/types/game";
import FoundationMenuModal from "./FoundationMenuModal";

interface BaseCell {
  x: number;
  y: number;
  type: string;
  canBuild?: boolean;
  ends_at?: string;
  showTrash?: boolean;
}

const GRID_SIZE = 31;
const CELL_SIZE_PX = 60;
const CELL_GAP = 4;

const buildingIcons: { [key: string]: React.ElementType } = {
  chest: Box,
  wall: BrickWall,
  turret: TowerControl,
  generator: Zap,
  trap: AlertTriangle,
  workbench: Hammer,
  furnace: CookingPot,
  foundation: Hammer,
  campfire: () => <>🔥</>,
};

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
  const [foundationMenu, setFoundationMenu] = useState<{isOpen: boolean, x: number, y: number} | null>(null);

  const hasActiveJob = initialConstructionJobs.length > 0;

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
      Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'empty', canBuild: false, showTrash: false }))
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
          newGrid[c.y][c.x].type = c.type;
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
      setBuildTime(9 * foundationCount + 15);
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
    
    if (cell.type === 'in_progress' && cell.ends_at) {
      if (cell.showTrash) {
        // Second click: cancel construction
        const originalGridData = gridData;
        const newGrid = JSON.parse(JSON.stringify(gridData));
        newGrid[y][x].type = 'empty';
        newGrid[y][x].ends_at = undefined;
        newGrid[y][x].showTrash = false;
        setGridData(updateCanBuild(newGrid));

        const { error } = await supabase.rpc('cancel_foundation_construction', { p_x: x, p_y: y });

        if (error) {
          showError(error.message || "Erreur lors de l'annulation.");
          setGridData(originalGridData);
        } else {
          showSuccess("Construction annulée.");
          onUpdate();
        }
      } else {
        // First click: show trash icon
        const newGrid = JSON.parse(JSON.stringify(gridData));
        newGrid[y][x].showTrash = true;
        setGridData(newGrid);
        setTimeout(() => {
          setGridData(currentGrid => {
            if (currentGrid && currentGrid[y][x].showTrash) {
              const finalGrid = JSON.parse(JSON.stringify(currentGrid));
              finalGrid[y][x].showTrash = false;
              return finalGrid;
            }
            return currentGrid;
          });
        }, 2000);
      }
      return;
    }
    
    if (cell.type === 'foundation' && !hasActiveJob) {
      setFoundationMenu({ isOpen: true, x, y });
      return;
    }

    if (!cell.canBuild || cell.type !== 'empty' || hasActiveJob) return;

    const originalGridData = gridData;
    const newGrid = JSON.parse(JSON.stringify(gridData));
    newGrid[y][x].type = 'in_progress';
    newGrid[y][x].ends_at = new Date(Date.now() + buildTime * 1000).toISOString();
    setGridData(updateCanBuild(newGrid));

    const { error } = await supabase.rpc('start_foundation_construction', { p_x: x, p_y: y });

    if (error) {
      showError(error.message || "Erreur lors de la construction.");
      setGridData(originalGridData);
    } else {
      showSuccess("Construction de la fondation démarrée !");
      onUpdate();
    }
  };

  const handleDemolishFoundation = async (x: number, y: number) => {
    const originalGridData = gridData;
    const newGrid = JSON.parse(JSON.stringify(gridData));
    newGrid[y][x].type = 'empty';
    setGridData(updateCanBuild(newGrid));

    const { error } = await supabase.rpc('demolish_foundation', { p_x: x, p_y: y });

    if (error) {
      showError(error.message);
      setGridData(originalGridData);
    } else {
      showSuccess("Fondation démolie.");
      onUpdate();
    }
  };

  const handleBuildOnFoundation = async (x: number, y: number, buildingType: string) => {
    const originalGridData = gridData;
    const newGrid = JSON.parse(JSON.stringify(gridData));
    newGrid[y][x].type = 'in_progress';
    newGrid[y][x].ends_at = new Date(Date.now() + 60 * 1000).toISOString();
    setGridData(updateCanBuild(newGrid));

    const { error } = await supabase.rpc('start_building_on_foundation', { p_x: x, p_y: y, p_building_type: buildingType });

    if (error) {
      showError(error.message);
      setGridData(originalGridData);
    } else {
      showSuccess("Construction démarrée !");
      onUpdate();
    }
  };

  const getCellContent = (cell: BaseCell) => {
    const Icon = buildingIcons[cell.type];
    if (Icon) return <Icon className="w-6 h-6 text-gray-300" />;

    if (cell.type === 'in_progress' && cell.ends_at) {
      if (cell.showTrash) {
        return <Trash2 className="w-8 h-8 text-red-500" />;
      }
      return (
        <div className="flex flex-col items-center justify-center text-white gap-1">
          <Loader2 className="w-5 h-5 animate-spin" />
          <Countdown endsAt={cell.ends_at} onComplete={onUpdate} />
        </div>
      );
    }
    if (cell.canBuild) {
      if (hasActiveJob) {
        return <Clock className="w-8 h-8 text-gray-600" />;
      }
      return (
        <div className="relative w-full h-full flex items-center justify-center group">
          <Plus className="w-8 h-8 text-gray-500 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
          <div className="absolute bottom-1 flex items-center gap-1 text-xs font-mono bg-black/50 px-1 rounded">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-white">90</span>
          </div>
        </div>
      );
    }
    return "";
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-400/20 border-orange-400/30";
      case 'foundation': return "bg-white/20 border-white/30 hover:bg-white/25 cursor-pointer";
      case 'in_progress': return "bg-yellow-500/20 border-yellow-500/30 animate-pulse cursor-pointer hover:border-red-500/50";
      case 'empty':
        if (cell.canBuild) {
          if (hasActiveJob) {
            return "bg-black/20 border-white/10 cursor-not-allowed";
          }
          return "bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer border-dashed";
        }
        return "bg-black/20 border-white/10";
      default: return "bg-gray-600/20 border-gray-500/30"; // Pour les autres types de bâtiments
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
                disabled={(!cell.canBuild && cell.type !== 'foundation' && cell.type !== 'in_progress') || (cell.canBuild && hasActiveJob) || (cell.type === 'foundation' && hasActiveJob)}
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
      <FoundationMenuModal
        isOpen={foundationMenu?.isOpen || false}
        onClose={() => setFoundationMenu(null)}
        x={foundationMenu?.x ?? null}
        y={foundationMenu?.y ?? null}
        onBuild={handleBuildOnFoundation}
        onDemolish={handleDemolishFoundation}
      />
    </div>
  );
};

export default BaseInterface;