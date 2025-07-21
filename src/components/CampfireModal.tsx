import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Flame, Clock } from 'lucide-react';
import { BaseConstruction, InventoryItem } from '@/types/game';
import { useGame } from '@/contexts/GameContext';

interface CampfireFuel {
  item_id: number;
  multiplier: number;
}

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: (silent?: boolean) => void;
}

const formatTime = (seconds: number) => {
  if (seconds <= 0) return "Éteint";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? `${h}h` : '',
    m > 0 ? `${m}m` : '',
    s > 0 ? `${s}s` : ''
  ].filter(Boolean).join(' ');
};

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { playerData, refreshBaseState } = useGame();
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [burnTime, setBurnTime] = useState(0);

  const currentConstructionState = playerData.baseConstructions.find(c => c.id === construction?.id);

  useEffect(() => {
    if (isOpen) {
      refreshBaseState();
      const fetchFuels = async () => {
        const { data, error } = await supabase.from('campfire_fuels').select('item_id, multiplier');
        if (error) showError("Impossible de charger les combustibles.");
        else setFuels(data || []);
      };
      fetchFuels();
    } else {
      setSelectedFuel(null);
      setQuantity(1);
    }
  }, [isOpen, refreshBaseState]);

  useEffect(() => {
    if (!currentConstructionState) return;

    const lastUpdate = new Date(currentConstructionState.fuel_last_updated_at).getTime();
    const secondsSinceUpdate = (Date.now() - lastUpdate) / 1000;
    const initialBurnTime = currentConstructionState.burn_time_remaining_seconds;
    const currentBurnTime = Math.max(0, initialBurnTime - secondsSinceUpdate);
    setBurnTime(currentBurnTime);

    if (currentBurnTime > 0) {
      const interval = setInterval(() => {
        setBurnTime(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentConstructionState]);

  const availableFuels = playerData.inventory.filter(item => 
    fuels.some(fuel => fuel.item_id === item.item_id)
  );

  const handleAddFuel = async () => {
    if (!selectedFuel) {
      showError("Veuillez sélectionner un combustible.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('add_fuel_to_campfire', {
      p_inventory_id: selectedFuel.id,
      p_quantity: quantity,
    });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Combustible ajouté !");
      onUpdate(true);
      setSelectedFuel(null);
      setQuantity(1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Feu de Camp</DialogTitle>
          <DialogDescription>Gardez le feu allumé pour survivre.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="text-center p-4 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-400">Temps de combustion restant</p>
            <p className="text-3xl font-bold font-mono text-orange-300 flex items-center justify-center gap-2">
              <Clock className="w-6 h-6" />
              {formatTime(burnTime)}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white font-mono">Combustible</label>
              <select
                value={selectedFuel?.id || ''}
                onChange={(e) => {
                  const item = availableFuels.find(f => f.id === Number(e.target.value)) || null;
                  setSelectedFuel(item);
                  setQuantity(1);
                }}
                className="w-full mt-1 bg-white/5 border-white/20 rounded-lg px-3 h-10 text-white"
              >
                <option value="" disabled>Choisir dans l'inventaire...</option>
                {availableFuels.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.items?.name} (x{item.quantity})
                  </option>
                ))}
              </select>
            </div>
            {selectedFuel && (
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white font-mono">Quantité</label>
                  <span className="font-mono text-lg font-bold">{quantity}</span>
                </div>
                <Slider
                  value={[quantity]}
                  onValueChange={(value) => setQuantity(value[0])}
                  min={1}
                  max={selectedFuel.quantity}
                  step={1}
                  disabled={selectedFuel.quantity <= 1}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAddFuel} disabled={loading || !selectedFuel} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter du combustible'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;