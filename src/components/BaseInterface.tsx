import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { BaseConstruction, BuildingDefinition, ConstructionJob } from '@/types/game';
import { cn } from '@/lib/utils';
import ItemIcon from './ItemIcon';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import BuildMenu from './BuildMenu';

const GRID_SIZE = 5;

interface BaseInterfaceProps {
  isActive: boolean;
  onInspectWorkbench: (construction: BaseConstruction) => void;
  onDemolishBuilding: (construction: BaseConstruction) => void;
}

const BaseInterface = ({ isActive, onInspectWorkbench, onDemolishBuilding }: BaseInterfaceProps) => {
  const { playerData, getIconUrl, buildingDefinitions, refreshPlayerData } = useGame();
  const [grid, setGrid] = useState<(any)[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number, y: number } | null>(null);
  const [isBuildMenuOpen, setIsBuildMenuOpen] = useState(false);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [craftingProgress, setCraftingProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    let animationFrameId: number;

    const updateProgress = () => {
      const now = Date.now();
      const newProgress: Record<number, number> = {};

      playerData.craftingJobs?.forEach(job => {
        const startTime = new Date(job.started_at).getTime();
        const endTime = new Date(job.ends_at).getTime();
        const totalDuration = endTime - startTime;

        if (totalDuration > 0) {
          const elapsedTime = now - startTime;
          const progress = Math.min(100, (elapsedTime / totalDuration) * 100);
          if (job.workbench_id) {
            newProgress[job.workbench_id] = progress;
          }
        }
      });

      setCraftingProgress(newProgress);
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playerData.craftingJobs, isActive]);

  useEffect(() => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill({ type: 'empty' }));
    
    playerData.baseConstructions.forEach(c => {
      if (c.x >= 0 && c.x < GRID_SIZE && c.y >= 0 && c.y < GRID_SIZE) {
        const buildingDef = buildingDefinitions.find(b => b.type === c.type);
        newGrid[c.y][c.x] = { type: c.type, construction: c, definition: buildingDef };
      }
    });

    playerData.constructionJobs?.forEach(job => {
      if (job.x >= 0 && job.x < GRID_SIZE && job.y >= 0 && job.y < GRID_SIZE) {
        const buildingDef = buildingDefinitions.find(b => b.type === job.type);
        newGrid[job.y][job.x] = { type: 'in_progress', job, definition: buildingDef };
      }
    });

    setGrid(newGrid);
  }, [playerData.baseConstructions, playerData.constructionJobs, buildingDefinitions]);

  const handleCellClick = (x: number, y: number) => {
    const cell = grid[y][x];
    setSelectedCell({ x, y });

    if (cell.type === 'empty') {
      const isAdjacent = (
        (x > 0 && grid[y][x-1].type !== 'empty' && grid[y][x-1].type !== 'in_progress') ||
        (x < GRID_SIZE - 1 && grid[y][x+1].type !== 'empty' && grid[y][x+1].type !== 'in_progress') ||
        (y > 0 && grid[y-1][x].type !== 'empty' && grid[y-1][x].type !== 'in_progress') ||
        (y < GRID_SIZE - 1 && grid[y+1][x].type !== 'empty' && grid[y+1][x].type !== 'in_progress')
      );
      if (isAdjacent) {
        setIsBuildMenuOpen(true);
      } else {
        showError("Vous devez construire à côté d'une structure existante.");
      }
    } else if (cell.type === 'workbench') {
      onInspectWorkbench(cell.construction);
    } else if (cell.type === 'foundation') {
      setIsBuildMenuOpen(true);
    }
  };

  const handleBuild = async (buildingType: string) => {
    if (!selectedCell) return;
    setIsBuildMenuOpen(false);
    
    const { x, y } = selectedCell;
    const cell = grid[y][x];
    
    let rpcCall = '';
    let params: any = {};

    if (cell.type === 'foundation') {
      rpcCall = 'start_building_on_foundation';
      params = { p_x: x, p_y: y, p_building_type: buildingType };
    } else if (cell.type === 'empty' && buildingType === 'foundation') {
      rpcCall = 'start_foundation_construction';
      params = { p_x: x, p_y: y };
    }

    if (rpcCall) {
      const { error } = await supabase.rpc(rpcCall, params);
      if (error) {
        showError(error.message);
      } else {
        refreshPlayerData();
      }
    }
    setSelectedCell(null);
  };

  const getJobTimeRemaining = (job: ConstructionJob) => {
    const endsAt = new Date(job.ends_at).getTime();
    const now = new Date().getTime();
    const diff = Math.round((endsAt - now) / 1000);
    if (diff <= 0) return "Terminé";
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (!isActive) return null;

  return (
    <>
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="grid grid-cols-5 gap-2">
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const isSelected = selectedCell?.x === x && selectedCell?.y === y;
              const isHovered = hoveredConstruction?.x === x && hoveredConstruction?.y === y;
              const progress = cell.construction ? craftingProgress[cell.construction.id] : undefined;

              return (
                <div key={`${x}-${y}`} className="relative w-16 h-16 md:w-20 md:h-20">
                  <button
                    onClick={() => handleCellClick(x, y)}
                    onMouseEnter={() => !isMobile && (cell.type === 'in_progress' || cell.construction) && setHoveredConstruction({x, y})}
                    onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                    className={cn(
                      "relative w-full h-full rounded-lg border-2 transition-all duration-200 flex items-center justify-center overflow-hidden",
                      {
                        'bg-slate-800/50 border-slate-700 hover:border-slate-500': cell.type === 'empty',
                        'bg-slate-700/60 border-slate-600 hover:border-slate-400': cell.type !== 'empty',
                        'border-sky-400 shadow-lg shadow-sky-500/30': isSelected,
                        'animate-pulse-green': cell.type === 'workbench' && cell.construction?.output_item_id,
                      }
                    )}
                  >
                    {cell.definition && (
                      <ItemIcon iconName={getIconUrl(cell.definition.icon)} alt={cell.definition.name} />
                    )}
                    {cell.type === 'in_progress' && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                    {progress !== undefined && progress < 100 && (
                      <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-gray-700/80 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full bg-green-400 transition-all duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </button>
                  {(isHovered || (isMobile && isSelected)) && cell.construction && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-slate-900 p-2 rounded-lg border border-slate-700 shadow-lg z-10 text-xs text-center">
                      <p className="font-bold">{cell.definition.name}</p>
                      <Button variant="destructive" size="xs" className="mt-2" onClick={() => onDemolishBuilding(cell.construction)}>
                        Démolir
                      </Button>
                    </div>
                  )}
                  {(isHovered || (isMobile && isSelected)) && cell.type === 'in_progress' && (
                     <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-slate-900 p-2 rounded-lg border border-slate-700 shadow-lg z-10 text-xs text-center">
                      <p className="font-bold">{cell.definition.name}</p>
                      <p>{getJobTimeRemaining(cell.job)}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <BuildMenu 
        isOpen={isBuildMenuOpen} 
        onClose={() => setIsBuildMenuOpen(false)} 
        onBuild={handleBuild}
        isFoundation={selectedCell ? grid[selectedCell.y][selectedCell.x].type === 'foundation' : false}
      />
    </>
  );
};

export default BaseInterface;