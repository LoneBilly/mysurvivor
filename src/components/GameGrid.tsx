import React from 'react';
import { motion } from 'framer-motion';
import { Mountain, Waves, Trees, Home, User, Skull, HelpCircle } from 'lucide-react';

interface Cell {
  type: 'mountain' | 'water' | 'forest' | 'start' | 'end' | 'empty';
}

interface GameGridProps {
  grid: Cell[][];
  discovered: boolean[][];
  playerPosition: { x: number; y: number };
  onCellClick: (x: number, y: number) => void;
}

const GameGrid: React.FC<GameGridProps> = ({ grid, discovered, playerPosition, onCellClick }) => {
  const getCellIcon = (cell: Cell) => {
    switch (cell.type) {
      case 'mountain':
        return <Mountain className="w-6 h-6 md:w-8 md:h-8 text-gray-500" />;
      case 'water':
        return <Waves className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />;
      case 'forest':
        return <Trees className="w-6 h-6 md:w-8 md:h-8 text-green-600" />;
      case 'start':
        return <Home className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />;
      case 'end':
        return <Skull className="w-6 h-6 md:w-8 md:h-8 text-red-600" />;
      default:
        return null;
    }
  };

  const getCellClasses = (cell: Cell, isDiscovered: boolean, x: number, y: number, playerPos: { x: number; y: number }) => {
    if (x === playerPos.x && y === playerPos.y) {
      return 'bg-blue-300 ring-2 ring-blue-500';
    }
    if (!isDiscovered) {
      return 'bg-gray-700 hover:bg-gray-600 cursor-pointer';
    }
    switch (cell.type) {
      case 'mountain':
        return 'bg-gray-400';
      case 'water':
        return 'bg-blue-200';
      case 'forest':
        return 'bg-green-300';
      case 'start':
        return 'bg-yellow-200';
      case 'end':
        return 'bg-red-300';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="grid grid-cols-7 gap-1 md:gap-2 w-full max-w-xl mx-auto">
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <button
            key={`${x}-${y}`}
            onClick={() => onCellClick(x, y)}
            className={`aspect-square flex items-center justify-center rounded-md transition-all duration-300 ease-in-out
              ${getCellClasses(cell, discovered[y][x], x, y, playerPosition)}
            `}
          >
            {x === playerPosition.x && y === playerPosition.y ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <User className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </motion.div>
            ) : discovered[y][x] ? (
              getCellIcon(cell)
            ) : (
              <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
            )}
          </button>
        ))
      )}
    </div>
  );
};

export default GameGrid;