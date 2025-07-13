import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showError } from '@/utils/toast';
import { Loader2, Zap, Clock, Box, BrickWall, TowerControl, AlertTriangle, Hammer, CookingPot, Trash2, TreeDeciduous, Cog } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

const buildings = [
  { name: 'Coffre basique', type: 'chest', icon: Box, costs: { energy: 20, wood: 20, metal: 0, components: 0 } },
  { name: 'Mur', type: 'wall', icon: BrickWall, costs: { energy: 10, wood: 0, metal: 20, components: 0 } },
  { name: 'Tourelle', type: 'turret', icon: TowerControl, costs: { energy: 50, wood: 0, metal: 10, components: 20 } },
  { name: 'Groupe électrogène', type: 'generator', icon: Zap, costs: { energy: 50, wood: 0, metal: 10, components: 20 } },
  { name: 'Piège à loup', type: 'trap', icon: AlertTriangle, costs: { energy: 30, wood: 0, metal: 1, components: 0 } },
  { name: 'Établi', type: 'workbench', icon: Hammer, costs: { energy: 30, wood: 5, metal: 0, components: 0 } },
  { name: 'Four', type: 'furnace', icon: CookingPot, costs: { energy: 30, wood: 0, metal: 20, components: 0 } },
];

type Building = typeof buildings[0];

interface FoundationMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number | null;
  y: number | null;
  onBuild: (x: number, y: number, building: Building) => void;
  onDemolish: (x: number, y: number) => void;
  playerResources: {
    energie: number;
    wood: number;
    metal: number;
    components: number;
  };
}

const resourceDetails: { [key: string]: { name: string; icon: React.ElementType } } = {
  energy: { name: 'Énergie', icon: Zap },
  wood: { name: 'Bois', icon: TreeDeciduous },
  metal: { name: 'Métal', icon: Hammer },
  components: { name: 'Composants', icon: Cog },
};

const CostSlot = ({ resource, required, available }: { resource: string; required: number; available: number }) => {
  if (required === 0) return null;
  const hasEnough = available >= required;
  const details = resourceDetails[resource];
  if (!details) return null;
  const Icon = details.icon;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-md border border-white/10">
            <Icon className={cn("w-4 h-4", hasEnough ? "text-gray-300" : "text-red-400")} />
            <span className={cn("text-sm font-mono", hasEnough ? "text-white" : "text-red-400")}>
              {required}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
          <p>{details.name}: {available} / {required}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish, playerResources }: FoundationMenuModalProps) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

  const handleBuildClick = (building: Building) => {
    if (x === null || y === null) {
      showError("Erreur de coordonnées.");
      return;
    }
    setLoading(true);
    onClose();
    onBuild(x, y, building);
  };

  const handleDemolishClick = () => {
    if (x === null || y === null) {
      showError("Erreur de coordonnées.");
      return;
    }
    setLoading(true);
    onClose();
    onDemolish(x, y);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Construire sur la fondation</DialogTitle>
          <DialogDescription>Choisissez un bâtiment à construire. Chaque construction prend 1 minute.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
          {buildings.map((b) => {
            const Icon = b.icon;
            const canAfford = Object.entries(b.costs).every(([resource, cost]) => {
              return playerResources[resource as keyof typeof playerResources] >= cost;
            });
            return (
              <div key={b.type} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-8 h-8 text-gray-300 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-semibold">{b.name}</p>
                    <div className="flex items-center gap-2">
                      {Object.entries(b.costs).map(([resource, cost]) => (
                        <CostSlot
                          key={resource}
                          resource={resource}
                          required={cost}
                          available={playerResources[resource as keyof typeof playerResources]}
                        />
                      ))}
                       <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-md border border-white/10">
                              <Clock className="w-4 h-4 text-gray-300" />
                              <span className="text-sm font-mono text-white">1m</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
                            <p>Temps de construction</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleBuildClick(b)} disabled={loading || !canAfford} className="ml-4">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Construire'}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDemolishClick} className="w-full flex items-center gap-2">
            <Trash2 className="w-4 h-4 mr-2" /> Démolir la fondation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FoundationMenuModal;