import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Search, Shield, Package, Check, X } from 'lucide-react';
import { MapCell } from '@/types/game';
import ItemIcon from './ItemIcon';
import { getCachedSignedUrl } from '@/utils/iconCache';

const EXPLORATION_COST = 5;
const EXPLORATION_DURATION_S = 30;

interface FoundItem {
  item_id: number;
  quantity: number;
  name: string;
  icon: string | null;
  description: string | null;
  type: string;
  signedIconUrl?: string;
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
  const [activeTab, setActiveTab] = useState('exploration');
  const [potentialLoot, setPotentialLoot] = useState<{name: string}[]>([]);
  const [scoutedTargets, setScoutedTargets] = useState<ScoutedTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [foundItems, setFoundItems] = useState<FoundItem[] | null>(null);
  const [inventoryFullError, setInventoryFullError] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'exploration') fetchPotentialLoot();
      if (activeTab === 'pvp') fetchScoutedTargets();
    } else {
      // Reset state on close
      setIsExploring(false);
      setProgress(0);
      setFoundItems(null);
      setInventoryFullError(false);
    }
  }, [isOpen, activeTab, fetchPotentialLoot, fetchScoutedTargets]);

  const handleStartExploration = async () => {
    if (!zone) return;
    const { error } = await supabase.rpc('start_exploration', { p_zone_id: zone.id });
    if (error) {
      showError(error.message);
      return;
    }
    
    onUpdate(); // Update energy display
    setIsExploring(true);
    setProgress(0);
    setFoundItems(null);
    setInventoryFullError(false);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 100 / EXPLORATION_DURATION_S;
        if (next >= 100) {
          clearInterval(interval);
          finishExploration();
          return 100;
        }
        return next;
      });
    }, 1000);
  };

  const finishExploration = async () => {
    if (!zone) return;
    const { data, error } = await supabase.rpc('finish_exploration', { p_zone_id: zone.id });
    if (error) {
      showError("Une erreur est survenue lors de la récupération du butin.");
    } else {
      const itemsWithUrls = await Promise.all(
        (data as FoundItem[]).map(async (item) => {
          if (item.icon && item.icon.includes('.')) {
            const signedUrl = await getCachedSignedUrl(item.icon);
            return { ...item, signedIconUrl: signedUrl || undefined };
          }
          return item;
        })
      );
      setFoundItems(itemsWithUrls);
    }
    setIsExploring(false);
    setProgress(0);
  };

  const handleCollectOne = async (itemToCollect: FoundItem) => {
    setInventoryFullError(false);
    const payload = [{ item_id: itemToCollect.item_id, quantity: itemToCollect.quantity }];
    
    const { error } = await supabase.rpc('collect_exploration_loot', { p_items_to_add: payload });

    if (error) {
      if (error.message.includes("Votre inventaire est plein")) {
        setInventoryFullError(true);
        showError("Votre inventaire est plein. Libérez de l'espace pour récupérer votre butin.");
      } else {
        showError(error.message);
      }
    } else {
      showSuccess(`${itemToCollect.name} x${itemToCollect.quantity} ajouté à l'inventaire !`);
      setFoundItems(currentItems => currentItems?.filter(item => item.item_id !== itemToCollect.item_id) || null);
      onUpdate();
    }
  };

  const handleDiscardOne = (itemToDiscard: FoundItem) => {
    setFoundItems(currentItems => currentItems?.filter(item => item.item_id !== itemToDiscard.item_id) || null);
    showInfo(`${itemToDiscard.name} a été jeté.`);
  };

  const filteredScoutedTargets = useMemo(() => {
    if (!zone) return [];
    return scoutedTargets.filter(target => target.base_zone_type === zone.type);
  }, [scoutedTargets, zone]);

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
            {foundItems ? (
              <div className="space-y-4">
                <h3 className="font-bold text-center">Butin trouvé !</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-black/20 rounded-lg">
                  {foundItems.length > 0 ? foundItems.map((item, index) => (
                    <div key={`${item.item_id}-${index}`} className="flex items-center gap-3 p-2 bg-white/10 rounded">
                      <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                        <ItemIcon iconName={item.signedIconUrl || item.icon} alt={item.name} />
                      </div>
                      <p className="flex-grow">{item.name} <span className="text-gray-400">x{item.quantity}</span></p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleCollectOne(item)}><Check className="w-4 h-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDiscardOne(item)}><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-400 p-4">
                      <p>Vous avez tout traité.</p>
                      <Button onClick={onClose} className="mt-2">Fermer</Button>
                    </div>
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
            ) : isExploring ? (
              <div className="text-center space-y-3">
                <p>Exploration en cours...</p>
                <Progress value={progress} />
                <p className="text-sm text-gray-400">Ne fermez pas cette fenêtre.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Butin potentiel :</h4>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <div className="flex flex-wrap gap-2">
                      {potentialLoot.map((item, index) => <span key={`${item.name}-${index}`} className="bg-white/10 px-2 py-1 rounded text-sm">{item.name}</span>)}
                    </div>
                  )}
                </div>
                <Button onClick={handleStartExploration} className="w-full">
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
  );
};

export default ExplorationModal;