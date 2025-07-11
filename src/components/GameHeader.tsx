import { Trophy, Settings, ArrowLeft, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface GameHeaderProps {
  spawnDate: string;
  credits: number;
  onLeaderboard: () => void;
  onOptions: () => void;
  currentView: 'map' | 'base' | 'exploration';
  onBackToMap: () => void;
}

const GameHeader = ({ spawnDate, credits, onLeaderboard, onOptions, currentView, onBackToMap }: GameHeaderProps) => {
  const [daysSurvived, setDaysSurvived] = useState(0);
  const showBackButton = currentView === 'base' || currentView === 'exploration';

  useEffect(() => {
    if (!spawnDate) return;

    const calculateDays = () => {
      const spawn = new Date(spawnDate);
      const now = new Date();
      const diffMs = now.getTime() - spawn.getTime();
      const calculatedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      setDaysSurvived(calculatedDays);
    };

    calculateDays();
    const intervalId = setInterval(calculateDays, 1000 * 60 * 60); // Met à jour toutes les heures

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
      <div className="flex-none text-center px-4 flex items-center gap-4">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-300 font-mono">
            Jours survécus
          </p>
          <p className="font-bold text-lg text-white">{daysSurvived}</p>
        </div>
        <div className="w-px h-8 bg-white/20"></div>
        <div className="flex flex-col items-center">
           <p className="text-sm text-gray-300 font-mono">
            Crédits
          </p>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-lg text-white">{credits}</span>
          </div>
        </div>
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