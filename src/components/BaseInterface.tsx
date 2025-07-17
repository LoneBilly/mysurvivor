import { useState, useMemo, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import CountdownTimer from './CountdownTimer';
import { BuildingIcon } from './BuildingIcon';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ConstructionInfoPanel } from './ConstructionInfoPanel';
import { BaseConstruction } from '@/types/game';

interface BaseInterfaceProps {
  onCellClick: (x: number, y: number) => void;
  onBuildingClick: (building: BaseConstruction) => void;
}

export function BaseInterface({ onCellClick, onBuildingClick }: BaseInterfaceProps) {
  const { playerData, refreshPlayerData } = useGame();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [hoveredConstruction, setHoveredConstruction] = useState<{ x: number; y: number } | null>(null);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);

  const handleConstructionComplete = useCallback((x: number, y: number) => {
    const jobId = `${x}-${y}`;
    if (!completedJobs.includes(jobId)) {
      setCompletedJobs(prev => [...prev, jobId]);
    }
    refreshPlayerData();
  }, [completedJobs, refreshPlayerData]);

  const grid = useMemo(() => {
    const size = 11;
    const newGrid: any[][] = Array(size).fill(null).map(() => Array(size).fill({ type: 'empty' }));

    playerData.baseConstructions?.forEach(c => {
      if (c.x >= 0 && c.x < size && c.y >= 0 && c.y < size) {
        newGrid[c.y][c.x] = { type: c.type, construction: c };
      }
    });

    playerData.constructionJobs?.forEach(job => {
      if (job.x >= 0 && job.x < size && job.y >= 0 && job.y < size) {
        newGrid[job.y][job.x] = { type: 'in_progress', job };
      }
    });

    return newGrid;
  }, [playerData.baseConstructions, playerData.constructionJobs]);

  const handleCellClick = (x: number, y: number) => {
    const cell = grid[y][x];
    const jobId = `${x}-${y}`;

    if (completedJobs.includes(jobId)) {
      setCompletedJobs(prev => prev.filter(id => id !== jobId));
    }

    if (cell.type === 'empty') {
      onCellClick(x, y);
    } else if (cell.construction) {
      onBuildingClick(cell.construction);
    }
  };

  const getCellClassName = (cell: any, x: number, y: number) => {
    const baseClasses = "aspect-square border border-gray-700/50 flex items-center justify-center transition-all duration-200 relative";
    const jobId = `${x}-${y}`;

    if (completedJobs.includes(jobId) && cell.type !== 'in_progress') {
      return `${baseClasses} animate-pulse-green`;
    }

    if (cell.type === 'in_progress') {
      return `${baseClasses} bg-yellow-900/50`;
    }
    if (cell.construction) {
      return `${baseClasses} bg-gray-800/50 hover:bg-gray-700/50`;
    }
    return `${baseClasses} hover:bg-gray-800/30`;
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-11 gap-1 p-2 bg-gray-900/50 rounded-lg border border-gray-700">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => !isMobile && (cell.type === 'in_progress' || cell.construction) && setHoveredConstruction({ x, y })}
              onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
              className={getCellClassName(cell, x, y)}
            >
              {cell.type === 'in_progress' && cell.job ? (
                <div className="flex flex-col items-center justify-center text-white text-xs">
                  <div className="opacity-50">
                    <BuildingIcon type={cell.job.type} className="w-4 h-4 mb-1" />
                  </div>
                  <CountdownTimer
                    endTime={cell.job.ends_at}
                    onComplete={() => handleConstructionComplete(x, y)}
                  />
                </div>
              ) : cell.construction ? (
                <BuildingIcon type={cell.construction.type} />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-800 group-hover:bg-gray-700 transition-colors"></div>
              )}
            </button>
          ))
        )}
      </div>
      {hoveredConstruction && (
        <ConstructionInfoPanel
          coords={hoveredConstruction}
          grid={grid}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}