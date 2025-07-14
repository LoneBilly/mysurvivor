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
import { useGame } from "@/contexts/GameContext";

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
  const { playerData, setPlayerData } = useGame();
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

    if (!draggedItem || dragOverIndex === null || !user) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const fromIndex = draggedItem.originalIndex;
    const toIndex = dragOverIndex;

    setDraggedItem(null);
    setDragOverIndex(null);

    if (fromIndex === toIndex) return;
    if (toIndex >= unlockedSlots) {
      showError("Vous ne pouvez pas déposer un objet sur un emplacement verrouillé.");
      return;
    }

    const originalSlots = [...slots];
    const originalInventoryData = JSON.parse(JSON.stringify(playerData.inventory));

    // Optimistic update
    const newSlots = [...slots];
    const fromItem = newSlots[fromIndex];
    const toItem = newSlots[toIndex];
    
    if (!fromItem) return;

    if (toItem && fromItem.item_id === toItem.item_id && fromItem.items?.stackable) {
      // Merge stacks
      const fromItemInArr = newSlots[fromIndex]!;
      const toItemInArr = newSlots[toIndex]!;
      toItemInArr.quantity += fromItemInArr.quantity;
      newSlots[fromIndex] = null;
    } else {
      // Swap or move to empty slot
      const fromItemInArr = newSlots[fromIndex];
      const toItemInArr = newSlots[toIndex];
      newSlots[fromIndex] = toItemInArr;
      newSlots[toIndex] = fromItemInArr;
      if (fromItemInArr) fromItemInArr.slot_position = toIndex;
      if (toItemInArr) toItemInArr.slot_position = fromIndex;
    }
    setSlots(newSlots);
    setPlayerData(prev => ({ ...prev, inventory: newSlots.filter(Boolean) as InventoryItem[] }));


    const { error } = await supabase.rpc('swap_inventory_items', {
        p_from_slot: fromIndex,
        p_to_slot: toIndex
    });

    if (error) {
        showError("Erreur de mise à jour de l'inventaire.");
        console.error(error);
        setSlots(originalSlots); // Revert
        setPlayerData(originalInventoryData); // Revert
    } else {
        onUpdate(true); // Full refresh from server
    }
  }, [draggedItem, dragOverIndex, slots, unlockedSlots, stopAutoScroll, user, onUpdate, playerData, setPlayerData]);

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

    if (clientY < rect.top + scrollThreshold && gridEl.scrollTop > 0) {
      scrollIntervalRef.current = requestAnimationFrame(() => {
        if (gridEl) gridEl.scrollTop -= 10;
        handleDragMove(clientX, clientY); // Continue scrolling
      });
    } else if (clientY > rect.bottom - scrollThreshold && gridEl.scrollTop < gridEl.scrollHeight - gridEl.clientHeight) {
      scrollIntervalRef.current = requestAnimationFrame(() => {
        if (gridEl) gridEl.scrollTop += 10;
        handleDragMove(clientX, clientY); // Continue scrolling
      });
    }
  }, [unlockedSlots, stopAutoScroll]);

  const handleDragStart = useCallback((index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const item = slots[index];
    if (!item) return;

    setDraggedItem({ item, originalIndex: index });
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = '56px';
    ghostNode.style.height = '56px';
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  }, [handleDragMove, slots]);

  const handleItemClick = (item: InventoryItem) => {
    setDetailedItem(item);
  };

  const handleUseItem = () => {
    showError("Cette fonctionnalité n'est pas encore disponible.");
  };

  const handleDropOneItem = async () => {
    if (!detailedItem) return;

    // Optimistic update
    const originalSlots = [...slots];
    const originalInventoryData = JSON.parse(JSON.stringify(playerData.inventory));

    const newSlots = slots.map(slot => 
      slot?.id === detailedItem.id ? { ...slot, quantity: slot.quantity - 1 } : slot
    ).filter(slot => slot === null || slot.quantity > 0);
    setSlots(newSlots);
    setPlayerData(prev => ({ ...prev, inventory: newSlots.filter(Boolean) as InventoryItem[] }));

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
      setSlots(originalSlots); // Revert
      setPlayerData(originalInventoryData); // Revert
    } else {
      showSuccess("Objet jeté.");
      setDetailedItem(null);
      onUpdate(true); // Full refresh
    }
  };

  const handleDropAllItems = async () => {
    if (!detailedItem) return;

    // Optimistic update
    const originalSlots = [...slots];
    const originalInventoryData = JSON.parse(JSON.stringify(playerData.inventory));

    const newSlots = slots.filter(slot => slot?.id !== detailedItem.id);
    setSlots(newSlots);
    setPlayerData(prev => ({ ...prev, inventory: newSlots.filter(Boolean) as InventoryItem[] }));

    const { error } = await supabase
      .from('inventories')
      .delete()
      .eq('id', detailedItem.id);

    if (error) {
      showError("Erreur lors de la suppression des objets.");
      setSlots(originalSlots); // Revert
      setPlayerData(originalInventoryData); // Revert
    } else {
      showSuccess("Objets jetés.");
      setDetailedItem(null);
      onUpdate(true); // Full refresh
    }
  };

  const handleSplitItem = async (item: InventoryItem, quantity: number) => {
    if (!item) return;
    setDetailedItem(null);
  
    // Optimistic update
    const originalSlots = [...slots];
    const originalInventoryData = JSON.parse(JSON.stringify(playerData.inventory));

    const newSlots = [...slots];
    const originalItemIndex = newSlots.findIndex(s => s?.id === item.id);
    if (originalItemIndex !== -1) {
      newSlots[originalItemIndex] = { ...newSlots[originalItemIndex]!, quantity: newSlots[originalItemIndex]!.quantity - quantity };
    }

    let nextSlot = -1;
    for (let i = 0; i < unlockedSlots; i++) {
      if (!newSlots.some(s => s?.slot_position === i)) {
        nextSlot = i;
        break;
      }
    }

    if (nextSlot !== -1) {
      newSlots[nextSlot] = { ...item, id: -1, quantity: quantity, slot_position: nextSlot }; // -1 for temp ID
    } else {
      showError("Votre inventaire est plein. Impossible de diviser l'objet.");
      setSlots(originalSlots); // Revert
      setPlayerData(originalInventoryData); // Revert
      return;
    }
    setSlots(newSlots);
    setPlayerData(prev => ({ ...prev, inventory: newSlots.filter(Boolean).map(s => s?.id === -1 ? { ...s, id: Math.random() } : s) as InventoryItem[] })); // Assign temp ID


    const { error } = await supabase.rpc('split_inventory_item', {
      p_inventory_id: item.id,
      p_split_quantity: quantity,
    });
  
    if (error) {
      showError(error.message || "Erreur lors de la division de l'objet.");
      setSlots(originalSlots); // Revert
      setPlayerData(originalInventoryData); // Revert
    } else {
      showSuccess("La pile d'objets a été divisée.");
      onUpdate(); // Full refresh
    }
  };

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
          className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[60vh] overflow-y-auto no-scrollbar"
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
          onUpdate={onUpdate} // Pass onUpdate to ItemDetailModal for blueprint reading
        />
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;