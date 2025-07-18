import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { CraftingRecipe, Item, InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";

interface BlueprintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CraftingRecipe | null;
}

const BlueprintDetailModal = ({ isOpen, onClose, recipe }: BlueprintDetailModalProps) => {
  const { items: allItems } = useGame();

  if (!recipe) return null;

  const getRecipeSlotItem = (itemId: number | null, quantity: number | null, slotPosition: number): InventoryItem | null => {
    if (!itemId || !quantity || quantity <= 0) return null;
    const itemDetails = allItems.find(item => item.id === itemId);
    if (!itemDetails) return null;

    return {
      id: itemId, // Using item ID as a unique key for recipe slot
      item_id: itemId,
      quantity: quantity,
      slot_position: slotPosition,
      items: {
        name: itemDetails.name,
        description: itemDetails.description,
        icon: itemDetails.icon,
        type: itemDetails.type,
        use_action_text: itemDetails.use_action_text,
        stackable: itemDetails.stackable,
      },
    };
  };

  const resultItem = allItems.find(item => item.id === recipe.result_item_id);
  const slots = [
    { slotNum: 0, itemId: recipe.slot1_item_id, quantity: recipe.slot1_quantity },
    { slotNum: 1, itemId: recipe.slot2_item_id, quantity: recipe.slot2_quantity },
    { slotNum: 2, itemId: recipe.slot3_item_id, quantity: recipe.slot3_quantity },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Recette: {resultItem?.name || 'Objet Inconnu'}
          </DialogTitle>
          <DialogDescription>
            Détails de la fabrication.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            {slots.map((slot, index) => (
              <div key={index} className="w-16 h-16">
                <InventorySlot
                  item={getRecipeSlotItem(slot.itemId, slot.quantity, slot.slotNum)}
                  index={slot.slotNum}
                  isUnlocked={true}
                  onDragStart={() => {}}
                  onItemClick={() => {}}
                  isBeingDragged={false}
                  isDragOver={false}
                  isLocked={true}
                />
              </div>
            ))}
          </div>
          <ArrowRight className="w-8 h-8 text-gray-400 flex-shrink-0" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-24 h-24 relative">
              <InventorySlot
                item={getRecipeSlotItem(resultItem?.id || null, recipe.result_quantity, -1)}
                index={-1}
                isUnlocked={true}
                onDragStart={() => {}}
                onItemClick={() => {}}
                isBeingDragged={false}
                isDragOver={false}
                isLocked={true}
              />
            </div>
            <span className="font-bold text-white text-center mt-1 text-lg">{resultItem?.name || 'Objet final'}</span>
            <span className="text-sm text-gray-400">x{recipe.result_quantity}</span>
          </div>
          <div className="text-sm text-gray-400 mt-4">
            Temps de fabrication: <span className="font-bold">{recipe.craft_time_seconds} secondes</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintDetailModal;