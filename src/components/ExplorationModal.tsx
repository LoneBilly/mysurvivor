import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Search, Shield, Package, Check, X, AlertTriangle, Castle, TreeDeciduous, Mountain } from 'lucide-react';
import { InventoryItem, MapCell } from '@/types/game';
import ItemIcon from './ItemIcon';
import * as LucideIcons from "lucide-react";
import { useGame } from '@/contexts/GameContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import InfoDisplayModal from './InfoDisplayModal';

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

interface NewlyDiscoveredZone {
  id: number;
  type: string;
  icon: string | null;
}

interface EventResult {
  name: string;
  description: string;
  icon: string | null;
  effects: Record<string, number>;
  success: boolean;
  newly_discovered_zone?: NewlyDiscoveredZone;
}

interface ScoutedTarget {
  target_player_id: string;
  target_username: string;
  base_zone_type: string;
}

interface PotentialInfo {
  name: string;
  icon: string | null;
  description: string | null;
}

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  onUpdate: () => void;
  onOpenInventory: () => void;
}

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate, onOpenInventory }: ExplorationModalProps) => {
  const { getIconUrl, refreshPlayerData, playerData } = useGame();
  const [activeTab, setActiveTab] = useState('exploration');
  const [potentialLoot, setPotentialLoot] = useState<PotentialInfo[]>([]);
  const [potentialEvents, setPotentialEvents] = useState<PotentialInfo[]>([]);
  const [scoutedTargets, setScoutedTargets] = useState<ScoutedTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [foundItems, setFoundItems] = useState<FoundItem[] | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [inventoryFullError, setInventoryFullError] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [detailedInfo, setDetailedInfo] = useState<PotentialInfo | null>(null);

  const resourceBoosts = useMemo(() => {
    const boosts = {
      bonus_recolte_bois_pourcentage: 0,
      bonus_recolte_pierre_pourcentage: 0,
      bonus_recolte_viande_pourcentage: 0,
    };

    const allPlayerItems = [
      ...playerData.inventory,
      ...Object.values(playerData.equipment).filter(Boolean) as InventoryItem[]
    ];

    for (const item of allPlayerItems) {
      if (item?.items?.effects) {
        for (const key in boosts) {
          if (item.items.effects[key]) {
            boosts[key as keyof typeof boosts] += Number(item.items.effects[key]);
          }
        }
      }
    }
    return boosts;
  }, [playerData.inventory, playerData.equipment]);

  const activeBoosts = useMemo(() => {
    const active: { label: string; value: number; icon: React.ElementType }[] = [];
    if (!potentialLoot) return active;

    const lootNames = potentialLoot.map(loot => loot.name.toLowerCase());

    if (resourceBoosts.bonus_recolte_bois_pourcentage > 0 && lootNames.includes('bois')) {
      active.push({ label: 'Bois', value: resourceBoosts.bonus_recolte_bois_pourcentage, icon: TreeDeciduous });
    }
    if (resourceBoosts.bonus_recolte_pierre_pourcentage > 0 && lootNames.includes('pierre')) {
      active.push({ label: 'Pierre', value: resourceBoosts.bonus_recolte_pierre_pourcentage, icon: Mountain });
    }
    // Add other resources like viande if needed
    return active;
  }, [potentialLoot, resourceBoosts]);

  const fetchZoneInfo = useCallback(async () => {
    if (!zone) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_zone_info', { p_zone_id: zone.id });
    if (error) {
      showError("Impossible de charger les informations de la zone.");
      console.error(error);
    } else {
      const eventsFromDb = data.potentialEvents || [];
      
      if (zone.interaction_type === 'Ressource') {
        eventsFromDb.push({
          name: "Découverte de zone",
          icon: "Map",
          description: "Vous avez une chance de trouver une carte révélant des zones adjacentes inexplorées."
        });
      }

      eventsFromDb.push({
        name: "Découverte de base",
        icon: "Castle",
        description: "Vous pourriez tomber sur la base d'un autre survivant, ce qui débloquerait une option d'attaque."
      });

      setPotentialLoot(data.potentialLoot || []);
      setPotentialEvents(eventsFromDb);
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
    setInventoryFullError(false);
    setRemainingTime(0);
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'exploration') fetchZoneInfo();
      if (activeTab === 'pvp') fetchScoutedTargets();
    } else {
      resetState();
    }
  }, [isOpen, activeTab, fetchZoneInfo, fetchScoutedTargets]);

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
        if (event_result.newly_discovered_zone) {
          showSuccess(`Nouvelle zone découverte : ${event_result.newly_discovered_zone.type} !`);
          await refreshPlayerData();
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
  }, [zone, onUpdate, refreshPlayerData]);

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

  useEffect(() => {
    if (foundItems !== null && foundItems.length === 0) {
      setFoundItems(null);
    }
  }, [foundItems]);

  const filteredScoutedTargets = useMemo(() => {
    if (!zone) return [];
    return scoutedTargets.filter(target => target.base_zone_type === zone.type);
  }, [scoutedTargets, zone]);

  const canExplore = potentialLoot.length > 0 || potentialEvents.length > 0;

  const getEventIcon = (iconName: string | null) => {
    if (!iconName) return AlertTriangle;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || AlertTriangle;
  };

  const resetView = () => {
    setFoundItems(null);
    setEventResult(null);
  };

  return (
    <>
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
                      {eventResult.newly_discovered_zone && (
                        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                          {(() => { const ZoneIcon = getEventIcon(eventResult.newly_discovered_zone.icon); return <ZoneIcon className="w-6 h-6 flex-shrink-0 text-green-300" />; })()}
                          <div>
                            <p className="font-semibold text-green-200">Nouvelle zone découverte !</p>
                            <p className="text-sm text-green-400">{eventResult.newly_discovered_zone.type}</p>
                          </div>
                        </div>
                      )}
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
                          <TooltipProvider key={`${item.name}-${index}`} delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => setDetailedInfo(item)} className="relative w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
                                  <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
                                <p>{item.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )) : (
                          <span className="text-gray-400 text-sm">Aucun objet disponible dans cette zone</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Événements possibles :</h4>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <div className="flex flex-wrap gap-2">
                        {potentialEvents.length > 0 ? potentialEvents.map((event, index) => (
                          <TooltipProvider key={`${event.name}-${index}`} delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => setDetailedInfo(event)} className="relative w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
                                  <ItemIcon iconName={event.icon} alt={event.name} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900/80 backdrop-blur-md text-white border border-white/20">
                                <p>{event.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )) : (
                          <span className="text-gray-400 text-sm">Aucun événement spécial dans cette zone</span>
                        )}
                      </div>
                    )}
                  </div>
                  {activeBoosts.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Bonus actifs :</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeBoosts.map(boost => (
                          <div key={boost.label} className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-300 text-sm px-3 py-1 rounded-full">
                            <boost.icon className="w-4 h-4" />
                            <span>{boost.label}: +{boost.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
      <InfoDisplayModal
        isOpen={!!detailedInfo}
        onClose={() => setDetailedInfo(null)}
        title={detailedInfo?.name || ''}
        description={detailedInfo?.description || null}
        icon={detailedInfo?.icon || null}
      />
    </>
  );
};

export default ExplorationModal;