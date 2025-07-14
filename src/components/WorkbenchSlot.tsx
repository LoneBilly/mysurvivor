import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd';
import { useGame } from '@/context/GameContext';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';
import InventorySlot from './InventorySlot';
import { cn } from '@/lib/utils';

export function WorkbenchSlot({ slotIndex, item, workbenchId }: { slotIndex: number, item: any, workbenchId: number }) {
  const { refreshPlayerData } = useGame();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.INVENTORY_ITEM, ItemTypes.WORKBENCH_ITEM],
    drop: async (draggedItem: any, monitor) => {
      if (draggedItem.type === ItemTypes.INVENTORY_ITEM) {
        const { error } = await supabase.rpc('move_item_to_workbench', {
          p_inventory_id: draggedItem.id,
          p_workbench_id: workbenchId,
          p_quantity_to_move: draggedItem.quantity,
          p_target_slot: slotIndex,
        });
        if (error) toast.error(error.message);
        else await refreshPlayerData();
      } else if (draggedItem.type === ItemTypes.WORKBENCH_ITEM) {
        if (draggedItem.slotIndex !== slotIndex) {
          const { error } = await supabase.rpc('swap_workbench_items', {
            p_workbench_id: workbenchId,
            p_from_slot: draggedItem.slotIndex,
            p_to_slot: slotIndex,
          });
          if (error) toast.error(error.message);
          else await refreshPlayerData();
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [workbenchId, slotIndex, refreshPlayerData]);

  return (
    <div ref={drop} className={cn(
      "w-full aspect-square bg-slate-800 rounded-md border-2 border-slate-700",
      isOver && canDrop && "border-yellow-400 bg-slate-700",
      isOver && !canDrop && "border-red-500"
    )}>
      {item && (
        <InventorySlot
          item={item}
          slotIndex={slotIndex}
          itemType={ItemTypes.WORKBENCH_ITEM}
          context={{ workbenchId }}
        />
      )}
    </div>
  );
}