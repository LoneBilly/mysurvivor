import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrickWall, Trash2, Heart, Shield, Wrench, Hammer, Zap } from "lucide-react";
import { BaseConstruction, BuildingLevel } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import ResourceCost from "./ResourceCost";

interface WallModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WallModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WallModalProps) => {
  const { buildingLevels, addConstructionJob, refreshPlayerData, playerData } = useGame();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const levelDef: BuildingLevel | undefined = useMemo(() => {
    if (!construction) return undefined;
    return buildingLevels.find(level => level.building_type === construction.type && level.level === construction.level);
  }, [construction, buildingLevels]);

  const nextLevelDef: BuildingLevel | undefined = useMemo(() => {
    if (!construction) return undefined;
    return buildingLevels.find(level => level.building_type === construction.type && level.level === construction.level + 1);
  }, [construction, buildingLevels]);

  const handleUpgrade = async () => {
    if (!construction || !nextLevelDef) return;
    setIsUpgrading(true);
    const { data, error } = await supabase.rpc('start_building_upgrade', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Amélioration démarrée !");
      if (data && data.length > 0) {
        addConstructionJob(data[0]);
      }
      onClose();
    }
    setIsUpgrading(false);
  };

  const handleRepair = async () => {
    if (!construction) return;
    setIsRepairing(true);
    const { error } = await supabase.rpc('repair_building', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Bâtiment réparé !");
      refreshPlayerData(true);
    }
    setIsRepairing(false);
  };

  if (!isOpen || !construction || !levelDef) return null;

  const maxHp = levelDef.stats?.health || 0;
  const currentHp = construction.building_state?.hp ?? maxHp;
  const isDamaged = currentHp < maxHp;

  const damagePercentage = maxHp > 0 ? (maxHp - currentHp) / maxHp : 0;
  const repairCosts = {
    wood: Math.ceil((levelDef.upgrade_cost_wood || 0) * damagePercentage),
    metal: Math.ceil((levelDef.upgrade_cost_metal || 0) * damagePercentage),
    components: Math.ceil((levelDef.upgrade_cost_components || 0) * damagePercentage),
    metal_ingots: Math.ceil((levelDef.upgrade_cost_metal_ingots || 0) * damagePercentage),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <BrickWall className="w-10 h-10 mx-auto text-orange-500 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Mur - Niveau {construction.level}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Heart size={16} className="text-red-400" />
                <span>PV: {currentHp}/{maxHp}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Shield size={16} className="text-blue-400" />
                <span>Armure: {levelDef.stats?.armor || 0}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          {isDamaged && (
            <div className="p-4 bg-red-900/30 rounded-lg border border-red-500/50">
              <h4 className="font-bold text-lg text-red-300 mb-2">Réparer le mur</h4>
              <p className="text-sm text-red-200 mb-2">Le mur est endommagé. Réparez-le pour restaurer ses points de vie.</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <ResourceCost type="wood" amount={repairCosts.wood} />
                <ResourceCost type="metal" amount={repairCosts.metal} />
                <ResourceCost type="components" amount={repairCosts.components} />
                <ResourceCost type="metal_ingot" amount={repairCosts.metal_ingots} />
              </div>
              <Button onClick={handleRepair} disabled={isRepairing} className="w-full" variant="destructive">
                <Wrench className="w-4 h-4 mr-2" />
                {isRepairing ? "Réparation..." : "Réparer"}
              </Button>
            </div>
          )}

          {nextLevelDef ? (
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="font-bold text-lg mb-2">Améliorer au niveau {nextLevelDef.level}</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                <ResourceCost type="energy" amount={nextLevelDef.upgrade_cost_energy} />
                <ResourceCost type="wood" amount={nextLevelDef.upgrade_cost_wood} />
                <ResourceCost type="metal" amount={nextLevelDef.upgrade_cost_metal} />
                <ResourceCost type="components" amount={nextLevelDef.upgrade_cost_components} />
                <ResourceCost type="metal_ingot" amount={nextLevelDef.upgrade_cost_metal_ingots} />
              </div>
              <Button onClick={handleUpgrade} disabled={isUpgrading} className="w-full">
                <Hammer className="w-4 h-4 mr-2" />
                {isUpgrading ? "Amélioration..." : `Améliorer (${nextLevelDef.upgrade_time_seconds}s)`}
              </Button>
            </div>
          ) : (
            <p className="text-center text-green-400">Niveau maximum atteint</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={() => onDemolish(construction)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Démolir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WallModal;