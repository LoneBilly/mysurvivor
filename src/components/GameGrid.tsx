import React from 'react';

interface GameGridProps {
  gameState: any;
  onUpdateGameState: (updates: any) => void;
}

const GameGrid: React.FC<GameGridProps> = ({ gameState, onUpdateGameState }) => {
  const grid = Array(7).fill(null).map(() => Array(7).fill(null));
  const discoveredGrid = gameState.grille_decouverte || [];
  
  const handleCellClick = async (x: number, y: number) => {
    if (Math.abs(x - gameState.position_x) <= 1 && Math.abs(y - gameState.position_y) <= 1) {
      const newDiscoveredGrid = [...discoveredGrid];
      if (!newDiscoveredGrid[y]) newDiscoveredGrid[y] = [];
      newDiscoveredGrid[y][x] = true;
      
      await onUpdateGameState({
        position_x: x,
        position_y: y,
        grille_decouverte: newDiscoveredGrid
      });
    }
  };

  const getCellContent = (x: number, y: number) => {
    const isPlayerPosition = x === gameState.position_x && y === gameState.position_y;
    const isDiscovered = discoveredGrid[y] && discoveredGrid[y][x];
    const isAdjacent = Math.abs(x - gameState.position_x) <= 1 && Math.abs(y - gameState.position_y) <= 1;
    
    if (isPlayerPosition) {
      return { content: '🧑', className: 'bg-blue-500 text-white' };
    }
    
    if (!isDiscovered && !isAdjacent) {
      return { content: '?', className: 'bg-gray-600 text-gray-300' };
    }
    
    // Logique pour différents types de cellules
    const cellType = Math.random();
    if (cellType < 0.1) {
      return { content: '🏠', className: 'bg-amber-100' };
    } else if (cellType < 0.2) {
      return { content: '🌳', className: 'bg-green-100' };
    } else if (cellType < 0.3) {
      return { content: '💧', className: 'bg-blue-100' };
    } else {
      return { content: '', className: 'bg-gray-200' };
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="grid grid-cols-7 gap-1 md:gap-2 max-w-md md:max-w-lg lg:max-w-xl">
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const { content, className } = getCellContent(x, y);
            const isClickable = Math.abs(x - gameState.position_x) <= 1 && Math.abs(y - gameState.position_y) <= 1;
            
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                disabled={!isClickable}
                className={`
                  aspect-square w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20
                  rounded-lg border-2 border-gray-300
                  flex items-center justify-center text-lg md:text-xl lg:text-2xl
                  transition-all duration-200
                  ${className}
                  ${isClickable ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-60'}
                `}
              >
                {content}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameGrid;