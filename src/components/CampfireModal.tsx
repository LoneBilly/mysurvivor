import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, ChestItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, CookingPot, Loader2 } from 'lucide-react';
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
  onUpdate: (silent?: boolean) => Promise<void>;
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

  if (days > 0) return `${days}j ${String(hours).padStart(2, '0')}h`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
};

const CookingProgress = ({ cookingSlot, onComplete }: { cookingSlot: NonNullable<BaseConstruction['cooking_slot']>, onComplete: () => void }) => {
  const { getIconUrl, allItems } = useGame();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const calculateState = () => {
      const now = Date.now();
      const end = new Date(cookingSlot.ends_at).getTime();
      const newRemaining = Math.max(0, Math.floor((end - now) / 1000));
      setRemainingSeconds(newRemaining);

      if (newRemaining <= 0 && cookingSlot.status !== 'burnt') {
        onCompleteRef.current();
        return;
      }

      if (cookingSlot.status === 'cooking') {
        const start = new Date(cookingSlot.started_at).getTime();
        const duration = end - start;
        setProgress(duration > 0 ? Math.min(100, ((now - start) / duration) * 100) : 100);
        setStatusText('Cuisson en cours...');
      } else if (cookingSlot.status === 'cooked') {
        const burnStartTime = end - 3 * 60 * 1000;
        const duration = end - burnStartTime;
        setProgress(duration > 0 ? 100 - Math.min(100, ((now - burnStartTime) / duration) * 100) : 0);
        setStatusText('Va brûler dans :');
      }
    };

    calculateState();
    const interval = setInterval(calculateState, 1000);
    return () => clearInterval(interval);
  }, [cookingSlot]);

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
    </div>
  );
};

const CampfireModal = ({ isOpen, onClose, construction: initialConstruction, onUpdate }: CampfireModalProps) => {
  const { getIconUrl, playerData, setPlayerData, allItems } = useGame();
  
  const constructionId = initialConstruction?.id;
  const currentConstruction = useMemo(() => {
    if (!constructionId) return null;
    return playerData.baseConstructions.find(c => c.id === constructionId) ?? null;
  }, [playerData.baseConstructions, constructionId]);

  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<CampfireFuelSource | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAddingFood, setIsAddingFood] = useState(false);

  const liveBurnTime = useAccurateCountdown(currentConstruction?.burn_time_remaining_seconds ?? 0, currentConstruction?.fuel_last_updated_at);
  const cookingSlot = currentConstruction?.cooking_slot;

  const availableFuels = useMemo(() => {
    const fuelItemIds = new Set(fuels.map(f => f.item_id));
    const inventoryFuels: CampfireFuelSource[] = playerData.inventory.filter(item => item.slot_position !== null && fuelItemIds.has(item.item_id)).map(item => ({ ...item, source: 'inventory' }));
    const chestFuels: CampfireFuelSource[] = (playerData.chestItems || []).filter(item => fuelItemIds.has(item.item_id)).map(item => ({ ...item, source: 'chest' as const, id: item.id, item_id: item.item_id, quantity: item.quantity, slot_position: item.slot_position, items: item.items }));
    return [...inventoryFuels, ...chestFuels];
  }, [playerData.inventory, playerData.chestItems, fuels]);

  const availableFood = useMemo(() => {
    const inventoryFood = playerData.inventory.filter(item => item.slot_position !== null && item.items?.type === 'Nourriture' && item.items.effects?.cooked_item_id).map(item => ({ ...item, source: 'inventory' as const }));
    const chestFood = (playerData.chestItems || []).filter(item => item.items?.type === 'Nourriture' && item.items.effects?.cooked_item_id).map(item => ({ ...item, source: 'chest' as const, id: item.id, item_id: item.item_id, quantity: item.quantity, slot_position: item.slot_position, items: item.items }));
    return [...inventoryFood, ...chestFood];
  }, [playerData.inventory, playerData.chestItems, allItems]);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const [fuelsRes, configRes] = await Promise.all([
          supabase.from('campfire_fuels').select('*'),
          supabase.from('campfire_config').select('*').single()
        ]);
        if (fuelsRes.data) setFuels(fuelsRes.data);
        if (configRes.data) setConfig(configRes.data);
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

  const maxAddableQuantity = useMemo(() => {
    if (!selectedFuel || !config || !currentConstruction) return 1;
    const fuelInfo = fuels.find(f => f.item_id === selectedFuel.item_id);
    if (!fuelInfo) return 1;
    const consumptionRate = parseFloat(String(config.base_wood_consumption_per_minute));
    if (isNaN(consumptionRate) || consumptionRate <= 0) return selectedFuel.quantity;
    const multiplier = parseFloat(String(fuelInfo.multiplier));
    if (isNaN(multiplier)) return 1;
    const secondsPerItem = (60 / consumptionRate) * multiplier;
    if (secondsPerItem <= 0) return selectedFuel.quantity;
    const remainingCapacity = MAX_BURN_TIME_SECONDS - liveBurnTime;
    const maxByCapacity = Math.floor(remainingCapacity / secondsPerItem);
    return Math.max(1, Math.min(selectedFuel.quantity, maxByCapacity));
  }, [selectedFuel, config, currentConstruction, liveBurnTime, fuels]);

  const burnTimeFromSelection = useMemo(() => {
    if (!selectedFuel || !config) return 0;
    const fuelInfo = fuels.find(f => f.item_id === selectedFuel.item_id);
    if (!fuelInfo) return 0;
    const consumptionRate = parseFloat(String(config.base_wood_consumption_per_minute));
    const multiplier = parseFloat(String(fuelInfo.multiplier));
    const secondsPerItem = (60 / consumptionRate) * multiplier;
    return Math.floor(quantity * secondsPerItem);
  }, [selectedFuel, quantity, fuels, config]);

  const handleAddFuel = async () => {
    if (!selectedFuel || !currentConstruction || !config) return;
    const finalQuantity = Math.min(quantity, maxAddableQuantity);
    if (finalQuantity <= 0) return;

    const fuelInfo = fuels.find(f => f.item_id === selectedFuel.item_id);
    if (!fuelInfo) return;
    const consumptionRate = parseFloat(String(config.base_wood_consumption_per_minute));
    const multiplier = parseFloat(String(fuelInfo.multiplier));
    const secondsPerItem = (60 / consumptionRate) * multiplier;
    const finalAddedBurnTime = Math.floor(finalQuantity * secondsPerItem);

    if (liveBurnTime + finalAddedBurnTime > MAX_BURN_TIME_SECONDS + 1) { // +1 for rounding issues
        showError("Vous ne pouvez pas dépasser 72h de combustion.");
        return;
    }

    setLoading(true);
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    setPlayerData(prev => {
        const newPlayerData = JSON.parse(JSON.stringify(prev));
        const cIndex = newPlayerData.baseConstructions.findIndex((c: BaseConstruction) => c.id === currentConstruction.id);
        if (cIndex > -1) {
            const c = newPlayerData.baseConstructions[cIndex];
            const timePassed = (Date.now() - new Date(c.fuel_last_updated_at).getTime()) / 1000;
            const currentRealBurnTime = Math.max(0, c.burn_time_remaining_seconds - timePassed);
            c.burn_time_remaining_seconds = currentRealBurnTime + finalAddedBurnTime;
            c.fuel_last_updated_at = new Date().toISOString();
        }
        const itemSource = selectedFuel.source === 'inventory' ? newPlayerData.inventory : newPlayerData.chestItems;
        const itemIndex = itemSource.findIndex((i: any) => i.id === selectedFuel.id);
        if (itemIndex > -1) {
            if (itemSource[itemIndex].quantity > finalQuantity) itemSource[itemIndex].quantity -= finalQuantity;
            else itemSource.splice(itemIndex, 1);
        }
        return newPlayerData;
    });
    
    setSelectedFuel(null);
    setQuantity(1);

    const rpcName = selectedFuel.source === 'inventory' ? 'add_fuel_to_campfire' : 'add_fuel_to_campfire_from_chest';
    const rpcParams = { p_quantity: finalQuantity, [selectedFuel.source === 'inventory' ? 'p_inventory_id' : 'p_chest_item_id']: selectedFuel.id };

    try {
        const { error } = await supabase.rpc(rpcName, rpcParams);
        if (error) throw error;
        showSuccess("Combustible ajouté !");
        onUpdate(true);
    } catch (error: any) {
        showError(error.message);
        setPlayerData(originalPlayerData);
    } finally {
        setLoading(false);
    }
  };

  const handleCookItem = async (item: CampfireFuelSource) => {
    if (!currentConstruction) return;
    setIsAddingFood(false);
    setLoading(true);

    const itemDetails = allItems.find(i => i.id === item.item_id);
    if (!itemDetails?.effects?.cooked_item_id || !itemDetails?.effects?.cooking_time_seconds) {
        showError("Cet objet n'a pas de recette de cuisson valide.");
        setLoading(false);
        return;
    }

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const newCookingSlot = {
        input_item_id: item.item_id,
        cooked_item_id: itemDetails.effects.cooked_item_id,
        status: 'cooking' as const,
        started_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + itemDetails.effects.cooking_time_seconds * 1000).toISOString(),
    };

    setPlayerData(prev => {
        const newPlayerData = JSON.parse(JSON.stringify(prev));
        const cIndex = newPlayerData.baseConstructions.findIndex((c: BaseConstruction) => c.id === currentConstruction.id);
        if (cIndex > -1) newPlayerData.baseConstructions[cIndex].cooking_slot = newCookingSlot;
        const itemSource = item.source === 'inventory' ? newPlayerData.inventory : newPlayerData.chestItems;
        const itemIndex = itemSource.findIndex((i: any) => i.id === item.id);
        if (itemIndex > -1) {
            if (itemSource[itemIndex].quantity > 1) itemSource[itemIndex].quantity -= 1;
            else itemSource.splice(itemIndex, 1);
        }
        return newPlayerData;
    });

    const rpcName = item.source === 'inventory' ? 'start_cooking' : 'start_cooking_from_chest';
    const rpcParams = { p_campfire_id: currentConstruction.id, [item.source === 'inventory' ? 'p_inventory_item_id' : 'p_chest_item_id']: item.id };

    try {
      const { error } = await supabase.rpc(rpcName, rpcParams);
      if (error) throw error;
      showSuccess("Cuisson démarrée !");
      onUpdate(true);
    } catch (error: any) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async () => {
    if (!currentConstruction) return;
    setLoading(true);
    const { error } = await supabase.rpc('collect_cooking_output', { p_campfire_id: currentConstruction.id });
    if (error) showError(error.message);
    else {
      showSuccess("Objet récupéré !");
      await onUpdate(false);
    }
    setLoading(false);
  };

  const handleClearBurnt = async () => {
    if (!currentConstruction) return;
    setLoading(true);
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    setPlayerData(prev => {
        const newPlayerData = JSON.parse(JSON.stringify(prev));
        const cIndex = newPlayerData.baseConstructions.findIndex((c: BaseConstruction) => c.id === currentConstruction.id);
        if (cIndex > -1) newPlayerData.baseConstructions[cIndex].cooking_slot = null;
        return newPlayerData;
    });

    const { error } = await supabase.rpc('clear_burnt_item', { p_campfire_id: currentConstruction.id });
    if (error) {
        showError(error.message);
        setPlayerData(originalPlayerData);
    } else {
        showSuccess("Restes calcinés nettoyés.");
        onUpdate(true);
    }
    setLoading(false);
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
            {cookingSlot ? (
              <>
                <CookingProgress cookingSlot={cookingSlot} onComplete={() => onUpdate(true)} />
                <div className="pt-2">
                  {cookingSlot.status === 'cooked' && <Button onClick={handleCollect} className="w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Récupérer"}</Button>}
                  {cookingSlot.status === 'burnt' && <Button onClick={handleClearBurnt} variant="destructive" className="w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Nettoyer"}</Button>}
                </div>
              </>
            ) : (
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
                <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={maxAddableQuantity} step={1} disabled={maxAddableQuantity <= 1} />
              </div>
              <p className="text-sm text-center text-gray-300">
                Ajoutera <span className="font-bold text-white">{formatDuration(burnTimeFromSelection)}</span>.
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setSelectedFuel(null)}>Changer</Button>
                <Button onClick={handleAddFuel} disabled={loading || quantity > maxAddableQuantity} className="flex-1">
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