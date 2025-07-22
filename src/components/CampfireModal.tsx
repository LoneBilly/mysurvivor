import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, Item } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, Clock, PlusCircle, Loader2, CookingPot, Check } from 'lucide-react';
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

const MAX_BURN_TIME_SECONDS = 72 * 60 * 60; // 72 hours

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  let parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds >= 0 && (minutes > 0 || hours > 0 || days > 0)) {
      parts.push(`${seconds}s`);
  } else if (seconds > 0) {
      parts.push(`${seconds}s`);
  } else if (parts.length === 0) {
      parts.push('0s');
  }
  
  return parts.join(' ');
};

const CookingSlot = ({ construction, onUpdate }: { construction: BaseConstruction, onUpdate: () => void }) => {
  const { items, getIconUrl } = useGame();
  const [cookingProgress, setCookingProgress] = useState(0);
  const [burnProgress, setBurnProgress] = useState(0);

  const cookingItem = useMemo(() => {
    if (!construction.cooking_item_id) return null;
    return items.find(i => i.id === construction.cooking_item_id);
  }, [construction.cooking_item_id, items]);

  useEffect(() => {
    if (!construction.cooking_item_id || !construction.cooking_started_at || !construction.cooking_ends_at) {
      setCookingProgress(0);
      setBurnProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const startTime = new Date(construction.cooking_started_at!).getTime();
      const endTime = new Date(construction.cooking_ends_at!).getTime();
      const burnTime = endTime + 3 * 60 * 1000;

      if (now < endTime) { // Cooking
        const duration = endTime - startTime;
        const elapsed = now - startTime;
        setCookingProgress(Math.min(100, (elapsed / duration) * 100));
        setBurnProgress(0);
      } else if (now < burnTime) { // Cooked, waiting to be collected
        setCookingProgress(100);
        const duration = burnTime - endTime;
        const elapsed = now - endTime;
        setBurnProgress(Math.min(100, (elapsed / duration) * 100));
      } else { // Burnt
        setCookingProgress(100);
        setBurnProgress(100);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [construction]);

  const handleCollect = async () => {
    const { error } = await supabase.rpc('collect_cooked_item');
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet récupéré !");
      onUpdate();
    }
  };

  if (!cookingItem) return null;

  const isCooked = cookingProgress >= 100;

  return (
    <div className="relative w-24 h-24 bg-black/20 rounded-lg border border-slate-600 flex flex-col items-center justify-center p-1">
      <div className="w-12 h-12 relative">
        <ItemIcon iconName={getIconUrl(cookingItem.icon)} alt={cookingItem.name} />
      </div>
      <p className="text-xs text-center mt-1 truncate">{cookingItem.name}</p>
      
      {isCooked ? (
        <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center p-2">
          <Button size="sm" onClick={handleCollect} className="w-full"><Check className="w-4 h-4 mr-1" />Collecter</Button>
          <p className="text-xs text-red-400 mt-2 text-center">Brûle dans...</p>
          <Progress value={100 - burnProgress} className="h-1 mt-1" indicatorClassName="bg-red-500" />
        </div>
      ) : (
        <div className="absolute bottom-1 left-1 right-1">
          <Progress value={cookingProgress} className="h-1" />
        </div>
      )}
    </div>
  );
};

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { getIconUrl, playerData, items } = useGame();
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<InventoryItem | null>(null);
  const [selectedFood, setSelectedFood] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const currentConstruction = useMemo(() => {
    if (!construction) return null;
    return playerData.baseConstructions.find(c => c.id === construction.id) || construction;
  }, [construction, playerData.baseConstructions]);

  const liveBurnTime = useAccurateCountdown(currentConstruction?.burn_time_remaining_seconds ?? 0);

  const availableFuels = useMemo(() => {
    const fuelItemIds = new Set(fuels.map(f => f.item_id));
    const allItems = [...playerData.inventory.filter(i => i.slot_position !== null), ...(playerData.chestItems || [])];
    const fuelMap = new Map<number, InventoryItem>();
    allItems.forEach(item => {
      if (fuelItemIds.has(item.item_id)) {
        const existing = fuelMap.get(item.item_id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          fuelMap.set(item.item_id, { ...item });
        }
      }
    });
    return Array.from(fuelMap.values());
  }, [playerData.inventory, playerData.chestItems, fuels]);

  const cookableItems = useMemo(() => {
    const allItems = [...playerData.inventory.filter(i => i.slot_position !== null), ...(playerData.chestItems || [])];
    const foodMap = new Map<number, InventoryItem>();
    allItems.forEach(item => {
      if (item.items?.type === 'Nourriture') {
        const existing = foodMap.get(item.item_id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          foodMap.set(item.item_id, { ...item });
        }
      }
    });
    return Array.from(foodMap.values());
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
      setSelectedFood(null);
      setQuantity(1);
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
    const { error } = await supabase.rpc('add_fuel_to_campfire', {
      p_item_id: selectedFuel.item_id,
      p_quantity: quantity,
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Combustible ajouté !");
      onUpdate(false);
      setSelectedFuel(null);
      setQuantity(1);
    }
    setLoading(false);
  };

  const handleStartCooking = async () => {
    if (!selectedFood) return;
    setLoading(true);
    const { error } = await supabase.rpc('start_cooking', { p_item_id: selectedFood.item_id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Cuisson démarrée !");
      onUpdate(false);
      setSelectedFood(null);
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

          <div className="flex justify-center items-start gap-4">
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-center">Cuisson</h4>
              <div className="flex justify-center">
                {currentConstruction.cooking_item_id ? (
                  <CookingSlot construction={currentConstruction} onUpdate={onUpdate} />
                ) : (
                  <div className="w-24 h-24 bg-black/20 rounded-lg border border-dashed border-slate-600 flex items-center justify-center">
                    <CookingPot className="w-8 h-8 text-slate-500" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedFuel ? (
            <div className="space-y-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                  <ItemIcon iconName={getIconUrl(selectedFuel.items?.icon)} alt={selectedFuel.items?.name || ''} />
                </div>
                <div><p className="font-bold">{selectedFuel.items?.name}</p><p className="text-xs text-gray-400">En stock: {selectedFuel.quantity}</p></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><Label htmlFor="quantity-slider">Quantité</Label><span className="font-mono text-lg font-bold">{quantity}</span></div>
                <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={selectedFuel.quantity} step={1} disabled={selectedFuel.quantity <= 1} />
              </div>
              <p className="text-sm text-center text-gray-300">Ajoutera <span className="font-bold text-white">{formatDuration(burnTimeFromSelection)}</span> de combustion.</p>
              {!canAddFuel && <p className="text-xs text-center text-red-400">Vous ne pouvez pas dépasser 72h de combustion.</p>}
              <div className="flex gap-2 pt-2"><Button variant="secondary" onClick={() => setSelectedFuel(null)}>Changer</Button><Button onClick={handleAddFuel} disabled={loading || !canAddFuel} className="flex-1">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}</Button></div>
            </div>
          ) : selectedFood ? (
            <div className="space-y-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                  <ItemIcon iconName={getIconUrl(selectedFood.items?.icon)} alt={selectedFood.items?.name || ''} />
                </div>
                <div><p className="font-bold">{selectedFood.items?.name}</p><p className="text-xs text-gray-400">En stock: {selectedFood.quantity}</p></div>
              </div>
              <div className="flex gap-2 pt-2"><Button variant="secondary" onClick={() => setSelectedFood(null)}>Changer</Button><Button onClick={handleStartCooking} disabled={loading} className="flex-1">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lancer la cuisson'}</Button></div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2 text-center">Ajouter un objet</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><h5 className="text-sm text-center text-gray-400 mb-1">Combustibles</h5><div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-black/20 rounded-lg">{availableFuels.map(item => (<button key={item.id} onClick={() => setSelectedFuel(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors"><ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} /><span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span></button>))}{availableFuels.length === 0 && <p className="col-span-full text-center text-xs text-gray-500 py-4">Aucun.</p>}</div></div>
                <div><h5 className="text-sm text-center text-gray-400 mb-1">Nourriture</h5><div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-black/20 rounded-lg">{cookableItems.map(item => (<button key={item.id} onClick={() => setSelectedFood(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors"><ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} /><span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>{item.quantity}</span></button>))}{cookableItems.length === 0 && <p className="col-span-full text-center text-xs text-gray-500 py-4">Aucune.</p>}</div></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;