import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Search, Gift, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { MapCell } from '@/types/game';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';
import ActionModal from './ActionModal';

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
  onUpdate: () => void;
  onOpenInventory: () => void;
}

interface ExplorationResult {
  loot: { item_id: number; quantity: number; name: string; icon: string; description: string; type: string }[];
  event_result: { name: string; description: string; icon: string; success: boolean; newly_discovered_zone?: MapCell } | null;
}

const ExplorationModal = ({ isOpen, onClose, zone, onUpdate, onOpenInventory }: ExplorationModalProps) => {
  const [isExploring, setIsExploring] = useState(false);
  const [explorationResult, setExplorationResult] = useState<ExplorationResult | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [inventoryFullLoot, setInventoryFullLoot] = useState<any[] | null>(null);
  const { getIconUrl } = useGame();

  const startExploration = useCallback(async () => {
    if (!zone) return;
    setIsExploring(true);
    setExplorationResult(null);
    try {
      const { error: startError } = await supabase.rpc('start_exploration', { p_zone_id: zone.id });
      if (startError) throw startError;

      // Simulate exploration time
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data, error: finishError } = await supabase.rpc('finish_exploration', { p_zone_id: zone.id });
      if (finishError) throw finishError;

      setExplorationResult(data);
    } catch (error: any) {
      showError(error.message || "Erreur lors de l'exploration.");
      onClose();
    } finally {
      setIsExploring(false);
    }
  }, [zone, onClose]);

  useEffect(() => {
    if (isOpen && zone && !isExploring && !explorationResult) {
      startExploration();
    }
    if (!isOpen) {
      // Reset state on close
      setTimeout(() => {
        setIsExploring(false);
        setExplorationResult(null);
        setInventoryFullLoot(null);
      }, 300);
    }
  }, [isOpen, zone, isExploring, explorationResult, startExploration]);

  const handleCollectLoot = async () => {
    if (!explorationResult?.loot || explorationResult.loot.length === 0) {
      onClose();
      return;
    }
    setCollecting(true);
    try {
      const { error } = await supabase.rpc('collect_exploration_loot', {
        p_items_to_add: explorationResult.loot,
      });
      if (error) throw error;
      showSuccess('Butin récupéré !');
      onUpdate();
      onClose();
    } catch (error: any) {
      if (error.message.includes("Votre inventaire est plein")) {
        setInventoryFullLoot(explorationResult.loot);
      } else {
        showError(error.message || 'Erreur lors de la collecte du butin.');
      }
    } finally {
      setCollecting(false);
    }
  };

  const renderContent = () => {
    if (isExploring) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-white" />
          <p className="mt-4 text-lg">Exploration en cours...</p>
        </div>
      );
    }

    if (explorationResult) {
      const { loot, event_result } = explorationResult;
      return (
        <div className="py-4 space-y-6">
          {event_result && (
            <div className={`p-4 rounded-lg border ${event_result.success ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" /> {event_result.name}
              </h3>
              <p className="text-sm mt-1">{event_result.description}</p>
              {event_result.newly_discovered_zone && (
                <div className="mt-2 p-2 bg-black/20 rounded-md flex items-center gap-2">
                  <ItemIcon iconName={getIconUrl(event_result.newly_discovered_zone.icon)} alt={event_result.newly_discovered_zone.type} size="sm" />
                  <span className="text-sm font-semibold">{event_result.newly_discovered_zone.type}</span>
                </div>
              )}
            </div>
          )}
          {loot.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Gift className="w-5 h-5" /> Butin trouvé</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-800/50 p-2 rounded-md">
                {loot.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-black/20 rounded">
                    <ItemIcon iconName={getIconUrl(item.icon)} alt={item.name} size="sm" />
                    <span className="font-semibold">{item.name} x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loot.length === 0 && !event_result && (
            <p className="text-center text-gray-400 py-8">Vous n'avez rien trouvé d'intéressant cette fois-ci.</p>
          )}
          <Button onClick={handleCollectLoot} className="w-full" disabled={collecting}>
            {collecting ? <Loader2 className="w-5 h-5 animate-spin" /> : (loot.length > 0 ? 'Récupérer le butin' : 'Terminer')}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Search /> Exploration de: {zone?.type || 'Zone'}
            </DialogTitle>
            <DialogDescription>
              Vous fouillez les environs à la recherche de ressources et d'opportunités.
            </DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={!!inventoryFullLoot}
        onClose={() => setInventoryFullLoot(null)}
        title="Inventaire plein !"
        description={
          <div>
            <p className="mb-4">Votre inventaire est plein. Vous pouvez faire de la place ou abandonner les objets suivants :</p>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-800/50 p-2 rounded-md">
              {inventoryFullLoot?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <ItemIcon iconName={getIconUrl(item.icon)} alt={item.name} size="sm" />
                  <span>{item.name} x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        }
        actions={[
          { label: "Ouvrir l'inventaire", onClick: () => { onOpenInventory(); onClose(); }, variant: "default" },
          { label: "Abandonner le butin", onClick: () => { setInventoryFullLoot(null); onClose(); }, variant: "destructive" },
        ]}
      />
    </>
  );
};

export default ExplorationModal;