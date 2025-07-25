import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Box, Trash2, Heart, Shield, ArrowRight, ArrowLeft, Divide, X } from "lucide-react";
import { BaseConstruction } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import InventoryGrid from "./InventoryGrid";
import { useDrop } from 'react-dnd';
import { ItemTypes } from './dnd/ItemTypes';
import { BuildingLevel } from "@/types/game";

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const ChestModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: ChestModalProps) => {
  const { playerData, setPlayerData, items, buildingLevels } = useGame();
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [itemToSplit, setItemToSplit] = useState<any>(null);

  const levelDef: BuildingLevel | undefined = useMemo(() => {
    if (!construction) return undefined;
    return buildingLevels.find(level => level.building_type === construction.type && level.level === construction.level);
  }, [construction, buildingLevels]);

  const chestItems = useMemo(() => {
    if (!construction) return [];
    return playerData.chestItems?.filter(item => item.chest_id === construction.id) || [];
  }, [playerData.chestItems, construction]);

  const inventoryItems = useMemo(() => {
    return playerData.inventory || [];
  }, [playerData.inventory]);

  const handleDropToChest = async (item: any, targetSlot: number | null) => {
    if (!construction) return;
    
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    let updatedPlayerData = JSON.parse(JSON.stringify(playerData));
    const movedItem = updatedPlayerData.inventory.find((i: any) => i.id === item.id);
    
    if (!movedItem) return;

    const { error } = await supabase.rpc('move_item_to_chest', {
      p_inventory_id: item.id,
      p_chest_id: construction.id,
      p_quantity_to_move: movedItem.quantity,
      p_target_slot: targetSlot
    });

    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      onUpdate();
    }
  };

  const handleDropToInventory = async (item: any, targetSlot: number | null) => {
    if (!construction) return;

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));

    const { error } = await supabase.rpc('move_item_from_chest', {
      p_chest_item_id: item.id,
      p_quantity_to_move: item.quantity,
      p_target_slot: targetSlot
    });

    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      onUpdate();
    }
  };

  const handleSwapInChest = async (fromSlot: number, toSlot: number) => {
    if (!construction) return;
    const { error } = await supabase.rpc('swap_chest_items', {
      p_chest_id: construction.id,
      p_from_slot: fromSlot,
      p_to_slot: toSlot
    });
    if (error) showError(error.message);
    else onUpdate();
  };

  const handleSwapInInventory = async (fromSlot: number, toSlot: number) => {
    const { error } = await supabase.rpc('swap_inventory_items', {
      p_from_slot: fromSlot,
      p_to_slot: toSlot
    });
    if (error) showError(error.message);
    else onUpdate();
  };

  const handleSplit = async () => {
    if (!itemToSplit || splitQuantity <= 0 || splitQuantity >= itemToSplit.quantity) {
      showError("Quantité invalide");
      return;
    }
    const rpc_name = itemToSplit.source === 'chest' ? 'split_chest_item' : 'split_inventory_item';
    const id_param_name = itemToSplit.source === 'chest' ? 'p_chest_item_id' : 'p_inventory_id';

    const { error } = await supabase.rpc(rpc_name, {
      [id_param_name]: itemToSplit.id,
      p_split_quantity: splitQuantity
    });

    if (error) {
      showError(error.message);
    } else {
      onUpdate();
    }
    setItemToSplit(null);
    setSplitQuantity(1);
  };

  const handleDropItem = async (item: any, quantity: number) => {
    const rpc_name = item.source === 'chest' ? 'drop_chest_item' : 'drop_inventory_item';
    const id_param_name = item.source === 'chest' ? 'p_chest_item_id' : 'p_inventory_id';
    const quantity_param_name = item.source === 'chest' ? 'p_quantity_to_drop' : 'p_quantity_to_drop';

    const { error } = await supabase.rpc(rpc_name, {
      [id_param_name]: item.id,
      [quantity_param_name]: quantity
    });

    if (error) {
      showError(error.message);
    } else {
      onUpdate();
    }
  };

  const [{ isOver: isOverChest }, dropChest] = useDrop(() => ({
    accept: ItemTypes.INVENTORY_ITEM,
    drop: (item: any) => handleDropToChest(item, null),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const [{ isOver: isOverInventory }, dropInventory] = useDrop(() => ({
    accept: ItemTypes.CHEST_ITEM,
    drop: (item: any) => handleDropToInventory(item, null),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  if (!isOpen || !construction) return null;

  const maxHp = levelDef?.stats?.health || 0;
  const currentHp = construction.building_state?.hp ?? maxHp;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Box className="w-10 h-10 mx-auto text-amber-500 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Coffre - Niveau {construction.level}</DialogTitle>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div ref={dropChest} className={`p-4 rounded-lg ${isOverChest ? 'bg-green-500/20' : 'bg-slate-900/50'}`}>
            <h3 className="font-mono text-lg mb-2 text-center">Contenu du coffre</h3>
            <InventoryGrid
              items={chestItems}
              slots={levelDef?.stats?.storage_slots || 0}
              onDropItem={handleDropToChest}
              onSwapItem={handleSwapInChest}
              onSplitItem={(item) => { setItemToSplit({...item, source: 'chest'}); setSplitQuantity(1); }}
              onDropAction={handleDropItem}
              source="chest"
            />
          </div>
          <div ref={dropInventory} className={`p-4 rounded-lg ${isOverInventory ? 'bg-green-500/20' : 'bg-slate-900/50'}`}>
            <h3 className="font-mono text-lg mb-2 text-center">Votre inventaire</h3>
            <InventoryGrid
              items={inventoryItems}
              slots={playerData.playerState.unlocked_slots}
              onDropItem={handleDropToInventory}
              onSwapItem={handleSwapInInventory}
              onSplitItem={(item) => { setItemToSplit({...item, source: 'inventory'}); setSplitQuantity(1); }}
              onDropAction={handleDropItem}
              source="inventory"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={() => onDemolish(construction)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Démolir
          </Button>
        </DialogFooter>
      </DialogContent>
      {itemToSplit && (
        <Dialog open={true} onOpenChange={() => setItemToSplit(null)}>
          <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
            <DialogHeader>
              <DialogTitle>Diviser l'objet</DialogTitle>
              <DialogDescription>
                Combien d'objets voulez-vous déplacer dans un nouveau slot ?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-4 my-4">
              <Button size="icon" variant="outline" onClick={() => setSplitQuantity(q => Math.max(1, q - 1))}><ArrowLeft className="w-4 h-4" /></Button>
              <input
                type="number"
                value={splitQuantity}
                onChange={(e) => setSplitQuantity(Math.max(1, Math.min(itemToSplit.quantity - 1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-900 text-center rounded-md p-2"
              />
              <Button size="icon" variant="outline" onClick={() => setSplitQuantity(q => Math.min(itemToSplit.quantity - 1, q + 1))}><ArrowRight className="w-4 h-4" /></Button>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setItemToSplit(null)}><X className="w-4 h-4 mr-2" />Annuler</Button>
              <Button onClick={handleSplit}><Divide className="w-4 h-4 mr-2" />Diviser</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default ChestModal;