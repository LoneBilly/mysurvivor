import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import InventorySlot from '@/components/InventorySlot';
import { DraggableWorkbenchSlot, ItemTypes, DraggableItem } from './DraggableWorkbenchSlot';
import { useToast } from "@/components/ui/use-toast";

// NOTE: Ces types sont des suppositions basées sur votre schéma de base de données.
interface Workbench {
  id: number;
}
interface WorkbenchItem {
  id: number;
  slot_position: number;
}

interface WorkbenchModalProps {
  workbench: Workbench;
  workbenchItems: WorkbenchItem[];
  refetchData: () => void;
}

// NOTE: Comme je n'ai pas le code complet de votre modale, je me concentre sur la partie
// que vous avez montrée. J'ai créé ce composant en supposant qu'il reçoit les
// `workbenchItems` et une fonction pour rafraîchir les données.
export function WorkbenchModal({ workbench, workbenchItems, refetchData }: WorkbenchModalProps) {
  const { toast } = useToast();

  const ingredientSlots = React.useMemo(() => {
    const slots: (WorkbenchItem | null)[] = Array(3).fill(null);
    if (workbenchItems) {
      workbenchItems.forEach(item => {
        if (item.slot_position >= 0 && item.slot_position < 3) {
          slots[item.slot_position] = item;
        }
      });
    }
    return slots;
  }, [workbenchItems]);

  const handleDropItem = async (draggedItem: DraggableItem, toSlot: number) => {
    if (!workbench || draggedItem.type !== ItemTypes.WORKBENCH_SLOT) return;

    const { error } = await supabase.rpc('swap_workbench_items', {
      p_workbench_id: workbench.id,
      p_from_slot: draggedItem.slot,
      p_to_slot: toSlot,
    });

    if (error) {
      console.error('Erreur lors de l''échange:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'échanger les objets.",
        variant: "destructive",
      });
    } else {
      refetchData();
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">Ingrédients</p>
      <div className="grid grid-cols-3 gap-1">
        {ingredientSlots.map((item, index) => (
          <div key={item?.id || `slot-${index}`} className="w-12 h-12">
            <DraggableWorkbenchSlot
              item={item}
              slot={index}
              onDropItem={handleDropItem}
            >
              {/* Je suppose que InventorySlot existe et affiche un objet */}
              <InventorySlot item={item} />
            </DraggableWorkbenchSlot>
          </div>
        ))}
      </div>
    </div>
  );
}