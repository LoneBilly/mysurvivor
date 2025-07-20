import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGame } from "@/contexts/GameContext";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { supabase } from "@/integrations/supabase/client";
import { EquipmentSlotType, InventoryItem } from "@/types/game";
import { cn } from "@/lib/utils";
import { CircleDashed } from "lucide-react";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ItemTypes = {
  ITEM: 'item',
};

const DraggableItem = ({ item, type, slot, children }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ITEM,
    item: { ...item, sourceType: type, sourceSlot: slot },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} className={cn("cursor-grab", isDragging && "opacity-50")}>
      {children}
    </div>
  );
};

const DropTarget = ({ onDrop, type, slot, slotType, children, className }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ITEM,
    drop: (item) => onDrop(item, { type, slot, slotType }),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div ref={drop} className={cn(className, isOver && "bg-slate-600/50 ring-2 ring-yellow-400")}>
      {children}
    </div>
  );
};

const InventorySlot = ({ item, slot, onDrop }) => {
  return (
    <DropTarget onDrop={onDrop} type="inventory" slot={slot} className="w-16 h-16 bg-slate-900/70 rounded-md border border-slate-700 flex items-center justify-center">
      {item && (
        <DraggableItem item={item} type="inventory" slot={item.slot_position}>
          <div className="relative">
            <img src={item.items.icon} alt={item.items.name} className="w-10 h-10 object-contain" />
            {item.quantity > 1 && (
              <span className="absolute -bottom-2 -right-2 bg-slate-800 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border border-slate-600">
                {item.quantity}
              </span>
            )}
          </div>
        </DraggableItem>
      )}
    </DropTarget>
  );
};

const EquipmentSlot = ({ item, slotType, onDrop, icon: Icon, label }) => {
  return (
    <DropTarget onDrop={onDrop} type="equipment" slotType={slotType} className="w-16 h-16 bg-slate-900/70 rounded-md border border-slate-700 flex items-center justify-center">
      {item ? (
        <DraggableItem item={item} type="equipment" slot={slotType}>
          <img src={item.items.icon} alt={item.items.name} className="w-10 h-10 object-contain" />
        </DraggableItem>
      ) : (
        <Icon className="w-8 h-8 text-slate-500" />
      )}
    </DropTarget>
  );
};

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { playerData, isProcessing, performAction } = useGame();

  if (!playerData) return null;

  const handleDropItem = async (source, destination) => {
    let rpcName = '';
    let params: any = {};

    if (source.sourceType === 'inventory' && destination.type === 'inventory') {
      rpcName = 'swap_inventory_items';
      params = { p_from_slot: source.sourceSlot, p_to_slot: destination.slot };
    } else if (source.sourceType === 'inventory' && destination.type === 'equipment') {
      rpcName = 'equip_item';
      params = { p_inventory_id: source.id, p_slot_type: destination.slotType };
    } else if (source.sourceType === 'equipment' && destination.type === 'inventory') {
      rpcName = 'unequip_item_to_slot';
      params = { p_inventory_id: source.id, p_target_slot: destination.slot };
    } else if (source.sourceType === 'equipment' && destination.type === 'equipment') {
        // Swapping equipped items - requires a more complex function or client-side logic
        // For now, we can unequip and then equip.
        console.log("Swapping equipment is not directly supported yet.");
        return;
    }

    if (!rpcName) return;
    await performAction(() => supabase.rpc(rpcName, params));
  };

  const inventoryMap = new Map<number, InventoryItem>();
  playerData.inventory.forEach(item => {
    if (item.slot_position !== null) {
      inventoryMap.set(item.slot_position, item);
    }
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-2xl font-bold">Inventaire</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                <CircleDashed className="w-10 h-10 animate-spin text-yellow-400" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center gap-4">
                <h3 className="font-bold text-lg text-slate-300">Équipement</h3>
                <div className="grid grid-cols-2 gap-4">
                    <EquipmentSlot item={playerData.equipment.weapon} slotType="weapon" onDrop={handleDropItem} icon={CircleDashed} label="Arme" />
                    <EquipmentSlot item={playerData.equipment.armor} slotType="armor" onDrop={handleDropItem} icon={CircleDashed} label="Armure" />
                    <EquipmentSlot item={playerData.equipment.backpack} slotType="backpack" onDrop={handleDropItem} icon={CircleDashed} label="Sac" />
                    <EquipmentSlot item={playerData.equipment.shoes} slotType="shoes" onDrop={handleDropItem} icon={CircleDashed} label="Chaussures" />
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-bold text-lg text-slate-300 mb-4 text-center">Contenu</h3>
                <div ref={null} className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[50vh] overflow-y-auto">
                  {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, i) => (
                    <InventorySlot key={i} item={inventoryMap.get(i)} slot={i} onDrop={handleDropItem} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
};

export default InventoryModal;