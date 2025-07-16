import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Hammer, Home, Trash2, Ban, ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { BaseConstruction } from '@/types/game';
import { cn } from '@/lib/utils';
import ItemIcon from './ItemIcon';
import BuildMenu from './BuildMenu';
import WorkbenchModal from './WorkbenchModal';
import DemolishConfirmationModal from './DemolishConfirmationModal';
import ChestModal from './ChestModal';
import { useMediaQuery } from 'react-responsive';

const GRID_SIZE = 7;

const BaseInterface = ({ onBack, onExpand, isExpanded }: { onBack: () => void; onExpand: () => void; isExpanded: boolean; }) => {
  const { playerData, getIconUrl, refreshPlayerData } = useGame();
  const [grid, setGrid] = useState<any[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);
  const [isWorkbenchModalOpen, setIsWorkbenchModalOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [selectedConstruction, setSelectedConstruction] = useState<BaseConstruction | null>(null);
  const [demolishTarget, setDemolishTarget] = useState<BaseConstruction | null>(null);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const center = useMemo(() => {
    if (!playerData?.baseConstructions || playerData.baseConstructions.length === 0) {
      return { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    }
    const xs = playerData.baseConstructions.map(c => c.x);
    const ys = playerData.baseConstructions.map(c => c.y);
    return {
      x: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length),
      y: Math.round(ys.reduce((a, b) => a + b, 0) / ys.length),
    };
  }, [playerData?.baseConstructions]);

  useEffect(() => {
    if (!playerData) return;

    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill({ type: 'empty', construction: null, isConstructing: false, isCrafting: false }));
    
    const craftingWorkbenchIds = new Set((playerData.craftingJobs || []).map(j => j.workbench_id));

    (playerData.baseConstructions || []).forEach(c => {
      const gridX = c.x - center.x + Math.floor(GRID_SIZE / 2);
      const gridY = c.y - center.y + Math.floor(GRID_SIZE / 2);
      if (gridY >= 0 && gridY < GRID_SIZE && gridX >= 0 && gridX < GRID_SIZE) {
        const isCrafting = c.type === 'workbench' && craftingWorkbenchIds.has(c.id);
        newGrid[gridY][gridX] = { type: c.type, construction: c, isConstructing: false, isCrafting };
      }
    });

    (playerData.constructionJobs || []).forEach(job => {
      const gridX = job.x - center.x + Math.floor(GRID_SIZE / 2);
      const gridY = job.y - center.y + Math.floor(GRID_SIZE / 2);
      if (gridY >= 0 && gridY < GRID_SIZE && gridX >= 0 && gridX < GRID_SIZE) {
        newGrid[gridY][gridX] = { ...newGrid[gridY][gridX], type: 'in_progress', isConstructing: true };
      }
    });

    setGrid(newGrid);
  }, [playerData, center]);

  const handleCellClick = (gridX: number, gridY: number) => {
    const cell = grid[gridY]?.[gridX];
    if (!cell) return;

    if (cell.construction) {
      setSelectedConstruction(cell.construction);
      if (cell.type === 'workbench') {
        setIsWorkbenchModalOpen(true);
      } else if (cell.type === 'chest') {
        setIsChestModalOpen(true);
      } else {
        setSelectedCell({ x: cell.construction.x, y: cell.construction.y });
      }
    } else {
      const worldX = gridX + center.x - Math.floor(GRID_SIZE / 2);
      const worldY = gridY + center.y - Math.floor(GRID_SIZE / 2);
      setSelectedCell({ x: worldX, y: worldY });
    }
  };

  const handleDemolish = (construction: BaseConstruction) => {
    setDemolishTarget(construction);
    setIsWorkbenchModalOpen(false);
    setIsChestModalOpen(false);
  };

  const closeBuildMenu = () => {
    setSelectedCell(null);
  };

  const getConstructionIcon = (type: string) => {
    switch (type) {
      case 'foundation': return 'Square';
      case 'workbench': return 'Hammer';
      case 'chest': return 'Archive';
      case 'campfire': return 'Flame';
      default: return 'HelpCircle';
    }
  };

  return (
    <div className={cn("fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-300 z-40", isExpanded ? "p-2" : "p-4 md:p-8")}>
      <div className="absolute top-4 left-4 flex gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10 hover:text-white">
          <ArrowLeft />
        </Button>
        <Button variant="ghost" size="icon" onClick={onExpand} className="text-white hover:bg-white/10 hover:text-white">
          {isExpanded ? <Minimize /> : <Maximize />}
        </Button>
      </div>
      <div className={cn("aspect-square w-full max-w-[90vh] md:max-w-[calc(100vh-8rem)] transition-all duration-300", isExpanded ? "max-w-full" : "")}>
        <div className="grid grid-cols-7 gap-1 h-full">
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                onMouseEnter={() => !isMobile && cell.isConstructing && setHoveredConstruction({x, y})}
                onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                className={cn(
                  "relative w-full h-full bg-slate-800/50 rounded-md border border-slate-700 hover:bg-slate-700/70 transition-colors duration-200 flex items-center justify-center group",
                  selectedCell && cell.construction?.x === selectedCell.x && cell.construction?.y === selectedCell.y && "ring-2 ring-cyan-400",
                  cell.type === 'empty' && "border-dashed",
                  cell.isCrafting && "animate-pulse border-2 border-yellow-400/80"
                )}
              >
                {cell.type !== 'empty' && !cell.isConstructing && (
                  <ItemIcon iconName={getConstructionIcon(cell.type)} alt={cell.type} className="w-1/2 h-1/2 text-slate-300" />
                )}
                {cell.isConstructing && (
                  <>
                    <Hammer className="w-1/2 h-1/2 text-yellow-400 animate-pulse" />
                    {hoveredConstruction?.x === x && hoveredConstruction?.y === y && (
                      <div className="absolute -top-2 -translate-y-full bg-slate-900 text-white px-2 py-1 rounded-md text-xs shadow-lg z-10">
                        En construction
                      </div>
                    )}
                  </>
                )}
                {cell.construction && cell.type === 'foundation' && (
                  <div className="absolute -bottom-1 -right-1 bg-slate-600 rounded-full p-0.5">
                    <Hammer className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedCell && (
        <BuildMenu
          x={selectedCell.x}
          y={selectedCell.y}
          onClose={closeBuildMenu}
          constructions={playerData?.baseConstructions || []}
          onUpdate={refreshPlayerData}
        />
      )}

      <WorkbenchModal
        isOpen={isWorkbenchModalOpen}
        onClose={() => setIsWorkbenchModalOpen(false)}
        construction={selectedConstruction}
        onDemolish={handleDemolish}
        onUpdate={refreshPlayerData}
      />

      <ChestModal
        isOpen={isChestModalOpen}
        onClose={() => setIsChestModalOpen(false)}
        construction={selectedConstruction}
        onDemolish={handleDemolish}
        onUpdate={refreshPlayerData}
      />

      <DemolishConfirmationModal
        isOpen={!!demolishTarget}
        onClose={() => setDemolishTarget(null)}
        construction={demolishTarget}
        onUpdate={refreshPlayerData}
      />
    </div>
  );
};

export default BaseInterface;