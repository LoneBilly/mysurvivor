import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Backpack, Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError, showSuccess } from "@/utils/toast";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface InventoryItem {
  id: number; // L'ID de l'entrée dans la table 'inventories'
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
const UNLOCKED_SLOTS = 10;

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!user || !isOpen) return;
    setLoading(true);

    const { data: inventoryData, error } = await supabase
      .from('inventories')
      .select(`
        id,
        item_id,
        quantity,
        slot_position,
        items (
          name,
          description,
          icon
        )
      `)
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

    // Swap items in the local state
    newSlots[draggedItemIndex] = targetItem;
    newSlots[targetIndex] = draggedItem;
    setSlots(newSlots);

    // Update database
    const updates = [];
    if (draggedItem) {
      updates.push(
        supabase.from('inventories').update({ slot_position: targetIndex }).eq('id', draggedItem.id)
      );
    }
    if (targetItem) {
      updates.push(
        supabase.from('inventories').update({ slot_position: draggedItemIndex }).eq('id', targetItem.id)
      );
    }

    const results = await Promise.all(updates);
    const dbError = results.some(res => res.error);

    if (dbError) {
      showError("Erreur lors de la mise à jour de l'inventaire.");
      // Revert state if DB update fails
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
        isUnlocked={index < UNLOCKED_SLOTS}
        onDragStart={setDraggedItemIndex}
        onDrop={handleDrop}
        isBeingDragged={draggedItemIndex === index}
      />
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full bg-gray-900/50 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <Package className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Inventaire
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Glissez-déposez pour organiser vos objets.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 max-h-[60vh]">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/20">
              <Backpack className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-xs text-gray-400 font-mono">Sac à dos</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 h-full">
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2" onDragEnd={() => setDraggedItemIndex(null)}>
                {renderSlots()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;