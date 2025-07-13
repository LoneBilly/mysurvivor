import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showError } from '@/utils/toast';
import { Loader2, Zap, Clock, Box, BrickWall, TowerControl, AlertTriangle, Hammer, CookingPot, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Item } from '@/types/game';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';

const buildings = [
  { name: 'Coffre basique', type: 'chest', icon: Box, costs: { energy: 20, wood: 20 } },
  { name: 'Mur', type: 'wall', icon: BrickWall, costs: { energy: 10, metal: 20 } },
  { name: 'Tourelle', type: 'turret', icon: TowerControl, costs: { energy: 50, metal: 10, components: 20 } },
  { name: 'Groupe électrogène', type: 'generator', icon: Zap, costs: { energy: 50, metal: 10, components: 20 } },
  { name: 'Piège à loup', type: 'trap', icon: AlertTriangle, costs: { energy: 30, metal: 1 } },
  { name: 'Établi', type: 'workbench', icon: Hammer, costs: { energy: 30, wood: 5 } },
  { name: 'Four', type: 'furnace', icon: CookingPot, costs: { energy: 30, metal: 20 } },
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
  items: Item[];
}

const resourceToItemName: { [key: string]: string } = {
  wood: 'Bois',
  metal: 'Pierre',
  components: 'Composants'
};

const CostDisplay = ({ resource, required, available, itemDetail }: { resource: string; required: number; available: number; itemDetail?: Item }) => {
  const { getIconUrl } = useGame();
  if (required === 0) return null;
  const hasEnough = available >= required;
  const isEnergy = resource === 'energy';
  const iconUrl = itemDetail ? getIconUrl(itemDetail.icon) : null;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "relative w-16 h-16 bg-black/20 rounded-lg border flex flex-col items-center justify-center p-1 text-center",
            hasEnough ? "border-white/10" : "border-red-500/50"
          )}>
            <div className="w-8 h-8 flex items-center justify-center mb-1">
              {isEnergy ? (
                <Zap className={cn("w-7 h-7", hasEnough ? "text-yellow-400" : "text-red-400")} />
              ) : (
                itemDetail ? (
                  <ItemIcon iconName={iconUrl || itemDetail.icon} alt={itemDetail.name} />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )
              )}
            </div>
            <span className={cn("text-xs font-mono", hasEnough ? "text-white" : "text-red-400")}>
              {required}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
          <p className="font-bold">{isEnergy ? 'Énergie' : itemDetail?.name}</p>
          <p className={cn(hasEnough ? "text-gray-300" : "text-red-400")}>Requis: {required}</p>
          <p className="text-gray-300">En stock: {available}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish, playerResources, items }: FoundationMenuModalProps) => {
  const [loading, setLoading] = useState(false);
  const [itemDetails, setItemDetails] = useState<{[key: string]: Item}>({});

  useEffect(() => {
    const fetchItemDetails = () => {
      const neededItemNames = Object.values(resourceToItemName);
      const itemsToFetch = items.filter(item => neededItemNames.includes(item.name));
      
      const details: {[key: string]: Item} = {};
      for (const item of itemsToFetch) {
        const key = Object.keys(resourceToItemName).find(k => resourceToItemName[k] === item.name);
        if (key) {
          details[key] = item;
        }
      }
      setItemDetails(details);
    };

    if (isOpen && items.length > 0) {
      fetchItemDetails();
    }
  }, [isOpen, items]);

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
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Construire sur la fondation</DialogTitle>
          <DialogDescription>Choisissez un bâtiment à construire. Chaque construction prend 1 minute.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          {buildings.map((b) => {
            const Icon = b.icon;
            const costs = { ...b.costs, wood: b.costs.wood || 0, metal: b.costs.metal || 0, components: b.costs.components || 0 };
            const canAfford = Object.entries(costs).every(([resource, cost]) => {
              const resourceKey = resource === 'energy' ? 'energie' : resource;
              return playerResources[resourceKey as keyof typeof playerResources] >= cost;
            });
            return (
              <div key={b.type} className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-10 h-10 text-gray-300 flex-shrink-0" />
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/10">
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
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(costs).map(([resource, cost]) => (
                    <CostDisplay
                      key={resource}
                      resource={resource}
                      required={cost}
                      available={playerResources[resource === 'energy' ? 'energie' : resource as keyof typeof playerResources]}
                      itemDetail={itemDetails[resource]}
                    />
                  ))}
                </div>

                <Button onClick={() => handleBuildClick(b)} disabled={loading || !canAfford} className="w-full">
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