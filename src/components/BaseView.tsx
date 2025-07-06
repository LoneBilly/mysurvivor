import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Flame } from 'lucide-react';

interface BaseViewProps {
  onExit: () => void;
}

const BaseView: React.FC<BaseViewProps> = ({ onExit }) => {
  const [viewportX, setViewportX] = useState(0);
  const [viewportY, setViewportY] = useState(0);
  
  // Taille de la grille visible (nombre de cases)
  const GRID_SIZE = 15;
  const CELL_SIZE = 40; // Taille d'une case en pixels
  
  // Position du feu de camp (centre de la grille)
  const CAMPFIRE_X = Math.floor(GRID_SIZE / 2);
  const CAMPFIRE_Y = Math.floor(GRID_SIZE / 2);

  const renderGrid = () => {
    const cells = [];
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const actualX = x + viewportX;
        const actualY = y + viewportY;
        const isCampfire = x === CAMPFIRE_X && y === CAMPFIRE_Y && viewportX === -CAMPFIRE_X && viewportY === -CAMPFIRE_Y;
        
        cells.push(
          <div
            key={`${actualX}-${actualY}`}
            className={`
              w-10 h-10 border border-gray-400 flex items-center justify-center
              ${isCampfire ? 'bg-orange-200' : 'bg-gray-200'}
              transition-colors duration-200
            `}
            style={{
              gridColumn: x + 1,
              gridRow: y + 1,
            }}
          >
            {isCampfire && (
              <Flame className="w-6 h-6 text-orange-600" />
            )}
          </div>
        );
      }
    }
    
    return cells;
  };

  const moveViewport = (dx: number, dy: number) => {
    setViewportX(prev => prev + dx);
    setViewportY(prev => prev + dy);
  };

  // Centrer la vue sur le feu de camp au démarrage
  useEffect(() => {
    setViewportX(-CAMPFIRE_X);
    setViewportY(-CAMPFIRE_Y);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <Button onClick={onExit} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'exploration
        </Button>
        <h1 className="text-xl font-bold">Ma Base</h1>
        <div className="w-32"></div> {/* Spacer pour centrer le titre */}
      </div>

      {/* Contrôles de navigation */}
      <div className="bg-white p-4 flex justify-center gap-2">
        <Button onClick={() => moveViewport(0, -1)} variant="outline" size="sm">↑</Button>
        <div className="flex gap-2">
          <Button onClick={() => moveViewport(-1, 0)} variant="outline" size="sm">←</Button>
          <Button onClick={() => moveViewport(1, 0)} variant="outline" size="sm">→</Button>
        </div>
        <Button onClick={() => moveViewport(0, 1)} variant="outline" size="sm">↓</Button>
      </div>

      {/* Grille de la base */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div 
          className="grid gap-0 border-2 border-gray-600"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          }}
        >
          {renderGrid()}
        </div>
      </div>

      {/* Info */}
      <div className="bg-white p-4 text-center text-sm text-gray-600">
        Position de la vue: ({viewportX}, {viewportY}) | Utilisez les flèches pour explorer votre base
      </div>
    </div>
  );
};

export default BaseView;