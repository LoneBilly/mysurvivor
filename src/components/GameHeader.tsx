import { Trophy, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameHeaderProps {
  joursSurvecus: number;
  onLeaderboard: () => void;
  onOptions: () => void;
  currentView: 'map' | 'base';
  onBackToMap: () => void;
}

const GameHeader = ({ joursSurvecus, onLeaderboard, onOptions, currentView, onBackToMap }: GameHeaderProps) => {
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
        <p className="text-sm text-gray-400">Jour</p>
        <p className="text-2xl font-bold">{joursSurvecus}</p>
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