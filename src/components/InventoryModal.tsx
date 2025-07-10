import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError, showSuccess } from "@/utils/toast";
import { GameState } from "@/types/game";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    description: string | null;
    icon: string | null;
    signedIconUrl?: string;
  } | null;
}

const TOTAL_SLOTS = 50;

const InventoryModal = ({ isOpen, onClose, gameState }: InventoryModalProps) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const unlockedSlots = gameState?.unlocked_slots ?? 0;

  const fetchInventory = useCallback(async () => {
    if (!user || !isOpen) return;
    setLoading(true);

    const { data: inventoryData, error } = await supabase
      .from('inventories')
      .select('id, item_id, quantity, slot_position, items(name, description, icon)')
      .eq('player_id', user.id);

    if (error) {
      console.error("Error fetching inventory:", error);
      setLoading(false);
      return;
    }

    const itemsWithSignedUrls = await Promise.all(
      inventoryData.map(async (item) => {
        if (item.items && item.items.icon && item.items.icon.includes('.')) {
          try {
            const { data, error: funcError } = await supabase.functions.invoke('get-item-icon-url', {
              body: { itemName: item.items.icon },
            });
            if (funcError) throw funcError;
            return { ...item, items: { ...item.items, signedIconUrl: data.signedUrl } };
          } catch (e) {
            console.error(`Failed to get signed URL for ${item.items.icon}`, e);
            return item;
          }
        }
        return item;
      })
    );

    const newSlots = Array(TOTAL_SLOTS).fill(null);
    itemsWithSignedUrls.forEach((item) => {
      if (item.slot_position !== null && item.slot_position < TOTAL_SLOTS) {
        newSlots[item.slot_position] = item;
      }
    });
    setSlots(newSlots);
    setLoading(false);
  }, [user, isOpen]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleDrop = async (targetIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      return;
    }

    const newSlots = [...slots];
    const draggedItem = newSlots[draggedItemIndex];
    const targetItem = newSlots[targetIndex];

    newSlots[draggedItemIndex] = targetItem;
    newSlots[targetIndex] = draggedItem;
    setSlots(newSlots);

    const updates = [];
    if (draggedItem) {
      updates.push(supabase.from('inventories').update({ slot_position: targetIndex }).eq('id', draggedItem.id));
    }
    if (targetItem) {
      updates.push(supabase.from('inventories').update({ slot_position: draggedItemIndex }).eq('id', targetItem.id));
    }

    const results = await Promise.all(updates);
    const dbError = results.some(res => res.error);

    if (dbError) {
      showError("Erreur de mise à jour.");
      fetchInventory();
    } else {
      showSuccess("Inventaire mis à jour.");
    }

    setDraggedItemIndex(null);
  };

  const renderSlots = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center col-span-full row-span-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    return slots.map((item, index) => (
      <InventorySlot
        key={index}
        item={item}
        index={index}
        isUnlocked={index < unlockedSlots}
        onDragStart={setDraggedItemIndex}
        onDrop={handleDrop}
        isBeingDragged={draggedItemIndex === index}
      />
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full bg-black/70 backdrop-blur-xl border-2 border-neutral-700/50 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <div className="flex items-center justify-center gap-3">
            <Package className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
              Inventaire
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
            <span className="text-white font-bold">{unlockedSlots}</span> / {TOTAL_SLOTS} SLOTS DÉBLOQUÉS
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4 bg-black/30 rounded-lg border border-neutral-800 max-h-[60vh] overflow-y-auto"
          onDragEnd={() => setDraggedItemIndex(null)}
        >
          {renderSlots()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;