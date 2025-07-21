import { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { BaseConstruction, ConstructionJob } from '@/types/game';
import { Button } from './ui/button';
import { PlusCircle, X, Hammer, ArrowUp, Bed, Briefcase, Trash2, Warehouse, Shield, FlaskConical, GitBranch } from 'lucide-react';
import ConstructionModal from './ConstructionModal';
import DemolishModal from './DemolishModal';
import UpgradeModal from './UpgradeModal';
import BedModal from './BedModal';
import ChestModal from './ChestModal';
import WorkbenchModal from './WorkbenchModal';
import CountdownTimer from './CountdownTimer';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const buildingIcons: { [key: string]: React.ElementType } = {
  foundation: GitBranch,
  bed: Bed,
  chest: Briefcase,
  wall: Shield,
  workbench: FlaskConical,
  storage: Warehouse,
  in_progress: Hammer,
};

const BaseInterface = () => {
  const { playerData, refreshPlayerData } = useGame();
  const [isConstructionModalOpen, setConstructionModalOpen] = useState(false);
  const [isDemolishModalOpen, setDemolishModalOpen] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [isBedModalOpen, setBedModalOpen] = useState(false);
  const [isChestModalOpen, setChestModalOpen] = useState(false);
  const [isWorkbenchModalOpen, setWorkbenchModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedConstruction, setSelectedConstruction] = useState<BaseConstruction | null>(null);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const gridSize = 10;

  const { grid, constructionJobsMap } = useMemo(() => {
    const newGrid: ({ type: string | null; construction: BaseConstruction | null; job_ends_at?: string })[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null).map(() => ({ type: null, construction: null })));
    
    playerData.baseConstructions.forEach(c => {
      if (c.x < gridSize && c.y < gridSize) {
        newGrid[c.y][c.x] = { type: c.type, construction: c, job_ends_at: undefined };
      }
    });

    const jobsMap = new Map<string, ConstructionJob>();
    playerData.constructionJobs.forEach(job => {
      if (job.x < gridSize && job.y < gridSize) {
        const key = `${job.x}-${job.y}`;
        jobsMap.set(key, job);
        newGrid[job.y][job.x] = { type: 'in_progress', construction: null, job_ends_at: job.ends_at };
      }
    });

    return { grid: newGrid, constructionJobsMap: jobsMap };
  }, [playerData.baseConstructions, playerData.constructionJobs]);

  const handleCellClick = (x: number, y: number) => {
    const cell = grid[y][x];
    setSelectedCell({ x, y });

    if (cell.construction) {
      setSelectedConstruction(cell.construction);
      switch (cell.type) {
        case 'bed': setBedModalOpen(true); break;
        case 'chest': setChestModalOpen(true); break;
        case 'workbench': setWorkbenchModalOpen(true); break;
        default: setUpgradeModalOpen(true); break;
      }
    } else if (cell.type === null) {
      setConstructionModalOpen(true);
    }
  };

  const getAdjacentFoundations = (x: number, y: number) => {
    const adjacent = [];
    if (x > 0) adjacent.push(grid[y][x - 1]);
    if (x < gridSize - 1) adjacent.push(grid[y][x + 1]);
    if (y > 0) adjacent.push(grid[y - 1][x]);
    if (y < gridSize - 1) adjacent.push(grid[y + 1][x]);
    return adjacent.some(cell => cell && cell.type !== null);
  };

  const handleConstructionComplete = () => {
    setTimeout(() => {
      refreshPlayerData();
    }, 500);
  };

  return (
    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Ma Base</h2>
      <div className="grid grid-cols-10 gap-1">
        {grid.map((row, y) => (
          row.map((cell, x) => {
            const job = constructionJobsMap.get(`${x}-${y}`);
            const Icon = cell.type ? buildingIcons[cell.type] : PlusCircle;
            const canBuild = cell.type === null && getAdjacentFoundations(x, y);

            const content = (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                onMouseEnter={() => !isMobile && cell.type === 'in_progress' && setHoveredConstruction({x, y})}
                onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                disabled={cell.type === null && !canBuild}
                className={`relative aspect-square w-full rounded-md flex items-center justify-center transition-all duration-200
                  ${cell.type ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800/50'}
                  ${cell.type === 'in_progress' ? 'animate-pulse' : ''}
                  ${canBuild ? 'hover:bg-green-900/50' : ''}
                  ${cell.type === null && !canBuild ? 'opacity-30 cursor-not-allowed' : ''}
                `}
              >
                <Icon className={`
                  ${cell.type ? 'text-white' : 'text-slate-500'}
                  ${canBuild && cell.type === null ? 'text-green-500' : ''}
                  w-1/2 h-1/2
                `} />
                {cell.construction && cell.construction.level > 1 && (
                  <span className="absolute top-0 right-1 text-xs font-bold text-yellow-400">{cell.construction.level}</span>
                )}
                {job && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <CountdownTimer
                      endTime={job.ends_at}
                      onComplete={handleConstructionComplete}
                    />
                  </div>
                )}
              </button>
            );

            if (isMobile || !cell.construction) {
              return content;
            }

            return (
              <TooltipProvider key={`${x}-${y}`} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent className="bg-slate-800 text-white border-slate-700">
                    <p className="font-bold">{cell.construction.type} (Niv. {cell.construction.level})</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedConstruction(cell.construction); setUpgradeModalOpen(true); }}>
                        <ArrowUp className="w-4 h-4 mr-1" /> Améliorer
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSelectedConstruction(cell.construction); setDemolishModalOpen(true); }}>
                        <Trash2 className="w-4 h-4 mr-1" /> Démolir
                      </Button>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })
        ))}
      </div>

      {selectedCell && (
        <ConstructionModal
          isOpen={isConstructionModalOpen}
          onClose={() => setConstructionModalOpen(false)}
          x={selectedCell.x}
          y={selectedCell.y}
        />
      )}
      {selectedConstruction && (
        <>
          <DemolishModal
            isOpen={isDemolishModalOpen}
            onClose={() => setDemolishModalOpen(false)}
            construction={selectedConstruction}
          />
          <UpgradeModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setUpgradeModalOpen(false)}
            construction={selectedConstruction}
          />
          <BedModal
            isOpen={isBedModalOpen}
            onClose={() => setBedModalOpen(false)}
            construction={selectedConstruction}
          />
          <ChestModal
            isOpen={isChestModalOpen}
            onClose={() => setChestModalOpen(false)}
            construction={selectedConstruction}
          />
           <WorkbenchModal
            isOpen={isWorkbenchModalOpen}
            onClose={() => setWorkbenchModalOpen(false)}
            construction={selectedConstruction}
          />
        </>
      )}
    </div>
  );
};

export default BaseInterface;