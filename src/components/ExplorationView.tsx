import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GameState } from '@/types/game';
import ExplorationMap from './ExplorationMap';

interface ExplorationViewProps {
  onBack: () => void;
  gameState: GameState;
}

const ExplorationView: React.FC<ExplorationViewProps> = ({ onBack, gameState }) => {
  return (
    <div className="p-0 sm:p-4 h-full w-full bg-gray-900">
      <Card className="h-full flex flex-col bg-gray-800/50 border-gray-700 text-white rounded-none sm:rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle>Carte d'exploration</CardTitle>
          <Button onClick={onBack} variant="outline" className="bg-gray-700 border-gray-600 hover:bg-gray-600">Retour</Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden flex items-center justify-center no-scrollbar p-0 sm:p-2">
          <ExplorationMap gameState={gameState} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ExplorationView;