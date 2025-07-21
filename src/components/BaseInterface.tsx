import React, { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { BaseConstruction } from '@/types/game';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import DynamicIcon from './DynamicIcon';
import { Plus, Wrench } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import BuildModal from './BuildModal';

interface BaseInterfaceProps {
  isActive: boolean;
  onInspectBuilding: (construction: BaseConstruction) => void;
  onDemolishBuilding: (construction: BaseConstruction) => void;
}

const getConstructionIcon = (type: string) => {
  switch (type) {
    case 'foundation': return 'Square';
    case 'workbench': return 'Hammer';
    case 'chest': return 'Box';
    case 'campfire': return 'Flame';
    case 'lit': return 'BedDouble';
    default: return 'Home';
  }
};

const getTimeRemaining = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "0s";
  const seconds = Math.floor(diff / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const BaseInterface = ({ isActive, onInspectBuilding }: BaseInterfaceProps) => {
  const { playerData } = useGame();
  const isMobile = useIsMobile();
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{x: number, y: number} | null>(null);

  const { constructions, jobs, grid, minX, minY } = useMemo(() => {
    const constructions = playerData.baseConstructions || [];
    const jobs = playerData.constructionJobs || [];
    if (constructions.length === 0 && jobs.length === 0) {
      return { constructions, jobs, grid: [], minX: 0, minY: 0 };
    }

    const allCoords = [...constructions.map(c => ({x: c.x, y: c.y})), ...jobs.map(j => ({x: j.x, y: j.y}))];
    const minX = Math.min(...allCoords.map(c => c.x));
    const maxX = Math.max(...allCoords.map(c => c.x));
    const minY = Math.min(...allCoords.map(c => c.y));
    const maxY = Math.max(...allCoords.map(c => c.y));

    const gridWidth = maxX - minX + 1;
    const gridHeight = maxY - minY + 1;

    const grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null));

    constructions.forEach(c => {
      grid[c.y - minY][c.x - minX] = c;
    });
    jobs.forEach(j => {
      grid[j.y - minY][j.x - minX] = { type: 'in_progress', job: j };
    });

    return { constructions, jobs, grid, minX, minY };
  }, [playerData.baseConstructions, playerData.constructionJobs]);

  const handleCellClick = (x: number, y: number) => {
    const construction = constructions.find(c => c.x === x && c.y === y);
    if (construction) {
      if (construction.type === 'foundation') {
        setSelectedCoords({ x, y });
        setIsBuildModalOpen(true);
      } else {
        onInspectBuilding(construction);
      }
    }
  };

  if (!isActive) return null;

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
        <div className="flex flex-col gap-1">
          {grid.map((row, y) => (
            <div key={y} className="flex gap-1">
              {row.map((cell, x) => {
                const absoluteX = x + minX;
                const absoluteY = y + minY;
                const isHovered = hoveredConstruction?.x === absoluteX && hoveredConstruction?.y === absoluteY;

                return (
                  <motion.button
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(absoluteX, absoluteY)}
                    onMouseEnter={() => !isMobile && cell?.type === 'in_progress' && setHoveredConstruction({x: absoluteX, y: absoluteY})}
                    onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
                    className={cn(
                      "w-20 h-20 sm:w-24 sm:h-24 rounded-lg border transition-all duration-200 flex items-center justify-center relative",
                      cell ? "bg-slate-800/70 border-slate-700 hover:bg-slate-800 hover:border-slate-600" : "bg-transparent border-dashed border-slate-700 hover:bg-slate-800/50"
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cell ? (
                      cell.type === 'in_progress' ? (
                        <>
                          <div className="flex flex-col items-center gap-1 text-yellow-400">
                            <Wrench className="w-8 h-8" />
                            <p className="text-xs font-bold">Construction</p>
                          </div>
                          {isHovered && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded-md text-xs whitespace-nowrap">
                              {cell.job.type} - {getTimeRemaining(cell.job.ends_at)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-white">
                          <DynamicIcon name={getConstructionIcon(cell.type)} className="w-8 h-8" />
                          <p className="text-xs font-bold capitalize">{cell.type}</p>
                          {cell.level > 1 && <span className="absolute top-1 right-1 text-xs font-bold bg-slate-900 px-1.5 py-0.5 rounded-full">{cell.level}</span>}
                        </div>
                      )
                    ) : (
                      <Plus className="w-8 h-8 text-slate-600" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {selectedCoords && (
        <BuildModal
          isOpen={isBuildModalOpen}
          onClose={() => setIsBuildModalOpen(false)}
          coords={selectedCoords}
        />
      )}
    </>
  );
};

export default BaseInterface;