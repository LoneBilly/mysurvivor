import {
  Dialog,
  CustomDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/CustomDialog";
import { Package, Loader2, Backpack, Shield, Sword, Footprints, Car, Trash2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import InventorySlot from "./InventorySlot";
import { showError, showSuccess } from "@/utils/toast";
import { InventoryItem, Equipment } from "@/types/game";
import ItemDetailModal from "./ItemDetailModal";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import ActionModal from "./ActionModal";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLOTS = 50;

type EquipmentSlotType = keyof Equipment;

const equipmentSlotsConfig: { type: EquipmentSlotType; icon: React.ElementType; label: string; itemType: string }[] = [
  { type: 'weapon', icon: Sword, label: 'Arme', itemType: 'armes' },
  { type: 'armor', icon: Shield, label: 'Armure', itemType: 'armure' },
  { type: 'backpack', icon: Backpack, label: 'Sac à dos', itemType: 'sac à dos' },
  { type: 'shoes', icon: Footprints, label: 'Chaussures', itemType: 'chaussures' },
  { type: 'vehicle', icon: Car, label: 'Véhicule', itemType: 'vehicule' },
];

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { playerData, setPlayerData, refreshPlayerData } = useGame();
  const { inventory, equipment, playerState: { unlocked_slots } } = playerData;

  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);
  const [dragState, setDragState] = useState<{ item: InventoryItem; source: 'inventory' | EquipmentSlotType; node: HTMLDivElement } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | EquipmentSlotType; index?: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({ isOpen: false, item: null });

  const handleItemClick = (item: InventoryItem) => setDetailedItem(item);

  const handleDragStart = (item: InventoryItem, source: 'inventory' | EquipmentSlotType, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = `${node.offsetWidth}px`;
    ghostNode.style.height = `${node.offsetHeight}px`;
    ghostNode.style.opacity = '0.85';
    document.body.appendChild(ghostNode);
    
    setDragState({ item, source, node: ghostNode });
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  };

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (dragState) {
      dragState.node.style.left = `${clientX - dragState.node.offsetWidth / 2}px`;
      dragState.node.style.top = `${clientY - dragState.node.offsetHeight / 2}px`;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-target'));
    
    if (slotElement) {
      const target = slotElement.getAttribute('data-slot-target') as 'inventory' | EquipmentSlotType | 'trash';
      const indexStr = slotElement.getAttribute('data-slot-index');
      const index = indexStr ? parseInt(indexStr, 10) : undefined;
      setDragOver({ target, index });
    } else {
      setDragOver(null);
    }
  }, [dragState]);

  const handleDragEnd = useCallback(async () => {
    if (dragState) {
      document.body.removeChild(dragState.node);
    }

    if (!dragState || !dragOver) {
      setDragState(null);
      setDragOver(null);
      return;
    }

    const { item: draggedItem, source } = dragState;
    const { target, index: toIndex } = dragOver;

    setDragState(null);
    setDragOver(null);

    if (target === 'trash') {
      setDeleteModal({ isOpen: true, item: draggedItem });
      return;
    }

    let rpcPromise;
    if (source === 'inventory' && target === 'inventory' && toIndex !== undefined) {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: draggedItem.slot_position, p_to_slot: toIndex });
    } else if (source === 'inventory' && target !== 'inventory') {
      rpcPromise = supabase.rpc('equip_item', { p_inventory_id: draggedItem.id, p_slot_type: target });
    } else if (source !== 'inventory' && target === 'inventory' && toIndex !== undefined) {
      rpcPromise = supabase.rpc('unequip_item_to_slot', { p_inventory_id: draggedItem.id, p_target_slot: toIndex });
    } else {
      return; // Invalid move (e.g., equipment to equipment)
    }

    const { error } = await rpcPromise;
    if (error) showError(error.message);
    await refreshPlayerData();

  }, [dragState, dragOver, refreshPlayerData]);

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (dragState) {
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
  }, [dragState, handleDragMove, handleDragEnd]);

  const handleDropItem = async (quantity: number) => {
    const item = deleteModal.item;
    if (!item) return;
    
    let rpcPromise;
    if (item.quantity > quantity) {
      rpcPromise = supabase.from('inventories').update({ quantity: item.quantity - quantity }).eq('id', item.id);
    } else {
      rpcPromise = supabase.from('inventories').delete().eq('id', item.id);
    }
    
    const { error } = await rpcPromise;
    if (error) showError(error.message);
    else showSuccess("Objet jeté.");
    
    setDeleteModal({ isOpen: false, item: null });
    await refreshPlayerData();
  };

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => inventory.find(item => item.slot_position === i) || null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
          <DialogHeader className="text-center mb-4">
            <div className="flex items-center justify-center gap-3">
              <Package className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire & Équipement</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
              <span className="text-white font-bold">{unlocked_slots}</span> / {TOTAL_SLOTS} SLOTS DÉBLOQUÉS
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              {equipmentSlotsConfig.map(({ type, icon: Icon, label }) => {
                const item = equipment[type];
                return (
                  <div key={type} data-slot-target={type} className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="w-full h-14">
                      <InventorySlot
                        item={item}
                        index={-1}
                        isUnlocked={true}
                        onDragStart={(idx, node, e) => item && handleDragStart(item, type, node, e)}
                        onItemClick={() => item && handleItemClick(item)}
                        isBeingDragged={dragState?.source === type}
                        isDragOver={dragOver?.target === type}
                      />
                    </div>
                  </div>
                );
              })}
              <div data-slot-target="trash" className={cn("mt-4 h-20 flex items-center justify-center flex-col gap-2 border-2 border-dashed rounded-lg transition-colors", dragOver?.target === 'trash' ? "border-red-500 bg-red-500/20 text-red-400" : "border-slate-700 text-slate-500")}>
                <Trash2 className="w-6 h-6" />
                <span className="text-sm font-mono">Jeter</span>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-5 sm:grid-cols-6 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[60vh] overflow-y-auto" data-slot-target="inventory">
              {slots.map((item, index) => (
                <InventorySlot
                  key={index}
                  item={item}
                  index={index}
                  isUnlocked={index < unlocked_slots}
                  onDragStart={(idx, node, e) => item && handleDragStart(item, 'inventory', node, e)}
                  onItemClick={() => item && handleItemClick(item)}
                  isBeingDragged={dragState?.source === 'inventory' && dragState.item.slot_position === index}
                  isDragOver={dragOver?.target === 'inventory' && dragOver.index === index}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem}
        onUse={() => {}}
        onDropOne={() => detailedItem && handleDropItem(1)}
        onDropAll={() => detailedItem && handleDropItem(detailedItem.quantity)}
        onUpdate={refreshPlayerData}
      />
      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        title="Jeter l'objet"
        description={`Êtes-vous sûr de vouloir jeter ${deleteModal.item?.items?.name} ? Cette action est irréversible.`}
        actions={[
          { label: "Jeter", onClick: () => handleDropItem(deleteModal.item!.quantity), variant: "destructive" },
          { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, item: null }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default InventoryModal;