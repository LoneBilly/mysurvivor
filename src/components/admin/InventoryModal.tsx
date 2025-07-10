import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function SortableItem({ id, item }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="aspect-square border rounded-md flex flex-col items-center justify-center p-2 text-center bg-white dark:bg-gray-900 relative cursor-grab">
      {item ? (
        <>
          <img src={item.items.icon} alt={item.items.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          <p className="text-xs sm:text-sm font-semibold mt-1 truncate">{item.items.name}</p>
          <p className="text-xs text-gray-500 absolute top-1 right-1 bg-gray-200 rounded-full px-1.5 py-0.5">{item.quantity}</p>
        </>
      ) : (
        <span className="text-gray-400 text-xs">Vide</span>
      )}
    </div>
  );
}

export function InventoryModal({ isOpen, onClose, inventory, player, unlockedSlots, onInventoryChange }) {
  const inventorySlots = Array.from({ length: unlockedSlots }, (_, i) => {
    return inventory.find(item => item.slot_position === i) || { slot_position: i, empty: true };
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const fromSlot = active.id as number;
      const toSlot = over.id as number;
      
      const { error } = await supabase.rpc('swap_inventory_items', {
        p_from_slot: fromSlot,
        p_to_slot: toSlot
      });

      if (error) {
        toast.error("Erreur lors du déplacement de l'objet: " + error.message);
      } else {
        toast.success("Objet déplacé.");
        onInventoryChange();
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Inventaire de {player.username}</DialogTitle>
          <DialogDescription>{unlockedSlots} slots débloqués. Vous pouvez glisser-déposer les objets pour les réorganiser.</DialogDescription>
        </DialogHeader>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={inventorySlots.map(i => i.slot_position)}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {inventorySlots.map((item) => (
                <SortableItem key={item.slot_position} id={item.slot_position} item={!item.empty ? item : null} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}