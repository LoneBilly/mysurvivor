"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InventorySlot from '@/components/InventorySlot';
import { useGameData } from '@/contexts/GameDataContext';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

interface BaseConstruction {
  id: number;
  type: string;
}

interface ChestItem {
  id: number;
  chest_id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    icon: string;
    description: string;
  }
}

interface DraggableItem {
  id: number;
  item_id: number;
  name: string;
  icon: string;
  quantity: number;
  slot_position: number;
  context: string;
}

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  chest: BaseConstruction;
}

const CHEST_SIZE = 28;

const ChestModal: React.FC<ChestModalProps> = ({ isOpen, onClose, chest }) => {
  const { chestItems, refreshPlayerData } = useGameData();

  const chestSpecificItems = chestItems.filter(item => item.chest_id === chest.id);
  const itemsBySlot = new Map(chestSpecificItems.map(item => [item.slot_position, item]));

  const handleDropInChest = async (draggedItem: DraggableItem, targetSlot: number) => {
    if (draggedItem.context === 'chest') {
      const { error } = await supabase.rpc('swap_chest_items', {
        p_chest_id: chest.id,
        p_from_slot: draggedItem.slot_position,
        p_to_slot: targetSlot,
      });
      if (error) toast.error(error.message);
      else {
        toast.success('Objets échangés.');
        refreshPlayerData();
      }
      return;
    }
    
    if (draggedItem.context === 'inventory') {
        const { error } = await supabase.rpc('move_item_to_chest', {
        p_inventory_id: draggedItem.id,
        p_chest_id: chest.id,
        p_quantity_to_move: draggedItem.quantity,
        p_target_slot: targetSlot,
        });

        if (error) {
            toast.error(`Erreur: ${error.message}`);
        } else {
            toast.success("Objet déplacé dans le coffre !");
            refreshPlayerData();
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Coffre</DialogTitle>
        </DialogHeader>
        <div 
          className="grid gap-2 p-1"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(5rem, 1fr))'
          }}
        >
          {Array.from({ length: CHEST_SIZE }).map((_, index) => {
            const chestItem = itemsBySlot.get(index);
            const itemForSlot: DraggableItem | null = chestItem ? {
              id: chestItem.id,
              item_id: chestItem.item_id,
              name: chestItem.items.name,
              icon: chestItem.items.icon,
              quantity: chestItem.quantity,
              slot_position: chestItem.slot_position,
              context: 'chest',
            } : null;

            return (
              <InventorySlot
                key={`chest-${index}`}
                slot={index}
                item={itemForSlot}
                context="chest"
                onDropItem={handleDropInChest}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChestModal;