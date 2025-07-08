import React from 'react';
import { useMapLayout } from '@/hooks/useMapLayout';
import { usePlayerState } from '@/hooks/usePlayerState';
import MapGrid from './MapGrid';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ExplorationViewProps {
  onBack: () => void;
}

const ExplorationView: React.FC<ExplorationViewProps> = ({ onBack }) => {
  const { layout, isLoading: isLoadingMap } = useMapLayout();
  const { playerState, isLoading: isLoadingPlayer } = usePlayerState();

  if (isLoadingMap || isLoadingPlayer) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const playerPosition = playerState && layout ? layout.find(c => c.id === playerState.current_zone_id) : undefined;

  return (
    <div className="p-4 h-screen bg-background">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle>Carte d'exploration</CardTitle>
          <Button onClick={onBack}>Retour au jeu</Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto flex items-center justify-center">
            <MapGrid
              layout={layout || []}
              onCellClick={() => {}} // Read-only map
              gridSize={{ width: 100, height: 100 }}
              cellSize="w-8 h-8"
              playerPositions={playerPosition ? [{ x: playerPosition.x, y: playerPosition.y, id: playerState.id }] : []}
              discoveredZones={playerState?.zones_decouvertes}
            />
        </CardContent>
      </Card>
    </div>
  );
};

export default ExplorationView;