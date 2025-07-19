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
import InfoDisplayModal from './InfoDisplayModal';
import { cn } from '@/lib/utils';

const EXPLORATION_COST = 5;
const EXPLORATION_DURATION_S = 3; // Reduced for better testing/gameplay flow

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
  onUpdate: (silent?: boolean) => void;
  onOpenInventory: () => void;
}

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate, onOpenInventory }: ExplorationModalProps) => {
  const { getIconUrl, playerData, refreshPlayerData } = useGame();
  const [activeTab, setActiveTab] = useState('exploration');
  const [potentialLoot, setPotentialLoot] = useState<{ name: string; icon: string | null; description: string | null; }[]>([]);
  const [potentialEvents, setPotentialEvents] = useState<{ name: string; icon: string | null; description: string | null; }[]>([]);
  const [scoutedTargets, setScoutedTargets] = useState<ScoutedTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [foundItems, setFoundItems] = useState<FoundItem[] | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [inventoryFullError, setInventoryFullError] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [infoModalData, setInfoModalData] = useState<{ title: string; description: string | null; icon: string | null; } | null>(null);

  const fetchZoneInfo = useCallback(async () => {
    if (!zone) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_zone_info', { p_zone_id: zone.id });
      if (error) throw error;
      setPotentialLoot(data.potentialLoot || []);
      setPotentialEvents(data.potentialEvents || []);
    } catch (error) {
      showError("Impossible de charger les informations de la zone.");
    } finally {
      setLoading(false);
    }
  }, [zone]);

  const fetchScoutedTargets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_scouted_targets');
    if (error) showError("Impossible de charger les cibles.");
    else setScoutedTargets(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'exploration') fetchZoneInfo();
      if (activeTab === 'pvp') fetchScoutedTargets();
    } else {
      setTimeout(() => {
        setIsExploring(false);
        setProgress(0);
        setFoundItems(null);
        setEventResult(null);
        setInventoryFullError(false);
        setRemainingTime(0);
      }, 300);
    }
  }, [isOpen, activeTab, fetchZoneInfo, fetchScoutedTargets]);

  const finishExploration = useCallback(async () => {
    if (!zone) return;
    const { data, error } = await supabase.rpc('finish_exploration', { p_zone_id: zone.id });
    if (error) {
      showError("Une erreur est survenue lors de la récupération du butin.");
    } else {
      const { loot, event_result } = data;
      setFoundItems(loot && loot.length > 0 ? loot : null);
      setEventResult(event_result || null);
      if (!loot?.length && !event_result) {
        showInfo("Vous n'avez rien trouvé cette fois-ci.");
      }
    }
    setIsExploring(false);
    onUpdate(true); // Silent update
  }, [zone, onUpdate]);

  useEffect(() => {
    if (!isExploring || !isOpen) return;
    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(remainingTime - 1);
        setProgress(prev => Math.min(100, prev + 100 / EXPLORATION_DURATION_S));
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      finishExploration();
    }
  }, [isExploring, remainingTime, finishExploration, isOpen]);

  const handleStartExploration = async () => {
    if (!zone) return;
    const { error } = await supabase.rpc('start_exploration', { p_zone_id: zone.id });
    if (error) {
      showError(error.message);
      return;
    }
    onUpdate(true);
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
        showError("Votre inventaire est plein.");
      } else {
        showError(error.message);
      }
      setFoundItems(prev => [...(prev || []), itemToCollect]);
    } else {
      showSuccess(`${itemToCollect.name} x${itemToCollect.quantity} ajouté !`);
      onUpdate(true);
    }
  };

  const handleDiscardOne = (itemToDiscard: FoundItem) => {
    setFoundItems(currentItems => (currentItems?.filter(item => item.item_id !== itemToDiscard.item_id) || null));
    showInfo(`${itemToDiscard.name} a été jeté.`);
  };

  const handleDiscoverZone = async (zoneId: number) => {
    const { error } = await supabase.rpc('discover_zone', { p_zone_to_discover_id: zoneId });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Nouvelle zone découverte !");
      await refreshPlayerData();
      setEventResult(prev => {
        if (!prev || !prev.discoverable_zones) return prev;
        return { ...prev, discoverable_zones: prev.discoverable_zones.map(z => z.id === zoneId ? { ...z, is_discovered: true } : z) };
      });
    }
  };

  const resetView = () => {
    setFoundItems(null);
    setEventResult(null);
  };

  const filteredScoutedTargets = useMemo(() => {
    if (!zone) return [];
    return scoutedTargets.filter(target => target.base_zone_type === zone.type);
  }, [scoutedTargets, zone]);

  const getEventIcon = (iconName: string | null) => {
    if (!iconName) return AlertTriangle;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || AlertTriangle;
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
                <div className="space-y-4">
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
                      {eventResult.discoverable_zones && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <h4 className="font-semibold text-sm mb-2">Zones adjacentes révélées :</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {eventResult.discoverable_zones.map(zone => {
                              const Icon = (LucideIcons as any)[zone.icon || 'MapPin'];
                              return (
                                <Button key={zone.id} disabled={zone.is_discovered} onClick={() => handleDiscoverZone(zone.id)} className={cn("h-auto flex flex-col items-center p-2", zone.is_discovered ? "bg-green-500/20 border-green-500/30 cursor-not-allowed" : "bg-blue-500/20 border-blue-500/30")}>
                                  <Icon className="w-6 h-6 mb-1" />
                                  <span className="text-xs text-center">{zone.type}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {foundItems && (
                    <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-black/20 rounded-lg">
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
                  {!foundItems && <div className="text-center pt-2"><Button onClick={resetView}>Continuer</Button></div>}
                </div>
              ) : isExploring ? (
                <div className="text-center space-y-3 py-8">
                  <p>Exploration en cours...</p>
                  <Progress value={progress} />
                  <p className="text-sm text-gray-400 font-mono">Temps restant : {remainingTime}s</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-gray-300">Butin potentiel :</h4>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <div className="flex flex-wrap gap-2 bg-black/20 p-2 rounded-md min-h-[52px]">
                        {potentialLoot.length > 0 ? potentialLoot.map((item, index) => (
                          <button key={`loot-${index}`} onClick={() => setInfoModalData({ title: item.name, description: item.description, icon: item.icon })} className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative cursor-pointer hover:bg-gray-600 transition-colors">
                            <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                          </button>
                        )) : <p className="text-xs text-gray-500 self-center px-2">Aucun butin spécifique.</p>}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleStartExploration} className="w-full" disabled={playerData.playerState.energie < EXPLORATION_COST}>
                    Lancer l'exploration ({EXPLORATION_COST} énergie, {EXPLORATION_DURATION_S}s)
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
        isOpen={!!infoModalData}
        onClose={() => setInfoModalData(null)}
        title={infoModalData?.title || ''}
        description={infoModalData?.description || null}
        icon={infoModalData?.icon || null}
      />
    </>
  );