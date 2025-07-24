import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, Clock, Loader2, CookingPot, Trash2 } from 'lucide-react';
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

interface FuelSource extends InventoryItem {
  source: 'inventory' | 'chest';
}

const MAX_BURN_TIME_SECONDS = 72 * 60 * 60; // 72 hours

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (days > 0) return `${days}j ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  if (minutes > 0) return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
};

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { getIconUrl, playerData, items: allItems } = useGame();
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<FuelSource | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [localCookingSlot, setLocalCookingSlot] = useState<any>(null);

  const liveBurnTime = useAccurateCountdown(construction?.burn_time_remaining_seconds ?? 0);
  const effectiveCookingSlot = construction?.cooking_slot || localCookingSlot;

  const availableFuels = useMemo(() => {
    const fuelItemIds = new Set(fuels.map(f => f.item_id));
    const inventoryFuels: FuelSource[] = playerData.inventory
        .filter(item => item.slot_position !== null && fuelItemIds.has(item.item_id))
        .map(item => ({ ...item, source: 'inventory' }));
    const chestFuels: FuelSource[] = (playerData.chestItems || [])
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
        if (fuelsRes.error || configRes.error) showError("Erreur de chargement des données du feu de camp.");
        else {
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
      setLocalCookingSlot(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFuel) setQuantity(1);
  }, [selectedFuel]);

  const burnTimeFromSelection = useMemo(() => {
    if (!selectedFuel || !config) return 0;
    const fuelInfo = fuels.find(f => f.item_id === selectedFuel.item_id);
    if (!fuelInfo) return 0;
    const consumptionRate = config.base_wood_consumption_per_minute;
    if (consumptionRate <= 0) return Infinity;
    const secondsPerWood = 60 / consumptionRate;
    return Math.floor(quantity * fuelInfo.multiplier * secondsPerWood);
  }, [selectedFuel, quantity, fuels, config]);

  const canAddFuel = useMemo(() => {
    if (!construction) return false;
    const addedBurnTime = burnTimeFromSelection;
    if (!isFinite(addedBurnTime)) return false;
    return (liveBurnTime + addedBurnTime) <= MAX_BURN_TIME_SECONDS;
  }, [liveBurnTime, burnTimeFromSelection, construction]);

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
      await onUpdate(false);
      setSelectedFuel(null);
      setQuantity(1);
    }
    setLoading(false);
  };

  const handleCookItem = async (item: FuelSource) => {
    if (!construction) return;
    setIsAddingFood(false);
    setLoading(true);

    const itemDetails = allItems.find(i => i.id === item.item_id);
    const cookingTime = itemDetails?.effects?.cooking_time_seconds ?? 180;
    const cookedItemId = itemDetails?.effects?.cooked_item_id;

    if (!cookedItemId) {
      showError("Cet objet ne peut pas être cuit.");
      setLoading(false);
      return;
    }

    const tempSlot = {
      input_item_id: item.item_id,
      cooked_item_id: cookedItemId,
      status: 'cooking',
      started_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + cookingTime * 1000).toISOString(),
    };
    setLocalCookingSlot(tempSlot);

    try {
      const rpcName = item.source === 'inventory' ? 'start_cooking' : 'start_cooking_from_chest';
      const rpcParams = item.source === 'inventory' ? { p_inventory_item_id: item.id, p_campfire_id: construction.id } : { p_chest_item_id: item.id, p_campfire_id: construction.id };
      const { error } = await supabase.rpc(rpcName, rpcParams);
      if (error) throw error;
      showSuccess("Cuisson démarrée !");
    } catch (error: any) {
      showError(error.message);
      setLocalCookingSlot(null); // Clear optimistic state on error
    } finally {
      await onUpdate(false);
      setLoading(false);
      setLocalCookingSlot(null);
    }
  };

  const handleCollect = async () => {
    if (!construction) return;
    const { error } = await supabase.rpc('collect_cooking_output', { p_campfire_id: construction.id });
    if (error) showError(error.message);
    else {
      showSuccess("Objet récupéré !");
      await onUpdate(false);
    }
  };

  const handleClearBurnt = async () => {
    if (!construction) return;
    const { error } = await supabase.rpc('clear_burnt_item', { p_campfire_id: construction.id });
    if (error) showError(error.message);
    else {
      showSuccess("Restes calcinés nettoyés.");
      await onUpdate(false);
    }
  };

  const CookingProgress = ({ cookingSlot }: { cookingSlot: any }) => {
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
          setProgress(duration > 0 ? Math.min(100, (now - start) / duration * 100) : 100);
          setStatusText('Cuisson en cours...');
        } else if (cookingSlot.status === 'cooked') {
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
          <ItemIcon iconName={getIconUrl(inputItem.icon)} alt={inputItem.name} label={inputItem.name} />
          <div className="flex-1 flex flex-col items-center">
            <p className="text-sm text-gray-300">{statusText}</p>
            {cookingSlot.status !== 'burnt' && <p className="font-mono text-lg font-bold text-white">{formatDuration(remainingSeconds)}</p>}
            {cookingSlot.status === 'burnt' && <p className="font-bold text-red-400">Brûlé !</p>}
          </div>
          <ItemIcon iconName={getIconUrl(outputItem.icon)} alt={outputItem.name} label={outputItem.name} />
        </div>
        {cookingSlot.status === 'cooking' && <Progress value={progress} className="h-2" />}
        <div className="pt-2">
          {cookingSlot.status === 'cooked' && <Button onClick={handleCollect} className="w-full">Récupérer</Button>}
          {cookingSlot.status === 'burnt' && <Button onClick={handleClearBurnt} variant="destructive" className="w-full">Nettoyer</Button>}
        </div>
      </div>
    );
  };

  if (!construction) return null;

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
            {effectiveCookingSlot ? <CookingProgress cookingSlot={effectiveCookingSlot} /> : (
              <Button variant="outline" className="w-full" onClick={() => setIsAddingFood(true)} disabled={liveBurnTime <= 0}>
                <CookingPot className="w-4 h-4 mr-2" /> Ajouter un aliment
              </Button>
            )}
          </div>

          {selectedFuel ? (
            <div className="space-y-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <ItemIcon iconName={getIconUrl(selectedFuel.items?.icon)} alt={selectedFuel.items?.name || ''} />
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