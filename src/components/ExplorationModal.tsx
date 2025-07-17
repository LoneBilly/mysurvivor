import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Check, X } from 'lucide-react';
import { MapCell } from '@/types/game';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGame } from '@/contexts/GameContext';
import ItemIcon from './ItemIcon';

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  onUpdate: () => void;
  onOpenInventory: () => void;
}

interface PotentialLootItem {
  items: {
    name: string;
    icon: string | null;
  } | null;
}

interface PotentialEventItem {
  events: {
    name: string;
    icon: string | null;
    description: string | null;
  } | null;
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
}

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate, onOpenInventory }: ExplorationModalProps) => {
  const { getIconUrl, playerData, setPlayerData } = useGame();
  const [explorationState, setExplorationState] = useState<'idle' | 'exploring' | 'results'>('idle');
  const [loot, setLoot] = useState<FoundItem[]>([]);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventoryFullError, setInventoryFullError] = useState(false);

  const [potentialLoot, setPotentialLoot] = useState<{ name: string; icon: string | null; }[]>([]);
  const [potentialEvents, setPotentialEvents] = useState<{ name: string; icon: string | null; description: string | null; }[]>([]);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setExplorationState('idle');
        setLoot([]);
        setEventResult(null);
        setInventoryFullError(false);
      }, 300);
    } else if (zone) {
      const fetchZoneInfo = async () => {
        setInfoLoading(true);
        try {
          const [lootRes, eventsRes] = await Promise.all([
            supabase.from('zone_items').select('items(name, icon)').eq('zone_id', zone.id),
            supabase.from('zone_events').select('events(name, icon, description)').eq('zone_id', zone.id)
          ]);

          if (lootRes.error) throw lootRes.error;
          if (eventsRes.error) throw eventsRes.error;

          const lootData = (lootRes.data as PotentialLootItem[])
            .map(item => item.items)
            .filter((item): item is { name: string; icon: string | null } => item !== null);
          setPotentialLoot(lootData);

          const eventData = (eventsRes.data as PotentialEventItem[])
            .map(item => item.events)
            .filter((item): item is { name: string; icon: string | null; description: string | null } => item !== null);
          setPotentialEvents(eventData);

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
  }, [isOpen, zone]);

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
      onUpdate();

    } catch (error: any) {
      showError(error.message || "Une erreur est survenue durant l'exploration.");
      setExplorationState('idle');
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const handleCollectOne = async (itemToCollect: FoundItem) => {
    setInventoryFullError(false);
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const originalLoot = [...loot];

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
      setPlayerData(originalPlayerData);
      setLoot(originalLoot);
    } else {
      showSuccess(`${itemToCollect.name} x${itemToCollect.quantity} ajouté à l'inventaire !`);
      onUpdate(true);
    }
  };

  const handleDiscardOne = (itemToDiscard: FoundItem) => {
    setLoot(currentItems => {
      const newItems = currentItems?.filter(item => item.item_id !== itemToDiscard.item_id);
      return newItems && newItems.length > 0 ? newItems : null;
    });
    showInfo(`${itemToDiscard.name} a été jeté.`);
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
                      <TooltipProvider key={`loot-${index}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative">
                              <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )) : <p className="text-xs text-gray-500 self-center px-2">Aucun butin spécifique à cette zone.</p>}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm text-gray-300">Événements possibles :</h4>
                {infoLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : (
                  <div className="flex flex-wrap gap-2 bg-black/20 p-2 rounded-md min-h-[52px]">
                    {potentialEvents.length > 0 ? potentialEvents.map((event, index) => (
                      <TooltipProvider key={`event-${index}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative">
                              <ItemIcon iconName={getIconUrl(event.icon) || event.icon} alt={event.name} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-bold">{event.name}</p>
                            {event.description && <p className="text-xs">{event.description}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default ExplorationModal;