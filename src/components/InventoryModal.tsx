import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Package, Backpack, Loader2, User, Shield, Shirt, Hand } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError, showSuccess } from "@/utils/toast";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedSlots: number;
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

const InventoryModal = ({ isOpen, onClose, unlockedSlots }: InventoryModalProps) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!user || !isOpen) return;
    setLoading(true);

    const { data: inventoryData, error } = await supabase
      .from('inventories')
      .select(`id, item_id, quantity, slot_position, items (name, description, icon)`)
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
    if (draggedItem) updates.push(supabase.from('inventories').update({ slot_position: targetIndex }).eq('id', draggedItem.id));
    if (targetItem) updates.push(supabase.from('inventories').update({ slot_position: draggedItemIndex }).eq('id', targetItem.id));

    const results = await Promise.all(updates);
    if (results.some(res => res.error)) {
      showError("Erreur de mise à jour de l'inventaire.");
      fetchInventory();
    } else {
      showSuccess("Inventaire mis à jour.");
    }
    setDraggedItemIndex(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-gray-900/60 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonne Équipement */}
          <div className="md:col-span-1 space-y-6">
            <div className="p-4 rounded-lg bg-black/20 border border-white/10">
              <h3 className="font-mono text-lg text-center mb-4">Équipement</h3>
              <div className="flex justify-center items-center">
                <div className="grid grid-cols-3 grid-rows-3 gap-2 w-48 h-48">
                  <div className="col-start-2 row-start-1 flex items-center justify-center"><Shield className="w-8 h-8 text-gray-600"/></div>
                  <div className="col-start-1 row-start-2 flex items-center justify-center"><Hand className="w-8 h-8 text-gray-600"/></div>
                  <div className="col-start-2 row-start-2 flex items-center justify-center bg-black/20 rounded-md"><User className="w-10 h-10 text-gray-500"/></div>
                  <div className="col-start-3 row-start-2 flex items-center justify-center"><Hand className="w-8 h-8 text-gray-600"/></div>
                  <div className="col-start-2 row-start-3 flex items-center justify-center"><Shirt className="w-8 h-8 text-gray-600"/></div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-black/20 border border-white/10">
              <h3 className="font-mono text-lg text-center mb-4">Sac à dos</h3>
              <div className="flex justify-center">
                <div className="w-24 h-24 flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/20">
                  <Backpack className="w-12 h-12 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Inventaire */}
          <div className="md:col-span-2 p-4 rounded-lg bg-black/20 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-mono text-lg">Contenu du sac</h3>
              <p className="font-mono text-sm text-gray-400">{unlockedSlots} / {TOTAL_SLOTS} slots</p>
            </div>
            <ScrollArea className="h-80 pr-3">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2" onDragEnd={() => setDraggedItemIndex(null)}>
                  {slots.map((item, index) => (
                    <InventorySlot
                      key={index}
                      item={item}
                      index={index}
                      isUnlocked={index < unlockedSlots}
                      onDragStart={setDraggedItemIndex}
                      onDrop={handleDrop}
                      isBeingDragged={draggedItemIndex === index}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;