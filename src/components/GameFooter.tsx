import React from 'react';
import { Progress } from '@/components/ui/progress';
import { usePlayerState } from '@/hooks/usePlayerState';

const GameFooter: React.FC = () => {
  const { playerState } = usePlayerState();

  if (!playerState) {
    return null; // Ou un état de chargement
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 text-white flex justify-around items-center z-50">
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">Vie</span>
        <Progress value={playerState.vie} className="w-24 h-2 bg-gray-600" indicatorClassName="bg-red-500" />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">Faim</span>
        <Progress value={playerState.faim} className="w-24 h-2 bg-gray-600" indicatorClassName="bg-orange-500" />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">Soif</span>
        <Progress value={playerState.soif} className="w-24 h-2 bg-gray-600" indicatorClassName="bg-blue-500" />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">Énergie</span>
        <Progress value={playerState.energie} className="w-24 h-2 bg-gray-600" indicatorClassName="bg-yellow-500" />
      </div>
    </footer>
  );
};

export default GameFooter;