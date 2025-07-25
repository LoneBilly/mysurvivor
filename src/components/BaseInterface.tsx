import React, { useState, useMemo } from 'react';
import { FullPlayerData } from '@/types';
import { getBuildingDefinition, getBuildingLevel, getConstructionImage } from '@/utils/construction';
import { Button } from './ui/button';
import { ArrowUp, Hammer, RotateCcw, Trash2, X } from 'lucide-react';
import ConstructionModal from './ConstructionModal';
import DemolishModal from './DemolishModal';
import UpgradeModal from './UpgradeModal';
import { useMediaQuery } from 'react-responsive';
import { BuildingDefinition, BuildingLevel } from '@/types/building';
import { ConstructionJob } from '@/types/db';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

interface BaseInterfaceProps {
  playerData: FullPlayerData;
  onOpenConstruction: (constructionId: number) => void;
  onStartConstruction: (x: number, y: number) => void;
  onDemolish: (x: number, y: number, type: 'foundation' | 'building') => void;
  onUpgrade: (constructionId: number) => void;
  onRotate: (constructionId: number, direction: number) => void;
  onCancelConstruction: (x: number, y: number) => void;
}

const BaseInterface: React.FC<BaseInterfaceProps> = ({
  playerData,
  onOpenConstruction,
  onStartConstruction,
  onDemolish,
  onUpgrade,
  onRotate,
  onCancelConstruction,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [isConstructionModalOpen, setIsConstructionModalOpen] = useState(false);
  const [isDemolishModalOpen, setIsDemolishModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);

  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const baseGrid = useMemo(() => {
    if (!playerData.baseConstructions) return [];
    const size = 10;
    const grid = Array(size).fill(null).map(() => Array(size).fill({ type: 'empty' }));

    playerData.baseConstructions.forEach(c => {
      if (c.x >= 0 && c.x < size && c.y >= 0 && c.y < size) {
        grid[c.y][c.x] = { ...c, isConstruction: true };
      }
    });

    playerData.constructionJobs.forEach(job => {
      if (job.x >= 0 && job.x < size && job.y >= 0 && job.y < size) {
        grid[job.y][job.x] = { type: 'in_progress', job, isConstruction: false };
      }
    });

    return grid;
  }, [playerData.baseConstructions, playerData.constructionJobs]);

  const handleCellClick = (x: number, y: number) => {
    const cell = baseGrid[y][x];
    if (cell.isConstruction) {
      onOpenConstruction(cell.id);
    } else if (cell.type === 'empty') {
      setSelectedCell({ x, y });
    } else {
      setSelectedCell({ x, y });
    }
  };

  const getOccupiedChestSlots = (chestId: number) => {
    if (!playerData.chestItems) return 0;
    return playerData.chestItems.filter(item => item.chest_id === chestId).length;
  };

  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0j';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    if (days > 0) {
      return `${days}j ${hours}h`;
    }
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    const seconds = Math.floor(totalSeconds % 60);
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const selectedConstruction = selectedCell ? baseGrid[selectedCell.y][selectedCell.x] : null;
  const buildingDef: BuildingDefinition | undefined = selectedConstruction?.isConstruction ? getBuildingDefinition(selectedConstruction.type) : undefined;
  const buildingLvl: BuildingLevel | undefined = selectedConstruction?.isConstruction ? getBuildingLevel(selectedConstruction.type, selectedConstruction.level) : undefined;
  const nextBuildingLvl: BuildingLevel | undefined = selectedConstruction?.isConstruction ? getBuildingLevel(selectedConstruction.type, selectedConstruction.level + 1) : undefined;
  const constructionJob = selectedCell ? playerData.constructionJobs.find(j => j.x === selectedCell.x && j.y === selectedCell.y) : null;

  const canUpgrade = selectedConstruction?.isConstruction && nextBuildingLvl;

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Ma Base</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="grid grid-cols-10 gap-1 bg-black p-2 rounded-md">
          {baseGrid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                onMouseEnter={() => !isMobile && cell.type === 'in_progress' && setHoveredConstruction({x, y})}
                onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                className={cn(
                  "w-12 h-12 md:w-16 md:h-16 border border-gray-700 flex items-center justify-center cursor-pointer relative transition-all duration-200",
                  selectedCell?.x === x && selectedCell?.y === y ? 'bg-yellow-500/20 border-yellow-400' : 'hover:bg-gray-700',
                  cell.type === 'foundation' && 'bg-gray-600/50',
                  cell.type === 'in_progress' && 'bg-orange-500/20 animate-pulse'
                )}
              >
                {cell.isConstruction && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <img
                          src={getConstructionImage(cell.type, cell.rotation)}
                          alt={cell.type}
                          className="w-full h-full object-contain"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getBuildingDefinition(cell.type)?.name || cell.type} (Niv. {cell.level})</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {cell.type === 'in_progress' && (
                  <Hammer className="w-6 h-6 text-orange-400" />
                )}
                {cell.type === 'campfire' && cell.burn_time_remaining_seconds > 0 && (
                  <div className="absolute bottom-0 right-0 text-xs bg-black bg-opacity-60 text-white px-1 rounded-tl-md">
                    {formatDuration(cell.burn_time_remaining_seconds)}
                  </div>
                )}
                {cell.type === 'chest' && (
                  <div className="absolute bottom-0 right-0 text-xs bg-black bg-opacity-60 text-white px-1 rounded-tl-md">
                    {getOccupiedChestSlots(cell.id)}/10
                  </div>
                )}
                {hoveredConstruction?.x === x && hoveredConstruction?.y === y && cell.job && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs p-1 rounded whitespace-nowrap">
                    {getBuildingDefinition(cell.job.type)?.name} - {formatDuration(Math.max(0, new Date(cell.job.ends_at).getTime() - Date.now()) / 1000)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="w-full md:w-64 bg-gray-900 p-4 rounded-md flex flex-col">
          {selectedCell ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">Case ({selectedCell.x}, {selectedCell.y})</h3>
                  <p className="text-sm text-gray-400">
                    {selectedConstruction?.isConstruction ? (buildingDef?.name || selectedConstruction.type) : selectedConstruction?.type === 'in_progress' ? `Construction en cours...` : 'Vide'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCell(null)}><X className="w-4 h-4" /></Button>
              </div>

              <div className="mt-4 flex-grow">
                {selectedConstruction?.isConstruction && (
                  <div>
                    <p>Niveau: {selectedConstruction.level}</p>
                    {buildingDef?.description && <p className="text-sm text-gray-400 mt-2">{buildingDef.description}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onOpenConstruction(selectedConstruction.id)}>Ouvrir</Button>
                      {canUpgrade && <Button size="sm" variant="secondary" onClick={() => setIsUpgradeModalOpen(true)}>Améliorer</Button>}
                      <Button size="sm" variant="ghost" onClick={() => onRotate(selectedConstruction.id, (selectedConstruction.rotation + 1) % 4)}><RotateCcw className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => setIsDemolishModalOpen(true)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                {selectedConstruction?.type === 'empty' && (
                  <Button onClick={() => onStartConstruction(selectedCell.x, selectedCell.y)}>Construire Fondation</Button>
                )}
                {selectedConstruction?.type === 'foundation' && (
                  <Button onClick={() => setIsConstructionModalOpen(true)}>Construire Bâtiment</Button>
                )}
                {constructionJob && (
                  <div>
                    <p>Construction: {getBuildingDefinition(constructionJob.type)?.name}</p>
                    <p>Temps restant: {formatDuration(Math.max(0, new Date(constructionJob.ends_at).getTime() - Date.now()) / 1000)}</p>
                    <Button variant="destructive" className="mt-4" onClick={() => onCancelConstruction(constructionJob.x, constructionJob.y)}>Annuler</Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-4">Cliquez sur une case pour voir ses détails.</p>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-gray-400 text-center">Sélectionnez une case pour voir les options.</p>
            </div>
          )}
        </div>
      </div>

      {selectedConstruction?.type === 'foundation' && selectedCell && (
        <ConstructionModal
          isOpen={isConstructionModalOpen}
          onClose={() => setIsConstructionModalOpen(false)}
          x={selectedCell.x}
          y={selectedCell.y}
        />
      )}
      {selectedConstruction?.isConstruction && selectedCell && (
        <>
          <DemolishModal
            isOpen={isDemolishModalOpen}
            onClose={() => setIsDemolishModalOpen(false)}
            onConfirm={() => {
              onDemolish(selectedCell.x, selectedCell.y, selectedConstruction.type === 'foundation' ? 'foundation' : 'building');
              setIsDemolishModalOpen(false);
              setSelectedCell(null);
            }}
            constructionName={buildingDef?.name || selectedConstruction.type}
          />
          {canUpgrade && (
            <UpgradeModal
              isOpen={isUpgradeModalOpen}
              onClose={() => setIsUpgradeModalOpen(false)}
              onConfirm={() => {
                onUpgrade(selectedConstruction.id);
                setIsUpgradeModalOpen(false);
                setSelectedCell(null);
              }}
              constructionName={buildingDef?.name || selectedConstruction.type}
              currentLevel={buildingLvl}
              nextLevel={nextBuildingLvl}
              playerData={playerData}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BaseInterface;