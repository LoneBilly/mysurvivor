import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { Plus, Loader2, LocateFixed, Zap, Clock, Hammer, Trash2, Box, BrickWall, TowerControl, AlertTriangle, CookingPot, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showInfo } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { BaseConstruction, ConstructionJob, CraftingJob } from "@/types/game";
import FoundationMenuModal from "./FoundationMenuModal";
import ChestModal from "./ChestModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/contexts/GameContext";
import CountdownTimer from "./CountdownTimer";
import CraftingProgressBar from "./CraftingProgressBar";

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
  foundation: Plus,
  campfire: () => <>🔥</>,
};

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string;
  build_time_seconds: number;
  cost_energy: number;
  cost_wood: number;
  cost_metal: number;
  cost_components: number;
}

interface BaseInterfaceProps {
  isActive: boolean;
  onInspectWorkbench: (construction: BaseConstruction) => void;
  onDemolishBuilding: (construction: BaseConstruction) => void;
}

const BaseInterface = ({ isActive, onInspectWorkbench, onDemolishBuilding }: BaseInterfaceProps) => {
  const { user } = useAuth();
  const { playerData, setPlayerData, refreshPlayerData, items, addConstructionJob } = useGame();
  const { baseConstructions: initialConstructions, constructionJobs: initialConstructionJobs = [], craftingJobs } = playerData;
  
  const isMobile = useIsMobile();
  const [gridData, setGridData] = useState<BaseCell[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasCentered = useRef(false);
  const [campfirePosition, setCampfirePosition] = useState<{ x: number; y: number } | null>(null);
  const [foundationMenu, setFoundationMenu] = useState<{isOpen: boolean, x: number, y: number} | null>(null);
  const [chestModalState, setChestModalState] = useState<{ isOpen: boolean; construction: BaseConstruction | null }>({ isOpen: false, construction: null });
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);
  const [craftingProgress, setCraftingProgress] = useState<Record<number, number>>({});

  const isJobRunning = useMemo(() => {
    if (!gridData) return initialConstructionJobs.length > 0;
    return gridData.some(row => row.some(cell => cell.type === 'in_progress'));
  }, [gridData, initialConstructionJobs]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerData?.craftingJobs) {
        setCraftingProgress({});
        return;
      }
      const newProgress: Record<number, number> = {};
      playerData.craftingJobs.forEach(job => {
        if (!job.craft_time_seconds) {
          newProgress[job.workbench_id] = 0;
          return;
        }

        const totalBatchDuration = job.initial_quantity * job.craft_time_seconds * 1000;
        if (totalBatchDuration <= 0) {
          newProgress[job.workbench_id] = 100;
          return;
        }
        
        const itemsCompleted = job.initial_quantity - job.quantity;
        const timeElapsedForCompletedItems = itemsCompleted * job.craft_time_seconds * 1000;
        
        const currentItemEndTime = new Date(job.ends_at).getTime();
        const currentItemDuration = job.craft_time_seconds * 1000;
        const currentItemStartTime = currentItemEndTime - currentItemDuration;
        
        const timeElapsedForCurrentItem = Math.max(0, Date.now() - currentItemStartTime);
        
        const totalTimeElapsed = timeElapsedForCompletedItems + timeElapsedForCurrentItem;
        
        newProgress[job.workbench_id] = Math.min(100, (totalTimeElapsed / totalBatchDuration) * 100);
      });
      setCraftingProgress(newProgress);
    }, 200);

    return () => clearInterval(interval);
  }, [playerData?.craftingJobs]);

  const isDraggingRef = useRef(false);
  const panState = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const totalResources = useMemo(() => {
    const inventoryWood = playerData.inventory.find(i => i.items?.name === 'Bois')?.quantity || 0;
    const inventoryMetal = playerData.inventory.find(i => i.items?.name === 'Pierre')?.quantity || 0;
    const inventoryComponents = playerData.inventory.find(i => i.items?.name === 'Composants')?.quantity || 0;
    
    return {
      energie: playerData.playerState.energie,
      wood: playerData.playerState.wood + inventoryWood,
      metal: playerData.playerState.metal + inventoryMetal,
      components: playerData.playerState.components + inventoryComponents,
    };
  }, [playerData.playerState, playerData.inventory]);

  const updateCanBuild = (grid: BaseCell[][]): BaseCell[][] => {
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, canBuild: false })));
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (newGrid[y][x].type !== 'empty' && newGrid[y][x].type !== 'in_progress') {
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
    
    let currentConstructions = [...constructions];
    const campfire = currentConstructions.find(c => c.type === 'campfire');
    const isCampfireInvalid = !campfire || campfire.x >= GRID_SIZE || campfire.y >= GRID_SIZE;

    if (isCampfireInvalid && currentConstructions.length > 0) {
      await supabase.from('base_constructions').delete().eq('player_id', user.id);
      currentConstructions = [];
    }

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
      
      await refreshPlayerData();
      return;
    }

    let newGrid: BaseCell[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'empty', canBuild: false, showTrash: false }))
    );

    let campPos: { x: number; y: number } | null = null;

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

    const finalGrid = updateCanBuild(newGrid);
    setGridData(finalGrid);
    setCampfirePosition(campPos);
    setLoading(false);
  }, [user, refreshPlayerData]);

  useEffect(() => {
    if (initialConstructions) {
      initializeGrid(initialConstructions, initialConstructionJobs);
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

  useEffect(() => {
    if (!isActive) {
      hasCentered.current = false;
    }
  }, [isActive]);

  useLayoutEffect(() => {
    if (isActive && !loading && gridData && campfirePosition && viewportRef.current && !hasCentered.current) {
      centerViewport(campfirePosition.x, campfirePosition.y, false);
      hasCentered.current = true;
    }
  }, [isActive, loading, gridData, campfirePosition, centerViewport]);

  const handleCancelConstruction = async (x: number, y: number) => {
    if (!gridData || !user) return;
    const originalGridData = JSON.parse(JSON.stringify(gridData));
    const originalJobs = [...(playerData.constructionJobs || [])];

    const newGrid = JSON.parse(JSON.stringify(gridData));
    newGrid[y][x].type = 'empty';
    newGrid[y][x].ends_at = undefined;
    newGrid[y][x].showTrash = false;
    setGridData(updateCanBuild(newGrid));

    setPlayerData(prev => ({
        ...prev,
        constructionJobs: prev.constructionJobs?.filter(job => !(job.x === x && job.y === y))
    }));

    const { error } = await supabase.rpc('cancel_construction_job', { p_x: x, p_y: y });

    if (error) {
        showError(error.message || "Erreur lors de l'annulation.");
        setGridData(originalGridData);
        setPlayerData(prev => ({ ...prev, constructionJobs: originalJobs }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !viewportRef.current) return;
    
    isDraggingRef.current = false;
    
    panState.current = {
      isPanning: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
    
    viewportRef.current.style.cursor = 'grabbing';
    viewportRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panState.current?.isPanning || !viewportRef.current) return;
    
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDraggingRef.current = true;
    }
    
    if (isDraggingRef.current) {
      e.preventDefault();
      viewportRef.current.scrollLeft = panState.current.scrollLeft - dx;
      viewportRef.current.scrollTop = panState.current.scrollTop - dy;
    }
  };

  const handleMouseUp = () => {
    if (viewportRef.current) {
      viewportRef.current.style.cursor = 'grab';
      viewportRef.current.style.userSelect = 'auto';
    }
    panState.current = null;
  };

  const handleCellClick = async (x: number, y: number) => {
    if (isDraggingRef.current) {
        return;
    }
    if (!gridData || !user) return;

    const cell = gridData[y][x];

    if (isJobRunning) {
        if (cell.type === 'in_progress') {
            if (isMobile) {
                if (cell.showTrash) {
                    handleCancelConstruction(x, y);
                } else {
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
            } else {
                handleCancelConstruction(x, y);
            }
            return;
        } else if (cell.type === 'chest' || cell.type === 'workbench' || cell.type === 'furnace') {
            if (cell.type === 'chest') {
                const constructionData = initialConstructions.find(c => c.x === x && c.y === y);
                if (constructionData) {
                    setChestModalState({ isOpen: true, construction: constructionData });
                }
            } else if (cell.type === 'workbench') {
                const constructionData = initialConstructions.find(c => c.x === x && c.y === y);
                if (constructionData) {
                    onInspectWorkbench(constructionData);
                }
            } else {
                showError(`L'interaction avec le bâtiment '${cell.type}' n'est pas encore disponible.`);
            }
        } else {
            showInfo("Une construction est déjà en cours.");
        }
        return;
    }
    
    if (cell.type === 'foundation') {
        setFoundationMenu({ isOpen: true, x, y });
        return;
    }

    if (cell.type === 'chest') {
        const constructionData = initialConstructions.find(c => c.x === x && c.y === y);
        if (constructionData) {
            setChestModalState({ isOpen: true, construction: constructionData });
        }
        return;
    }

    if (cell.type === 'workbench') {
        const constructionData = initialConstructions.find(c => c.x === x && c.y === y);
        if (constructionData) {
            onInspectWorkbench(constructionData);
        }
        return;
    }

    if (Object.keys(buildingIcons).includes(cell.type) && cell.type !== 'foundation' && cell.type !== 'campfire') {
        showError(`L'interaction avec le bâtiment '${cell.type}' n'est pas encore disponible.`);
        return;
    }

    if (!cell.canBuild || cell.type !== 'empty') return;

    const energyCost = 90;
    if (playerData.playerState.energie < energyCost) {
        showError("Énergie insuffisante.");
        return;
    }

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    const newPlayerData = JSON.parse(JSON.stringify(playerData));
    newPlayerData.playerState.energie -= energyCost;
    setPlayerData(newPlayerData);

    const { data, error } = await supabase.rpc('start_foundation_construction', { p_x: x, p_y: y });

    if (error) {
        showError(error.message || "Erreur lors de la construction.");
        setPlayerData(originalPlayerData);
    } else {
        if (data && data.length > 0) {
            addConstructionJob(data[0]);
        } else {
            refreshPlayerData(true);
        }
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
      refreshPlayerData();
    }
  };

  const handleBuildOnFoundation = async (x: number, y: number, building: BuildingDefinition) => {
    if (playerData.playerState.energie < building.cost_energy || totalResources.wood < building.cost_wood || totalResources.metal < building.cost_metal || totalResources.components < building.cost_components) {
      showError("Ressources insuffisantes.");
      return;
    }

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));

    const newPlayerData = JSON.parse(JSON.stringify(playerData));
    newPlayerData.playerState.energie -= building.cost_energy;
    setPlayerData(newPlayerData);

    const { data, error } = await supabase.rpc('start_building_on_foundation', { p_x: x, p_y: y, p_building_type: building.type });

    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      if (data && data.length > 0) {
        addConstructionJob(data[0]);
        refreshPlayerData(true); // Refresh resources
      } else {
        refreshPlayerData(true);
      }
    }
  };

  const getCellStyle = (cell: BaseCell) => {
    switch (cell.type) {
      case 'campfire': return "bg-orange-400/20 border-orange-400/30";
      case 'foundation':
        if (isJobRunning) {
          return "bg-white/20 border-white/30 cursor-not-allowed opacity-60";
        }
        return "bg-white/20 border-white/30 hover:bg-white/25 cursor-pointer";
      case 'in_progress': return "bg-yellow-500/20 border-yellow-500/30 animate-pulse cursor-pointer hover:border-red-500/50";
      case 'chest': return "bg-gray-600/20 border-amber-700 hover:bg-gray-600/30 cursor-pointer";
      case 'wall': return "bg-gray-600/20 border-orange-500 hover:bg-gray-600/30 cursor-pointer";
      case 'turret': return "bg-gray-600/20 border-blue-500 hover:bg-gray-600/30 cursor-pointer";
      case 'generator': return "bg-gray-600/20 border-yellow-400 hover:bg-gray-600/30 cursor-pointer";
      case 'trap': return "bg-gray-600/20 border-red-500 hover:bg-gray-600/30 cursor-pointer";
      case 'workbench': {
        const construction = initialConstructions.find(c => c.x === cell.x && c.y === cell.y);
        const isCrafting = construction && playerData.craftingJobs?.some(job => job.workbench_id === construction.id);
        const hasOutput = construction && construction.output_item_id;
        if (isCrafting) return "bg-yellow-600/20 border-yellow-500 hover:bg-yellow-600/30 cursor-pointer";
        if (hasOutput) return "bg-green-600/20 border-green-500 hover:bg-green-600/30 cursor-pointer animate-pulse";
        return "bg-gray-600/20 border-amber-700 hover:bg-gray-600/30 cursor-pointer";
      }
      case 'furnace': return "bg-gray-600/20 border-gray-300 hover:bg-gray-600/30 cursor-pointer";
      case 'empty':
        if (cell.canBuild) {
          const baseStyle = "bg-white/5 border-white/10 border-dashed";
          if (isJobRunning) {
            return `${baseStyle} cursor-not-allowed`;
          }
          return `${baseStyle} hover:bg-white/10 cursor-pointer`;
        }
        return "bg-black/20 border-white/10";
      default: return "bg-gray-600/20 border-gray-500/30 cursor-pointer hover:bg-gray-600/30";
    }
  };

  const getCellContent = (cell: BaseCell) => {
    const construction = initialConstructions.find(c => c.x === cell.x && c.y === cell.y);
    
    if (cell.type === 'workbench') {
      const job = construction ? playerData.craftingJobs?.find(j => j.workbench_id === construction.id) : undefined;
      const hasOutput = construction && construction.output_item_id;
      const Icon = buildingIcons.workbench;

      if (job) {
        return (
          <>
            <Icon className="w-8 h-8 text-yellow-400" />
            <CraftingProgressBar progress={craftingProgress[job.workbench_id] || 0} />
          </>
        );
      }
      if (hasOutput) {
        return <Icon className="w-8 h-8 text-green-400" />;
      }
    }

    if (cell.type === 'in_progress' && cell.ends_at) {
      if (isMobile) {
        if (cell.showTrash) {
          return <X className="w-8 h-8 text-red-500" />;
        }
        return (
          <div className="flex flex-col items-center justify-center text-white gap-1 h-full">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-mono">
              <CountdownTimer endTime={cell.ends_at} onComplete={refreshPlayerData} />
            </span>
          </div>
        );
      } else {
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-1 h-full transition-opacity duration-150 group-hover:opacity-0">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-mono">
                <CountdownTimer endTime={cell.ends_at} onComplete={refreshPlayerData} />
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <X className="w-8 h-8 text-red-500" />
            </div>
          </div>
        );
      }
    }
    if (cell.canBuild) {
      if (isJobRunning) {
        return (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
        );
      }
      return (
        <div className="relative w-full h-full flex items-center justify-center group">
          <Plus className="w-8 h-8 text-gray-500 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
          <div className="absolute bottom-1 right-1 flex items-center gap-1 text-xs font-mono">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-white">90</span>
          </div>
        </div>
      );
    }

    const Icon = buildingIcons[cell.type];
    if (Icon) {
      if (cell.type === 'foundation' && isJobRunning) {
        return (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
        );
      }
      return <Icon className="w-6 h-6 text-gray-300" />;
    }

    return "";
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
        className="w-full h-full overflow-auto no-scrollbar cursor-grab"
        style={{ opacity: gridData ? 1 : 0, transition: 'opacity 0.5s' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                onMouseEnter={() => !isMobile && cell.type === 'in_progress' && setHoveredConstruction({x, y})}
                onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                className={cn(
                  "group absolute flex items-center justify-center text-2xl font-bold rounded-lg border transition-colors",
                  getCellStyle(cell)
                )}
                style={{
                  left: x * (CELL_SIZE_PX + CELL_GAP),
                  top: y * (CELL_SIZE_PX + CELL_GAP),
                  width: CELL_SIZE_PX,
                  height: CELL_SIZE_PX,
                }}
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
        playerResources={totalResources}
        items={items}
      />
      <ChestModal
        isOpen={chestModalState.isOpen}
        onClose={() => setChestModalState({ isOpen: false, construction: null })}
        construction={chestModalState.construction}
        onDemolish={onDemolishBuilding}
        onUpdate={refreshPlayerData}
      />
    </div>
  );
};

export default BaseInterface;