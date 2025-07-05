import React from 'react';
import { motion } from 'framer-motion';
import { Mountain, Waves, Trees, Tent, User, Skull, HelpCircle } from 'lucide-react';
import { BiomeName } from '@/lib/grid';

interface Cell {
  biome: BiomeName;
}

interface GameGridProps {
  grid: Cell[][];
  playerPosition: { y: number; x: number };
  onCellClick: (y: number, x: number) => void;
  discoveredGrid: boolean[][];
}

const GameGrid: React.FC<GameGridProps> = ({ grid, playerPosition, onCellClick, discoveredGrid }) => {
  const getBiomeIcon = (biome: BiomeName) => {
    switch (biome) {
      case 'Forêt':
        return <Trees className="w-6 h-6 text-green-600" />;
      case 'Montagne':
        return <Mountain className="w-6 h-6 text-gray-500" />;
      case 'Plage':
        return <Waves className="w-6 h-6 text-yellow-500" />;
      case 'Océan':
        return <Waves className="w-6 h-6 text-blue-500" />;
      case 'Campement':
        return <Tent className="w-6 h-6 text-orange-600" />;
      case 'Danger':
        return <Skull className="w-6 h-6 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="grow w-full flex items-center justify-center overflow-hidden m-[10px]">
      <div className="grid grid-cols-7 gap-1 md:gap-2 aspect-square h-full max-w-full">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${y}-${x}`}
              onClick={() => onCellClick(y, x)}
              className={`aspect-square flex items-center justify-center rounded-md transition-all duration-300
                ${discoveredGrid[y]?.[x] ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-400 dark:bg-gray-600'}
                ${playerPosition.y === y && playerPosition.x === x ? 'ring-4 ring-blue-500 z-10' : ''}
              `}
            >
              {discoveredGrid[y]?.[x] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {playerPosition.y === y && playerPosition.x === x ? (
                    <User className="w-6 h-6 text-blue-600" />
                  ) : (
                    getBiomeIcon(cell.biome)
                  )}
                </motion.div>
              )}
              {!discoveredGrid[y]?.[x] && (
                <HelpCircle className="w-6 h-6 text-gray-500" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default GameGrid;