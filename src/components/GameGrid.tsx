import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Home, TreeDeciduous, Mountain, Zap, Wrench, Shield, HelpCircle } from 'lucide-react';

// Type de zone basé sur le schéma de la base de données
interface Zone {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string | null;
}

interface GameGridProps {
  grid: (Zone | null)[][];
  playerX: number;
  playerY: number;
  discoveredZones: number[];
  basePosition?: { x: number; y: number };
  onZoneClick: (x: number, y: number) => void;
}

const ZoneIcon = ({ type, base, isPlayerPosition }: { type: string; base: boolean; isPlayerPosition: boolean }) => {
  const iconColor = isPlayerPosition ? 'text-blue-400' : 'text-gray-300';
  if (base) return <Home className={`h-8 w-8 ${iconColor}`} />;
  switch (type) {
    case 'Forêt':
      return <TreeDeciduous className={`h-8 w-8 ${iconColor}`} />;
    case 'Montagne':
      return <Mountain className={`h-8 w-8 ${iconColor}`} />;
    case 'Centrale':
      return <Zap className={`h-8 w-8 ${iconColor}`} />;
    case 'Usine':
      return <Wrench className={`h-8 w-8 ${iconColor}`} />;
    case 'Bunker':
      return <Shield className={`h-8 w-8 ${iconColor}`} />;
    default:
      return <HelpCircle className={`h-8 w-8 ${iconColor}`} />;
  }
};

const GameGrid: React.FC<GameGridProps> = ({ grid, playerX, playerY, discoveredZones, basePosition, onZoneClick }) => {
  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg h-full aspect-square flex items-center justify-center">
      <div className="grid grid-cols-7 gap-1 md:gap-2 w-full h-full">
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isPlayerHere = playerX === x && playerY === y;
            const isBaseHere = basePosition?.x === x && basePosition?.y === y;
            const isDiscovered = cell ? discoveredZones.includes(cell.id) : false;

            return (
              <TooltipProvider key={`${x}-${y}`} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => onZoneClick(x, y)}
                      className={`relative aspect-square rounded-md flex items-center justify-center transition-all duration-300 ease-in-out
                        ${isDiscovered ? 'bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer' : 'bg-gray-900/80'}
                        ${isPlayerHere ? 'ring-4 ring-blue-500 shadow-lg' : ''}
                      `}
                    >
                      {isDiscovered && cell && (
                        <ZoneIcon type={cell.type} base={isBaseHere} isPlayerPosition={isPlayerHere} />
                      )}
                      {!isDiscovered && (
                        <HelpCircle className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                  </TooltipTrigger>
                  {isDiscovered && cell && (
                    <TooltipContent>
                      <p className="font-bold">{cell.type}</p>
                      <p>({x}, {y})</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameGrid;