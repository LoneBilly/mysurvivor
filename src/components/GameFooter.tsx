import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
    colorClassName
  }: { 
    icon: any; 
    label: string; 
    value: number;
    colorClassName: string;
  }) => (
    <div className="flex flex-col items-start space-y-1 p-3 rounded-lg bg-gray-700 border border-gray-600 w-full">
      <div className="flex items-center justify-between w-full mb-1"> {/* Adjusted for label and value on same line */}
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-gray-300" />
          <span className="text-sm font-medium text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-bold text-white">{value}/100</span> {/* Changed to X/100 format */}
      </div>
      <Progress value={value} className="w-full h-2 bg-gray-600" indicatorClassName={colorClassName} />
    </div>
  );

  return (
    <footer className="bg-gray-800 border-t border-gray-700 text-white p-4">
      {/* Layout mobile : 2x2 pour les stats + inventaire pleine largeur */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatItem
            icon={Heart}
            label="Vie"
            value={stats.vie}
            colorClassName="bg-red-500"
          />
          <StatItem
            icon={Utensils}
            label="Faim"
            value={stats.faim}
            colorClassName="bg-orange-500"
          />
          <StatItem
            icon={Droplets}
            label="Soif"
            value={stats.soif}
            colorClassName="bg-blue-500"
          />
          <StatItem
            icon={Zap}
            label="Énergie"
            value={stats.energie}
            colorClassName="bg-yellow-500"
          />
        </div>
        <Button
          onClick={onInventaire}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 border-blue-500"
          variant="default"
        >
          <Package className="w-5 h-5" />
          <span>Inventaire</span>
        </Button>
      </div>

      {/* Layout desktop : stats prennent toute la largeur avec séparation pour l'inventaire */}
      <div className="hidden md:flex items-center">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <StatItem
            icon={Heart}
            label="Vie"
            value={stats.vie}
            colorClassName="bg-red-500"
          />
          <StatItem
            icon={Utensils}
            label="Faim"
            value={stats.faim}
            colorClassName="bg-orange-500"
          />
          <StatItem
            icon={Droplets}
            label="Soif"
            value={stats.soif}
            colorClassName="bg-blue-500"
          />
          <StatItem
            icon={Zap}
            label="Énergie"
            value={stats.energie}
            colorClassName="bg-yellow-500"
          />
        </div>
        
        {/* Séparateur vertical */}
        <div className="w-px h-12 bg-gray-600 mx-6"></div>
        
        <Button
          onClick={onInventaire}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 border-blue-500 px-6"
          variant="default"
        >
          <Package className="w-5 h-5" />
          <span>Inventaire</span>
        </Button>
      </div>
    </footer>
  );
};

export default GameFooter;