import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showError } from '@/utils/toast';
import { Loader2, Zap, Clock, Box, BrickWall, TowerControl, AlertTriangle, Hammer, CookingPot, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Item } from '@/types/game';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';

const buildingIcons: { [key: string]: React.ElementType } = {
  chest: Box,
  wall: BrickWall,
  turret: TowerControl,
  generator: Zap,
  trap: AlertTriangle,
  workbench: Hammer,
  furnace: CookingPot,
};

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string;
  build_time_seconds: number;
  cost_energy: number;
  cost_wood: number;
  cost_metal: number;
  cost_components: number;
}

const resourceToItemName: { [key: string]: string } = {
  wood: 'Bois',
  metal: 'Pierre', // This must remain 'Pierre' to match the item name in DB
  components: 'Composants'
};

const CostDisplay = ({ resource, required, available, itemDetail }: { resource: string; required: number; available: number; itemDetail?: Item }) => {
  const { getIconUrl } = useGame();
  if (required === 0) return null;
  const hasEnough = available >= required;
  const iconUrl = itemDetail ? getIconUrl(itemDetail.icon) : null;

  const displayName = useMemo(() => {
    if (resource === 'metal') return 'Métal';
    if (resource === 'wood') return 'Bois';
    if (resource === 'components') return 'Composants';
    return itemDetail?.name || resource;
  }, [resource, itemDetail]);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "relative w-16 h-16 bg-black/20 rounded-lg border",
            hasEnough ? "border-white/10" : "border-red-500/50"
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              {itemDetail ? (
                <div className="w-8 h-8 relative">
                  <ItemIcon iconName={iconUrl || itemDetail.icon} alt={itemDetail.name} />
                </div>
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>
            <span className={cn(
                "absolute bottom-1 right-1.5 text-sm font-bold z-10",
                hasEnough ? "text-white" : "text-red-400"
            )} style={{ textShadow: '1px 1px 2px black' }}>
              {required}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
          <p className="font-bold">{displayName}</p>
          <p className={cn(hasEnough ? "text-gray-300" : "text-red-400")}>Requis: {required}</p>
          <p className="text-gray-300">En stock: {available}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface FoundationMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number | null;
  y: number | null;
  onBuild: (x: number, y: number, building: BuildingDefinition) => void;
  onDemolish: (x: number, y: number) => void;
  playerResources: {
    energie: number;
    wood: number;
    metal: number;
    components: number;
  };
  items: Item[];
}

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish, playerResources, items }: FoundationMenuModalProps) => {
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);
  const [itemDetails, setItemDetails] = useState<{[key: string]: Item}>({});

  useEffect(() => {
    const fetchBuildingDefinitions = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('building_definitions').select('*');
      if (error) {
        showError("Impossible de charger les définitions des bâtiments.");
      } else {
        setBuildings(data || []);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchBuildingDefinitions();
    }
  }, [isOpen]);

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

  const handleBuildClick = (building: BuildingDefinition) => {
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
          <DialogDescription>Choisissez un bâtiment à construire.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            buildings.map((b) => {
              const Icon = buildingIcons[b.type];
              const resourceCosts = { wood: b.cost_wood, metal: b.cost_metal, components: b.cost_components };
              const canAfford = Object.entries(resourceCosts).every(([resource, cost]) => playerResources[resource as keyof typeof resourceCosts] >= cost) && playerResources.energie >= b.cost_energy;
              
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
                              <Zap className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm font-mono text-white">{b.cost_energy}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Énergie requise</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/10">
                              <Clock className="w-4 h-4 text-gray-300" />
                              <span className="text-sm font-mono text-white">{Math.floor(b.build_time_seconds / 60)}m {b.build_time_seconds % 60}s</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Temps de construction</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(resourceCosts).map(([resource, cost]) => (
                      <CostDisplay
                        key={resource}
                        resource={resource}
                        required={cost}
                        available={playerResources[resource as keyof typeof resourceCosts]}
                        itemDetail={itemDetails[resource]}
                      />
                    ))}
                  </div>

                  <Button onClick={() => handleBuildClick(b)} disabled={loading || !canAfford} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Construire'}
                  </Button>
                </div>
              );
            })
          )}
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