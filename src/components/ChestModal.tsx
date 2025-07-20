import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChestItem } from "@/types";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { Box } from "lucide-react";
import { DraggableItem } from "./dnd/DraggableItem";
import { Droppable } from "./dnd/Droppable";

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  chestItems: ChestItem[];
  chestId: number;
  onChestUpdate: () => void;
}

const CHEST_SLOTS = 30; // Vous pouvez ajuster cette valeur

export function ChestModal({
  isOpen,
  onClose,
  chestItems,
  chestId,
  onChestUpdate,
}: ChestModalProps) {
  const { toast } = useToast();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const fromSlot = active.data.current?.slot;
      const toSlot = over.data.current?.slot;
      const fromContainer = active.data.current?.container;
      const toContainer = over.data.current?.container;

      if (fromContainer === "chest" && toContainer === "chest") {
        const { error } = await supabase.rpc("swap_chest_items", {
          p_chest_id: chestId,
          p_from_slot: fromSlot,
          p_to_slot: toSlot,
        });

        if (error) {
          toast({
            title: "Erreur",
            description: error.message,
            variant: "destructive",
          });
        } else {
          onChestUpdate();
        }
      }
    }
  };

  const slots = Array.from({ length: CHEST_SLOTS }, (_, i) => i);
  const itemsBySlot = chestItems.reduce((acc, item) => {
    if (item.slot_position !== null) {
      acc[item.slot_position] = item;
    }
    return acc;
  }, {} as Record<number, ChestItem>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl w-full max-h-[90vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-2 sm:p-4 flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 text-white">
            <Box className="w-6 h-6 sm:w-7 sm:h-7" />
            <DialogTitle className="text-lg sm:text-xl">Contenu du Coffre</DialogTitle>
          </div>
        </DialogHeader>
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex-grow overflow-y-auto mt-4 pr-1 sm:pr-2">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 sm:gap-2">
              {slots.map((slot) => {
                const item = itemsBySlot[slot];
                return (
                  <Droppable
                    key={slot}
                    id={`chest-slot-${slot}`}
                    data={{ slot, container: "chest" }}
                    className="relative aspect-square bg-slate-900/50 rounded-md flex items-center justify-center"
                  >
                    {item ? (
                      <DraggableItem
                        id={`chest-item-${item.id}`}
                        data={{
                          item,
                          slot,
                          container: "chest",
                        }}
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center p-1" title={item.items.name}>
                          <img
                            src={`/assets/items/${item.items.icon}`}
                            alt={item.items.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                          />
                          {item.items.stackable && item.quantity > 1 && (
                            <span className="absolute bottom-0 right-1 text-xs font-bold text-white bg-slate-800/80 px-1 rounded">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                      </DraggableItem>
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}