import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, ChestItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, Clock, PlusCircle, Loader2, CookingPot, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import ItemIcon from './ItemIcon';
import { useAccurateCountdown } from '@/hooks/useAccurateCountdown';
import { Progress } from './ui/progress';

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: (silent?: boolean) => void;
}

interface CampfireFuel {
  item_id: number;
  multiplier: number;
}

interface CampfireConfig {
  base_wood_consumption_per_minute: number;
}

interface CampfireFuelSource extends InventoryItem {
  source: 'inventory' | 'chest';
}

const MAX_BURN_TIME_SECONDS = 72 * 60 * 60; // 72 hours

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (days > 0) {
    return `${days}j ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { getIconUrl, playerData, items: allItems } = useGame();
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<CampfireFuelSource | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAddingFood, setIsAddingFood] = useState(false);

  const currentConstruction = construction;
  const liveBurnTime = useAccurateCountdown(currentConstruction?.burn_time_remaining_seconds ?? 0);
  const cookingSlot = currentConstruction?.cooking_slot;

  const availableFuels = useMemo(() => {
    const fuelItemIds = new Set(fuels.map(f => f.item_id));
    const inventoryFuels: CampfireFuelSource[] = playerData.inventory
        .filter(item => item.slot_position !== null && fuelItemIds.has(item.item_id))
        .map(item => ({ ...item, source: 'inventory' }));
    const chestFuels: CampfireFuelSource[] = (playerData.chestItems || [])
        .filter(item => fuelItemIds.has(item.item_id))
        .map(item => ({ ...item, source: 'chest' as const, id: item.id, item_id: item.item_id, quantity: item.quantity, slot_position: item.slot_position, items: item.items }));
    return [...inventoryFuels, ...chestFuels];
  }, [playerData.inventory, playerData.chestItems, fuels]);

  const availableFood = useMemo(() => {
    const inventoryFood = playerData.inventory.filter(item => item.slot_position !== null && item.items?.type === 'Nourriture').map(item => ({ ...item, source: 'inventory' as const }));
    const chestFood = (playerData.chestItems || []).filter(item => item.items?.type === 'Nourriture').map(item => ({ ...item, source: 'chest' as const, id: item.id, item_id: item.item_id, quantity: item.quantity, slot_position: item.slot_position, items: item.items }));
    return [...inventoryFood, ...chestFood];
  }, [playerData.inventory, playerData.chestItems]);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        const [fuelsRes, configRes] = await Promise.all([
          supabase.from('campfire_fuels').select('*'),
          supabase.from('campfire_config').select('*').single()
        ]);
        if (fuelsRes.error || configRes.error) {
          showError("Erreur de chargement des données du feu de camp.");
        } else {
          setFuels(fuelsRes.data || []);
          setConfig(configRes.data);
        }
        setLoading(false);
      };
      fetchData();
    } else {
      setSelectedFuel(null);
      setQuantity(1);
      setIsAddingFood(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFuel) setQuantity(1);
  }, [selectedFuel]);

  const burnTimeFromSelection = useMemo(() => {
    if (!selectedFuel || !config) return 0;
    const fuelInfo = fuels.find(f => f.item_id === selectedFuel.item_id);
    if (!fuelInfo) return 0;
    
    const consumptionRate = parseFloat(String(config.base_wood_consumption_per_minute));
    if (isNaN(consumptionRate) || consumptionRate <= 0) return Infinity;
    
    const multiplier = parseFloat(String(fuelInfo.multiplier));
    if (isNaN(multiplier)) return 0;

    const secondsPerWood = 60 / consumptionRate;
    return Math.floor(quantity * multiplier * secondsPerWood);
  }, [selectedFuel, quantity, fuels, config]);

  const canAddFuel = useMemo(() => {
    if (!currentConstruction) return false;
    const addedBurnTime = burnTimeFromSelection;
    if (!isFinite(addedBurnTime)) return false;
    return (liveBurnTime + addedBurnTime) <= MAX_BURN_TIME_SECONDS;
  }, [liveBurnTime, burnTimeFromSelection, currentConstruction]);

  const handleAddFuel = async () => {
    if (!selectedFuel || !canAddFuel) return;
    setLoading(true);
    
    const rpcName = selectedFuel.source === 'inventory' ? 'add_fuel_to_campfire' : 'add_fuel_to_campfire_from_chest';
    const rpcParams = selectedFuel.source === 'inventory' 
      ? { p_inventory_id: selectedFuel.id, p_quantity: quantity }
      : { p_chest_item_id: selectedFuel.id, p_quantity: quantity };

    const { error } = await supabase.rpc(rpcName, rpcParams);
    
    if (error) showError(error.message);
    else {
      showSuccess("Combustible ajouté !");
      onUpdate(false);
      setSelectedFuel(null);
      setQuantity(1);
    }
    setLoading(false);
  };

  const handleCookItem = async (item: CampfireFuelSource) => {
    if (!currentConstruction) return;
    setIsAddingFood(false);
    setLoading(true);
    const rpcName = item.source === 'inventory' ? 'start_cooking' : 'start_cooking_from_chest';
    const rpcParams = item.source === 'inventory' ? { p_inventory_item_id: item.id, p_campfire_id: currentConstruction.id } : { p_chest_item_id: item.id, p_campfire_id: currentConstruction.id };
    const { error } = await supabase.rpc(rpcName, rpcParams);
    if (error) showError(error.message);
    else {
      showSuccess("Cuisson démarrée !");
      onUpdate(false);
    }
    setLoading(false);
  };

  const handleCollect = async () => {
    if (!currentConstruction) return;
    const { error } = await supabase.rpc('collect_cooking_output', { p_campfire_id: currentConstruction.id });
    if (error) showError(error.message);
    else {
      showSuccess("Objet récupéré !");
      onUpdate(false);
    }
  };

  const handleClearBurnt = async () => {
    if (!currentConstruction) return;
    const { error } = await supabase.rpc('clear_burnt_item', { p_campfire_id: currentConstruction.id });
    if (error) showError(error.message);
    else {
      showSuccess("Restes calcinés nettoyés.");
      onUpdate(false);
    }
  };

  const CookingProgress = () => {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    useEffect(() => {
      if (!cookingSlot?.ends_at) return;

      const calculateState = () => {
        const now = Date.now();
        const end = new Date(cookingSlot.ends_at).getTime();
        setRemainingSeconds(Math.max(0, Math.floor((end - now) / 1000)));

        if (cookingSlot.status === 'cooking') {
          const start = new Date(cookingSlot.started_at).getTime();
          const duration = end - start;
          if (duration > 0) {
            const elapsed = now - start;
            setProgress(Math.min(100, (elapsed / duration) * 100));
          } else {
            setProgress(100);
          }
          setStatusText('Cuisson en cours...');
        } else if (cookingSlot.status === 'cooked') {
          const burnStartTime = end - 3 * 60 * 1000; // 3 minutes before it burns
          const duration = end - burnStartTime;
          if (duration > 0) {
            const elapsed = now - burnStartTime;
            setProgress(100 - Math.min(100, (elapsed / duration) * 100));
          } else {
            setProgress(0);
          }
          setStatusText('Va brûler dans :');
        }
      };

      calculateState();
      const interval = setInterval(calculateState, 1000);
      return () => clearInterval(interval);
    }, [cookingSlot]);

    if (!cookingSlot) return null;
    const inputItem = allItems.find(i => i.id === cookingSlot.input_item_id);
    const outputItem = allItems.find(i => i.id === cookingSlot.cooked_item_id);
    
    if (!inputItem || !outputItem) return null;

    return (
      <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-slate-700">
        <div className="flex items-center justify-around gap-2">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
              <ItemIcon iconName={getIconUrl(inputItem.icon)} alt={inputItem.name} />
            </div>
            <p className="text-xs text-gray-400 truncate w-14">{inputItem.name}</p>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <p className="text-sm text-gray-300">{statusText}</p>
            {cookingSlot.status !== 'burnt' && <p className="font-mono text-lg font-bold text-white">{formatDuration(remainingSeconds)}</p>}
            {cookingSlot.status === 'burnt' && <p className="font-bold text-red-400">Brûlé !</p>}
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
              <ItemIcon iconName={getIconUrl(outputItem.icon)} alt={outputItem.name} />
            </div>
            <p className="text-xs text-gray-400 truncate w-14">{outputItem.name}</p>
          </div>
        </div>

        {cookingSlot.status !== 'burnt' && <Progress value={progress} className="h-2" />}
        
        <div className="pt-2">
          {cookingSlot.status === 'cooked' && <Button onClick={handleCollect} className="w-full">Récupérer</Button>}
          {cookingSlot.status === 'burnt' && <Button onClick={handleClearBurnt} variant="destructive" className="w-full">Nettoyer</Button>}
        </div>
      </div>
    );
  };

  if (!currentConstruction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Feu de Camp</DialogTitle>
          <DialogDescription>Gardez le feu allumé pour survivre.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-center p-4 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-400">Temps de combustion restant</p>
            <p className="text-3xl font-bold font-mono text-orange-300">{formatDuration(liveBurnTime)}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-center">Cuisson</h4>
            {cookingSlot ? <CookingProgress /> : (
              <Button variant="outline" className="w-full" onClick={() => setIsAddingFood(true)} disabled={liveBurnTime <= 0}>
                <CookingPot className="w-4 h-4 mr-2" /> Ajouter un aliment
              </Button>
            )}
          </div>

          {selectedFuel ? (
            <div className="space-y-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                  <ItemIcon iconName={getIconUrl(selectedFuel.items?.icon)} alt={selectedFuel.items?.name || ''} />
                </div>
                <div>
                  <p className="font-bold">{selectedFuel.items?.name}</p>
                  <p className="text-xs text-gray-400">En stock: {selectedFuel.quantity}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="quantity-slider">Quantité</Label>
                  <span className="font-mono text-lg font-bold">{quantity}</span>
                </div>
                <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={selectedFuel.quantity} step={1} disabled={selectedFuel.quantity <= 1} />
              </div>
              <p className="text-sm text-center text-gray-300">Ajoutera <span className="font-bold text-white">{formatDuration(burnTimeFromSelection)}</span> de combustion.</p>
              {!canAddFuel && <p className="text-xs text-center text-red-400">Vous ne pouvez pas dépasser 72h de combustion.</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setSelectedFuel(null)}>Changer</Button>
                <Button onClick={handleAddFuel} disabled={loading || !canAddFuel} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2 text-center">Ajouter du combustible</h4>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg">
                {availableFuels.map(item => (
                  <button key={`${item.source}-${item.id}`} onClick={() => setSelectedFuel(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
                    <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                    <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
                  </button>
                ))}
                {availableFuels.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Aucun combustible disponible.</p>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      <Dialog open={isAddingFood} onOpenChange={setIsAddingFood}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>Choisir un aliment à cuire</DialogTitle></DialogHeader>
          <div className="py-4 max-h-64 overflow-y-auto grid grid-cols-4 gap-2">
            {availableFood.map(item => (
              <button key={`${item.source}-${item.id}`} onClick={() => handleCookItem(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
                <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
              </button>
            ))}
            {availableFood.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Aucune nourriture à cuire.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default CampfireModal;