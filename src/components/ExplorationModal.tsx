import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Check, X } from 'lucide-react';
import { MapCell, DiscoverableZone } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import ItemIcon from './ItemIcon';
import InfoDisplayModal from './InfoDisplayModal';
import { cn } from '@/lib/utils';
import * as LucideIcons from "lucide-react";

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  onUpdate: () => void;
  onOpenInventory: () => void;
}

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

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate, onOpenInventory }: ExplorationModalProps) => {
  const { getIconUrl, refreshInventoryAndChests, refreshResources, refreshPlayerData, mapLayout, playerData } = useGame();
  const [explorationState, setExplorationState] = useState<'idle' | 'exploring' | 'results'>('idle');
  const [loot, setLoot] = useState<FoundItem[]>([]);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventoryFullError, setInventoryFullError] = useState(false);

  const [potentialLoot, setPotentialLoot] = useState<{ name: string; icon: string | null; description: string | null; }[]>([]);
  const [potentialEvents, setPotentialEvents] = useState<{ name: string; icon: string | null; description: string | null; }[]>([]);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoModalData, setInfoModalData] = useState<{ title: string; description: string | null; icon: string | null; adjacentZones?: DiscoverableZone[] | null; } | null>(null);
  const [adjacentZones, setAdjacentZones] = useState<DiscoverableZone[] | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setExplorationState('idle');
        setLoot([]);
        setEventResult(null);
        setInventoryFullError(false);
        setAdjacentZones(null);
      }, 300);
    } else if (zone) {
      const fetchZoneInfo = async () => {
        setInfoLoading(true);
        try {
          const [lootRes, eventsRes] = await Promise.all([
            supabase.from('zone_items').select('items(name, icon, description)').eq('zone_id', zone.id),
            supabase.from('zone_events').select('events(name, icon, description)').eq('zone_id', zone.id)
          ]);

          if (lootRes.error) throw lootRes.error;
          if (eventsRes.error) throw eventsRes.error;

          const lootData = (lootRes.data as { items: { name: string; icon: string | null; description: string | null; } | null }[])
            .map(item => item.items)
            .filter((item): item is { name: string; icon: string | null; description: string | null; } => item !== null);
          setPotentialLoot(lootData);

          const eventData = (eventsRes.data as { events: { name: string; icon: string | null; description: string | null; } | null }[])
            .map(item => item.events)
            .filter((item): item is { name: string; icon: string | null; description: string | null; } => item !== null);
          setPotentialEvents(eventData);

          if (zone.interaction_type === 'Ressource') {
            const discoveredSet = new Set(playerData.playerState.zones_decouvertes);
            const currentZone = mapLayout.find(z => z.id === zone.id);
            if (currentZone) {
              const adjZones = mapLayout
                .filter(z => (Math.abs(z.x - currentZone.x) + Math.abs(z.y - currentZone.y)) === 1)
                .map(z => ({ ...z, is_discovered: discoveredSet.has(z.id) }));
              setAdjacentZones(adjZones);
            }
          } else {
            setAdjacentZones(null);
          }

        } catch (error) {
          console.error("Error fetching zone info:", error);
          setPotentialLoot([]);
          setPotentialEvents([]);
        } finally {
          setInfoLoading(false);
        }
      };

      fetchZoneInfo();
    }
  }, [isOpen, zone, mapLayout, playerData.playerState.zones_decouvertes]);

  const handleStartExploration = async () => {
    if (!zone) return;
    setLoading(true);
    setExplorationState('exploring');

    try {
      await supabase.rpc('start_exploration', { p_zone_id: zone.id });
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { data, error } = await supabase.rpc('finish_exploration', { p_zone_id: zone.id });

      if (error) throw error;

      setLoot(data.loot || []);
      setEventResult(data.event_result || null);
      setExplorationState('results');
      refreshResources();

    } catch (error: any) {
      showError(error.message || "Une erreur est survenue durant l'exploration.");
      setExplorationState('idle');
      refreshResources();
    } finally {
      setLoading(false);
    }
  };

  const handleCollectOne = async (itemToCollect: FoundItem) => {
    setInventoryFullError(false);
    
    setLoot(currentItems => (currentItems?.filter(item => item.item_id !== itemToCollect.item_id) || null));
    
    const payload = [{ item_id: itemToCollect.item_id, quantity: itemToCollect.quantity }];
    const { error } = await supabase.rpc('collect_exploration_loot', { p_items_to_add: payload });

    if (error) {
      if (error.message.includes("Votre inventaire est plein")) {
        setInventoryFullError(true);
        showError("Votre inventaire est plein. Libérez de l'espace pour récupérer votre butin.");
      } else {
        showError(error.message);
      }
      setLoot(prev => [...prev, itemToCollect]); // Re-add item to loot on error
    } else {
      showSuccess(`${itemToCollect.name} x${itemToCollect.quantity} ajouté à l'inventaire !`);
      refreshInventoryAndChests();
    }
  };

  const handleDiscardOne = (itemToDiscard: FoundItem) => {
    setLoot(currentItems => {
      const newItems = currentItems?.filter(item => item.item_id !== itemToDiscard.item_id);
      return newItems && newItems.length > 0 ? newItems : null;
    });
    showInfo(`${itemToDiscard.name} a été jeté.`);
  };

  const handleDiscoverZone = async (zoneId: number) => {
    setLoading(true);
    const { error } = await supabase.rpc('discover_zone', { p_zone_to_discover_id: zoneId });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Nouvelle zone découverte !");
      await refreshPlayerData();
      setEventResult(prev => {
        if (!prev || !prev.discoverable_zones) return prev;
        return {
          ...prev,
          discoverable_zones: prev.discoverable_zones.map(z => 
            z.id === zoneId ? { ...z, is_discovered: true } : z
          )
        };
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (loot !== null && loot.length === 0 && explorationState === 'results') {
      if (!eventResult) {
        showInfo("Vous avez traité tout le butin.");
      }
      setExplorationState('idle');
    }
  }, [loot, explorationState, eventResult]);

  const renderContent = () => {
    switch (explorationState) {
      case 'exploring':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="font-semibold">Exploration en cours...</p>
          </div>
        );
      case 'results':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Rapport d'exploration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {eventResult && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="w-5 h-5 relative flex-shrink-0">
                      <ItemIcon iconName={getIconUrl(eventResult.icon) || eventResult.icon} alt={eventResult.name} />
                    </div>
                    {eventResult.name}
                  </h4>
                  <p className="text-sm text-gray-300">{eventResult.description}</p>
                </div>
              )}
              {eventResult?.name === 'Découverte de zone' && eventResult.success && eventResult.discoverable_zones && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Zones adjacentes révélées :</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {eventResult.discoverable_zones.map(zone => {
                      const Icon = (LucideIcons as any)[zone.icon || 'MapPin'];
                      return (
                        <Button
                          key={zone.id}
                          disabled={zone.is_discovered || loading}
                          onClick={() => handleDiscoverZone(zone.id)}
                          className={cn(
                            "h-auto flex flex-col items-center p-2",
                            zone.is_discovered ? "bg-green-500/20 border-green-500/30 cursor-not-allowed" : "bg-blue-500/20 border-blue-500/30"
                          )}
                        >
                          <Icon className="w-6 h-6 mb-1" />
                          <span className="text-xs text-center">{zone.type}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Butin trouvé :</h4>
                {loot.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {loot.map((item, index) => (
                      <div key={`${item.item_id}-${index}`} className="bg-black/20 p-2 rounded-md text-center">
                        <div className="w-10 h-10 mx-auto mb-1 relative">
                          <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                        </div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="icon" className="h-7 w-7 flex-1" onClick={() => handleCollectOne(item)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" className="h-7 w-7 flex-1" variant="destructive" onClick={() => handleDiscardOne(item)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Vous n'avez rien trouvé d'intéressant.</p>
                )}
              </div>
              {inventoryFullError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center space-y-2">
                  <p className="text-red-300 text-sm">Votre inventaire est plein.</p>
                  <Button onClick={onOpenInventory} variant="destructive" size="sm">
                    Ouvrir l'inventaire
                  </Button>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-slate-700">
              <Button onClick={() => setExplorationState('idle')} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Terminer"}
              </Button>
            </div>
          </>
        );
      case 'idle':
      default:
        const discoveryEvent = { name: 'Découverte de zone', description: 'Vous pourriez trouver une carte révélant une zone voisine.', icon: 'Map' };
        const allPotentialEvents = [...potentialEvents];
        if (zone?.interaction_type === 'Ressource') {
            allPotentialEvents.push(discoveryEvent);
        }
        return (
          <>
            <DialogHeader>
              <DialogTitle>Explorer {zone?.type}</DialogTitle>
              <DialogDescription>
                L'exploration consomme 5 points d'énergie. Vous pourriez trouver des ressources précieuses ou déclencher des événements.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm text-gray-300">Butin potentiel :</h4>
                {infoLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (
                  <div className="flex flex-wrap gap-2 bg-black/20 p-2 rounded-md min-h-[52px]">
                    {potentialLoot.length > 0 ? potentialLoot.map((item, index) => (
                      <button key={`loot-${index}`} onClick={() => setInfoModalData({ title: item.name, description: item.description, icon: item.icon })} className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative cursor-pointer hover:bg-gray-600 transition-colors">
                        <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                      </button>
                    )) : <p className="text-xs text-gray-500 self-center px-2">Aucun butin spécifique à cette zone.</p>}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm text-gray-300">Événements possibles :</h4>
                {infoLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (
                  <div className="flex flex-wrap gap-2 bg-black/20 p-2 rounded-md min-h-[52px]">
                    {allPotentialEvents.length > 0 ? allPotentialEvents.map((event, index) => (
                      <button key={`event-${index}`} onClick={() => {
                        const isDiscovery = event.name === 'Découverte de zone';
                        setInfoModalData({ 
                            title: event.name, 
                            description: event.description, 
                            icon: event.icon,
                            ...(isDiscovery && { adjacentZones: adjacentZones })
                        });
                      }} className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative cursor-pointer hover:bg-gray-600 transition-colors">
                        <ItemIcon iconName={getIconUrl(event.icon) || event.icon} alt={event.name} />
                      </button>
                    )) : <p className="text-xs text-gray-500 self-center px-2">Aucun événement spécial dans cette zone.</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <Button onClick={handleStartExploration} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lancer l'exploration (5 Energie)"}
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
        >
          {renderContent()}
        </DialogContent>
      </Dialog>
      <InfoDisplayModal 
        isOpen={!!infoModalData}
        onClose={() => setInfoModalData(null)}
        title={infoModalData?.title || ''}
        description={infoModalData?.description || null}
        icon={infoModalData?.icon || null}
        adjacentZones={infoModalData?.adjacentZones}
      />
    </>
  );
};

export default ExplorationModal;