import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Flame, Clock } from 'lucide-react';
import { BaseConstruction, InventoryItem } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import ItemIcon from './ItemIcon';

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
}

interface CampfireFuel {
  item_id: number;
  multiplier: number;
}

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const CampfireModal = ({ isOpen, onClose, construction }: CampfireModalProps) => {
  const { playerData, getIconUrl, refreshBaseState } = useGame();
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [burnTime, setBurnTime] = useState(0);

  const currentConstruction = useMemo(() => {
    if (!construction) return null;
    return playerData.baseConstructions.find(c => c.id === construction.id) || construction;
  }, [construction, playerData.baseConstructions]);

  useEffect(() => {
    const fetchFuels = async () => {
      const { data, error } = await supabase.from('campfire_fuels').select('item_id, multiplier');
      if (error) console.error("Error fetching fuels");
      else setFuels(data || []);
    };
    if (isOpen) {
      fetchFuels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!currentConstruction) return;
    
    const lastUpdate = new Date(currentConstruction.fuel_last_updated_at).getTime();
    const secondsPassed = (Date.now() - lastUpdate) / 1000;
    const initialBurnTime = currentConstruction.burn_time_remaining_seconds;
    const currentBurnTime = Math.max(0, initialBurnTime - secondsPassed);
    setBurnTime(currentBurnTime);

    const interval = setInterval(() => {
      setBurnTime(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentConstruction]);

  const availableFuels = useMemo(() => {
    const fuelItemIds = new Set(fuels.map(f => f.item_id));
    return playerData.inventory.filter(item => item.slot_position !== null && fuelItemIds.has(item.item_id));
  }, [playerData.inventory, fuels]);

  useEffect(() => {
    if (selectedFuel) {
      setQuantity(1);
    }
  }, [selectedFuel]);

  const handleAddFuel = async () => {
    if (!selectedFuel) return;
    setLoading(true);
    const { error } = await supabase.rpc('add_fuel_to_campfire', {
      p_inventory_id: selectedFuel.id,
      p_quantity: quantity,
    });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${quantity}x ${selectedFuel.items?.name} ajouté(s) au feu.`);
      refreshBaseState();
      setSelectedFuel(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Feu de camp</DialogTitle>
          <DialogDescription>Ajoutez du combustible pour maintenir le feu allumé.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-center p-3 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-400 flex items-center justify-center gap-2"><Clock size={14} /> Temps de combustion restant</p>
            <p className="text-3xl font-bold font-mono text-orange-300">{formatDuration(burnTime)}</p>
          </div>
          
          <div className="space-y-2">
            <p className="font-semibold">Ajouter du combustible :</p>
            <div className="flex flex-wrap gap-2">
              {availableFuels.map(item => (
                <button key={item.id} onClick={() => setSelectedFuel(item)} className={`relative w-16 h-16 rounded-lg border-2 ${selectedFuel?.id === item.id ? 'border-orange-400' : 'border-slate-600'}`}>
                  <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                  <span className="absolute bottom-0.5 right-1 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>x{item.quantity}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedFuel && (
            <div className="p-3 bg-white/5 rounded-lg space-y-3">
              <p>Ajouter {selectedFuel.items?.name}</p>
              <div className="flex justify-between items-center">
                <label htmlFor="quantity-slider">Quantité</label>
                <span className="font-mono text-lg font-bold">{quantity}</span>
              </div>
              <Slider
                id="quantity-slider"
                value={[quantity]}
                onValueChange={(value) => setQuantity(value[0])}
                min={1}
                max={selectedFuel.quantity}
                step={1}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleAddFuel} disabled={!selectedFuel || loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter au feu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;