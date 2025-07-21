import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from '@/contexts/GameContext';
import { Flame, PlusCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ScrollArea } from './ui/scroll-area';
import ItemIcon from './ItemIcon';
import { Slider } from './ui/slider';

interface CampfireFuel {
  item_id: number;
  multiplier: number;
}

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
}

const CampfireModal = ({ isOpen, onClose, construction }: CampfireModalProps) => {
  const { playerData, refreshPlayerData, getIconUrl } = useGame();
  const [burnTime, setBurnTime] = useState(0);
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [availableFuels, setAvailableFuels] = useState<InventoryItem[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && construction) {
      const campfire = playerData.baseConstructions.find(c => c.id === construction.id);
      setBurnTime(campfire?.burn_time_remaining_seconds || 0);
    } else {
      setIsAddingFuel(false);
      setSelectedFuel(null);
    }
  }, [isOpen, construction, playerData.baseConstructions]);

  useEffect(() => {
    if (burnTime > 0) {
      const interval = setInterval(() => {
        setBurnTime(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [burnTime]);

  const fetchAvailableFuels = useCallback(async () => {
    const { data: fuelDefs, error } = await supabase.from('campfire_fuels').select('item_id');
    if (error) return;
    const fuelItemIds = new Set(fuelDefs.map(f => f.item_id));
    const fuelsInInventory = playerData.inventory.filter(item => fuelItemIds.has(item.item_id));
    setAvailableFuels(fuelsInInventory);
  }, [playerData.inventory]);

  useEffect(() => {
    if (isAddingFuel) {
      fetchAvailableFuels();
    }
  }, [isAddingFuel, fetchAvailableFuels]);

  const handleAddFuel = async () => {
    if (!selectedFuel) return;
    const { error } = await supabase.rpc('add_fuel_to_campfire', {
      p_inventory_id: selectedFuel.id,
      p_quantity: quantity,
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Combustible ajouté !");
      await refreshPlayerData();
      setIsAddingFuel(false);
      setSelectedFuel(null);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Feu de camp</DialogTitle>
        </DialogHeader>
        
        {isAddingFuel ? (
          <div className="py-4 space-y-4">
            {selectedFuel ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                    <ItemIcon iconName={getIconUrl(selectedFuel.items?.icon)} alt={selectedFuel.items?.name || ''} />
                  </div>
                  <p className="font-bold">{selectedFuel.items?.name}</p>
                </div>
                <div>
                  <Label>Quantité: {quantity}</Label>
                  <Slider value={[quantity]} onValueChange={([val]) => setQuantity(val)} min={1} max={selectedFuel.quantity} step={1} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedFuel(null)}>Retour</Button>
                  <Button onClick={handleAddFuel} className="flex-1">Ajouter</Button>
                </div>
              </div>
            ) : (
              <>
                <p>Choisissez un combustible :</p>
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-4 gap-2">
                    {availableFuels.map(item => (
                      <button key={item.id} onClick={() => setSelectedFuel(item)} className="relative aspect-square bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600 hover:border-slate-400">
                        <ItemIcon iconName={getIconUrl(item.items?.icon)} alt={item.items?.name || ''} />
                        <span className="absolute bottom-1 right-1 text-xs font-bold">{item.quantity}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <Button variant="outline" onClick={() => setIsAddingFuel(false)}>Annuler</Button>
              </>
            )}
          </div>
        ) : (
          <div className="py-4 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <Clock className="w-6 h-6" />
              <p className="text-2xl font-mono font-bold">{formatTime(burnTime)}</p>
            </div>
            <p className="text-sm text-gray-400">Temps de combustion restant</p>
            <Button onClick={() => setIsAddingFuel(true)} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" /> Ajouter du combustible
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;