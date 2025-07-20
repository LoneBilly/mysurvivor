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
import { InventoryItem, Equipment } from "@/types/game";
import ItemDetailModal from "./ItemDetailModal";
import { useGame } from "@/contexts/GameContext";
import EquipmentSlots from "./EquipmentSlots";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLOTS = 50;

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { playerData, setPlayerData, refreshPlayerData } = useGame();
  const { inventory, unlockedSlots, equipment } = playerData;
  
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'equipment'; slotType?: keyof Equipment } | null>(null);
  
  const [draggedItem, setDraggedItem] = useState<{ source: 'inventory' | 'equipment'; index?: number; slotType?: keyof Equipment } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'equipment'; index?: number; slotType?: keyof Equipment } | null>(null);
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

    const from = draggedItem;
    const to = dragOver;

    setDraggedItem(null);
    setDragOver(null);

    if (!from || !to) return;
    if (from.source === 'inventory' && to.target === 'inventory' && from.index === to.index) return;
    if (from.source === 'equipment' && to.target === 'equipment' && from.slotType === to.slotType) return;

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    let rpcPromise;

    if (from.source === 'inventory' && to.target === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: from.index, p_to_slot: to.index });
    } else if (from.source === 'equipment' && to.target === 'inventory') {
      const itemToUnequip = equipment[from.slotType!];
      if (itemToUnequip) {
        rpcPromise = supabase.rpc('unequip_item_to_slot', { p_inventory_id: itemToUnequip.id, p_target_slot: to.index });
      }
    } else if (from.source === 'inventory' && to.target === 'equipment') {
      const itemToEquip = slots[from.index!];
      if (itemToEquip) {
        rpcPromise = supabase.rpc('equip_item', { p_inventory_id: itemToEquip.id, p_slot_type: to.slotType });
      }
    }

    if (rpcPromise) {
      const { error } = await rpcPromise;
      if (error) {
        showError(error.message);
        setPlayerData(originalPlayerData);
      } else {
        await refreshPlayerData(true);
      }
    }
  }, [draggedItem, dragOver, slots, equipment, stopAutoScroll, playerData, setPlayerData, refreshPlayerData]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index') || el.hasAttribute('data-slot-type'));
    
    if (slotElement) {
      const targetElement = (slotElement as HTMLElement).closest('[data-slot-target]');
      const target = targetElement?.getAttribute('data-slot-target') as 'inventory' | 'equipment' | undefined;

      if (target === 'inventory') {
        const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
        if (index !== -1 && index < unlockedSlots) {
          setDragOver({ target, index });
          return;
        }
      } else if (target === 'equipment') {
        const slotType = slotElement.getAttribute('data-slot-type') as keyof Equipment | null;
        if (slotType) {
          setDragOver({ target, slotType });
          return;
        }
      }
    }
    setDragOver(null);

    const gridEl = gridRef.current;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const scrollThreshold = 60;

    stopAutoScroll();

    if (clientY < rect.top + scrollThreshold) {
      const scroll = () => { gridEl.scrollTop -= 10; scrollIntervalRef.current = requestAnimationFrame(scroll); };
      scroll();
    } else if (clientY > rect.bottom - scrollThreshold) {
      const scroll = () => { gridEl.scrollTop += 10; scrollIntervalRef.current = requestAnimationFrame(scroll); };
      scroll();
    }
  }, [unlockedSlots, stopAutoScroll]);

  const handleDragStart = (source: 'inventory' | 'equipment', identifier: number | keyof Equipment, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const dragInfo = source === 'inventory' ? { source, index: identifier as number } : { source, slotType: identifier as keyof Equipment };
    setDraggedItem(dragInfo);
    
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

  const handleItemClick = (item: InventoryItem, source: 'inventory' | 'equipment', slotType?: keyof Equipment) => {
    if (item) setDetailedItem({ item, source, slotType });
  };

  const handleDropAllItems = async () => {
    if (!detailedItem) return;
    const { error } = await supabase.from('inventories').delete().eq('id', detailedItem.item.id);
    if (error) showError("Erreur lors de la suppression des objets.");
    else {
      showSuccess("Objets jetés.");
      setDetailedItem(null);
      await refreshPlayerData();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <div className="flex items-center justify-center gap-3">
            <Package className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire & Équipement</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
            <span className="text-white font-bold">{unlockedSlots}</span> / {TOTAL_SLOTS} SLOTS DÉBLOQUÉS
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <div ref={gridRef} className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center col-span-full row-span-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : (
                slots.map((item, index) => (
                  <div key={index} data-slot-target="inventory">
                    <InventorySlot
                      item={item}
                      index={index}
                      isUnlocked={index < unlockedSlots}
                      onDragStart={(node, e) => handleDragStart('inventory', index, node, e)}
                      onItemClick={(clickedItem) => clickedItem && handleItemClick(clickedItem, 'inventory')}
                      isBeingDragged={draggedItem?.source === 'inventory' && draggedItem?.index === index}
                      isDragOver={dragOver?.target === 'inventory' && dragOver?.index === index}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="md:col-span-1">
            <EquipmentSlots
              equipment={equipment}
              onDragStart={(slotType, node, e) => handleDragStart('equipment', slotType, node, e)}
              onItemClick={(item, slotType) => handleItemClick(item, 'equipment', slotType)}
              draggedItem={draggedItem}
              dragOverSlot={dragOver?.target === 'equipment' ? dragOver.slotType! : null}
            />
          </div>
        </div>
        <ItemDetailModal
          isOpen={!!detailedItem}
          onClose={() => setDetailedItem(null)}
          item={detailedItem?.item || null}
          onUse={() => {}}
          onDropOne={() => {}}
          onDropAll={handleDropAllItems}
          onUpdate={refreshPlayerData}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;