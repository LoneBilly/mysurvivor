import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

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

  const handleDragStart = (index: number, node: HTMLDivElement) => {
    setDraggedItemIndex(index);
    draggedItemNode.current = node.cloneNode(true) as HTMLDivElement;
    if (draggedItemNode.current) {
      draggedItemNode.current.style.position = 'fixed';
      draggedItemNode.current.style.pointerEvents = 'none';
      draggedItemNode.current.style.zIndex = '1000';
      draggedItemNode.current.style.width = `${node.offsetWidth}px`;
      draggedItemNode.current.style.height = `${node.offsetHeight}px`;
      document.body.appendChild(draggedItemNode.current);
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const target = document.elementFromPoint(clientX, clientY);
    const slotElement = target?.closest('[data-slot-index]');
    const newDragOverIndex = slotElement ? parseInt(slotElement.getAttribute('data-slot-index')!, 10) : null;
    setDragOverIndex(newDragOverIndex);
  };

  const handleDragEnd = async () => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }

    if (draggedItemIndex !== null && dragOverIndex !== null && draggedItemIndex !== dragOverIndex && dragOverIndex < unlockedSlots) {
      const newSlots = [...slots];
      const draggedItem = newSlots[draggedItemIndex];
      const targetItem = newSlots[dragOverIndex];

      newSlots[draggedItemIndex] = targetItem;
      newSlots[dragOverIndex] = draggedItem;
      setSlots(newSlots);

      const updates = [];
      if (draggedItem) {
        updates.push(supabase.from('inventories').update({ slot_position: dragOverIndex }).eq('id', draggedItem.id));
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
    }

    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchEnd = () => handleDragEnd();

    if (draggedItemIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedItemIndex]);

  const renderSlots = () => {
    if (loading) {
      return <div className="h-full flex items-center justify-center col-span-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }
    return slots.map((item, index) => (
      <InventorySlot
        key={index}
        item={item}
        index={index}
        isUnlocked={index < unlockedSlots}
        onDragStart={handleDragStart}
        isBeingDragged={draggedItemIndex === index}
        isDragOver={dragOverIndex === index}
      />
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full bg-gray-900/50 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <div className="flex items-center justify-center gap-3">
            <Package className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
            <span className="text-white font-bold">{unlockedSlots}</span> / {TOTAL_SLOTS} SLOTS DÉBLOQUÉS
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4 bg-black/30 rounded-lg border border-neutral-800 max-h-[60vh] overflow-y-auto">
          {renderSlots()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;