import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { CraftingRecipe, Item, InventoryItem } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import ItemIcon from './ItemIcon'; // Keep for general icon display if needed, though InventorySlot uses it internally
import InventorySlot from './InventorySlot'; // Import InventorySlot

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LearnedBlueprint {
  recipe_id: number;
}

const BlueprintModal = ({ isOpen, onClose }: BlueprintModalProps) => {
  const { items: allItems, getIconUrl } = useGame();
  const [learnedRecipes, setLearnedRecipes] = useState<CraftingRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLearnedBlueprints = useCallback(async () => {
    setLoading(true);
    try {
      const { data: learnedData, error: learnedError } = await supabase
        .from('learned_blueprints')
        .select('recipe_id');
      
      if (learnedError) throw learnedError;

      const recipeIds = (learnedData as LearnedBlueprint[]).map(b => b.recipe_id);

      if (recipeIds.length === 0) {
        setLearnedRecipes([]);
        setLoading(false);
        return;
      }

      const { data: recipesData, error: recipesError } = await supabase
        .from('crafting_recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipesError) throw recipesError;

      setLearnedRecipes(recipesData || []);

    } catch (error: any) {
      showError("Impossible de charger vos blueprints.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLearnedBlueprints();
    }
  }, [isOpen, fetchLearnedBlueprints]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <BookOpen className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Blueprints</DialogTitle>
          <DialogDescription>Recettes que vous avez apprises.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : learnedRecipes.length > 0 ? (
            learnedRecipes.map(recipe => {
              const resultItem = allItems.find(item => item.id === recipe.result_item_id);
              const slots = [
                { slotNum: 0, itemId: recipe.slot1_item_id, quantity: recipe.slot1_quantity },
                { slotNum: 1, itemId: recipe.slot2_item_id, quantity: recipe.slot2_quantity },
                { slotNum: 2, itemId: recipe.slot3_item_id, quantity: recipe.slot3_quantity },
              ];

              return (
                <div key={recipe.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {/* Ingredients */}
                    <div className="flex items-center gap-1">
                      {slots.map((slot, index) => (
                        <div key={index} className="w-16 h-16"> {/* Each slot container */}
                          <InventorySlot
                            item={getRecipeSlotItem(slot.itemId, slot.quantity, slot.slotNum)}
                            index={slot.slotNum}
                            isUnlocked={true}
                            onDragStart={() => {}} // No drag for display
                            onItemClick={() => {}} // No click action for display
                            isBeingDragged={false}
                            isDragOver={false}
                            isLocked={true} // Make it non-interactive
                          />
                        </div>
                      ))}
                    </div>

                    <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0 mx-2 sm:mx-4" />

                    {/* Result Item */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-20 h-20 relative"> {/* Larger for result */}
                        <InventorySlot
                          item={getRecipeSlotItem(resultItem?.id || null, recipe.result_quantity, -1)} // Use -1 for slot_position as it's not a real slot
                          index={-1}
                          isUnlocked={true}
                          onDragStart={() => {}}
                          onItemClick={() => {}}
                          isBeingDragged={false}
                          isDragOver={false}
                          isLocked={true}
                        />
                      </div>
                      <span className="font-bold text-white text-center mt-1">{resultItem?.name || 'Objet final'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-400 py-10">Vous n'avez appris aucun blueprint.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintModal;