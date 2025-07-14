import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';

// Ces types sont des exemples, vous devriez les adapter à votre projet
export interface BaseConstruction {
  id: number;
  x: number;
  y: number;
  type: string;
  output_item_id?: number;
  output_quantity?: number;
}

export interface CraftingJob {
  id: number;
  workbench_id: number;
  status: 'in_progress' | 'completed';
  ends_at: string;
  started_at: string;
  recipe_id: number;
}

interface BaseGridProps {
  constructions: BaseConstruction[];
  craftingJobs: CraftingJob[];
  onWorkbenchClick: (workbench: BaseConstruction) => void;
}

const buildingIcons: { [key: string]: string } = {
  workbench: '🛠️',
  foundation: '🟫',
  campfire: '🔥',
  chest: '📦',
};

const BaseGrid = ({ constructions, craftingJobs, onWorkbenchClick }: BaseGridProps) => {
  const grid = Array(5).fill(null).map(() => Array(5).fill(null));

  constructions.forEach(c => {
    if (c.x >= 0 && c.x < 5 && c.y >= 0 && c.y < 5) {
      grid[c.y][c.x] = c;
    }
  });

  const isCrafting = (workbenchId: number) => {
    return craftingJobs.some(job => job.workbench_id === workbenchId && job.status === 'in_progress');
  };

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-gray-800 rounded-lg">
      {grid.map((row, y) =>
        row.map((cell, x) => {
          const construction = cell as BaseConstruction | null;
          const isWorkbenchCrafting = construction?.type === 'workbench' && isCrafting(construction.id);

          return (
            <TooltipProvider key={`${y}-${x}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-20 h-20 border-2 border-gray-600 rounded-md flex items-center justify-center text-4xl cursor-pointer
                      ${construction ? 'bg-gray-700' : 'bg-gray-900'}
                      ${construction?.type === 'workbench' ? 'hover:bg-blue-900' : ''}
                      ${isWorkbenchCrafting ? 'animate-pulse border-yellow-400' : ''}
                    `}
                    onClick={() => construction?.type === 'workbench' && onWorkbenchClick(construction)}
                  >
                    {construction ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{buildingIcons[construction.type] || '🏢'}</span>
                        {isWorkbenchCrafting && (
                          <Flame className="absolute top-1 right-1 w-5 h-5 text-yellow-400 animate-bounce" />
                        )}
                      </div>
                    ) : null}
                  </div>
                </TooltipTrigger>
                {construction && (
                  <TooltipContent>
                    <p className="capitalize">{construction.type.replace('_', ' ')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })
      )}
    </div>
  );
};

export default BaseGrid;