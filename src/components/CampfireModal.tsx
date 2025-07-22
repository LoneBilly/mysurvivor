import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, Clock, PlusCircle, Loader2, CookingPot, CheckCircle } from 'lucide-react';
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
const BURN_OFF_DURATION_SECONDS = 3 * 60; // 3 minutes

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
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
    const allPlayerItems = [...playerData.inventory, ...(playerData.chestItems || [])];
    const fuelMap = new Map<number, InventoryItem>();

    allPlayerItems.forEach(item => {
      if (item && item.slot_position !== null && fuelItemIds.has(item.item_id)) {
        if (fuelMap.has(item.item_id)) {
          const existing = fuelMap.get(item.item_id)!;
          existing.quantity += item.quantity;
        } else {
          fuelMap.set(item.item_id, { ...item, id: item.item_id });
        }
      }
    });
    return Array.from(fuelMap.values());
  }, [playerData.inventory, playerData.chestItems, fuels]);

  const availableFood = useMemo(() => {
    return playerData.inventory.filter(item => item.slot_position !== null && item.items?.type === 'Nourriture' && item.items.effects?.cooked_item_id);
  }, [playerData.inventory]);

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
    if (selectedFuel || selectedFood) {
      setQuantity(1);
    }
  }, [selectedFuel, selectedFood]);

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
    const { error } = await supabase.rpc('start_cooking', {
      p_inventory_id: selectedFood.id,
      p_quantity: quantity,
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Cuisson démarrée !");
      onUpdate(false);
      setSelectedFood(null);
      setQuantity(1);
    }
    setLoading(false);
  };

  const handleCollectCookedItem = async () => {
    if (!currentConstruction) return;
    setLoading(true);
    const { error } = await supabase.rpc('collect_cooked_item', { p_campfire_id: currentConstruction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Plat récupéré !");
      onUpdate(false);
    }
    setLoading(false);
  };

  const cookingItem = useMemo(() => items.find(i => i.id === currentConstruction?.cooking_slot_item_id), [items, currentConstruction]);
  const cookedItem = useMemo(() => items.find(i => i.id === currentConstruction?.cooked_item_id), [items, currentConstruction]);

  const cookingProgress = useMemo(() => {
    if (!currentConstruction?.cooking_started_at || !currentConstruction?.cooking_ends_at) return 0;
    const start = new Date(currentConstruction.cooking_started_at).getTime();
    const end = new Date(currentConstruction.cooking_ends_at).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  }, [currentConstruction]);

  const burnProgress = useMemo(() => {
    if (!currentConstruction?.cooked_at) return 0;
    const start = new Date(currentConstruction.cooked_at).getTime();
    const end = start + BURN_OFF_DURATION_SECONDS * 1000;
    const now = Date.now();
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  }, [currentConstruction]);

  if (!currentConstruction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Feu de Camp</DialogTitle>
          <DialogDescription>Gardez le feu allumé pour survivre et cuisiner.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-center p-4 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-400">Temps de combustion restant</p>
            <p className="text-3xl font-bold font-mono text-orange-300">{formatDuration(liveBurnTime)}</p>
          </div>

          <div className="space-y-2 p-3 bg-black/20 rounded-lg">
            <h4 className="font-semibold text-center">Cuisson</h4>
            <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-md flex items-center justify-center relative border border-slate-600">
              {cookingItem ? (
                <>
                  <ItemIcon iconName={getIconUrl(cookingItem.icon)} alt={cookingItem.name} />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  <Progress value={cookingProgress} className="absolute bottom-1 left-1 right-1 h-1.5" />
                </>
              ) : cookedItem ? (
                <>
                  <ItemIcon iconName={getIconUrl(cookedItem.icon)} alt={cookedItem.name} />
                  <Progress value={100 - burnProgress} className="absolute bottom-1 left-1 right-1 h-1.5" indicatorClassName="bg-red-500" />
                </>
              ) : (
                <CookingPot className="w-8 h-8 text-gray-500" />
              )}
            </div>
            {cookedItem ? (
              <Button onClick={handleCollectCookedItem} disabled={loading} className="w-full"><CheckCircle className="w-4 h-4 mr-2" />Récupérer</Button>
            ) : !cookingItem && (
              <Button variant="outline" onClick={() => setSelectedFood(availableFood[0])} disabled={availableFood.length === 0 || liveBurnTime <= 0}>
                {liveBurnTime <= 0 ? "Le feu est éteint" : "Ajouter à manger"}
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
          ) : selectedFood ? (
            <div className="space-y-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
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
                  <Label htmlFor="quantity-slider">Quantité</Label>
                  <span className="font-mono text-lg font-bold">{quantity}</span>
                </div>
                <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={selectedFood.quantity} step={1} disabled={selectedFood.quantity <= 1} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setSelectedFood(null)}>Changer</Button>
                <Button onClick={handleStartCooking} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lancer la cuisson'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold mb-2 text-center">Ajouter du combustible</h4>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg">
                {availableFuels.map(item => (
                  <button key={item.id} onClick={() => setSelectedFuel(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400 transition-colors">
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
    </Dialog>
  );
};

export default CampfireModal;