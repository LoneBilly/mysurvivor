import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, ChestItem, Item } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, CookingPot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import ItemIcon from './ItemIcon';
import { useAccurateCountdown } from '@/hooks/useAccurateCountdown';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  if (days > 0) {
    return `${days}j ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(seconds).padStart(2, '0')}s`;
};

const CookingProgress = ({ cookingSlot, onComplete, allItems }: { cookingSlot: NonNullable<BaseConstruction['cooking_slot']>, onComplete: () => void, allItems: Item[] | null }) => {
  const { getIconUrl } = useGame();
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

      if (newRemaining <= 0) {
        if (cookingSlot.status === 'cooking') setProgress(100);
        else if (cookingSlot.status === 'cooked') setProgress(0);
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

  if (!allItems) {
    return <div className="p-3 bg-white/5 rounded-lg border border-slate-700"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  const inputItem = allItems.find(i => i.id === cookingSlot.input_item_id);
  const outputItem = allItems.find(i => i.id === cookingSlot.cooked_item_id);
  
  if (!inputItem || !outputItem) return null;

  const quantity = cookingSlot.quantity || 1;

  return (
    <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-slate-700">
      <div className="flex items-center justify-around gap-2">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
            <ItemIcon iconName={getIconUrl(inputItem.icon)} alt={inputItem.name} />
            {quantity > 1 && <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{quantity}</span>}
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
            {quantity > 1 && <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{quantity}</span>}
          </div>
          <p className="text-xs text-gray-400 truncate w-14">{outputItem.name}</p>
        </div>
      </div>
      {cookingSlot.status !== 'burnt' && <Progress value={progress} className="h-2" />}
    </div>
  );
};

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { getIconUrl, playerData, items: allItems } = useGame();
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<CampfireFuelSource | null>(null);
  const [fuelQuantity, setFuelQuantity] = useState(1);
  const [selectedFood, setSelectedFood] = useState<CampfireFuelSource | null>(null);
  const [foodQuantity, setFoodQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isCookingLoading, setIsCookingLoading] = useState(false);

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
    const inventoryFood = playerData.inventory.filter(item => item.slot_position !== null && item.items?.type === 'Nourriture' && item.items.effects?.cooked_item_id).map(item => ({ ...item, source: 'inventory' as const }));
    const chestFood = (playerData.chestItems || []).filter(item => item.items?.type === 'Nourriture' && item.items.effects?.cooked_item_id).map(item => ({ ...item, source: 'chest' as const, id: item.id, item_id: item.item_id, quantity: item.quantity, slot_position: item.slot_position, items: item.items }));
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
      setFuelQuantity(1);
      setSelectedFood(null);
      setFoodQuantity(1);
      setIsCookingLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFuel) setFuelQuantity(1);
  }, [selectedFuel]);

  useEffect(() => {
    if (selectedFood) setFoodQuantity(1);
  }, [selectedFood]);

  const burnTimeFromSelection = useMemo(() => {
    if (!selectedFuel || !config) return 0;
    const fuelInfo = fuels.find(f => f.item_id === selectedFuel.item_id);
    if (!fuelInfo) return 0;
    
    const consumptionRate = parseFloat(String(config.base_wood_consumption_per_minute));
    if (isNaN(consumptionRate) || consumptionRate <= 0) return Infinity;
    
    const multiplier = parseFloat(String(fuelInfo.multiplier));
    if (isNaN(multiplier)) return 0;

    const secondsPerWood = 60 / consumptionRate;
    return Math.floor(fuelQuantity * multiplier * secondsPerWood);
  }, [selectedFuel, fuelQuantity, fuels, config]);

  const maxAddableFuelQuantity = useMemo(() => {
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

  const cookingTimeFromSelection = useMemo(() => {
    if (!selectedFood) return 0;
    const cookTime = selectedFood.items?.effects?.cooking_time_seconds || 180;
    return cookTime * foodQuantity;
  }, [selectedFood, foodQuantity]);

  const handleRpc = async (rpcName: string, params: any, successMessage: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc(rpcName, params);
      if (error) throw error;
      showSuccess(successMessage);
      await onUpdate(true);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFuel = async () => {
    if (!selectedFuel || !currentConstruction) return;
    const rpcName = selectedFuel.source === 'inventory' ? 'add_fuel_to_campfire' : 'add_fuel_to_campfire_from_chest';
    const params = selectedFuel.source === 'inventory' 
      ? { p_inventory_id: selectedFuel.id, p_quantity: fuelQuantity }
      : { p_chest_item_id: selectedFuel.id, p_quantity: fuelQuantity };
    
    await handleRpc(rpcName, params, "Combustible ajouté !");
    setSelectedFuel(null);
    setFuelQuantity(1);
  };

  const handleCookItem = async () => {
    if (!selectedFood || !currentConstruction) return;
    setIsCookingLoading(true);
    const rpcName = selectedFood.source === 'inventory' ? 'start_cooking' : 'start_cooking_from_chest';
    const params = selectedFood.source === 'inventory' 
      ? { p_inventory_item_id: selectedFood.id, p_campfire_id: currentConstruction.id, p_quantity_to_cook: foodQuantity } 
      : { p_chest_item_id: selectedFood.id, p_campfire_id: currentConstruction.id, p_quantity_to_cook: foodQuantity };
    
    await handleRpc(rpcName, params, "Cuisson démarrée !");
    setIsCookingLoading(false);
    setSelectedFood(null);
    setFoodQuantity(1);
  };

  const handleCollect = () => {
    if (!currentConstruction) return;
    handleRpc('collect_cooking_output', { p_campfire_id: currentConstruction.id }, "Objet récupéré !");
  };

  const handleClearBurnt = () => {
    if (!currentConstruction) return;
    handleRpc('clear_burnt_item', { p_campfire_id: currentConstruction.id }, "Restes calcinés nettoyés.");
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
        
        <div className="text-center p-4 bg-black/20 rounded-lg">
          <p className="text-sm text-gray-400">Temps de combustion restant</p>
          <p className="text-3xl font-bold font-mono text-orange-300">{formatDuration(liveBurnTime)}</p>
        </div>

        <Tabs defaultValue="cooking" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cooking">Cuisson</TabsTrigger>
            <TabsTrigger value="fuel">Combustible</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cooking" className="pt-4">
            <div className="space-y-2 flex-grow flex flex-col">
              <div className="flex-grow flex flex-col justify-center">
                {isCookingLoading ? (
                  <div className="flex items-center justify-center h-full min-h-[108px] bg-white/5 rounded-lg border border-slate-700">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                ) : cookingSlot ? (
                  <div className="space-y-2">
                    <CookingProgress cookingSlot={cookingSlot} onComplete={() => onUpdate(true)} allItems={allItems} />
                    <div className="pt-2">
                      {cookingSlot.status === 'cooked' && <Button onClick={handleCollect} disabled={loading} className="w-full">Récupérer</Button>}
                      {cookingSlot.status === 'burnt' && <Button onClick={handleClearBurnt} disabled={loading} variant="destructive" className="w-full">Nettoyer</Button>}
                    </div>
                  </div>
                ) : selectedFood ? (
                  <div className="space-y-4 p-4 bg-white/5 rounded-lg flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={getIconUrl(selectedFood.items?.icon)} alt={selectedFood.items?.name || ''} />
                        </div>
                        <div>
                          <p className="font-bold">{selectedFood.items?.name}</p>
                          <p className="text-xs text-gray-400">En stock: {selectedFood.quantity}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="quantity-slider">Quantité à cuire</Label>
                          <span className="font-mono text-lg font-bold">{foodQuantity}</span>
                        </div>
                        <Slider value={[foodQuantity]} onValueChange={([val]) => setFoodQuantity(val)} min={1} max={selectedFood.quantity} step={1} disabled={selectedFood.quantity <= 1} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-center text-gray-300 mt-4">
                        Temps de cuisson total: <span className="font-bold text-white">{formatDuration(cookingTimeFromSelection)}</span>.
                      </p>
                      {liveBurnTime < cookingTimeFromSelection && <p className="text-xs text-center text-red-400 mt-1">Combustible insuffisant.</p>}
                      <div className="flex gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setSelectedFood(null)}>Changer</Button>
                        <Button onClick={handleCookItem} disabled={loading || liveBurnTime < cookingTimeFromSelection} className="flex-1">
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Démarrer la cuisson'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-gray-400">Choisissez un aliment à cuire</p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-2 bg-black/20 rounded-lg">
                      {availableFood.map(item => (
                        <button 
                          key={`${item.source}-${item.id}`} 
                          onClick={() => setSelectedFood(item)} 
                          disabled={liveBurnTime <= 0 || loading || isCookingLoading}
                          className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={liveBurnTime <= 0 ? "Le feu est éteint" : item.items?.name}
                        >
                          <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                          <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span>
                        </button>
                      ))}
                      {availableFood.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Aucune nourriture à cuire.</p>}
                    </div>
                    {liveBurnTime <= 0 && <p className="text-center text-xs text-red-400 mt-2">Le feu doit être allumé pour pouvoir cuire.</p>}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fuel" className="pt-4">
            <div className="space-y-4 flex flex-col">
              {selectedFuel ? (
                <div className="space-y-4 p-4 bg-white/5 rounded-lg flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
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
                        <span className="font-mono text-lg font-bold">{fuelQuantity}</span>
                      </div>
                      <Slider value={[fuelQuantity]} onValueChange={([val]) => setFuelQuantity(val)} min={1} max={maxAddableFuelQuantity} step={1} disabled={selectedFuel.quantity <= 1 || maxAddableFuelQuantity <= 1} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-center text-gray-300 mt-4">
                      Ajoutera <span className="font-bold text-white">{formatDuration(burnTimeFromSelection)}</span>.
                      <br />
                      Nouveau total: <span className="font-bold text-orange-300">{formatDuration(liveBurnTime + burnTimeFromSelection)}</span>
                    </p>
                    {liveBurnTime + burnTimeFromSelection > MAX_BURN_TIME_SECONDS && <p className="text-xs text-center text-red-400 mt-1">Vous ne pouvez pas dépasser 72h de combustion.</p>}
                    <div className="flex gap-2 pt-4">
                      <Button variant="secondary" onClick={() => setSelectedFuel(null)}>Changer</Button>
                      <Button onClick={handleAddFuel} disabled={loading || liveBurnTime + burnTimeFromSelection > MAX_BURN_TIME_SECONDS} className="flex-1">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-center text-sm text-gray-400">Choisissez un combustible</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-2 bg-black/20 rounded-lg">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;