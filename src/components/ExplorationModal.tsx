import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Clock, Loader2, Axe, Pickaxe, Bone } from "lucide-react";
import { MapCell, InventoryItem } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useState, useEffect, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import ItemIcon from "./ItemIcon";

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  onUpdate: () => Promise<void>;
}

interface ZoneInfo {
  potentialLoot: { name: string; icon: string | null; description: string | null }[];
  potentialEvents: { name: string; icon: string | null; description: string | null }[];
}

const resourceBoostMapping: Record<string, { name: string, icon: React.ElementType }> = {
  bonus_recolte_bois_pourcentage: { name: 'Bois', icon: Axe },
  bonus_recolte_pierre_pourcentage: { name: 'Pierre', icon: Pickaxe },
  bonus_recolte_viande_pourcentage: { name: 'Viande', icon: Bone },
};

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate }: ExplorationModalProps) => {
  const { getIconUrl, playerData } = useGame();
  const [isExploring, setIsExploring] = useState(false);
  const [explorationResult, setExplorationResult] = useState<any>(null);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  useEffect(() => {
    if (isOpen && zone) {
      setIsLoadingInfo(true);
      const fetchZoneInfo = async () => {
        const { data, error } = await supabase.rpc('get_zone_info', { p_zone_id: zone.id });
        if (error) {
          showError("Erreur lors de la récupération des informations de la zone.");
          console.error(error);
        } else {
          setZoneInfo(data);
        }
        setIsLoadingInfo(false);
      };
      fetchZoneInfo();
    } else {
      setExplorationResult(null);
      setIsExploring(false);
      setZoneInfo(null);
    }
  }, [isOpen, zone]);

  const handleExplore = async () => {
    if (!zone) return;
    setIsExploring(true);
    const { error: startError } = await supabase.rpc('start_exploration', { p_zone_id: zone.id });
    if (startError) {
      showError(startError.message);
      setIsExploring(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data, error } = await supabase.rpc('finish_exploration', { p_zone_id: zone.id });
    if (error) {
      showError(error.message);
    } else {
      setExplorationResult(data);
    }
    setIsExploring(false);
  };

  const handleCollectLoot = async () => {
    if (!explorationResult?.loot || explorationResult.loot.length === 0) {
      onClose();
      return;
    }
    const { error } = await supabase.rpc('collect_exploration_loot', { p_items_to_add: explorationResult.loot });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Butin récupéré !");
    }
    await onUpdate();
    onClose();
  };

  const activeBoosts = useMemo(() => {
    if (!playerData || !zoneInfo?.potentialLoot) return [];

    const totalBoosts: Record<string, number> = {};
    const allPlayerItems = [...playerData.inventory, ...Object.values(playerData.equipment)].filter(Boolean) as InventoryItem[];

    for (const item of allPlayerItems) {
        if (item.items?.effects) {
            for (const effectKey in item.items.effects) {
                if (resourceBoostMapping[effectKey]) {
                    if (!totalBoosts[effectKey]) {
                        totalBoosts[effectKey] = 0;
                    }
                    totalBoosts[effectKey] += Number(item.items.effects[effectKey]) || 0;
                }
            }
        }
    }

    return Object.entries(totalBoosts)
        .map(([effectKey, totalValue]) => {
            const mapping = resourceBoostMapping[effectKey];
            const isRelevant = zoneInfo.potentialLoot.some(loot => loot.name === mapping.name);
            return {
                ...mapping,
                totalValue,
                isRelevant,
            };
        })
        .filter(boost => boost.isRelevant && boost.totalValue > 0);

  }, [playerData, zoneInfo]);

  const renderContent = () => {
    if (isExploring) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <p className="text-lg font-mono">Exploration en cours...</p>
        </div>
      );
    }

    if (explorationResult) {
      return (
        <div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">Rapport d'exploration</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {explorationResult.loot && explorationResult.loot.length > 0 ? (
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-300">Butin trouvé :</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {explorationResult.loot.map((item: any, index: number) => (
                    <div key={index} className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
                        <ItemIcon iconName={getIconUrl(item.icon)} alt={item.name} />
                        <span className="absolute -bottom-2 -right-2 bg-slate-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-slate-600">
                          {item.quantity}
                        </span>
                      </div>
                      <p className="text-sm mt-2 text-white truncate w-full">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400">Vous n'avez rien trouvé d'intéressant cette fois-ci.</p>
            )}
            {explorationResult.event_result && (
              <div className="mt-4 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                <h3 className="font-bold text-lg mb-2 text-yellow-300">{explorationResult.event_result.name}</h3>
                <p className="text-gray-300">{explorationResult.event_result.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCollectLoot} className="w-full">Fermer</Button>
          </DialogFooter>
        </div>
      );
    }

    return (
      <>
        <DialogHeader className="text-center">
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">{zone?.type || 'Exploration'}</DialogTitle>
          <DialogDescription>Que voulez-vous faire dans cette zone ?</DialogDescription>
          {activeBoosts.length > 0 && (
            <div className="mt-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg space-y-2 text-left">
                <h4 className="font-semibold text-green-300">Bonus de récolte actifs :</h4>
                {activeBoosts.map(boost => {
                    const BoostIcon = boost.icon;
                    return (
                        <div key={boost.name} className="flex items-center gap-2 text-green-200">
                            <BoostIcon className="w-4 h-4" />
                            <span>{boost.name}:</span>
                            <span className="font-bold">+{boost.totalValue}%</span>
                        </div>
                    )
                })}
            </div>
          )}
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-around text-center">
            <div className="flex flex-col items-center gap-1">
              <Clock className="w-6 h-6 text-gray-400" />
              <span className="text-sm font-bold">3s</span>
              <span className="text-xs text-gray-500">Durée</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span className="text-sm font-bold">-5</span>
              <span className="text-xs text-gray-500">Énergie</span>
            </div>
          </div>
          {isLoadingInfo ? (
            <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : zoneInfo && (
            <div className="space-y-4">
              {zoneInfo.potentialLoot.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-300">Butin potentiel :</h3>
                  <div className="flex flex-wrap gap-4">
                    {zoneInfo.potentialLoot.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-lg">
                        <div className="w-8 h-8 rounded-md bg-slate-900/50 flex-shrink-0 p-1">
                          <ItemIcon iconName={getIconUrl(item.icon)} alt={item.name} />
                        </div>
                        <span className="text-sm text-white">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleExplore} disabled={isExploring} className="w-full">
            <Search className="w-4 h-4 mr-2" />
            Explorer la zone
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default ExplorationModal;