import React from 'react';
import { GameCell } from './GameCell';

interface GameGridProps {
  grid: boolean[][];
  playerPosition: { x: number; y: number };
  onCellClick: (x: number, y: number) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  playerPosition,
  onCellClick,
}) => {
  return (
    <div 
      className="grid grid-cols-7 gap-1 md:gap-2 w-full h-full"
      style={{
        aspectRatio: '1/1',
        maxHeight: 'calc(100vh - 140px)', // Ajuste selon la hauteur du header/footer
        maxWidth: 'calc(100vh - 140px)',
        margin: '0 auto'
      }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <button
            key={`${x}-${y}`}
            onClick={() => onCellClick(x, y)}
            className="aspect-square"
          >
            <GameCell
              isDiscovered={cell}
              isPlayer={playerPosition.x === x && playerPosition.y === y}
            />
          </button>
        ))
      )}
    </div>
  );
};