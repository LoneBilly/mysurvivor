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
import { showError } from "@/utils/toast";
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
  const gridRef = useRef<HTMLDivElement>(null);

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
    if (isOpen) {
      fetchInventory();
    }
    return () => {
      if (draggedItemNode.current) {
        document.body.removeChild(draggedItemNode.current);
        draggedItemNode.current = null;
      }
      setDraggedItemIndex(null);
      setDragOverIndex(null);
    };
  }, [isOpen, fetchInventory]);

  const handleDragStart = (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItemIndex(index);
    
    const ghostNode = node.cloneNode(true) as HTMLDivElement;
    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = `${node.offsetWidth}px`;
    ghostNode.style.height = `${node.offsetHeight}px`;
    ghostNode.style.transform = 'scale(1.1) rotate(3deg)';
    ghostNode.classList.add('shadow-2xl', 'shadow-black');
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
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
          newDragOverIndex = parseInt((slot as HTMLElement).dataset.slotIndex || '-1', 10);
          break;
        }
      }
    }
    setDragOverIndex(newDragOverIndex);
  };

  const handleDragEnd = async () => {
    const fromIndex = draggedItemIndex;
    const toIndex = dragOverIndex;

    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }

    setDraggedItemIndex(null);
    setDragOverIndex(null);

    if (fromIndex === null || toIndex === null || fromIndex === toIndex || toIndex >= unlockedSlots) {
      return;
    }

    const originalSlots = [...slots];
    const newSlots = [...slots];
    const itemToMove = newSlots[fromIndex];
    const itemAtTarget = newSlots[toIndex];

    newSlots[toIndex] = itemToMove;
    newSlots[fromIndex] = itemAtTarget;
    setSlots(newSlots);

    const updates = [];
    if (itemToMove) {
      updates.push(supabase.from('inventories').update({ slot_position: toIndex }).eq('id', itemToMove.id));
    }
    if (itemAtTarget) {
      updates.push(supabase.from('inventories').update({ slot_position: fromIndex }).eq('id', itemAtTarget.id));
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      if (results.some(res => res.error)) {
        showError("Erreur de mise à jour de l'inventaire.");
        setSlots(originalSlots);
      }
    }
  };

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItemIndex !== null) {
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
    };
  }, [draggedItemIndex, dragOverIndex, slots]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-700/30 via-gray-900 to-black text-white border-2 border-neutral-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4 pb-4 border-b border-neutral-700">
          <div className="flex items-center justify-center gap-3">
            <Package className="w-8 h-8 text-amber-300" />
            <DialogTitle className="text-white font-mono tracking-widest uppercase text-2xl">Équipement</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-2">
            CAPACITÉ: <span className="text-white font-bold">{unlockedSlots}</span> / {TOTAL_SLOTS}
          </DialogDescription>
        </DialogHeader>
        <div
          ref={gridRef}
          className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 p-4 bg-black/50 rounded-lg border border-neutral-800 shadow-inner shadow-black/50 max-h-[60vh] overflow-y-auto"
        >
          {loading ? (
            <div className="h-48 flex items-center justify-center col-span-full"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
          ) : (
            slots.map((item, index) => (
              <InventorySlot
                key={index}
                item={item}
                index={index}
                isUnlocked={index < unlockedSlots}
                onDragStart={handleDragStart}
                isBeingDragged={draggedItemIndex === index}
                isDragOver={dragOverIndex === index}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;