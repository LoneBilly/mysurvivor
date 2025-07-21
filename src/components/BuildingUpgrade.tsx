import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpCircle, Clock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { BaseConstruction, Item } from '@/types/game';
import { BuildingLevel } from '@/types/admin';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import ItemIcon from './ItemIcon';

interface BuildingUpgradeProps {
  construction: BaseConstruction;
  onUpdate: (silent?: boolean) => void;
  onClose: () => void;
}

const CostDisplay = ({ item, required, available }: { item: Item | undefined, required: number, available: number }) => {
  const { getIconUrl } = useGame();
  if (!item || required === 0) return null;
  const hasEnough = available >= required;
  const iconUrl = getIconUrl(item.icon);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative w-12 h-12 bg-black/20 rounded-lg border flex items-center justify-center", hasEnough ? "border-white/10" : "border-red-500/50")}>
            <div className="w-7 h-7 relative"><ItemIcon iconName={iconUrl || item.icon} alt={item.name} /></div>
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

const BuildingUpgrade = ({ construction, onUpdate, onClose }: BuildingUpgradeProps) => {
  const { playerData, items, addConstructionJob } = useGame();
  const [nextLevel, setNextLevel] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

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
        showError("Erreur de chargement du niveau suivant.");
      } else {
        setNextLevel(data);
      }
      setLoading(false);
    };

    fetchNextLevel();
  }, [construction]);

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

  const resourceItems = useMemo(() => ({
    wood: items.find(i => i.name === 'Bois'),
    metal: items.find(i => i.name === 'Pierre'),
    components: items.find(i => i.name === 'Composants'),
  }), [items]);

  const canAfford = useMemo(() => {
    if (!nextLevel) return false;
    return (
      totalResources.wood >= nextLevel.upgrade_cost_wood &&
      totalResources.metal >= nextLevel.upgrade_cost_metal &&
      totalResources.components >= nextLevel.upgrade_cost_components
    );
  }, [nextLevel, totalResources]);

  const handleUpgrade = async () => {
    if (!nextLevel) return;
    setIsUpgrading(true);
    const { data, error } = await supabase.rpc('start_building_upgrade', { p_construction_id: construction.id });
    
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Amélioration vers le niveau ${nextLevel.level} lancée !`);
      if (data && data.length > 0) {
        addConstructionJob(data[0]);
      }
      onUpdate(true);
      onClose();
    }
    setIsUpgrading(false);
  };

  if (loading) {
    return <div className="h-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  if (!nextLevel) {
    return <Button disabled>Niveau maximum atteint</Button>;
  }

  const isJobRunning = playerData.constructionJobs && playerData.constructionJobs.length > 0;

  return (
    <div className="w-full space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Niveau suivant: {nextLevel.level}</h4>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{nextLevel.upgrade_time_seconds}s</span>
        </div>
      </div>
      <div className="flex justify-center gap-2">
        <CostDisplay item={resourceItems.wood} required={nextLevel.upgrade_cost_wood} available={totalResources.wood} />
        <CostDisplay item={resourceItems.metal} required={nextLevel.upgrade_cost_metal} available={totalResources.metal} />
        <CostDisplay item={resourceItems.components} required={nextLevel.upgrade_cost_components} available={totalResources.components} />
      </div>
      <Button onClick={handleUpgrade} disabled={!canAfford || isUpgrading || isJobRunning} className="w-full">
        {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : isJobRunning ? "Construction en cours..." : <><ArrowUpCircle className="w-4 h-4 mr-2" />Améliorer</>}
      </Button>
    </div>
  );
};

export default BuildingUpgrade;