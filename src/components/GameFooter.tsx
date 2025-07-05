import { Button } from "@/components/ui/button";
import { Heart, Utensils, Droplets, Zap, Package } from "lucide-react";
import { GameStats } from "@/types/game";

interface GameFooterProps {
  stats: GameStats;
  onInventaire: () => void;
}

const GameFooter = ({ stats, onInventaire }: GameFooterProps) => {
  const StatItem = ({ 
    icon: Icon, 
    label, 
    value, 
    color 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    color: string; 
  }) => (
    <div className={`flex items-center space-x-2 p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5" />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </div>
    </div>
  );

  return (
    <footer className="bg-gray-800 text-white p-4">
      {/* Layout mobile : 2x2 pour les stats + inventaire pleine largeur */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatItem
            icon={Heart}
            label="Vie"
            value={stats.vie}
            color="bg-red-600"
          />
          <StatItem
            icon={Utensils}
            label="Faim"
            value={stats.faim}
            color="bg-orange-600"
          />
          <StatItem
            icon={Droplets}
            label="Soif"
            value={stats.soif}
            color="bg-blue-600"
          />
          <StatItem
            icon={Zap}
            label="Énergie"
            value={stats.energie}
            color="bg-yellow-600"
          />
        </div>
        <Button
          onClick={onInventaire}
          className="w-full flex items-center justify-center space-x-2"
          variant="secondary"
        >
          <Package className="w-5 h-5" />
          <span>Inventaire</span>
        </Button>
      </div>

      {/* Layout desktop : tout sur une ligne */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex space-x-4">
          <StatItem
            icon={Heart}
            label="Vie"
            value={stats.vie}
            color="bg-red-600"
          />
          <StatItem
            icon={Utensils}
            label="Faim"
            value={stats.faim}
            color="bg-orange-600"
          />
          <StatItem
            icon={Droplets}
            label="Soif"
            value={stats.soif}
            color="bg-blue-600"
          />
          <StatItem
            icon={Zap}
            label="Énergie"
            value={stats.energie}
            color="bg-yellow-600"
          />
        </div>
        
        <Button
          onClick={onInventaire}
          className="flex items-center space-x-2"
          variant="secondary"
        >
          <Package className="w-5 h-5" />
          <span>Inventaire</span>
        </Button>
      </div>
    </footer>
  );
};

export default GameFooter;