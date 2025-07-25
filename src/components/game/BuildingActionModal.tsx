import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BaseConstruction, BuildingLevel } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, X, Heart, Wrench, Trash2 } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { showSuccess, showError } from '@/utils/toast';
import { formatTime } from '@/utils/format-time';
import { ResourceCostList } from './ResourceCostList';
import DynamicIcon from '../DynamicIcon';

interface BuildingActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const BuildingActionModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: BuildingActionModalProps) => {
  const { buildingLevels, playerData, addConstructionJob } = useGame();
  const [levelData, setLevelData] = useState<BuildingLevel | null>(null);
  const [nextLevelData, setNextLevelData] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && construction) {
      setLoading(true);
      const currentLevel = buildingLevels.find(l => l.building_type === construction.type && l.level === construction.level);
      const nextLevel = buildingLevels.find(l => l.building_type === construction.type && l.level === construction.level + 1);
      setLevelData(currentLevel || null);
      setNextLevelData(nextLevel || null);
      setLoading(false);
    }
  }, [isOpen, construction, buildingLevels]);

  const maxHp = levelData?.stats?.health ?? 0;
  const currentHp = construction?.building_state?.hp ?? maxHp;
  const isDamaged = currentHp < maxHp;

  const repairCost = useMemo(() => {
    if (!levelData || !isDamaged) return [];
    const damagePercentage = (maxHp - currentHp) / maxHp;
    return [
      { resource: 'wood', amount: Math.ceil(levelData.upgrade_cost_wood * damagePercentage) },
      { resource: 'metal', amount: Math.ceil(levelData.upgrade_cost_metal * damagePercentage) },
      { resource: 'components', amount: Math.ceil(levelData.upgrade_cost_components * damagePercentage) },
      { resource: 'metal_ingots', amount: Math.ceil(levelData.upgrade_cost_metal_ingots * damagePercentage) },
    ].filter(c => c.amount > 0);
  }, [levelData, isDamaged, currentHp, maxHp]);

  const upgradeCost = useMemo(() => {
    if (!nextLevelData) return [];
    return [
      { resource: 'energy', amount: nextLevelData.upgrade_cost_energy },
      { resource: 'wood', amount: nextLevelData.upgrade_cost_wood },
      { resource: 'metal', amount: nextLevelData.upgrade_cost_metal },
      { resource: 'components', amount: nextLevelData.upgrade_cost_components },
      { resource: 'metal_ingots', amount: nextLevelData.upgrade_cost_metal_ingots },
    ].filter(c => c.amount > 0);
  }, [nextLevelData]);

  const handleRepair = async () => {
    if (!construction) return;
    setIsProcessing(true);
    const { error } = await supabase.rpc('repair_building', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Bâtiment réparé !");
      onUpdate();
      onClose();
    }
    setIsProcessing(false);
  };

  const handleUpgrade = async () => {
    if (!construction) return;
    setIsProcessing(true);
    const { data, error } = await supabase.rpc('start_building_upgrade', { p_construction_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Amélioration lancée !");
      if (data && data.length > 0) addConstructionJob(data[0]);
      onUpdate();
      onClose();
    }
    setIsProcessing(false);
  };

  if (!isOpen || !construction) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-white relative" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></Button>
        {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : !levelData ? <p>Données introuvables.</p> : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-slate-700/50 rounded-lg flex items-center justify-center">
                <DynamicIcon name={levelData.icon} className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{levelData.name} - Nv. {construction.level}</h2>
                <p className="text-slate-400">{levelData.description}</p>
              </div>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <div className="flex items-center gap-2 text-red-400">
                  <Heart className="w-5 h-5" />
                  <span>Points de Vie</span>
                </div>
                <span>{currentHp} / {maxHp}</span>
              </div>
            </div>

            {isDamaged ? (
              <div>
                <h3 className="font-semibold text-lg mb-2">Réparer le bâtiment</h3>
                <ResourceCostList costs={repairCost} resources={playerData.totalResources} />
                <Button onClick={handleRepair} disabled={isProcessing} className="w-full mt-4">
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                  Réparer
                </Button>
              </div>
            ) : nextLevelData ? (
              <div>
                <h3 className="font-semibold text-lg mb-2">Prochain niveau: {nextLevelData.level}</h3>
                <p className="text-sm text-slate-300 mb-2">{nextLevelData.description}</p>
                <ResourceCostList costs={upgradeCost} resources={playerData.totalResources} />
                <p className="text-sm mt-2"><span className="font-semibold text-slate-400">Temps:</span> {formatTime(nextLevelData.upgrade_time_seconds)}</p>
                <Button onClick={handleUpgrade} disabled={isProcessing} className="w-full mt-4">
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUp className="w-4 h-4 mr-2" />}
                  Améliorer
                </Button>
              </div>
            ) : (
              <p className="text-center font-semibold text-green-400">Niveau maximum atteint !</p>
            )}
            <Button variant="destructive" size="sm" onClick={() => onDemolish(construction)} className="w-full mt-4">
              <Trash2 className="w-4 h-4 mr-2" /> Démolir
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BuildingActionModal;