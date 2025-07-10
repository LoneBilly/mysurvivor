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
import DraggableInventorySlot, { InventoryItem } from "./DraggableInventorySlot";
import { showError } from "@/utils/toast";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLOTS = 50;
const UNLOCKED_SLOTS = 10;

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('inventories')
      .select(`
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
      showError("Erreur de chargement de l'inventaire.");
      setLoading(false);
      return;
    }

    const itemsWithUrls = await Promise.all(
      data.map(async (item) => {
        if (item.items && item.items.icon && item.items.icon.includes('.')) {
          try {
            const { data: funcData, error: funcError } = await supabase.functions.invoke('get-item-icon-url', {
              body: { itemName: item.items.icon },
            });
            if (funcError) throw funcError;
            return { ...item, items: { ...item.items, signedIconUrl: funcData.signedUrl } };
          } catch (e) { return item; }
        }
        return item;
      })
    );

    const newSlots = Array(TOTAL_SLOTS).fill(null);
    itemsWithUrls.forEach((item) => {
      if (item.slot_position < TOTAL_SLOTS) {
        newSlots[item.slot_position] = item;
      }
    });

    setSlots(newSlots);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen, fetchInventory]);

  const handleDrop = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newSlots = [...slots];
    const fromItem = newSlots[fromIndex];
    const toItem = newSlots[toIndex];

    // Swap items in local state for immediate feedback
    newSlots[fromIndex] = toItem;
    newSlots[toIndex] = fromItem;
    setSlots(newSlots);

    // Prepare data for Supabase update
    const updates = [];
    if (fromItem) {
      updates.push({ player_id: user!.id, item_id: fromItem.item_id, slot_position: toIndex });
    }
    if (toItem) {
      updates.push({ player_id: user!.id, item_id: toItem.item_id, slot_position: fromIndex });
    }

    if (updates.length > 0) {
      const { error } = await supabase.from('inventories').upsert(updates, {
        onConflict: 'player_id,item_id',
      });

      if (error) {
        showError("Erreur de sauvegarde de l'inventaire.");
        // Revert state on error
        setSlots(slots);
      }
    }
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
      <DraggableInventorySlot
        key={index}
        item={item}
        index={index}
        isLocked={index >= UNLOCKED_SLOTS}
        onDrop={handleDrop}
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
            Gérez vos objets et ressources.
          </gDialogDescription>
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
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
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