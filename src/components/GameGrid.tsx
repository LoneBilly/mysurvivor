"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GameGridProps {
  grid: { type: string; discovered: boolean; content?: string }[][];
  onCellClick: (x: number, y: number) => void;
  playerX: number;
  playerY: number;
}

const GameGrid: React.FC<GameGridProps> = ({ grid, onCellClick, playerX, playerY }) => {
  return (
    <div className="grid grid-cols-7 gap-1 md:gap-2 max-w-md md:max-w-lg lg:max-w-xl bg-stone-900 p-1 rounded-md">
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <button
            key={`${x}-${y}`}
            className={cn(
              "w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center text-sm md:text-base font-bold rounded-sm",
              cell.discovered ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-500",
              x === playerX && y === playerY && "bg-blue-600 text-white border-2 border-blue-300",
              "hover:bg-gray-600 transition-colors duration-200"
            )}
            onClick={() => onCellClick(x, y)}
            disabled={!cell.discovered && !(x === playerX && y === playerY)} // Only allow clicking discovered cells or the player's cell
          >
            {x === playerX && y === playerY ? 'P' : cell.content || ''}
          </button>
        ))
      )}
    </div>
  );
};

export default GameGrid;