import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CraftingRecipe } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Wrench, ArrowRight } from 'lucide-react';
import ItemIcon from '@/components/ItemIcon';
import { getPublicIconUrl } from '@/utils/imageUrls';
import { useIsMobile } from '@/hooks/use-mobile';
import RecipeItemSlot from './RecipeItemSlot';

interface BlueprintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CraftingRecipe | null;
}

const BlueprintDetailModal = ({ isOpen, onClose, recipe }: BlueprintDetailModalProps) => {
  const { items: allItems } = useGame();
  const isMobile = useIsMobile();

  const resultItem = useMemo(() => {
    return allItems.find(item => item.id === recipe?.result_item_id);
  }, [allItems, recipe]);

  const slots = useMemo(() => {
    if (!recipe) return [];
    // Ensure all 3 slots are represented, even if empty, to maintain layout
    const s: ({ item_id: number | null; quantity: number | null; } | null)[] = [null, null, null];
    
    if (recipe.slot1_item_id) s[0] = { item_id: recipe.slot1_item_id, quantity: recipe.slot1_quantity };
    if (recipe.slot2_item_id) s[1] = { item_id: recipe.slot2_item_id, quantity: recipe.slot2_quantity };
    if (recipe.slot3_item_id) s[2] = { item_id: recipe.slot3_item_id, quantity: recipe.slot3_quantity };
    
    return s;
  }, [recipe]);

  if (!recipe || !resultItem) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-lg overflow-y-auto bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Détail du Blueprint</DialogTitle>
            <DialogDescription>Chargement des détails du blueprint...</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-lg overflow-y-auto bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <Wrench className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Recette de {resultItem.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Temps de fabrication: {recipe.craft_time_seconds} secondes
          </DialogDescription>
        </DialogHeader>

        {/* Main content area for recipe display */}
        <div className={cn(
          "flex flex-col items-center justify-center gap-4 sm:gap-6"
        )}>
          {/* Ingredients Section */}
          <div className="flex flex-row flex-nowrap justify-center gap-3 sm:gap-4 w-full overflow-x-auto pb-2 no-scrollbar">
            {slots.map((slot, index) => {
              const ingredientItem = slot?.item_id ? allItems.find(item => item.id === slot.item_id) : null;
              
              return (
                <RecipeItemSlot
                  key={index}
                  item={ingredientItem}
                  quantity={slot?.quantity}
                  isEmpty={!ingredientItem}
                  slotNumber={index + 1} // Pass the slot number
                />
              );
            })}
          </div>

          {/* Arrow Separator */}
          <ArrowRight className="w-8 h-8 text-white flex-shrink-0 rotate-90 my-2" />

          {/* Result Item Section */}
          <RecipeItemSlot
            item={resultItem}
            quantity={recipe.result_quantity}
            isResult={true}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline" className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600">Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintDetailModal;