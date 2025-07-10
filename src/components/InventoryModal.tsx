import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Lock, Backpack, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ItemIcon from "./ItemIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InventoryItem {
  id: number; // ID de l'entrée dans la table inventories
  quantity: number;
  slot_position: number | null;
  items: {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    signedIconUrl?: string;
  } | null;
}

const TOTAL_SLOTS = 50;
const UNLOCKED_SLOTS = 5;

// --- Composant Slot ---
interface InventorySlotProps {
  item?: InventoryItem | null;
  index: number;
  isLocked: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging: boolean;
}

const InventorySlot = ({ item, index, isLocked, onDragStart, onDrop, onDragOver, isDragging }: InventorySlotProps) => {
  if (isLocked) {
    return (
      <div className="relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200 bg-black/20 border-white/10 cursor-not-allowed">
        <Lock className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  if (!item || !item.items) {
    return (
      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
        className="relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200 bg-white/10 border-white/20"
      />
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDrop={(e) => onDrop(e, index)}
            onDragOver={onDragOver}
            className={cn(
              "relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing",
              "bg-sky-400/20 border-sky-400/40",
              isDragging && "opacity-30"
            )}
          >
            <ItemIcon iconName={item.items.signedIconUrl || item.items.icon} alt={item.items.name} />
            {item.quantity > 1 && (
              <span className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                {item.quantity}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900 text-white border-gray-700">
          <p className="font-bold">{item.items.name}</p>
          {item.items.description && <p className="text-sm text-gray-400">{item.items.description}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// --- Composant Modal Principal ---
const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inventory, setInventory] = useState<(InventoryItem | null)[]>(Array(UNLOCKED_SLOTS).fill(null));

  const fetchAndRepairInventory = async () => {
    if (!user) return [];
    
    const { data: inventoryData, error } = await supabase
      .from('inventories')
      .select(`
        id,
        quantity,
        slot_position,
        items ( id, name, description, icon )
      `)
      .eq('player_id', user.id);

    if (error) {
      console.error("Error fetching inventory:", error);
      throw new Error("Failed to fetch inventory");
    }

    const itemsWithSignedUrls = await Promise.all(
      (inventoryData as InventoryItem[]).map(async (item) => {
        if (item.items && item.items.icon && item.items.icon.includes('.')) {
          try {
            const { data, error: funcError } = await supabase.functions.invoke('get-item-icon-url', {
              body: { itemName: item.items.icon },
            });
            if (funcError) throw funcError;
            return { ...item, items: { ...item.items, signedIconUrl: data.signedUrl } };
          } catch (e) {
            console.error(`Failed to get signed URL for ${item.items.icon}`, e);
            return item;
          }
        }
        return item;
      })
    );
    
    const filledInventory = Array(UNLOCKED_SLOTS).fill(null);
    const unslottedItems: InventoryItem[] = [];
    const updatesToPersist: { id: number; slot_position: number }[] = [];

    itemsWithSignedUrls.forEach((item) => {
      const pos = item.slot_position;
      if (pos !== null && pos >= 0 && pos < UNLOCKED_SLOTS && !filledInventory[pos]) {
        filledInventory[pos] = item;
      } else {
        unslottedItems.push(item);
      }
    });

    unslottedItems.forEach((item) => {
      const emptySlotIndex = filledInventory.findIndex(slot => slot === null);
      if (emptySlotIndex !== -1) {
        filledInventory[emptySlotIndex] = item;
        updatesToPersist.push({ id: item.id, slot_position: emptySlotIndex });
      }
    });

    if (updatesToPersist.length > 0) {
      console.log("Repairing inventory slots...", updatesToPersist);
      const { error: updateError } = await supabase.from('inventories').upsert(updatesToPersist);
      if (updateError) {
        console.error("Failed to repair inventory slots:", updateError);
      } else {
        showSuccess("Inventaire corrigé et synchronisé.");
      }
    }
    
    return filledInventory;
  };

  const { isLoading } = useQuery({
    queryKey: ['inventory', user?.id],
    queryFn: fetchAndRepairInventory,
    enabled: !!user && isOpen,
    onSuccess: (data) => {
      setInventory(data);
    },
    refetchOnWindowFocus: false,
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (draggedIndex === targetIndex) return;

    const newInventory = [...inventory];
    const draggedItem = newInventory[draggedIndex];
    const targetItem = newInventory[targetIndex];

    newInventory[draggedIndex] = targetItem;
    newInventory[targetIndex] = draggedItem;
    
    setInventory(newInventory);

    const updates = [];
    if (draggedItem) {
      updates.push({ id: draggedItem.id, slot_position: targetIndex });
    }
    if (targetItem) {
      updates.push({ id: targetItem.id, slot_position: draggedIndex });
    }

    if (updates.length > 0) {
      const { error } = await supabase.from('inventories').upsert(updates);
      if (error) {
        showError("Erreur de mise à jour de l'inventaire.");
        console.error(error);
        queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
      } else {
        queryClient.setQueryData(['inventory', user?.id], newInventory);
      }
    }
  };

  const renderSlots = () => {
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center col-span-full row-span-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    const slots = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const isLocked = i >= UNLOCKED_SLOTS;
      const item = isLocked ? null : inventory[i];
      slots.push(
        <InventorySlot
          key={i}
          index={i}
          item={item}
          isLocked={isLocked}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          isDragging={false}
        />
      );
    }
    return slots;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full bg-gray-900/50 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <Package className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Inventaire
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Gérez vos objets et ressources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 max-h-[60vh]">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/20">
              <Backpack className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-xs text-gray-400 font-mono">Sac à dos</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 h-full">
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {renderSlots()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;