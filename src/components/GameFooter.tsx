import StatBar from './StatBar';
import { Button } from './ui/button';
import { Backpack } from 'lucide-react';
import CreditsDisplay from './CreditsDisplay';

interface GameFooterProps {
  stats: {
    vie: number;
    faim: number;
    soif: number;
    energie: number;
  };
  credits: number;
  onInventaire: () => void;
  onBuyCredits: () => void;
}

const GameFooter = ({ stats, credits, onInventaire, onBuyCredits }: GameFooterProps) => {
  return (
    <footer className="bg-gray-900/50 backdrop-blur-md border-t border-gray-700 p-2 sm:p-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 flex-grow w-full">
          <StatBar label="Vie" value={stats.vie} color="bg-red-500" />
          <StatBar label="Faim" value={stats.faim} color="bg-yellow-500" />
          <StatBar label="Soif" value={stats.soif} color="bg-blue-500" />
          <StatBar label="Énergie" value={stats.energie} color="bg-green-500" />
        </div>
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <CreditsDisplay credits={credits} onClick={onBuyCredits} />
          <Button onClick={onInventaire} className="px-3 sm:px-4">
            <Backpack className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Inventaire</span>
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default GameFooter;