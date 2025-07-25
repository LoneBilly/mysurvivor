import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Fuel, CookingPot, Trash2, X, Minus, Plus, Check, Clock, Heart, Shield } from "lucide-react";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import CountdownTimer from "./CountdownTimer";
import { BuildingLevel } from "@/types/game";

interface CampfireModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: () => void;
}

const CampfireModal = ({ isOpen, onClose, construction, onUpdate }: CampfireModalProps) => {
  const { playerData, items, buildingLevels } = useGame();
  const [selectedFuel, setSelectedFuel] = useState<InventoryItem | null>(null);
  const [fuelQuantity, setFuelQuantity] = useState(1);
  const [selectedFood, setSelectedFood] = useState<InventoryItem | null>(null);
  const [foodQuantity, setFoodQuantity] = useState(1);

  const levelDef: BuildingLevel | undefined = useMemo(() => {
    if (!construction) return undefined;
    return buildingLevels.find(level => level.building_type === 'campfire' && level.level === construction.level);
  }, [construction, buildingLevels]);

  const availableFuels = useMemo(() => {
    return playerData.inventory.filter(item => item.items.type === 'Combustible');
  }, [playerData.inventory]);

  const availableFoods = useMemo(() => {
    return playerData.inventory.filter(item => item.items.type === 'Nourriture' && item.items.effects?.cooked_item_id);
  }, [playerData.inventory]);

  useEffect(() => {
    if (selectedFuel && fuelQuantity > selectedFuel.quantity) {
      setFuelQuantity(selectedFuel.quantity);
    }
  }, [selectedFuel, fuelQuantity]);

  useEffect(() => {
    if (selectedFood && foodQuantity > selectedFood.quantity) {
      setFoodQuantity(selectedFood.quantity);
    }
  }, [selectedFood, foodQuantity]);

  const handleAddFuel = async () => {
    if (!selectedFuel || !construction) return;
    const { error } = await supabase.rpc('add_fuel_to_campfire', {
      p_inventory_id: selectedFuel.id,
      p_quantity: fuelQuantity
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Combustible ajouté !");
      onUpdate();
      setSelectedFuel(null);
      setFuelQuantity(1);
    }
  };

  const handleStartCooking = async () => {
    if (!selectedFood || !construction) return;
    const { error } = await supabase.rpc('start_cooking', {
      p_campfire_id: construction.id,
      p_inventory_item_id: selectedFood.id,
      p_quantity_to_cook: foodQuantity
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Cuisson démarrée !");
      onUpdate();
      setSelectedFood(null);
      setFoodQuantity(1);
    }
  };

  const handleCollectOutput = async () => {
    if (!construction) return;
    const { error } = await supabase.rpc('collect_cooking_output', { p_campfire_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Récolté !");
      onUpdate();
    }
  };

  const handleClearBurnt = async () => {
    if (!construction) return;
    const { error } = await supabase.rpc('clear_burnt_item', { p_campfire_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Nettoyé !");
      onUpdate();
    }
  };

  if (!isOpen || !construction) return null;

  const cookingSlot = construction.cooking_slot;
  const inputItem = cookingSlot?.input_item_id ? items.find(i => i.id === cookingSlot.input_item_id) : null;
  const cookedItem = cookingSlot?.cooked_item_id ? items.find(i => i.id === cookingSlot.cooked_item_id) : null;

  const maxHp = levelDef?.stats?.health || 0;
  const currentHp = construction.building_state?.hp ?? maxHp;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Feu de camp</DialogTitle>
          <DialogDescription>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Heart size={16} className="text-red-400" />
                <span>PV: {currentHp}/{maxHp}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Shield size={16} className="text-blue-400" />
                <span>Armure: {levelDef?.stats?.armor || 0}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <p className="text-lg font-mono text-orange-300">Temps de combustion restant</p>
            <p className="text-3xl font-bold">
              {construction.burn_time_remaining_seconds > 0 
                ? new Date(construction.burn_time_remaining_seconds * 1000).toISOString().substr(11, 8)
                : "Éteint"
              }
            </p>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg">
            <h3 className="font-mono text-lg mb-2 text-center flex items-center justify-center gap-2"><CookingPot size={20} /> Emplacement de cuisson</h3>
            {cookingSlot ? (
              <div className="text-center">
                {cookingSlot.status === 'cooking' && inputItem && (
                  <>
                    <p>Cuisson de {cookingSlot.quantity}x {inputItem.name}...</p>
                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                      <Clock size={16} />
                      <CountdownTimer endTime={cookingSlot.ends_at} onComplete={onUpdate} />
                    </div>
                  </>
                )}
                {cookingSlot.status === 'cooked' && cookedItem && (
                  <div className="flex flex-col items-center gap-2">
                    <p>{cookingSlot.quantity}x {cookedItem.name} est prêt !</p>
                    <Button onClick={handleCollectOutput} variant="primary" size="sm">
                      <Check className="w-4 h-4 mr-2" /> Récupérer
                    </Button>
                    <p className="text-xs text-gray-400">Brûlera dans <CountdownTimer endTime={cookingSlot.ends_at} onComplete={onUpdate} /></p>
                  </div>
                )}
                {cookingSlot.status === 'burnt' && cookedItem && (
                  <div className="flex flex-col items-center gap-2">
                    <p>{cookingSlot.quantity}x {cookedItem.name} a brûlé !</p>
                    <Button onClick={handleClearBurnt} variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" /> Nettoyer
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-center text-gray-400 mb-2">Sélectionnez un aliment à cuire :</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {availableFoods.map(item => (
                    <button key={item.id} onClick={() => setSelectedFood(item)} className={cn("p-2 rounded-lg border-2", selectedFood?.id === item.id ? "border-blue-500 bg-blue-500/20" : "border-slate-700 bg-slate-800")}>
                      <img src={`/items/${item.items.icon}`} alt={item.items.name} className="w-12 h-12 mx-auto" />
                      <p className="text-xs truncate">{item.items.name}</p>
                      <p className="text-xs font-bold">x{item.quantity}</p>
                    </button>
                  ))}
                </div>
                {selectedFood && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setFoodQuantity(q => Math.max(1, q - 1))}><Minus size={16} /></Button>
                      <input type="number" value={foodQuantity} onChange={e => setFoodQuantity(Math.max(1, Math.min(selectedFood.quantity, parseInt(e.target.value) || 1)))} className="w-16 text-center bg-slate-700 rounded" />
                      <Button size="icon" variant="ghost" onClick={() => setFoodQuantity(q => Math.min(selectedFood.quantity, q + 1))}><Plus size={16} /></Button>
                    </div>
                    <Button onClick={handleStartCooking} className="w-full" disabled={!construction.burn_time_remaining_seconds || foodQuantity <= 0}>
                      <CookingPot className="w-4 h-4 mr-2" /> Cuire ({foodQuantity})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg">
            <h3 className="font-mono text-lg mb-2 text-center flex items-center justify-center gap-2"><Fuel size={20} /> Ajouter du combustible</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {availableFuels.map(item => (
                <button key={item.id} onClick={() => setSelectedFuel(item)} className={cn("p-2 rounded-lg border-2", selectedFuel?.id === item.id ? "border-green-500 bg-green-500/20" : "border-slate-700 bg-slate-800")}>
                  <img src={`/items/${item.items.icon}`} alt={item.items.name} className="w-12 h-12 mx-auto" />
                  <p className="text-xs truncate">{item.items.name}</p>
                  <p className="text-xs font-bold">x{item.quantity}</p>
                </button>
              ))}
            </div>
            {selectedFuel && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setFuelQuantity(q => Math.max(1, q - 1))}><Minus size={16} /></Button>
                  <input type="number" value={fuelQuantity} onChange={e => setFuelQuantity(Math.max(1, Math.min(selectedFuel.quantity, parseInt(e.target.value) || 1)))} className="w-16 text-center bg-slate-700 rounded" />
                  <Button size="icon" variant="ghost" onClick={() => setFuelQuantity(q => Math.min(selectedFuel.quantity, q + 1))}><Plus size={16} /></Button>
                </div>
                <Button onClick={handleAddFuel} className="w-full" disabled={fuelQuantity <= 0}>
                  <Fuel className="w-4 h-4 mr-2" /> Ajouter ({fuelQuantity})
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampfireModal;