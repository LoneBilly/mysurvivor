import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMediaQuery } from 'react-responsive';
import BuildModal from './modals/BuildModal';
import UpgradeModal from './modals/UpgradeModal';
import ConstructionProgressModal from './modals/ConstructionProgressModal';
import WorkbenchModal from './modals/WorkbenchModal';
import ChestModal from './modals/ChestModal';
import CampfireModal from './modals/CampfireModal';
import TrapModal from './modals/TrapModal';
import CrossbowModal from './modals/CrossbowModal';

const buildingIcons: { [key: string]: string } = {
  foundation: 'grip.png',
  workbench: 'workbench.png',
  chest: 'chest.png',
  campfire: 'campfire.png',
  lit: 'bed.png',
  piège: 'trap.png',
  arbalete: 'crossbow_trap.png',
  in_progress: 'construction.png',
};

const BaseInterface = ({
  baseConstructions,
  constructionJobs,
  inventory,
  chestItems,
  workbenchItems,
  craftingJobs,
  learnedRecipes,
  onRotate,
  onDemolishFoundation,
  onDemolishBuilding,
  onUpgrade,
  onStartBuilding,
  onCancelConstruction,
  onStartCrafting,
  onCollectCrafted,
  onCancelCrafting,
  onMoveToWorkbench,
  onMoveFromWorkbench,
  onStartCooking,
  onCollectCooking,
  onClearBurnt,
  onAddFuel,
  onArmTrap,
  onClaimTrapLoot,
  onArmCrossbow,
  onLoadCrossbow,
  onStartSleep,
  onRest,
  onCollectWorkbenchOutput,
  onDiscardWorkbenchOutput,
}) => {
  const [gridSize] = useState({ width: 5, height: 5 });
  const [selectedConstruction, setSelectedConstruction] = useState<any>(null);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isConstructionProgressModalOpen, setIsConstructionProgressModalOpen] = useState(false);
  const [isWorkbenchModalOpen, setIsWorkbenchModalOpen] = useState(false);
  const [isChestModalOpen, setIsChestModalOpen] = useState(false);
  const [isCampfireModalOpen, setIsCampfireModalOpen] = useState(false);
  const [isTrapModalOpen, setIsTrapModalOpen] = useState(false);
  const [isCrossbowModalOpen, setIsCrossbowModalOpen] = useState(false);

  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const grid = useMemo(() => {
    const newGrid = Array(gridSize.height).fill(null).map(() => Array(gridSize.width).fill({ type: 'empty' }));
    baseConstructions.forEach(c => {
      if (c.x < gridSize.width && c.y < gridSize.height) {
        newGrid[c.y][c.x] = { ...c, type: c.type, id: c.id };
      }
    });
    constructionJobs.forEach(j => {
      if (j.x < gridSize.width && j.y < gridSize.height) {
        newGrid[j.y][j.x] = { ...j, type: 'in_progress', id: j.id };
      }
    });
    return newGrid;
  }, [baseConstructions, constructionJobs, gridSize]);

  const handleCellClick = (x: number, y: number) => {
    const construction = baseConstructions.find(c => c.x === x && c.y === y);
    const job = constructionJobs.find(j => j.x === x && j.y === y);

    if (job) {
      setSelectedConstruction(job);
      setIsConstructionProgressModalOpen(true);
    } else if (construction) {
      setSelectedConstruction(construction);
      if (construction.type === 'workbench') {
        setIsWorkbenchModalOpen(true);
      } else if (construction.type === 'chest') {
        setIsChestModalOpen(true);
      } else if (construction.type === 'campfire') {
        setIsCampfireModalOpen(true);
      } else if (construction.type === 'piège') {
        setIsTrapModalOpen(true);
      } else if (construction.type === 'arbalete') {
        setIsCrossbowModalOpen(true);
      } else if (construction.type !== 'foundation') {
        setIsUpgradeModalOpen(true);
      } else {
        setIsBuildModalOpen(true);
      }
    } else {
      setSelectedConstruction({ x, y });
      setIsBuildModalOpen(true);
    }
  };

  const getRotationClass = (rotation) => {
    switch (rotation) {
      case 1: return 'rotate-90';
      case 2: return 'rotate-180';
      case 3: return '-rotate-90';
      default: return 'rotate-0';
    }
  };

  return (
    <div className="p-2 md:p-4 bg-gray-800 rounded-lg">
      <div className="grid grid-cols-5 gap-1 md:gap-2">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <motion.button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => !isMobile && cell.type === 'in_progress' && setHoveredConstruction({x, y})}
              onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
              className={cn(
                "aspect-square border-2 rounded-md flex items-center justify-center transition-all duration-200",
                "bg-gray-700/50 border-gray-600 hover:bg-gray-700",
                cell.type !== 'empty' && "bg-gray-600/50",
                cell.type === 'foundation' && "border-blue-400/50",
                cell.type === 'in_progress' && "border-yellow-400/50 animate-pulse"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {cell.type !== 'empty' && (
                <img
                  src={`/assets/buildings/${buildingIcons[cell.type]}`}
                  alt={cell.type}
                  className={cn("w-3/4 h-3/4 object-contain", getRotationClass(cell.rotation))}
                />
              )}
              {hoveredConstruction && hoveredConstruction.x === x && hoveredConstruction.y === y && (
                <div className="absolute bottom-full mb-2 w-max bg-black text-white text-xs rounded py-1 px-2">
                  Construction en cours...
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>

      {isBuildModalOpen && (
        <BuildModal
          isOpen={isBuildModalOpen}
          onClose={() => setIsBuildModalOpen(false)}
          onStartBuilding={onStartBuilding}
          coords={selectedConstruction}
        />
      )}
      {isUpgradeModalOpen && selectedConstruction && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          construction={selectedConstruction}
          onUpgrade={onUpgrade}
          onDemolishBuilding={onDemolishBuilding}
          onDemolishFoundation={onDemolishFoundation}
          onRotate={onRotate}
          onStartSleep={onStartSleep}
          onRest={onRest}
        />
      )}
      {isConstructionProgressModalOpen && selectedConstruction && (
        <ConstructionProgressModal
          isOpen={isConstructionProgressModalOpen}
          onClose={() => setIsConstructionProgressModalOpen(false)}
          job={selectedConstruction}
          onCancel={onCancelConstruction}
        />
      )}
      {isWorkbenchModalOpen && selectedConstruction && (
        <WorkbenchModal
          isOpen={isWorkbenchModalOpen}
          onClose={() => setIsWorkbenchModalOpen(false)}
          workbench={selectedConstruction}
          inventory={inventory}
          workbenchItems={workbenchItems.filter(item => item.workbench_id === selectedConstruction.id)}
          craftingJobs={craftingJobs.filter(job => job.workbench_id === selectedConstruction.id)}
          learnedRecipes={learnedRecipes}
          onStartCrafting={onStartCrafting}
          onCollectCrafted={onCollectCrafted}
          onCancelCrafting={onCancelCrafting}
          onMoveToWorkbench={onMoveToWorkbench}
          onMoveFromWorkbench={onMoveFromWorkbench}
          onCollectOutput={onCollectWorkbenchOutput}
          onDiscardOutput={onDiscardWorkbenchOutput}
        />
      )}
      {isChestModalOpen && selectedConstruction && (
        <ChestModal
          isOpen={isChestModalOpen}
          onClose={() => setIsChestModalOpen(false)}
          chest={selectedConstruction}
          inventory={inventory}
          chestItems={chestItems.filter(item => item.chest_id === selectedConstruction.id)}
        />
      )}
      {isCampfireModalOpen && selectedConstruction && (
        <CampfireModal
          isOpen={isCampfireModalOpen}
          onClose={() => setIsCampfireModalOpen(false)}
          campfire={selectedConstruction}
          inventory={inventory}
          chestItems={chestItems}
          onStartCooking={onStartCooking}
          onCollectCooking={onCollectCooking}
          onClearBurnt={onClearBurnt}
          onAddFuel={onAddFuel}
        />
      )}
      {isTrapModalOpen && selectedConstruction && (
        <TrapModal
          isOpen={isTrapModalOpen}
          onClose={() => setIsTrapModalOpen(false)}
          construction={selectedConstruction}
          onArmTrap={onArmTrap}
          onClaimTrapLoot={onClaimTrapLoot}
        />
      )}
      {isCrossbowModalOpen && selectedConstruction && (
        <CrossbowModal
          isOpen={isCrossbowModalOpen}
          onClose={() => setIsCrossbowModalOpen(false)}
          construction={selectedConstruction}
          inventory={inventory}
          onArmCrossbow={onArmCrossbow}
          onLoadCrossbow={onLoadCrossbow}
        />
      )}
    </div>
  );
};

export default BaseInterface;