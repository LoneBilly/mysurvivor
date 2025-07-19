import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Utensils, Droplets, Zap, Package, Coins, MoreHorizontal } from "lucide-react";
import { GameStats } from "@/types/game";

interface GameFooterProps {
  stats: GameStats;
  credits: number;
  onInventaire: () => void;
  onPurchaseCredits: () => void;
  onMoreOptions: () => void; // New prop for the more options button
}

const GameFooter = ({ stats, credits, onInventaire, onPurchaseCredits, onMoreOptions }: GameFooterProps) => {
  const StatItem = ({ 
    icon: Icon, 
    label, 
    value,
  }: { 
    icon: any; 
    label: string; 
    value: number;
  }) => (
    <div className="flex flex-col items-start space-y-1 p-3 rounded-lg border border-white/10 bg-white/5 w-full">
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-gray-300 font-mono">{label}</span>
        </div>
        <span className="text-sm font-bold text-white font-mono">{value}/100</span>
      </div>
      <Progress value={value} className="w-full h-3 bg-white/10 border border-white/20 rounded-full" indicatorClassName="bg-white rounded-full" />
    </div>
  );

  return (
    <footer className="bg-white/5 backdrop-blur-lg border-t border-white/10 text-white p-4">
      {/* Layout mobile */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatItem icon={Heart} label="Vie" value={stats.vie} />
          <StatItem icon={Utensils} label="Faim" value={stats.faim} />
          <StatItem icon={Droplets} label="Soif" value={stats.soif} />
          <StatItem icon={Zap} label="Énergie" value={stats.energie} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onPurchaseCredits}
            className="flex items-center justify-between bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-3 w-24"
            variant="default"
          >
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-bold">{credits}</span>
          </Button>
          <Button
            onClick={onInventaire}
            className="flex-grow flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all"
            variant="default"
          >
            <Package className="w-5 h-5" />
            <span>Inventaire</span>
          </Button>
          <Button
            onClick={onMoreOptions}
            className="flex-shrink-0 flex items-center justify-center bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all w-24"
            variant="default"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Layout desktop */}
      <div className="hidden md:flex items-center">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <StatItem icon={Heart} label="Vie" value={stats.vie} />
          <StatItem icon={Utensils} label="Faim" value={stats.faim} />
          <StatItem icon={Droplets} label="Soif" value={stats.soif} />
          <StatItem icon={Zap} label="Énergie" value={stats.energie} />
        </div>
        
        <div className="w-px h-12 bg-white/20 mx-4"></div>
        
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={onInventaire}
            className="w-full justify-center flex items-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-6 py-2"
            variant="default"
          >
            <Package className="w-5 h-5 mr-2" />
            <span>Inventaire</span>
          </Button>
          <Button
            onClick={onMoreOptions}
            className="w-full justify-center flex items-center space-x-2 bg-white/10 text-white hover:bg-white/20 rounded-lg border border-white/20 transition-all px-6 py-2"
            variant="default"
          >
            <MoreHorizontal className="w-5 h-5 mr-2" />
            <span>Plus</span>
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default GameFooter;