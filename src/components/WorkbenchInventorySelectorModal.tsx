import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import ItemIcon from './ItemIcon';
import { useGame } from '@/contexts/GameContext';
import { InventoryItem, WorkbenchItem } from '@/types/game';

interface WorkbenchInventorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbenchId: number;
  workbenchItems: WorkbenchItem[];
  onItemsMoved: () => void;
}

const WorkbenchInventorySelectorModal = ({ isOpen, onClose, workbenchId, workbenchItems, onItemsMoved }: WorkbenchInventorySelectorModalProps) => {
  const { playerData, getIconUrl, refreshPlayerData } = useGame();
  const [loading, setLoading] = useState(false);

  const handleMoveToWorkbench = async (item: InventoryItem) => {
    setLoading(true);
    // We need to find an available slot in the workbench (0, 1, 2)
    const usedSlots = workbenchItems.map(i => i.slot_position);
    let targetSlot = -1;
    for (let i = 0; i < 3; i++) {
      if (!usedSlots.includes(i)) {
        targetSlot = i;
        break;
      }
    }

    if (targetSlot === -1) {
      showError("L'établi est plein.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.rpc('move_item_to_workbench', {
      p_inventory_id: item.id,
      p_workbench_id: workbenchId,
      p_quantity_to_move: item.quantity,
      p_target_slot: targetSlot
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet déplacé vers l'établi.");
      await refreshPlayerData();
      onItemsMoved();
    }
    setLoading(false);
  };

  const handleMoveToInventory = async (item: WorkbenchItem) => {
    setLoading(true);
    const { error } = await supabase.rpc('move_item_from_workbench_to_inventory', {
      p_workbench_item_id: item.id,
      p_quantity_to_move: item.quantity
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet déplacé vers l'inventaire.");
      await refreshPlayerData();
      onItemsMoved();
    }
    setLoading(false);
  };

  const renderGrid = (items: (InventoryItem | WorkbenchItem)[], type: 'inventory' | 'workbench') => {
    return (
      <div className="py-4 max-h-[60vh] overflow-y-auto grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {items.length > 0 ? (
          items.map(item => (
            <button
              key={`${type}-${item.id}`}
              onClick={() => type === 'inventory' ? handleMoveToWorkbench(item as InventoryItem) : handleMoveToInventory(item as WorkbenchItem)}
              className="aspect-square bg-slate-700/50 rounded-md flex items-center justify-center relative border border-slate-600 hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              <ItemIcon iconName={getIconUrl(item.items.icon)} alt={item.items.name} />
              {item.quantity > 1 && (
                <span className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                  {item.quantity}
                </span>
              )}
            </button>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-400">Vide</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Transférer des objets</DialogTitle>
          <DialogDescription>Déplacez les objets entre votre inventaire et l'établi.</DialogDescription>
        </DialogHeader>
        {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"><Loader2 className="w-8 h-8 animate-spin" /></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <h3 className="font-bold text-lg text-center mb-2">Inventaire</h3>
            {renderGrid(playerData.inventory, 'inventory')}
          </div>
          <div>
            <h3 className="font-bold text-lg text-center mb-2">Établi</h3>
            {renderGrid(workbenchItems, 'workbench')}
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchInventorySelectorModal;