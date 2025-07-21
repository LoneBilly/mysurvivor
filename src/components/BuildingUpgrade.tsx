import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpCircle, Clock, Zap, Box, ArrowRight } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { BaseConstruction, Item } from '@/types/game';
import { BuildingLevel } from '@/types/game';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import ItemIcon from './ItemIcon';
import DynamicIcon from './DynamicIcon';

interface BuildingUpgradeProps {
  construction: BaseConstruction;
  onUpdate: (silent?: boolean) => void;
  onClose: () => void;
  onUpgradeComplete?: () => void;
}

const statDisplayConfig: { [key: string]: { label: string; icon: React.ElementType; unit?: string } } = {
  storage_slots: { label: "Slots de stockage", icon: Box },
  energy_regen_per_second: { label: "Régénération d'énergie", icon: Zap, unit: "/s" },
  crafting_speed_modifier_percentage: { label: "Vitesse de fabrication", icon: Clock, unit: '%' },
};

const CostDisplay = ({ item, required, available, icon: IconComponent }: { item?: Item, required: number, available: number, icon?: React.ElementType }) => {
  const { getIconUrl } = useGame();
  if ((!item && !IconComponent) || required === 0) return null;
  const hasEnough = available >= required;
  const iconUrl = item ? getIconUrl(item.icon) : undefined;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative w-12 h-12 bg-black/20 rounded-lg border flex items-center justify-center", hasEnough ? "border-white/10" : "border-red-500/50")}>
            <div className="w-8 h-8 relative">
              {IconComponent ? <IconComponent className="w-full h-full text-yellow-400" /> : <ItemIcon iconName={iconUrl || item?.icon} alt={item?.name || ''} />}
            </div>
            <span className={cn("absolute -bottom-1 -right-1 text-xs font-bold px-1 rounded bg-gray-900", hasEnough ? "text-white" : "text-red-400")}>{required}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{item?.name || 'Énergie'}</p>
          <p>Requis: {required}</p>
          <p>En stock: {available}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const BuildingUpgrade = ({ construction, onUpdate, onClose, onUpgradeComplete }: BuildingUpgradeProps) => {
  const { playerData, items, addConstructionJob, buildingLevels } = useGame();
  const [nextLevel, setNextLevel] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const currentLevel = useMemo(() => {
    return buildingLevels.find(
      level => level.building_type === construction.type && level.level === construction.level
    );
  }, [construction, buildingLevels]);

  useEffect(() => {
    setLoading(true);
    const nextLevelData = buildingLevels.find(
      level => level.building_type === construction.type && level.level === construction.level + 1
    );
    setNextLevel(nextLevelData || null);
    setLoading(false);
  }, [construction, buildingLevels]);

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
      components: calculateTotal('Composants'),
      metal_ingots: calculateTotal('Lingot de métal'),
      energy: playerData.playerState.energie || 0,
    };
  }, [playerData]);

  const resourceItems = useMemo(() => ({
    wood: items.find(i => i.name === 'Bois'),
    metal: items.find(i => i.name === 'Pierre'),
    components: items.find(i => i.name === 'Composants'),
    metal_ingots: items.find(i => i.name === 'Lingot de métal'),
  }), [items]);

  const canAfford = useMemo(() => {
    if (!nextLevel) return false;
    return (
      totalResources.energy >= (nextLevel.upgrade_cost_energy || 0) &&
      totalResources.wood >= (nextLevel.upgrade_cost_wood || 0) &&
      totalResources.metal >= (nextLevel.upgrade_cost_metal || 0) &&
      totalResources.components >= (nextLevel.upgrade_cost_components || 0) &&
      totalResources.metal_ingots >= (nextLevel.upgrade_cost_metal_ingots || 0)
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
      if (onUpgradeComplete) onUpgradeComplete();
    }
    setIsUpgrading(false);
  };

  const isJobRunning = playerData.constructionJobs && playerData.constructionJobs.length > 0;

  const statChanges = useMemo(() => {
    if (!currentLevel || !nextLevel) return [];
    const allKeys = new Set([...Object.keys(currentLevel.stats || {}), ...Object.keys(nextLevel.stats || {})]);
    const changes = [];
    for (const key of allKeys) {
      const oldValue = (currentLevel.stats as any)?.[key] ?? 0;
      const newValue = (nextLevel.stats as any)?.[key] ?? 0;
      if (oldValue !== newValue) {
        changes.push({ key, oldValue, newValue });
      }
    }
    return changes;
  }, [currentLevel, nextLevel]);

  return (
    <div className="w-full space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
      {loading ? (
        <div className="h-24 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : nextLevel ? (
        <>
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">Niveau suivant: {nextLevel.level}</h4>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{nextLevel.upgrade_time_seconds}s</span>
            </div>
          </div>
          {statChanges.length > 0 && (
            <div className="space-y-2 text-sm">
              {statChanges.map(({ key, oldValue, newValue }) => {
                const config = statDisplayConfig[key];
                if (!config) return null;
                return (
                  <div key={key} className="flex items-center justify-between bg-black/20 p-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4 text-gray-300" />
                      <span>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span>{oldValue}{config.unit}</span>
                      <ArrowRight className="w-4 h-4 text-green-400" />
                      <span className="font-bold text-green-300">{newValue}{config.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-center gap-2 flex-wrap">
            <CostDisplay icon={Zap} required={nextLevel.upgrade_cost_energy || 0} available={totalResources.energy} />
            <CostDisplay item={resourceItems.wood} required={nextLevel.upgrade_cost_wood || 0} available={totalResources.wood} />
            <CostDisplay item={resourceItems.metal} required={nextLevel.upgrade_cost_metal || 0} available={totalResources.metal} />
            <CostDisplay item={resourceItems.components} required={nextLevel.upgrade_cost_components || 0} available={totalResources.components} />
            <CostDisplay item={resourceItems.metal_ingots} required={nextLevel.upgrade_cost_metal_ingots || 0} available={totalResources.metal_ingots} />
          </div>
          <Button onClick={handleUpgrade} disabled={!canAfford || isUpgrading || isJobRunning} className="w-full">
            {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : isJobRunning ? "Construction en cours..." : <><ArrowUpCircle className="w-4 h-4 mr-2" />Améliorer</>}
          </Button>
        </>
      ) : (
        <div className="w-full h-10 flex items-center justify-center bg-gray-800/50 rounded-md text-gray-400 font-bold">
          Niv Max
        </div>
      )}
    </div>
  );
};

export default BuildingUpgrade;