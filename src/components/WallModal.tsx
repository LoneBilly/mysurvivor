import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, Item } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { BrickWall, Trash2, ArrowUpCircle, Heart, Loader2, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import BuildingUpgradeModal from './BuildingUpgradeModal';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import ItemIcon from './ItemIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WallModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => Promise<void>;
}

const CostDisplay = ({ item, required, available }: { item?: Item, required: number, available: number }) => {
  const { getIconUrl } = useGame();
  if (!item || required === 0) return null;
  const hasEnough = available >= required;
  const iconUrl = getIconUrl(item.icon);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative w-12 h-12 bg-black/20 rounded-lg border flex items-center justify-center", hasEnough ? "border-white/10" : "border-red-500/50")}>
            <div className="w-8 h-8 relative">
              <ItemIcon iconName={iconUrl || item.icon} alt={item.name} />
            </div>
            <span className={cn("absolute -bottom-1 -right-1 text-xs font-bold px-1 rounded bg-gray-900", hasEnough ? "text-white" : "text-red-400")}>{required}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{item.name}</p>
          <p>Requis: {required}</p>
          <p>En stock: {available}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const WallModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WallModalProps) => {
  const { playerData, items, buildingLevels } = useGame();
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const currentLevelInfo = useMemo(() => {
    if (!construction) return null;
    return buildingLevels.find(
      level => level.building_type === construction.type && level.level === construction.level
    );
  }, [construction, buildingLevels]);

  const hasNextLevel = useMemo(() => {
    if (!construction) return false;
    return buildingLevels.some(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
  }, [construction, buildingLevels]);

  const maxHp = currentLevelInfo?.stats?.max_hp || 100;
  const currentHp = construction?.building_state?.hp ?? maxHp;
  const damage = maxHp - currentHp;
  const damagePercentage = maxHp > 0 ? damage / maxHp : 0;

  const totalResources = useMemo(() => {
    const calculateTotal = (itemName: string) => {
      const inventoryQty = playerData.inventory.find(i => i.items?.name === itemName)?.quantity || 0;
      const chestQty = playerData.chestItems
        .filter(i => i.items?.name === itemName)
        .reduce((acc, i) => acc + i.quantity, 0);
      return inventoryQty + chestQty;
    };
    return {
      wood: calculateTotal('Bois'),
      metal: calculateTotal('Pierre'),
    };
  }, [playerData.inventory, playerData.chestItems]);

  const resourceItems = useMemo(() => ({
    wood: items.find(i => i.name === 'Bois'),
    metal: items.find(i => i.name === 'Pierre'),
  }), [items]);

  const repairCosts = useMemo(() => {
    if (!currentLevelInfo || damagePercentage <= 0) return null;
    return {
      wood: Math.ceil((currentLevelInfo.upgrade_cost_wood || 0) * damagePercentage),
      metal: Math.ceil((currentLevelInfo.upgrade_cost_metal || 0) * damagePercentage),
    };
  }, [currentLevelInfo, damagePercentage]);

  const canAffordRepair = useMemo(() => {
    if (!repairCosts) return false;
    return totalResources.wood >= repairCosts.wood && totalResources.metal >= repairCosts.metal;
  }, [repairCosts, totalResources]);

  const handleRepair = async () => {
    if (!construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('repair_building', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Mur réparé !");
      await onUpdate(true);
    }
    setLoading(false);
  };

  if (!construction) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader className="text-center">
            <BrickWall className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Mur - Niveau {construction.level}</DialogTitle>
            <DialogDescription>Protège votre base des intrus.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-center mb-4 p-3 bg-black/20 rounded-lg">
              <p className="text-sm text-gray-400">Points de vie</p>
              <p className="text-2xl font-bold font-mono text-red-400 flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                {currentHp} / {maxHp}
              </p>
              <Progress value={(currentHp / maxHp) * 100} className="mt-2 h-3" indicatorClassName="bg-red-500" />
            </div>
            {damage > 0 && (
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-3">
                <h4 className="font-semibold text-center">Réparer le mur</h4>
                <div className="flex justify-center gap-2">
                  <CostDisplay item={resourceItems.wood} required={repairCosts?.wood || 0} available={totalResources.wood} />
                  <CostDisplay item={resourceItems.metal} required={repairCosts?.metal || 0} available={totalResources.metal} />
                </div>
                <Button onClick={handleRepair} disabled={loading || !canAffordRepair} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wrench className="w-4 h-4 mr-2" />Réparer</>}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:space-x-2 gap-2">
            {hasNextLevel ? (
              <Button onClick={() => setIsUpgradeModalOpen(true)} className="flex-1">
                <ArrowUpCircle className="w-4 h-4 mr-2" /> Améliorer
              </Button>
            ) : (
              <Button disabled className="flex-1">Niv Max</Button>
            )}
            <Button variant="destructive" onClick={() => onDemolish(construction)} className="flex-1">
              <Trash2 className="w-4 h-4 mr-2" /> Détruire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BuildingUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        construction={construction}
        onUpdate={onUpdate}
        onUpgradeComplete={onClose}
      />
    </>
  );
};

export default WallModal;