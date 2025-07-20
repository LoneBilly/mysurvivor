import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InventoryItem } from "@/types/game";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemDetailModal from "./ItemDetailModal";
import { Backpack } from "lucide-react";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { playerData, setPlayerData, refreshInventoryAndChests } = useGame();
  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);

  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const handleItemClick = (item: InventoryItem) => {
    if (item) {
      setDetailedItem(item);
    }
  };

  const handleDrop = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    const { error } = await supabase.rpc('drop_inventory_item', { p_inventory_id: item.id, p_quantity_to_drop: quantity });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet jeté.");
      await refreshInventoryAndChests();
    }
  };

  const handleDragStart = (index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem(index);
    
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
  };

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index'));
    
    if (slotElement) {
      const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
      if (index !== -1) {
        setDragOver(index);
        return;
      }
    }
    setDragOver(null);
  }, []);

  const handleDragEnd = async () => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }
  
    if (draggedItem === null || dragOver === null || draggedItem === dragOver) {
      setDraggedItem(null);
      setDragOver(null);
      return;
    }
  
    const fromIndex = draggedItem;
    const toIndex = dragOver;
  
    setDraggedItem(null);
    setDragOver(null);
  
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    let optimisticData = JSON.parse(JSON.stringify(playerData));
  
    const fromItem = optimisticData.inventory.find((i: InventoryItem) => i.slot_position === fromIndex);
    const toItem = optimisticData.inventory.find((i: InventoryItem) => i.slot_position === toIndex);
  
    if (fromItem) {
      if (toItem) {
        if (fromItem.item_id === toItem.item_id && fromItem.items?.stackable) {
          toItem.quantity += fromItem.quantity;
          optimisticData.inventory = optimisticData.inventory.filter((i: InventoryItem) => i.id !== fromItem.id);
        } else {
          toItem.slot_position = fromIndex;
          fromItem.slot_position = toIndex;
        }
      } else {
        fromItem.slot_position = toIndex;
      }
    }
  
    setPlayerData(optimisticData);
  
    try {
      const { error } = await supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
      if (error) throw error;
      await refreshInventoryAndChests();
    } catch (error: any) {
      showError(error.message || "Erreur de déplacement.");
      setPlayerData(originalPlayerData);
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
    };
  }, [draggedItem, handleDragMove, handleDragEnd]);

  const renderGrid = () => {
    const slots = Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
      return playerData.inventory.find(i => i?.slot_position === index) || null;
    });

    return (
      <div
        className="grid [grid-template-columns:repeat(auto-fill,4.5rem)] gap-2 justify-center p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[50vh] overflow-y-auto relative"
      >
        {slots.map((item, index) => (
          <InventorySlot
            key={index}
            item={item}
            index={index}
            isUnlocked={index < playerData.playerState.unlocked_slots}
            onDragStart={(idx, node, e) => handleDragStart(idx, node, e)}
            onItemClick={handleItemClick}
            isBeingDragged={draggedItem === index}
            isDragOver={dragOver === index}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Backpack className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
              Gérez vos objets.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {renderGrid()}
          </div>
        </DialogContent>
      </Dialog>
      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem}
        source={'inventory'}
        onTransfer={() => {}} // No transfer from inventory to inventory
        onDropOne={() => detailedItem && handleDrop(detailedItem, 1)}
        onDropAll={() => detailedItem && handleDrop(detailedItem, detailedItem.quantity)}
        onUse={() => {}}
        onUpdate={refreshInventoryAndChests}
      />
    </>
  );
};

export default InventoryModal;