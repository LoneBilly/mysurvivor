import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Search, Shield, Package, Check, X, AlertTriangle } from 'lucide-react';
import { MapCell, DiscoverableZone } from '@/types/game';
import ItemIcon from './ItemIcon';
import * as LucideIcons from "lucide-react";
import { useGame } from '@/contexts/GameContext';
import { cn } from '@/lib/utils';

const EXPLORATION_COST = 5;
const EXPLORATION_DURATION_S = 3; // Reduced for better UX

interface FoundItem {
  item_id: number;
  quantity: number;
  name: string;
  icon: string | null;
  description: string | null;
  type: string;
}

interface EventResult {
  name: string;
  description: string;
  icon: string | null;
  effects: Record<string, number>;
  success: boolean;
  discoverable_zones?: DiscoverableZone[];
}

interface ScoutedTarget {
  target_player_id: string;
  target_username: string;
  base_zone_type: string;
}

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  onUpdate: () => void;
  onOpenInventory: () => void;
}

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate, onOpenInventory }: ExplorationModalProps) => {
  const { getIconUrl, playerData, setPlayerData, refreshPlayerData } = useGame();
  const [activeTab, setActiveTab] = useState('exploration');
  const [potentialLoot, setPotentialLoot] = useState<{name: string}[]>([]);
  const [scoutedTargets, setScoutedTargets] = useState<ScoutedTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [foundItems, setFoundItems] = useState<FoundItem[] | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [discoverableZones, setDiscoverableZones] = useState<DiscoverableZone[] | null>(null);
  const [inventoryFullError, setInventoryFullError] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [discoveringZoneId, setDiscoveringZoneId] = useState<number | null>(null);

  const fetchPotentialLoot = useCallback(async () => {
    if (!zone) return;
    setLoading(true);
    const { data, error } = await supabase.from('zone_items').select('items(name)').eq('zone_id', zone.id);
    if (error) {
      showError("Impossible de charger les objets potentiels.");
    } else {
      setPotentialLoot(data.map(d => d.items).filter(Boolean) as {name: string}[]);
    }
    setLoading(false);
  }, [zone]);

  const fetchScoutedTargets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_scouted_targets');
    if (error) {
      showError("Impossible de charger les cibles.");
    } else {
      setScoutedTargets(data || []);
    }
    setLoading(false);
  }, []);

  const resetState = () => {
    setIsExploring(false);
    setProgress(0);
    setFoundItems(null);
    setEventResult(null);
    setDiscoverableZones(null);
    setInventoryFullError(false);
    setRemainingTime(0);
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'exploration') fetchPotentialLoot();
      if (activeTab === 'pvp') fetchScoutedTargets();
    } else {
      resetState();
    }
  }, [isOpen, activeTab, fetchPotentialLoot, fetchScoutedTargets]);

  const finishExploration = useCallback(async () => {
    if (!zone) return;
    const { data, error } = await supabase.rpc('finish_exploration', { p_zone_id: zone.id });
    if (error) {
      showError("Une erreur est survenue lors de la récupération du butin.");
    } else {
      const { loot, event_result } = data;
      
      if (loot && loot.length > 0) setFoundItems(loot);
      else if (!event_result) showInfo("Vous n'avez rien trouvé cette fois-ci.");

      if (event_result) {
        setEventResult(event_result);
        if (event_result.discoverable_zones) {
          setDiscoverableZones(event_result.discoverable_zones);
        }
        if (event_result.success && event_result.effects) {
          const effectsText = Object.entries(event_result.effects)
            .map(([stat, value]) => `${value > 0 ? '+' : ''}${value} ${stat}`)
            .join(', ');
          if (effectsText) showSuccess(`Événement: ${event_result.name} - ${effectsText}`);
        }
      }
      onUpdate();
    }
    setIsExploring(false);
  }, [zone, onUpdate]);

  useEffect(() => {
    if (!isExploring) return;

    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(remainingTime - 1);
        setProgress(prev => Math.min(100, prev + 100 / EXPLORATION_DURATION_S));
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      finishExploration();
    }
  }, [isExploring, remainingTime, finishExploration]);

  const handleStartExploration = async () => {
    if (!zone) return;
    const { error } = await supabase.rpc('start_exploration', { p_zone_id: zone.id });
    if (error) {
      showError(error.message);
      return;
    }
    
    onUpdate();
    setIsExploring(true);
    setProgress(0);
    setFoundItems(null);
    setEventResult(null);
    setDiscoverableZones(null);
    setInventoryFullError(false);
    setRemainingTime(EXPLORATION_DURATION_S);
  };

  const handleCollectOne = async (itemToCollect: FoundItem) => {
    setInventoryFullError(false);
    setFoundItems(currentItems => (currentItems?.filter(item => item.item_id !== itemToCollect.item_id) || null));
    
    const payload = [{ item_id: itemToCollect.item_id, quantity: itemToCollect.quantity }];
    const { error } = await supabase.rpc('collect_exploration_loot', { p_items_to_add: payload });

    if (error) {
      if (error.message.includes("Votre inventaire est plein")) {
        setInventoryFullError(true);
        showError("Votre inventaire est plein. Libérez de l'espace pour récupérer votre butin.");
      } else {
        showError(error.message);
      }
      setFoundItems(prev => [...(prev || []), itemToCollect]);
    } else {
      showSuccess(`${itemToCollect.name} x${itemToCollect.quantity} ajouté à l'inventaire !`);
      onUpdate();
    }
  };

  const handleDiscardOne = (itemToDiscard: FoundItem) => {
    setFoundItems(currentItems => {
      const newItems = currentItems?.filter(item => item.item_id !== itemToDiscard.item_id);
      return newItems && newItems.length > 0 ? newItems : null;
    });
    showInfo(`${itemToDiscard.name} a été jeté.`);
  };

  const handleDiscoverZone = async (zoneId: number) => {
    setDiscoveringZoneId(zoneId);
    const { error } = await supabase.rpc('discover_zone', { p_zone_to_discover_id: zoneId });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Nouvelle zone découverte !");
      await refreshPlayerData();
      setDiscoverableZones(prev => prev?.map(z => z.id === zoneId ? { ...z, is_discovered: true } : z) || null);
    }
    setDiscoveringZoneId(null);
  };

  useEffect(() => {
    if (foundItems !== null && foundItems.length === 0) {
      setFoundItems(null);
    }
  }, [foundItems]);

  const filteredScoutedTargets = useMemo(() => {
    if (!zone) return [];
    return scoutedTargets.filter(target => target.base_zone_type === zone.type);
  }, [scoutedTargets, zone]);

  const canExplore = potentialLoot.length > 0;

  const getEventIcon = (iconName: string | null) => {
    if (!iconName) return AlertTriangle;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || AlertTriangle;
  };

  const resetView = () => {
    setFoundItems(null);
    setEventResult(null);
    setDiscoverableZones(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-2xl">{zone?.type || 'Exploration'}</DialogTitle>
          <DialogDescription>Que voulez-vous faire dans cette zone ?</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exploration"><Search className="w-4 h-4 mr-2" />Explorer</TabsTrigger>
            <TabsTrigger value="pvp"><Shield className="w-4 h-4 mr-2" />PvP</TabsTrigger>
          </TabsList>
          <TabsContent value="exploration" className="mt-4">
            {foundItems || eventResult ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <h3 className="font-bold text-center">Résultats de l'exploration</h3>
                
                {eventResult && (
                  <div className={`p-3 rounded-lg border ${eventResult.success ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
                    <div className="flex items-center gap-3">
                      {(() => { const EventIcon = getEventIcon(eventResult.icon); return <EventIcon className="w-6 h-6 flex-shrink-0" />; })()}
                      <div className="flex-grow">
                        <p className="font-bold">{eventResult.name}</p>
                        <p className="text-sm text-gray-300">{eventResult.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {discoverableZones && (
                  <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/30">
                    <h4 className="font-semibold mb-2">Zones adjacentes révélées :</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {discoverableZones.map(zone => {
                        const Icon = (LucideIcons as any)[zone.icon || 'MapPin'];
                        return (
                          <Button key={zone.id} disabled={zone.is_discovered || discoveringZoneId === zone.id} onClick={() => handleDiscoverZone(zone.id)} className={cn("h-auto flex flex-col items-center p-2", zone.is_discovered ? "bg-green-500/20 border-green-500/30 cursor-not-allowed" : "bg-blue-500/20 border-blue-500/30")}>
                            {discoveringZoneId === zone.id ? <Loader2 className="w-6 h-6 animate-spin mb-1" /> : <Icon className="w-6 h-6 mb-1" />}
                            <span className="text-xs text-center">{zone.type}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {foundItems && (
                  <div className="space-y-2 p-2 bg-black/20 rounded-lg">
                    <h4 className="font-semibold text-center">Butin trouvé</h4>
                    {foundItems.map((item, index) => (
                      <div key={`${item.item_id}-${index}`} className="flex items-center gap-3 p-2 bg-white/10 rounded">
                        <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                        </div>
                        <p className="flex-grow">{item.name} <span className="text-gray-400">x{item.quantity}</span></p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleCollectOne(item)}><Check className="w-4 h-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDiscardOne(item)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {inventoryFullError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center space-y-2">
                    <p className="text-red-300 text-sm">Votre inventaire est plein.</p>
                    <Button onClick={onOpenInventory} variant="destructive" size="sm">Ouvrir l'inventaire</Button>
                  </div>
                )}

                {!foundItems && (
                  <div className="text-center pt-2">
                    <Button onClick={resetView}>Continuer</Button>
                  </div>
                )}
              </div>
            ) : isExploring ? (
              <div className="text-center space-y-3">
                <p>Exploration en cours...</p>
                <Progress value={progress} />
                <p className="text-sm text-gray-400 font-mono">Temps restant : {remainingTime}s</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Butin potentiel :</h4>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <div className="flex flex-wrap gap-2">
                      {potentialLoot.length > 0 ? potentialLoot.map((item, index) => (
                        <span key={`${item.name}-${index}`} className="bg-white/10 px-2 py-1 rounded text-sm">{item.name}</span>
                      )) : (
                        <span className="text-gray-400 text-sm">Aucun objet disponible dans cette zone</span>
                      )}
                    </div>
                  )}
                </div>
                <Button onClick={handleStartExploration} className="w-full" disabled={!canExplore}>
                  {canExplore ? `Lancer l'exploration (${EXPLORATION_COST} énergie, ${EXPLORATION_DURATION_S}s)` : "Exploration indisponible"}
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="pvp" className="mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
              <div className="space-y-2">
                {filteredScoutedTargets.length > 0 ? filteredScoutedTargets.map((target, index) => (
                  <div key={`${target.target_player_id}-${index}`} className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                    <div>
                      <p className="font-bold">{target.target_username}</p>
                      <p className="text-sm text-gray-400">Base: {target.base_zone_type}</p>
                    </div>
                    <Button disabled>Attaquer (bientôt)</Button>
                  </div>
                )) : <p className="text-center text-gray-400 p-4">Aucun joueur repéré dans cette zone.</p>}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ExplorationModal;