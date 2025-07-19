import { useState, useRef, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect';
import { InventoryItem, Equipment } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { getPublicIconUrl } from '@/utils/imageUrls';
import { Backpack, Shield, Sword, Footprints, Car, Trash2, GitCommitHorizontal, MoveUp, MoveDown, X } from 'lucide-react';
import ItemTooltip from './ItemTooltip';
import ActionModal from './ActionModal';

const ItemTypes = {
  INVENTORY_ITEM: 'inventoryItem',
  EQUIPMENT_ITEM: 'equipmentItem',
};

interface DraggableItemProps {
  item: InventoryItem;
  onDrop: (item: InventoryItem, targetSlot: number | string) => void;
}

const DraggableItem = ({ item }: { item: InventoryItem }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: item.slot_position !== null ? ItemTypes.INVENTORY_ITEM : ItemTypes.EQUIPMENT_ITEM,
    item: { ...item },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  if (!item.items) return null;

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative"
    >
      <ItemTooltip item={item}>
        <div className="relative w-full h-full flex items-center justify-center">
          <img src={getPublicIconUrl(item.items.icon)} alt={item.items.name} className="max-w-full max-h-full object-contain p-1" />
          {item.quantity > 1 && (
            <span className="absolute bottom-0 right-0 text-xs font-bold bg-slate-800/80 text-white rounded-full px-1.5 py-0.5 leading-none">
              {item.quantity}
            </span>
          )}
        </div>
      </ItemTooltip>
    </div>
  );
};

interface InventorySlotProps {
  slot: number;
  item: InventoryItem | undefined;
  onDrop: (item: InventoryItem, targetSlot: number) => void;
}

const InventorySlot = ({ slot, item, onDrop }: InventorySlotProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.INVENTORY_ITEM, ItemTypes.EQUIPMENT_ITEM],
    drop: (draggedItem: InventoryItem) => onDrop(draggedItem, slot),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`aspect-square rounded-lg border ${isOver ? 'border-yellow-400 bg-yellow-400/20' : 'border-slate-700'} bg-slate-800/50 flex items-center justify-center transition-colors duration-200`}
    >
      {item && <DraggableItem item={item} />}
    </div>
  );
};

interface EquipmentSlotProps {
  type: keyof Equipment;
  item: InventoryItem | null;
  onDrop: (item: InventoryItem, targetSlot: string) => void;
}

const EquipmentSlot = ({ type, item, onDrop }: EquipmentSlotProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.INVENTORY_ITEM,
    drop: (draggedItem: InventoryItem) => onDrop(draggedItem, type),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const icons = {
    backpack: <Backpack className="w-8 h-8 text-slate-600" />,
    armor: <Shield className="w-8 h-8 text-slate-600" />,
    weapon: <Sword className="w-8 h-8 text-slate-600" />,
    shoes: <Footprints className="w-8 h-8 text-slate-600" />,
    vehicle: <Car className="w-8 h-8 text-slate-600" />,
  };

  return (
    <div
      ref={drop}
      className={`w-full aspect-square rounded-lg border-2 ${isOver ? 'border-yellow-400 bg-yellow-400/20' : 'border-slate-700'} bg-slate-800/50 flex items-center justify-center transition-colors duration-200`}
    >
      {item ? <DraggableItem item={item} /> : icons[type]}
    </div>
  );
};

const InventoryModal = () => {
  const { isInventoryOpen, closeInventory, playerData, refreshPlayerData } = useGame();
  const gridRef = useRef<HTMLDivElement>(null);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [itemToDrop, setItemToDrop] = useState<InventoryItem | null>(null);
  const [dropQuantity, setDropQuantity] = useState(1);

  useEffect(() => {
    if (itemToDrop) {
      setDropQuantity(itemToDrop.quantity);
    }
  }, [itemToDrop]);

  if (!playerData) return null;

  const { inventory, equipment, playerState } = playerData;
  const inventoryItems = inventory.filter(item => item.slot_position !== null);
  const unlockedSlots = playerState.unlocked_slots;

  const handleDrop = async (draggedItem: InventoryItem, target: number | string) => {
    if (typeof target === 'number') { // Dropped on inventory slot
      if (draggedItem.slot_position === target) return; // Dropped on itself

      if (draggedItem.slot_position !== null) { // inventory -> inventory
        const { error } = await supabase.rpc('swap_inventory_items', { p_from_slot: draggedItem.slot_position, p_to_slot: target });
        if (error) showError(error.message);
      } else { // equipment -> inventory
        const { error } = await supabase.rpc('unequip_item_to_slot', { p_inventory_id: draggedItem.id, p_target_slot: target });
        if (error) showError(error.message);
      }
    } else if (typeof target === 'string') { // Dropped on equipment slot
      if (draggedItem.slot_position === null) return; // equipment -> equipment (not allowed)
      const { error } = await supabase.rpc('equip_item', { p_inventory_id: draggedItem.id, p_slot_type: target });
      if (error) showError(error.message);
    }
    await refreshPlayerData();
  };

  const handleDropOnTrash = async (item: InventoryItem) => {
    setItemToDrop(item);
    setIsDropModalOpen(true);
  };

  const confirmDrop = async () => {
    if (!itemToDrop) return;
    const { error } = await supabase.rpc('split_inventory_item', { p_inventory_id: itemToDrop.id, p_split_quantity: itemToDrop.quantity - dropQuantity });
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${dropQuantity} ${itemToDrop.items?.name}(s) jeté(s).`);
    }
    setIsDropModalOpen(false);
    setItemToDrop(null);
    await refreshPlayerData();
  };

  const slots = Array.from({ length: unlockedSlots }, (_, i) => i);

  const backend = isMobile ? TouchBackend : HTML5Backend;

  return (
    <>
      <Dialog open={isInventoryOpen} onOpenChange={closeInventory}>
        <DialogContent className="max-w-4xl bg-slate-900/80 backdrop-blur-lg text-white border-slate-700 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-mono tracking-wider uppercase">Inventaire</DialogTitle>
            <DialogDescription className="sr-only">Gérez votre inventaire et votre équipement.</DialogDescription>
          </DialogHeader>
          <DndProvider backend={backend} options={{ enableMouseEvents: true }}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 p-1">
              <div>
                <h3 className="font-bold text-lg mb-2 text-slate-300">Contenu du sac</h3>
                <div
                  ref={gridRef}
                  className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-[50vh] overflow-y-auto"
                >
                  {slots.map(slotIndex => {
                    const itemInSlot = inventoryItems.find(i => i.slot_position === slotIndex);
                    return <InventorySlot key={slotIndex} slot={slotIndex} item={itemInSlot} onDrop={handleDrop} />;
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-lg mb-2 text-slate-300">Équipement</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(equipment) as Array<keyof Equipment>).map(type => (
                    <EquipmentSlot key={type} type={type} item={equipment[type]} onDrop={handleDrop} />
                  ))}
                </div>
                <TrashDropZone onDrop={handleDropOnTrash} />
              </div>
            </div>
          </DndProvider>
        </DialogContent>
      </Dialog>
      <ActionModal
        isOpen={isDropModalOpen}
        onClose={() => setIsDropModalOpen(false)}
        title={`Jeter ${itemToDrop?.items?.name}`}
        description={
          <div>
            <p>Combien voulez-vous en jeter ?</p>
            <div className="flex items-center gap-2 my-4">
              <Button onClick={() => setDropQuantity(1)} variant="outline">1</Button>
              <Input 
                type="range" 
                min="1" 
                max={itemToDrop?.quantity} 
                value={dropQuantity} 
                onChange={(e) => setDropQuantity(parseInt(e.target.value))}
                className="w-full"
              />
              <Button onClick={() => setDropQuantity(itemToDrop?.quantity || 1)} variant="outline">Max</Button>
            </div>
            <p className="text-center font-bold text-lg">{dropQuantity}</p>
          </div>
        }
        actions={[
          { label: `Jeter ${dropQuantity}`, onClick: confirmDrop, variant: "destructive" },
          { label: "Annuler", onClick: () => setIsDropModalOpen(false), variant: "secondary" },
        ]}
      />
    </>
  );
};

const TrashDropZone = ({ onDrop }: { onDrop: (item: InventoryItem) => void }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.INVENTORY_ITEM, ItemTypes.EQUIPMENT_ITEM],
    drop: (item: InventoryItem) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div ref={drop} className={`mt-auto p-4 rounded-lg border-2 ${isOver ? 'border-red-500 bg-red-500/20' : 'border-dashed border-slate-700'} flex flex-col items-center justify-center gap-2 text-slate-500 transition-colors`}>
      <Trash2 className="w-8 h-8" />
      <span>Jeter l'objet</span>
    </div>
  );
};

export default InventoryModal;