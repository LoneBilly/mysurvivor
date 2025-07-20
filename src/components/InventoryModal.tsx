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
import EquipmentSlot, { EquipmentSlotType } from "./EquipmentSlot";
import { useGame } from "@/contexts/GameContext";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  unlockedSlots: number;
  onUpdate: () => Promise<void>;
}

const TOTAL_SLOTS = 50;

const SLOT_TYPE_MAP: Record<EquipmentSlotType, string> = {
  armor: 'Armure',
  backpack: 'Sac à dos',
  shoes: 'Chaussures',
  vehicle: 'Vehicule',
};

const InventoryModal = ({ isOpen, onClose, inventory, unlockedSlots, onUpdate }: InventoryModalProps) => {
  const { user } = useAuth();
  const { playerData, setPlayerData } = useGame();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);
  
  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'equipment' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' } | { type: EquipmentSlotType; target: 'equipment' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      onUpdate();
    }
  }, [isOpen, onUpdate]);

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

    const dragged = draggedItem;
    const over = dragOver;

    setDraggedItem(null);
    setDragOver(null);

    if (!dragged || !over || !user) return;

    if (dragged.source === 'inventory' && over.target === 'inventory' && dragged.item.slot_position === over.index) return;
    if (dragged.source === 'equipment' && over.target === 'equipment' && (playerData.equipment as any)[over.type]?.id === dragged.item.id) return;

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    let optimisticData = JSON.parse(JSON.stringify(playerData));
    let rpcPromise;

    try {
      if (dragged.source === 'inventory' && over.target === 'inventory') {
        const fromItem = optimisticData.inventory.find((i: InventoryItem) => i.id === dragged.item.id);
        const toItem = optimisticData.inventory.find((i: InventoryItem) => i.slot_position === over.index);

        if (fromItem && toItem && fromItem.item_id === toItem.item_id && fromItem.items?.stackable) {
          const toItemIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === toItem.id);
          optimisticData.inventory[toItemIndex].quantity += fromItem.quantity;
          optimisticData.inventory = optimisticData.inventory.filter((i: InventoryItem) => i.id !== fromItem.id);
          rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromItem.slot_position, p_to_slot: toItem.slot_position });
        } else {
          const fromIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === dragged.item.id);
          if (fromIndex !== -1) {
            if (toItem) {
              const toIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === toItem.id);
              optimisticData.inventory[toIndex].slot_position = dragged.item.slot_position;
            }
            optimisticData.inventory[fromIndex].slot_position = over.index;
          }
          rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: dragged.item.slot_position, p_to_slot: over.index });
        }
      } else if (dragged.source === 'equipment' && over.target === 'inventory') {
        const extraSlots = dragged.item.items?.effects?.extra_slots || 0;
        if (extraSlots > 0) {
            const currentUnlockedSlots = playerData.playerState.unlocked_slots;
            const newUnlockedSlots = currentUnlockedSlots - extraSlots;

            if (over.index >= newUnlockedSlots) {
                showError("Vous ne pouvez pas placer cet objet dans un emplacement qui sera verrouillé.");
                return;
            }

            const highestOccupiedSlot = Math.max(-1, ...playerData.inventory
                .filter(i => i.slot_position !== null && i.id !== dragged.item.id)
                .map(i => i.slot_position as number)
            );
            
            if (highestOccupiedSlot >= newUnlockedSlots) {
                showError("Impossible de déséquiper : des objets se trouvent dans des emplacements qui seraient verrouillés.");
                return;
            }
        }

        const itemIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === dragged.item.id);
        if (itemIndex !== -1) {
          optimisticData.inventory[itemIndex].slot_position = over.index;
          const equipmentSlot = Object.keys(optimisticData.equipment).find(key => (optimisticData.equipment as any)[key]?.id === dragged.item.id);
          if (equipmentSlot) (optimisticData.equipment as any)[equipmentSlot] = null;
        }
        rpcPromise = supabase.rpc('unequip_item_to_slot', { p_inventory_id: dragged.item.id, p_target_slot: over.index });
      } else if (dragged.source === 'inventory' && over.target === 'equipment') {
        const requiredItemType = SLOT_TYPE_MAP[over.type];
        const draggedItemType = dragged.item.items?.type;
        if (requiredItemType !== draggedItemType) {
          showError(`Cet objet ne peut pas être équipé ici. Emplacement pour: ${requiredItemType}.`);
          return;
        }

        const itemIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === dragged.item.id);
        const currentlyEquipped = optimisticData.equipment[over.type];
        
        if (itemIndex !== -1) {
          optimisticData.inventory[itemIndex].slot_position = null;
          optimisticData.equipment[over.type] = optimisticData.inventory[itemIndex];
          if (currentlyEquipped) {
            const oldEquipIndex = optimisticData.inventory.findIndex((i: InventoryItem) => i.id === currentlyEquipped.id);
            if (oldEquipIndex !== -1) {
              optimisticData.inventory[oldEquipIndex].slot_position = dragged.item.slot_position;
            }
          }
        }
        rpcPromise = supabase.rpc('equip_item', { p_inventory_id: dragged.item.id, p_slot_type: over.type });
      }
      
      setPlayerData(optimisticData);

      if (rpcPromise) {
        const { error } = await rpcPromise;
        if (error) throw error;
        onUpdate();
      }
    } catch (error: any) {
      showError(error.message || "Erreur de mise à jour de l'inventaire.");
      setPlayerData(originalPlayerData);
    }
  }, [draggedItem, dragOver, user, onUpdate, stopAutoScroll, playerData, setPlayerData]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index') || el.hasAttribute('data-slot-type'));
    
    if (slotElement) {
      if (slotElement.hasAttribute('data-slot-index')) {
        const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
        if (index !== -1 && index < unlockedSlots) {
          setDragOver({ index, target: 'inventory' });
          return;
        }
      } else if (slotElement.hasAttribute('data-slot-type')) {
        const type = slotElement.getAttribute('data-slot-type') as EquipmentSlotType;
        setDragOver({ type, target: 'equipment' });
        return;
      }
    }
    setDragOver(null);

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

  const handleDragStart = useCallback((item: InventoryItem, source: 'inventory' | 'equipment', node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem({ item, source });
    
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
  }, [handleDragMove]);

  const handleItemClick = (item: InventoryItem) => {
    setDetailedItem(item);
  };

  const handleUseItem = () => {
    showError("Cette fonctionnalité n'est pas encore disponible.");
  };

  const handleDropOneItem = async () => {
    if (!detailedItem) return;

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
    } else {
      showSuccess("Objet jeté.");
      setDetailedItem(null);
      onUpdate();
    }
  };

  const handleDropAllItems = async () => {
    if (!detailedItem) return;

    const { error } = await supabase
      .from('inventories')
      .delete()
      .eq('id', detailedItem.id);

    if (error) {
      showError("Erreur lors de la suppression des objets.");
    } else {
      showSuccess("Objets jetés.");
      setDetailedItem(null);
      onUpdate();
    }
  };

  const handleSplitItem = async (item: InventoryItem, quantity: number) => {
    if (!item) return;
    setDetailedItem(null);

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    const usedSlots = new Set(playerData.inventory.map(i => i.slot_position));
    let nextEmptySlot = -1;
    for (let i = 0; i < unlockedSlots; i++) {
      if (!usedSlots.has(i)) {
        nextEmptySlot = i;
        break;
      }
    }

    if (nextEmptySlot === -1) {
      showError("Inventaire plein, impossible de diviser.");
      return;
    }

    const newPlayerData = JSON.parse(JSON.stringify(originalPlayerData));
    const itemToSplitIndex = newPlayerData.inventory.findIndex((i: InventoryItem) => i.id === item.id);
    
    if (itemToSplitIndex === -1) return;

    newPlayerData.inventory[itemToSplitIndex].quantity -= quantity;

    const newItem: InventoryItem = {
      ...newPlayerData.inventory[itemToSplitIndex],
      id: Date.now(),
      quantity: quantity,
      slot_position: nextEmptySlot,
    };
    newPlayerData.inventory.push(newItem);

    setPlayerData(newPlayerData);

    const { error } = await supabase.rpc('split_inventory_item', {
      p_inventory_id: item.id,
      p_split_quantity: quantity,
    });
  
    if (error) {
      showError(error.message || "Erreur lors de la division de l'objet.");
      setPlayerData(originalPlayerData);
    } else {
      showSuccess("La pile d'objets a été divisée.");
      await onUpdate();
    }
  };

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItem) {
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
      setDragOver(null);
      stopAutoScroll();
    }
  }, [isOpen, stopAutoScroll]);

  const equipmentSlots: { type: EquipmentSlotType; label: string; item: InventoryItem | null }[] = [
    { type: 'armor', label: 'Armure', item: playerData.equipment?.armor },
    { type: 'backpack', label: 'Sac à dos', item: playerData.equipment?.backpack },
    { type: 'shoes', label: 'Chaussures', item: playerData.equipment?.shoes },
    { type: 'vehicle', label: 'Vehicule', item: playerData.equipment?.vehicle },
  ];

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

        <div className="flex justify-center gap-1 sm:gap-2 mb-6 relative">
          {equipmentSlots.map(slot => (
            <div key={slot.type} className="flex flex-col items-center gap-2">
              <EquipmentSlot
                slotType={slot.type}
                label={slot.label}
                item={slot.item}
                onDragStart={(item, node, e) => handleDragStart(item, 'equipment', node, e)}
                isDragOver={dragOver?.target === 'equipment' && dragOver.type === slot.type}
                onItemClick={handleItemClick}
              />
              <p className="text-xs text-gray-400 font-mono">{slot.label}</p>
            </div>
          ))}
        </div>

        <div
          ref={gridRef}
          className="grid [grid-template-columns:repeat(auto-fill,minmax(4rem,1fr))] gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[50vh] overflow-y-auto relative"
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
                onDragStart={(idx, node, e) => slots[idx] && handleDragStart(slots[idx]!, 'inventory', node, e)}
                onItemClick={(clickedItem) => clickedItem && handleItemClick(clickedItem)}
                isBeingDragged={draggedItem?.source === 'inventory' && draggedItem.item.slot_position === index}
                isDragOver={dragOver?.target === 'inventory' && dragOver.index === index}
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
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;