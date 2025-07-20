import {
  Dialog,
  CustomDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/CustomDialog";
import { Package, Loader2, Backpack, Shield, Sword, Footprints, Car, Trash2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError, showSuccess } from "@/utils/toast";
import { InventoryItem, Equipment, EquipmentSlotType } from "@/types/game";
import ItemDetailModal from "./ItemDetailModal";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import ActionModal from "./ActionModal";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  equipment: Equipment;
  unlockedSlots: number;
  onUpdate: () => Promise<void>;
}

const TOTAL_SLOTS = 50;

const equipmentSlotConfig: { type: EquipmentSlotType; icon: React.ElementType }[] = [
  { type: 'weapon', icon: Sword },
  { type: 'armor', icon: Shield },
  { type: 'backpack', icon: Backpack },
  { type: 'shoes', icon: Footprints },
  { type: 'vehicle', icon: Car },
];

const InventoryModal = ({ isOpen, onClose, inventory, equipment, unlockedSlots, onUpdate }: InventoryModalProps) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [localEquipment, setLocalEquipment] = useState<Equipment>(equipment);
  const [loading, setLoading] = useState(true);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'equipment'; slotType?: EquipmentSlotType } | null>(null);
  
  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'equipment'; sourceId: number | EquipmentSlotType } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'equipment' | 'drop'; targetId: number | EquipmentSlotType | null } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const newSlots = Array(TOTAL_SLOTS).fill(null);
    inventory.forEach((item) => {
      if (item.slot_position !== null && item.slot_position < TOTAL_SLOTS) {
        newSlots[item.slot_position] = item;
      }
    });
    setSlots(newSlots);
    setLocalEquipment(equipment);
    setLoading(false);
  }, [inventory, equipment]);

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

    if (!from || !to || !user) return;

    if (to.target === 'drop') {
      setDraggedItem(from);
      setIsDropModalOpen(true);
      return;
    }

    const originalSlots = JSON.parse(JSON.stringify(slots));
    const originalEquipment = JSON.parse(JSON.stringify(localEquipment));
    
    const newSlots = [...slots];
    const newEquipment = { ...localEquipment };
    
    let rpcCall: PromiseLike<{ error: any }>;

    try {
      if (from.source === 'inventory' && to.target === 'inventory') {
        const fromIndex = from.sourceId as number;
        const toIndex = to.targetId as number;
        if (fromIndex === toIndex || toIndex >= unlockedSlots) return;
        
        [newSlots[fromIndex], newSlots[toIndex]] = [newSlots[toIndex], newSlots[fromIndex]];
        setSlots(newSlots);
        rpcCall = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });

      } else if (from.source === 'inventory' && to.target === 'equipment') {
        const toSlotType = to.targetId as EquipmentSlotType;
        const itemToEquip = from.item;
        
        const currentlyEquipped = newEquipment[toSlotType];
        newEquipment[toSlotType] = itemToEquip;
        
        const fromIndex = newSlots.findIndex(i => i?.id === itemToEquip.id);
        if (fromIndex !== -1) newSlots[fromIndex] = currentlyEquipped;
        
        setSlots(newSlots);
        setLocalEquipment(newEquipment);
        rpcCall = supabase.rpc('equip_item', { p_inventory_id: itemToEquip.id, p_slot_type: toSlotType });

      } else if (from.source === 'equipment' && to.target === 'inventory') {
        const fromSlotType = from.sourceId as EquipmentSlotType;
        const toIndex = to.targetId as number;
        if (toIndex >= unlockedSlots) throw new Error("Vous ne pouvez pas déposer un objet sur un emplacement verrouillé.");

        const itemToUnequip = from.item;
        const itemInTargetSlot = newSlots[toIndex];

        newSlots[toIndex] = itemToUnequip;
        newEquipment[fromSlotType] = itemInTargetSlot;

        setSlots(newSlots);
        setLocalEquipment(newEquipment);
        rpcCall = supabase.rpc('unequip_item_to_slot', { p_inventory_id: itemToUnequip.id, p_target_slot: toIndex });
      } else {
        return;
      }

      const { error } = await rpcCall;
      if (error) throw error;
      
      await onUpdate();

    } catch (error: any) {
      showError(error.message || "Une erreur est survenue.");
      setSlots(originalSlots);
      setLocalEquipment(originalEquipment);
    }
  }, [draggedItem, dragOver, unlockedSlots, stopAutoScroll, user, onUpdate, slots, localEquipment]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index') || el.hasAttribute('data-slot-type'));
    const dropZone = elements.find(el => (el as HTMLElement).id === 'drop-zone');

    if (dropZone) {
      setDragOver({ target: 'drop', targetId: null });
      return;
    }

    if (slotElement) {
      const inventoryIndex = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
      const equipmentType = slotElement.getAttribute('data-slot-type') as EquipmentSlotType | null;

      if (inventoryIndex !== -1) {
        setDragOver({ target: 'inventory', targetId: inventoryIndex });
        return;
      }
      if (equipmentType) {
        setDragOver({ target: 'equipment', targetId: equipmentType });
        return;
      }
    }
    setDragOver(null);
  }, []);

  const handleDragStart = useCallback((item: InventoryItem, source: 'inventory' | 'equipment', sourceId: number | EquipmentSlotType, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem({ item, source, sourceId });
    
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

  const handleItemClick = (item: InventoryItem, source: 'inventory' | 'equipment', slotType?: EquipmentSlotType) => {
    setDetailedItem({ item, source, slotType });
  };

  const handleDropZoneDrop = async () => {
    if (!draggedItem) return;
    const itemToDrop = draggedItem.item;
    setDraggedItem(null);
    setIsDropModalOpen(false);

    const { error } = await supabase.rpc('drop_inventory_item', { p_inventory_id: itemToDrop.id, p_quantity_to_drop: itemToDrop.quantity });
    if (error) {
      showError("Erreur lors de la suppression de l'objet.");
    } else {
      showSuccess("Objet jeté.");
      onUpdate();
    }
  };

  const handleDetailModalDropOne = async () => {
    if (!detailedItem) return;
    const item = detailedItem.item;
    setDetailedItem(null);

    const { error } = await supabase.rpc('drop_inventory_item', { p_inventory_id: item.id, p_quantity_to_drop: 1 });
    if (error) showError(error.message);
    else {
      showSuccess("1x objet jeté.");
      onUpdate();
    }
  };

  const handleDetailModalDropAll = async () => {
    if (!detailedItem) return;
    const item = detailedItem.item;
    setDetailedItem(null);

    const { error } = await supabase.rpc('drop_inventory_item', { p_inventory_id: item.id, p_quantity_to_drop: item.quantity });
    if (error) showError(error.message);
    else {
      showSuccess("Pile d'objets jetée.");
      onUpdate();
    }
  };

  const handleDetailModalSplit = async (item: InventoryItem, quantity: number) => {
    if (!item) return;
    setDetailedItem(null);
  
    const { error } = await supabase.rpc('split_inventory_item', {
      p_inventory_id: item.id,
      p_split_quantity: quantity,
    });
  
    if (error) showError(error.message);
    else {
      showSuccess("La pile d'objets a été divisée.");
      onUpdate();
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full h-[90vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
          <DialogHeader className="text-center flex-shrink-0">
            <div className="flex items-center justify-center gap-3">
              <Package className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire & Équipement</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-shrink-0 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
            <h3 className="text-center font-bold font-mono mb-3 text-gray-300">Équipement</h3>
            <div className="flex justify-center items-center gap-4">
              <div className="flex flex-wrap justify-center gap-2">
                {equipmentSlotConfig.map(({ type, icon: Icon }) => {
                  const item = localEquipment[type];
                  return (
                    <div key={type} data-slot-type={type} className="w-16 h-16">
                      <InventorySlot
                        item={item}
                        index={-1}
                        isUnlocked={true}
                        onDragStart={(idx, node, e) => item && handleDragStart(item, 'equipment', type, node, e)}
                        onItemClick={() => item && handleItemClick(item, 'equipment', type)}
                        isBeingDragged={draggedItem?.source === 'equipment' && draggedItem?.sourceId === type}
                        isDragOver={dragOver?.target === 'equipment' && dragOver?.targetId === type}
                        placeholderIcon={<Icon className="w-6 h-6 text-slate-500" />}
                      />
                    </div>
                  );
                })}
              </div>
              <div id="drop-zone" className={cn("w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors flex-shrink-0", dragOver?.target === 'drop' ? "bg-red-500/20 border-red-500" : "border-slate-600")}>
                <Trash2 className={cn("w-6 h-6 transition-colors", dragOver?.target === 'drop' ? "text-red-400" : "text-slate-500")} />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
            <h3 className="text-center font-bold font-mono mb-3 text-gray-300">
              Inventaire <span className="text-white">({unlockedSlots} / {TOTAL_SLOTS})</span>
            </h3>
            <div ref={gridRef} className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 flex-grow overflow-y-auto pr-2">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center col-span-full row-span-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : (
                slots.map((item, index) => (
                  <InventorySlot
                    key={index}
                    item={item}
                    index={index}
                    isUnlocked={index < unlockedSlots}
                    onDragStart={(idx, node, e) => item && handleDragStart(item, 'inventory', idx, node, e)}
                    onItemClick={() => item && handleItemClick(item, 'inventory')}
                    isBeingDragged={draggedItem?.source === 'inventory' && draggedItem?.sourceId === index}
                    isDragOver={dragOver?.target === 'inventory' && dragOver?.targetId === index}
                  />
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem?.item || null}
        onUse={() => showError("Cette fonctionnalité n'est pas encore disponible.")}
        onDropOne={handleDetailModalDropOne}
        onDropAll={handleDetailModalDropAll}
        onSplit={handleDetailModalSplit}
        source={detailedItem?.source}
        onUpdate={onUpdate}
      />
      <ActionModal
        isOpen={isDropModalOpen}
        onClose={() => setIsDropModalOpen(false)}
        title="Jeter l'objet"
        description={`Êtes-vous sûr de vouloir jeter ${draggedItem?.item.quantity}x ${draggedItem?.item.items?.name} ? Cette action est irréversible.`}
        actions={[
          { label: "Confirmer", onClick: handleDropZoneDrop, variant: "destructive" },
          { label: "Annuler", onClick: () => setIsDropModalOpen(false), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default InventoryModal;