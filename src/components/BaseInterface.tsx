import { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Hammer, HelpCircle, Home, Plus, Trash2, X } from 'lucide-react';
import ItemIcon from './ItemIcon';
import CampfireModal from './CampfireModal';
import ChestModal from './ChestModal';
import WorkbenchModal from './WorkbenchModal';
import { BaseConstruction, ConstructionJob } from '@/types/game';
import DemolishModal from './DemolishModal';
import BuildModal from './BuildModal';
import UpgradeModal from './UpgradeModal';
import BedModal from './BedModal';
import { useMediaQuery } from 'react-responsive';

const GRID_SIZE = 5;

const BaseInterface = () => {
  const { playerData, getIconUrl, mapLayout, buildings, items, onUpdate } = useGame();
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [isCampfireModalOpen, setCampfireModalOpen] = useState(false);
  const [isChestModalOpen, setChestModalOpen] = useState(false);
  const [isWorkbenchModalOpen, setWorkbenchModalOpen] = useState(false);
  const [isDemolishModalOpen, setDemolishModalOpen] = useState(false);
  const [isBuildModalOpen, setBuildModalOpen] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [isBedModalOpen, setBedModalOpen] = useState(false);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);

  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const baseZone = useMemo(() => {
    if (!playerData.playerState.base_zone_id) return null;
    return mapLayout.find(z => z.id === playerData.playerState.base_zone_id);
  }, [playerData.playerState.base_zone_id, mapLayout]);

  const grid = useMemo(() => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill({ type: 'empty' }));
    playerData.baseConstructions.forEach(c => {
      if (c.x >= 0 && c.x < GRID_SIZE && c.y >= 0 && c.y < GRID_SIZE) {
        newGrid[c.y][c.x] = { type: c.type, construction: c };
      }
    });
    playerData.constructionJobs.forEach(job => {
      if (job.x >= 0 && job.x < GRID_SIZE && job.y >= 0 && job.y < GRID_SIZE) {
        newGrid[job.y][job.x] = { type: 'in_progress', job };
      }
    });
    return newGrid;
  }, [playerData.baseConstructions, playerData.constructionJobs]);

  const selectedConstruction = useMemo(() => {
    if (!selectedCell) return null;
    return playerData.baseConstructions.find(c => c.x === selectedCell.x && c.y === selectedCell.y) || null;
  }, [selectedCell, playerData.baseConstructions]);

  const handleCellClick = (x: number, y: number) => {
    setSelectedCell({ x, y });
    const construction = playerData.baseConstructions.find(c => c.x === x && c.y === y);
    if (construction) {
      switch (construction.type) {
        case 'campfire':
          setCampfireModalOpen(true);
          break;
        case 'chest':
          setChestModalOpen(true);
          break;
        case 'workbench':
          setWorkbenchModalOpen(true);
          break;
        case 'lit':
          setBedModalOpen(true);
          break;
        default:
          setUpgradeModalOpen(true);
          break;
      }
    } else {
      const job = playerData.constructionJobs.find(j => j.x === x && j.y === y);
      if (!job) {
        setBuildModalOpen(true);
      }
    }
  };

  const getBuildingData = (type: string) => {
    return buildings.find(b => b.building_type === type && b.level === 1);
  };

  const getConstructionJobAt = (x: number, y: number): ConstructionJob | undefined => {
    return playerData.constructionJobs.find(job => job.x === x && job.y === y);
  };

  const getConstructionAt = (x: number, y: number): BaseConstruction | undefined => {
    return playerData.baseConstructions.find(c => c.x === x && c.y === y);
  };

  const getBuildingLevelInfo = (type: string, level: number) => {
    return buildings.find(b => b.building_type === type && b.level === level);
  };

  const renderCellContent = (cell: any, x: number, y: number) => {
    if (cell.type === 'empty') {
      return <Plus className="w-8 h-8 text-slate-500" />;
    }
    if (cell.type === 'in_progress') {
      const job = cell.job as ConstructionJob;
      const buildingDef = getBuildingData(job.type);
      const endsAt = new Date(job.ends_at).getTime();
      const totalTime = endsAt - new Date(job.created_at).getTime();
      const remainingTime = endsAt - Date.now();
      const progress = totalTime > 0 ? ((totalTime - remainingTime) / totalTime) * 100 : 0;

      const isHovered = hoveredConstruction?.x === x && hoveredConstruction?.y === y;

      return (
        <>
          <ItemIcon iconName={getIconUrl(buildingDef?.stats?.icon as string)} alt={job.type} className="w-10 h-10" />
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Hammer className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-600">
            <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }}></div>
          </div>
          {isHovered && (
             <div className="absolute -top-2 -right-2 p-1 bg-red-600 rounded-full cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedCell({x, y}); setDemolishModalOpen(true); }}>
               <X className="w-4 h-4 text-white" />
             </div>
          )}
        </>
      );
    }
    const construction = cell.construction as BaseConstruction;
    const buildingLevelInfo = getBuildingLevelInfo(construction.type, construction.level);
    return (
      <>
        <ItemIcon iconName={getIconUrl(buildingLevelInfo?.stats?.icon as string)} alt={construction.type} className="w-10 h-10" />
        <span className="absolute top-1 left-1.5 text-xs font-bold text-white bg-slate-800/50 px-1 rounded" style={{ textShadow: '1px 1px 2px black' }}>
          {construction.level}
        </span>
      </>
    );
  };

  if (!baseZone) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Home className="w-16 h-16 text-slate-500 mb-4" />
        <h3 className="text-xl font-bold">Aucune base établie</h3>
        <p className="text-slate-400">Vous n'avez pas encore de base. Explorez le monde pour en trouver une.</p>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ItemIcon iconName={getIconUrl(baseZone.icon)} alt={baseZone.type || ''} className="w-8 h-8" />
          {baseZone.type}
        </h2>
        <Button variant="ghost" size="icon">
          <HelpCircle className="w-6 h-6 text-slate-400" />
        </Button>
      </div>

      <div className="flex-grow grid grid-cols-5 grid-rows-5 gap-2">
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const construction = getConstructionAt(x, y);
            const isCampfireCooked = construction?.type === 'campfire' && construction.cooking_slot?.status === 'cooked';
            
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                onMouseEnter={() => !isMobile && getConstructionJobAt(x, y) && setHoveredConstruction({x, y})}
                onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                className={cn(
                  "relative aspect-square flex items-center justify-center rounded-md transition-colors duration-300",
                  cell.type === 'empty' ? 'bg-slate-800/50 hover:bg-slate-700/50 border-2 border-dashed border-slate-700 hover:border-slate-500' : 'bg-slate-800 border border-slate-700',
                  isCampfireCooked && "bg-green-800/50 border-green-500 animate-pulse",
                  selectedCell?.x === x && selectedCell?.y === y && 'border-blue-500'
                )}
              >
                {renderCellContent(cell, x, y)}
              </button>
            )
          })
        )}
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="destructive" onClick={() => { setSelectedCell(null); setDemolishModalOpen(true); }}>
          <Trash2 className="w-4 h-4 mr-2" />
          Démolir
        </Button>
      </div>

      {isCampfireModalOpen && selectedConstruction && (
        <CampfireModal
          isOpen={isCampfireModalOpen}
          onClose={() => setCampfireModalOpen(false)}
          construction={selectedConstruction}
          onUpdate={onUpdate}
        />
      )}
      {isChestModalOpen && selectedConstruction && (
        <ChestModal
          isOpen={isChestModalOpen}
          onClose={() => setChestModalOpen(false)}
          construction={selectedConstruction}
        />
      )}
      {isWorkbenchModalOpen && selectedConstruction && (
        <WorkbenchModal
          isOpen={isWorkbenchModalOpen}
          onClose={() => setWorkbenchModalOpen(false)}
          construction={selectedConstruction}
        />
      )}
      {isBedModalOpen && selectedConstruction && (
        <BedModal
          isOpen={isBedModalOpen}
          onClose={() => setBedModalOpen(false)}
          construction={selectedConstruction}
        />
      )}
      {isDemolishModalOpen && (
        <DemolishModal
          isOpen={isDemolishModalOpen}
          onClose={() => setDemolishModalOpen(false)}
          selectedCell={selectedCell}
          onUpdate={onUpdate}
        />
      )}
      {isBuildModalOpen && selectedCell && (
        <BuildModal
          isOpen={isBuildModalOpen}
          onClose={() => setBuildModalOpen(false)}
          coords={selectedCell}
          onUpdate={onUpdate}
        />
      )}
      {isUpgradeModalOpen && selectedConstruction && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          construction={selectedConstruction}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default BaseInterface;