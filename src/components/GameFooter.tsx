import { Heart, Soup, Droplet, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StatBarProps {
  value: number;
  icon: React.ReactNode;
  label: string;
}

const StatBar = ({ value, icon, label }: StatBarProps) => {
  const getIndicatorColor = (val: number) => {
    if (val > 75) return 'bg-blue-500';
    if (val > 50) return 'bg-yellow-500';
    if (val > 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 flex flex-col items-center px-2">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-white font-bold text-sm md:text-base">{label}</span>
      </div>
      <div className="w-full">
        <Progress 
          value={value} 
          className="h-2 bg-gray-600" 
          indicatorClassName={getIndicatorColor(value)}
        />
      </div>
      <span className="text-white text-sm mt-1">{value}%</span>
    </div>
  );
};

interface GameFooterProps {
  gameState: {
    vie: number;
    faim: number;
    soif: number;
    energie: number;
  } | null;
}

export default function GameFooter({ gameState }: GameFooterProps) {
  if (!gameState) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-gray-800 p-2 z-50">
      <div className="container mx-auto flex justify-around items-start">
        <StatBar value={gameState.vie} icon={<Heart className="text-red-400 h-5 w-5" />} label="Vie" />
        <StatBar value={gameState.faim} icon={<Soup className="text-orange-400 h-5 w-5" />} label="Faim" />
        <StatBar value={gameState.soif} icon={<Droplet className="text-blue-400 h-5 w-5" />} label="Soif" />
        <StatBar value={gameState.energie} icon={<Zap className="text-yellow-400 h-5 w-5" />} label="Énergie" />
      </div>
    </footer>
  );
}