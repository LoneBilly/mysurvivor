import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, Clock } from 'lucide-react';
import { BaseConstruction, Item } from '@/types/game';
import { BuildingLevel } from '@/types/admin';
import { useGame } from '@/contexts/GameContext';
import { showError, showSuccess } from '@/utils/toast';
import ItemIcon from './ItemIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface BuildingUpgradePanelProps {
  construction: BaseConstruction;
  onClose: () => void;
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
  const iconUrl = itemDetail ? getIconUrl(itemDetail.icon) : null;

  const displayName = useMemo(() => {
    if (resource === 'metal') return 'Pierre';
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

const BuildingUpgradePanel = ({ construction, onClose }: BuildingUpgradePanelProps) => {
  const { playerData, items, addConstructionJob, refreshPlayerData } = useGame();
  const [nextLevel, setNextLevel] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemDetails, setItemDetails] = useState<{[key: string]: Item}>({});

  useEffect(() => {
    const fetchNextLevel = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('building_levels')
        .select('*')
        .eq('building_type', construction.type)
        .eq('level', construction.level + 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        showError("Erreur de chargement de l'amélioration.");
      } else {
        setNextLevel(data);
      }
      setLoading(false);
    };

    fetchNextLevel();
  }, [construction]);

  useEffect(() => {
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
  }, [items]);

  const totalResources = useMemo(() => {
    const inventoryWood = playerData.inventory.find(i => i.items?.name === 'Bois')?.quantity || 0;
    const inventoryMetal = playerData.inventory.find(i => i.items?.name === 'Pierre')?.quantity || 0;
    const inventoryComponents = playerData.inventory.find(i => i.items?.name === 'Composants')?.quantity || 0;
    
    return {
      wood: playerData.playerState.wood + inventoryWood,
      metal: playerData.playerState.metal + inventoryMetal,
      components: playerData.playerState.components + inventoryComponents,
    };
  }, [playerData.playerState, playerData.inventory]);

  const handleUpgrade = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('start_building_upgrade', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Amélioration lancée !");
      if (data && data.length > 0) {
        addConstructionJob(data[0]);
      }
      await refreshPlayerData(true);
      onClose();
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!nextLevel) {
    return <div className="text-center p-4 text-gray-400">Niveau maximum atteint.</div>;
  }

  const canAfford = totalResources.wood >= nextLevel.upgrade_cost_wood &&
                    totalResources.metal >= nextLevel.upgrade_cost_metal &&
                    totalResources.components >= nextLevel.upgrade_cost_components;

  const isJobRunning = playerData.constructionJobs && playerData.constructionJobs.length > 0;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
      <h4 className="font-bold text-center">Améliorer au niveau {nextLevel.level}</h4>
      <div className="flex justify-center flex-wrap gap-2">
        <CostDisplay resource="wood" required={nextLevel.upgrade_cost_wood} available={totalResources.wood} itemDetail={itemDetails.wood} />
        <CostDisplay resource="metal" required={nextLevel.upgrade_cost_metal} available={totalResources.metal} itemDetail={itemDetails.metal} />
        <CostDisplay resource="components" required={nextLevel.upgrade_cost_components} available={totalResources.components} itemDetail={itemDetails.components} />
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
        <Clock className="w-4 h-4" />
        <span>Temps: {nextLevel.upgrade_time_seconds}s</span>
      </div>
      <Button onClick={handleUpgrade} disabled={loading || !canAfford || isJobRunning} className="w-full">
        {isJobRunning ? "Construction en cours..." : !canAfford ? "Ressources insuffisantes" : (
          <>
            <ArrowUp className="w-4 h-4 mr-2" />
            Améliorer
          </>
        )}
      </Button>
    </div>
  );
};

export default BuildingUpgradePanel;