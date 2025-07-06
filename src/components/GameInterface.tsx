import React, { useState } from 'react';
import GameGrid from './GameGrid';
import BaseInterface from './BaseInterface';
import ResourceHeader from './ResourceHeader';

const GameInterface = () => {
  const [currentView, setCurrentView] = useState<'map' | 'base'>('map');
  const [resources, setResources] = useState({ wood: 10, metal: 5, components: 3 });

  const handleCellSelect = (cell) => {
    // Logique pour gérer la sélection de cellule
  };

  return (
    <div className="flex flex-col h-full">
      <ResourceHeader
        wood={resources.wood}
        metal={resources.metal}
        components={resources.components}
      />
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-900 min-h-0">
        {currentView === 'map' ? (
          <GameGrid onCellSelect={handleCellSelect} />
        ) : (
          <BaseInterface />
        )}
      </main>
    </div>
  );
};

export default GameInterface;