import { useState, useMemo } from 'react';
import { PlayerData, BaseConstruction, ConstructionJob } from '@/types';
import { Flame, Hammer, Archive, Crosshair, MousePointerSquare, Building, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArbaleteModal } from './modals/ArbaleteModal';
import { toast } from 'sonner';

const GRID_SIZE = 5;

interface BaseInterfaceProps {
  playerData: PlayerData;
}

type GridCell = BaseConstruction | (ConstructionJob & { status: 'in_progress' }) | null;

export function BaseInterface({ playerData }: BaseInterfaceProps) {
  const [selectedConstruction, setSelectedConstruction] = useState<BaseConstruction | null>(null);
  const [isArbaleteModalOpen, setIsArbaleteModalOpen] = useState(false);
  const [hoveredConstruction, setHoveredConstruction] = useState<{x: number, y: number} | null>(null);

  const { baseConstructions, inventory, constructionJobs } = playerData;

  const grid: GridCell[][] = useMemo(() => {
    const newGrid: GridCell[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

    baseConstructions.forEach(c => {
      if (c.x >= 0 && c.x < GRID_SIZE && c.y >= 0 && c.y < GRID_SIZE) {
        newGrid[c.y][c.x] = c;
      }
    });
  
    constructionJobs.forEach(job => {
      if (job.x >= 0 && job.x < GRID_SIZE && job.y >= 0 && job.y < GRID_SIZE) {
        newGrid[job.y][job.x] = { ...job, status: 'in_progress' };
      }
    });
    return newGrid;
  }, [baseConstructions, constructionJobs]);

  const getBuildingIcon = (construction: BaseConstruction | ConstructionJob) => {
    const rotation = 'rotation' in construction ? construction.rotation : 0;
    const iconProps = {
      className: cn("w-8 h-8 transition-transform duration-200 ease-in-out", {
        "scale-125": hoveredConstruction && hoveredConstruction.x === construction.x && hoveredConstruction.y === construction.y
      }),
      style: { transform: `rotate(${rotation * 90}deg)` }
    };

    switch (construction.type) {
      case 'campfire':
        return <Flame {...iconProps} className={cn(iconProps.className, "text-orange-500")} />;
      case 'workbench':
        return <Hammer {...iconProps} className={cn(iconProps.className, "text-gray-500")} />;
      case 'chest':
        return <Archive {...iconProps} className={cn(iconProps.className, "text-yellow-600")} />;
      case 'piège':
        return <MousePointerSquare {...iconProps} className={cn(iconProps.className, "text-yellow-400")} />;
      case 'arbalete':
        return <Crosshair {...iconProps} className={cn(iconProps.className, "text-red-500")} />;
      case 'foundation':
        return <div className="w-full h-full bg-gray-700/50 rounded-md" />;
      default:
        return <HelpCircle {...iconProps} className={cn(iconProps.className, "text-gray-400")} />;
    }
  };

  const handleCellClick = (x: number, y: number) => {
    const cellData = grid[y][x];
    if (cellData) {
      if ('status' in cellData && cellData.status === 'in_progress') {
        toast.info(`Construction en cours: ${cellData.type}.`);
      } else {
        const construction = cellData as BaseConstruction;
        setSelectedConstruction(construction);
        if (construction.type === 'arbalete') {
          setIsArbaleteModalOpen(true);
        } else {
          toast.info(`Vous avez cliqué sur: ${construction.type}`);
        }
      }
    } else {
      toast.info("Emplacement vide. Vous pouvez construire ici.");
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Ma Base</h2>
      <div className="grid grid-cols-5 gap-1 aspect-square max-w-md mx-auto">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => !isMobile && cell && setHoveredConstruction({x, y})}
              onMouseLeave={() => !isMobile && setHoveredConstruction(null)}
              className="relative aspect-square bg-gray-700 border border-gray-600 rounded-md flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              {cell ? getBuildingIcon(cell) : <div className="w-full h-full" />}
              {cell && 'status' in cell && cell.status === 'in_progress' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                  <Building className="w-6 h-6 text-white animate-pulse" />
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {isArbaleteModalOpen && selectedConstruction && (
        <ArbaleteModal
          isOpen={isArbaleteModalOpen}
          onClose={() => setIsArbaleteModalOpen(false)}
          construction={selectedConstruction}
          inventory={inventory}
        />
      )}
    </div>
  );
}