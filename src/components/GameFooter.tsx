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
  }: { 
    icon: any; 
    label: string; 
    value: number;
  }) => (
    <div className="flex flex-col items-start space-y-1 p-3 rounded-none border-2 border-black bg-white w-full">
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-black" />
          <span className="text-sm font-medium text-gray-600 font-mono">{label}</span>
        </div>
        <span className="text-sm font-bold text-black font-mono">{value}/100</span>
      </div>
      <Progress value={value} className="w-full h-3 bg-white border border-black" indicatorClassName="bg-black" />
    </div>
  );

  return (
    <footer className="bg-white border-t-2 border-black text-black p-4">
      {/* Layout mobile */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatItem icon={Heart} label="Vie" value={stats.vie} />
          <StatItem icon={Utensils} label="Faim" value={stats.faim} />
          <StatItem icon={Droplets} label="Soif" value={stats.soif} />
          <StatItem icon={Zap} label="Énergie" value={stats.energie} />
        </div>
        <Button
          onClick={onInventaire}
          className="w-full flex items-center justify-center space-x-2 bg-black text-white hover:bg-gray-800 rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          variant="default"
        >
          <Package className="w-5 h-5" />
          <span>Inventaire</span>
        </Button>
      </div>

      {/* Layout desktop */}
      <div className="hidden md:flex items-center">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <StatItem icon={Heart} label="Vie" value={stats.vie} />
          <StatItem icon={Utensils} label="Faim" value={stats.faim} />
          <StatItem icon={Droplets} label="Soif" value={stats.soif} />
          <StatItem icon={Zap} label="Énergie" value={stats.energie} />
        </div>
        
        <div className="w-px h-12 bg-black mx-6"></div>
        
        <Button
          onClick={onInventaire}
          className="flex items-center space-x-2 bg-black text-white hover:bg-gray-800 rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all px-6"
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