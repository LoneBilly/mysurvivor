import {
  Dialog,
  CustomDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/CustomDialog";
import { Package, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError, showSuccess } from "@/utils/toast";
import { InventoryItem } from "@/types/game";
import ItemDetailModal from "./ItemDetailModal";
import { useAuth } from "@/contexts/AuthContext";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  unlockedSlots: number;
  onUpdate: (silent?: boolean) => Promise<void>;
}

const TOTAL_SLOTS = 50;

const InventoryModal = ({ isOpen, onClose, inventory, unlockedSlots, onUpdate }: InventoryModalProps) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);
  
  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; originalIndex: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const newSlots = Array(TOTAL_SLOTS).fill(null);
    inventory.forEach((item) => {
      if (item.slot_position !== null && item.slot_position < TOTAL_SLOTS) {
        newSlots[item.slot_position] = item;
      }
    });
    setSlots(newSlots);
    setLoading(false);
  }, [inventory]);

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const handleDragEnd = useCallback(async () => {
    stopAutoScroll();
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }

    const fromIndex = draggedItem?.originalIndex;
    const toIndex = dragOverIndex;

    setDraggedItem(null);
    setDragOverIndex(null);

    if (fromIndex === null || toIndex === null || !user) return;
    if (toIndex >= unlockedSlots) {
      showError("Vous ne pouvez pas déposer un objet sur un emplacement verrouillé.");
      onUpdate(true); // Revert optimistic update by refreshing
      return;
    }

    const originalSlots = [...slots];
    const fromItem = originalSlots[fromIndex];
    const toItem = originalSlots[toIndex];

    if (!fromItem) {
        onUpdate(true); // Revert if item somehow disappeared
        return;
    }

    // Optimistic update
    const newSlots = [...originalSlots];
    if (toItem && fromItem.item_id === toItem.item_id && fromItem.items?.stackable) {
        // Merge stacks
        newSlots[toIndex] = { ...toItem, quantity: toItem.quantity + fromItem.quantity };
        newSlots[fromIndex] = null;
    } else {
        // Swap or move to empty slot
        newSlots[fromIndex] = toItem ? { ...toItem, slot_position: fromIndex } : null;
        newSlots[toIndex] = { ...fromItem, slot_position: toIndex };
    }
    setSlots(newSlots);

    const { error } = await supabase.rpc('swap_inventory_items', {
        p_from_slot: fromIndex,
        p_to_slot: toIndex
    });

    if (error) {
        showError(error.message || "Erreur de mise à jour de l'inventaire.");
        console.error(error);
        setSlots(originalSlots); // Revert optimistic update
    } else {
        onUpdate(true); // Final refresh from server
    }
  }, [draggedItem, dragOverIndex, slots, unlockedSlots, stopAutoScroll, user, onUpdate]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    let newDragOverIndex: number | null = null;
    if (gridRef.current) {
      const slotElements = Array.from(gridRef.current.children);
      for (const slot of slotElements) {
        const rect = slot.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const potentialIndex = parseInt((slot as HTMLElement).dataset.slotIndex || '-1', 10);
          if (potentialIndex !== -1 && potentialIndex < unlockedSlots) newDragOverIndex = potentialIndex;
          break;
        }
      }
    }
    setDragOverIndex(newDragOverIndex);

    const gridEl = gridRef.current;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const scrollThreshold = 60;

    stopAutoScroll();

    if (clientY < rect.top + scrollThreshold) {
      const scroll = () => {
        gridEl.scrollTop -= 10;
        scrollIntervalRef.current = requestAnimationFrame(scroll);
      };
      scroll();
    } else if (clientY > rect.bottom - scrollThreshold) {
      const scroll = () => {
        gridEl.scrollTop += 10;
        scrollIntervalRef.current = requestAnimationFrame(scroll);
      };
      scroll();
    }
  }, [unlockedSlots, stopAutoScroll]);

  const handleDragStart = useCallback((item: InventoryItem, index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    setDraggedItem({ item, originalIndex: index });
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = `${node.offsetWidth}px`; // Match original slot size
    ghostNode.style.height = `${node.offsetHeight}px`; // Match original slot size
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  }, [handleDragMove]);

  const handleItemClick = (item: InventoryItem) => {
    setDetailedItem(item);
  };

  const handleUseItem = () => {
    showError("Cette fonctionnalité n'est pas encore disponible.");
  };

  const handleDropOneItem = async () => {
    if (!detailedItem) return;

    // Optimistic update
    const originalInventory = [...playerData.inventory];
    const newInventory = playerData.inventory.map(invItem => {
        if (invItem.id === detailedItem.id) {
            return { ...invItem, quantity: invItem.quantity - 1 };
        }
        return invItem;
    }).filter(invItem => invItem.quantity > 0);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setDetailedItem(null); // Close modal immediately

    let error;
    if (detailedItem.quantity > 1) {
      ({ error } = await supabase
        .from('inventories')
        .update({ quantity: detailedItem.quantity - 1 })
        .eq('id', detailedItem.id));
    } else {
      ({ error } = await supabase
        .from('inventories')
        .delete()
        .eq('id', detailedItem.id));
    }

    if (error) {
      showError("Erreur lors de la suppression de l'objet.");
      setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
    } else {
      showSuccess("Objet jeté.");
      onUpdate(true); // Final refresh
    }
  };

  const handleDropAllItems = async () => {
    if (!detailedItem) return;

    // Optimistic update
    const originalInventory = [...playerData.inventory];
    const newInventory = playerData.inventory.filter(invItem => invItem.id !== detailedItem.id);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setDetailedItem(null); // Close modal immediately

    const { error } = await supabase
      .from('inventories')
      .delete()
      .eq('id', detailedItem.id);

    if (error) {
      showError("Erreur lors de la suppression des objets.");
      setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
    } else {
      showSuccess("Objets jetés.");
      onUpdate(true); // Final refresh
    }
  };

  const handleSplitItem = async (item: InventoryItem, quantity: number) => {
    if (!item) return;
    
    // Optimistic update
    const originalInventory = [...playerData.inventory];
    const newInventory = playerData.inventory.map(invItem => {
        if (invItem.id === item.id) {
            return { ...invItem, quantity: invItem.quantity - quantity };
        }
        return invItem;
    });
    // Find first empty slot for the new stack
    let newSlotPosition = -1;
    for (let i = 0; i < unlockedSlots; i++) {
        if (!newInventory.some(invItem => invItem.slot_position === i)) {
            newSlotPosition = i;
            break;
        }
    }
    if (newSlotPosition === -1) {
        showError("Votre inventaire est plein. Impossible de diviser l'objet.");
        setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
        return;
    }
    const newItem = { ...item, id: -1, quantity: quantity, slot_position: newSlotPosition }; // -1 for temp ID
    newInventory.push(newItem);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setDetailedItem(null); // Close modal immediately

    const { error } = await supabase.rpc('split_inventory_item', {
      p_inventory_id: item.id,
      p_split_quantity: quantity,
    });
  
    if (error) {
      showError(error.message || "Erreur lors de la division de l'objet.");
      setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
    } else {
      showSuccess("La pile d'objets a été divisée.");
      onUpdate(true); // Final refresh
    }
  };

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItem !== null) {
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
    }

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
      stopAutoScroll();
    };
  }, [draggedItem, handleDragMove, handleDragEnd, stopAutoScroll]);

  useEffect(() => {
    if (!isOpen) {
      if (draggedItemNode.current) {
        document.body.removeChild(draggedItemNode.current);
        draggedItemNode.current = null;
      }
      setDraggedItem(null);
      setDragOverIndex(null);
      stopAutoScroll();
    }
  }, [isOpen, stopAutoScroll]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6"
      >
        <DialogHeader className="text-center mb-4">
          <div className="flex items-center justify-center gap-3">
            <Package className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
            <span className="text-white font-bold">{unlockedSlots}</span> / {TOTAL_SLOTS} SLOTS DÉBLOQUÉS
          </DialogDescription>
        </DialogHeader>
        <div
          ref={gridRef}
          className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[60vh] overflow-y-auto"
        >
          {loading ? (
            <div className="h-full w-full flex items-center justify-center col-span-full row-span-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            slots.map((item, index) => (
              <InventorySlot
                key={index}
                item={item}
                index={index}
                isUnlocked={index < unlockedSlots}
                onDragStart={handleDragStart}
                onItemClick={handleItemClick}
                isBeingDragged={draggedItem?.originalIndex === index}
                isDragOver={dragOverIndex === index}
              />
            ))
          )}
        </div>
        <ItemDetailModal
          isOpen={!!detailedItem}
          onClose={() => setDetailedItem(null)}
          item={detailedItem}
          onUse={handleUseItem}
          onDropOne={handleDropOneItem}
          onDropAll={handleDropAllItems}
          onSplit={handleSplitItem}
          source="inventory"
          onUpdate={() => onUpdate(true)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;