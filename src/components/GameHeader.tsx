import { Trophy, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface GameHeaderProps {
  joursSurvecus: number;
  spawnDate: string;
  onLeaderboard: () => void;
  onOptions: () => void;
  currentView: 'map' | 'base';
  onBackToMap: () => void;
}

const GameHeader = ({ joursSurvecus, spawnDate, onLeaderboard, onOptions, currentView, onBackToMap }: GameHeaderProps) => {
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    if (!spawnDate) return;

    const calculateElapsedTime = () => {
      const spawn = new Date(spawnDate);
      const now = new Date();
      const diffMs = now.getTime() - spawn.getTime();
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setElapsedTime(formattedTime);
    };

    calculateElapsedTime();
    const intervalId = setInterval(calculateElapsedTime, 1000);

    return () => clearInterval(intervalId);
  }, [spawnDate]);

  return (
    <header className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-sm text-white border-b border-gray-700/50 h-[73px]">
      <div className="flex-1 flex justify-start">
        {currentView === 'map' ? (
          <Button variant="ghost" size="icon" onClick={onLeaderboard} className="hover:bg-gray-700">
            <Trophy className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={onBackToMap}
            className="flex items-center space-x-2 text-gray-200 hover:bg-gray-700 hover:text-white p-2 sm:px-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
        )}
      </div>
      <div className="flex-none text-center px-4">
        <p className="text-sm text-gray-300">
          Jours survécus: <span className="font-bold text-lg text-green-400">{joursSurvecus}</span>
        </p>
        {elapsedTime && (
          <p className="text-xs text-gray-400 font-mono mt-1" suppressHydrationWarning>
            {elapsedTime}
          </p>
        )}
      </div>
      <div className="flex-1 flex justify-end">
        <Button variant="ghost" size="icon" onClick={onOptions} className="hover:bg-gray-700">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default GameHeader;