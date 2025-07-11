import { Trophy, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface GameHeaderProps {
  spawnDate: string;
  onLeaderboard: () => void;
  onOptions: () => void;
  currentView: 'map' | 'base' | 'exploration';
  onBackToMap: () => void;
}

const GameHeader = ({ spawnDate, onLeaderboard, onOptions, currentView, onBackToMap }: GameHeaderProps) => {
  const [elapsedTime, setElapsedTime] = useState('');
  const [daysSurvived, setDaysSurvived] = useState(0);
  const showBackButton = currentView === 'base';

  useEffect(() => {
    if (!spawnDate) return;

    const calculateTimes = () => {
      const spawn = new Date(spawnDate);
      const now = new Date();
      const diffMs = now.getTime() - spawn.getTime();
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setElapsedTime(formattedTime);

      const calculatedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      setDaysSurvived(calculatedDays);
    };

    calculateTimes();
    const intervalId = setInterval(calculateTimes, 1000);

    return () => clearInterval(intervalId);
  }, [spawnDate]);

  return (
    <header className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-lg text-white border-b border-white/10 h-[73px]">
      <div className="flex-1 flex justify-start">
        {currentView === 'map' ? (
          <Button variant="ghost" size="icon" onClick={onLeaderboard} className="hover:bg-white/10 rounded-lg">
            <Trophy className="w-5 h-5" />
          </Button>
        ) : showBackButton ? (
          <Button
            variant="ghost"
            onClick={onBackToMap}
            className="flex items-center space-x-2 text-white hover:bg-white/10 p-2 sm:px-3 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
        ) : (
          <div className="w-10 h-10" /> // Placeholder
        )}
      </div>
      <div className="flex-none text-center px-4">
        <p className="text-sm text-gray-300 font-mono">
          Jours survécus: <span className="font-bold text-lg text-white">{daysSurvived}</span>
        </p>
        {elapsedTime && (
          <p className="text-xs text-gray-400 font-mono mt-1" suppressHydrationWarning>
            {elapsedTime}
          </p>
        )}
      </div>
      <div className="flex-1 flex justify-end">
        <Button variant="ghost" size="icon" onClick={onOptions} className="hover:bg-white/10 rounded-lg">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default GameHeader;