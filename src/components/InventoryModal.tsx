import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError } from "@/utils/toast";
import { GameState } from "@/types/game";
import { useQuery } from '@tanstack/react-query';

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
    type: string;
    signedIconUrl?: string;
  } | null;
}

const TOTAL_SLOTS = 50;

const InventoryModal = ({ isOpen, onClose, gameState }: InventoryModalProps) => {
  const { user } = useAuth();
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const unlockedSlots = gameState?.unlocked_slots ?? 0;

  const { data: inventoryData, isLoading, error, refetch } = useQuery<InventoryItem[], Error>({
    queryKey: ['inventory', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: inventoryRes, error: inventoryError } = await supabase
        .from('inventories')
        .select('id, item_id, quantity, slot_position, items(name, description, icon, type)')
        .eq('player_id', user.id);

      if (inventoryError) throw inventoryError;

      const itemsWithSignedUrls = await Promise.all(
        (inventoryRes || []).map(async (item) => {
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
      return itemsWithSignedUrls as InventoryItem[];
    },
    enabled: isOpen && !!user,
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    refetchOnWindowFocus: false,
  });

  const slots = useMemo(() => {
    const newSlots = Array(TOTAL_SLOTS).fill(null) as (InventoryItem | null)[];
    if (inventoryData) {
      inventoryData.forEach((item) => {
        if (item.slot_position !== null && item.slot_position < TOTAL_SLOTS) {
          newSlots[item.slot_position] = item;
        }
      });
    }
    return newSlots;
  }, [inventoryData]);

  useEffect(() => {
    if (error) {
      showError("Erreur de chargement de l'inventaire.");
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (!isOpen) {
      if (draggedItemNode.current) {
        document.body.removeChild(draggedItemNode.current);
        draggedItemNode.current = null;
      }
      setDraggedItemIndex(null);
      setDragOverIndex(null);
    }
  }, [isOpen]);

  const handleDragStart = (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItemIndex(index);
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = '64px';
    ghostNode.style.height = '64px';
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
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
          const potentialIndex = parseInt((slot as HTMLElement).dataset.slotIndex || '-1', 10);
          if (potentialIndex !== -1 && potentialIndex < unlockedSlots) {
            newDragOverIndex = potentialIndex;
          }
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

    if (fromIndex === null || toIndex === null || fromIndex === toIndex) {
      return;
    }

    if (toIndex >= unlockedSlots) {
      showError("Vous ne pouvez pas déposer un objet sur un emplacement verrouillé.");
      return;
    }

    const updates = [];
    const itemToMove = slots[fromIndex];
    const itemAtTarget = slots[toIndex];

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
      } else {
        refetch(); 
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
      <DialogContent className="max-w-3xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
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
          className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[60vh] overflow-y-auto"
        >
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center col-span-full row-span-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
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