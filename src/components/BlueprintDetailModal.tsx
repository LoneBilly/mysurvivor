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
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
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
      <DialogContent className="max-w-2xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center">
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
          "py-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8",
          isMobile ? "overflow-y-auto no-scrollbar" : ""
        )}>
          {/* Ingredients Section */}
          <div className="flex flex-row flex-wrap justify-center items-center gap-3 sm:gap-4">
            {slots.map((slot, index) => {
              const ingredientItem = slot?.item_id ? allItems.find(item => item.id === slot.item_id) : null;
              
              return (
                <div key={index} className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-700/50 border border-slate-600 w-28 h-32 sm:w-32 sm:h-36 justify-center flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center relative">
                    {ingredientItem ? (
                      <ItemIcon iconName={getPublicIconUrl(ingredientItem.icon)} alt={ingredientItem.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Vide</div>
                    )}
                  </div>
                  {ingredientItem && (
                    <>
                      <p className="text-sm font-semibold mt-1 truncate w-full px-1">{ingredientItem.name}</p>
                      <p className="text-xs text-gray-400">x{slot?.quantity}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Arrow Separator */}
          <ArrowRight className={cn("w-8 h-8 text-white flex-shrink-0", isMobile ? "rotate-90 my-4" : "")} />

          {/* Result Item Section */}
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-700/50 border border-slate-600 w-36 h-40 sm:w-44 sm:h-48 justify-center flex-shrink-0">
            <div className="w-24 h-24 flex items-center justify-center relative">
              <ItemIcon iconName={getPublicIconUrl(resultItem.icon)} alt={resultItem.name} />
            </div>
            <p className="text-lg font-bold mt-2 truncate w-full px-1">{resultItem.name}</p>
            <p className="text-base text-gray-300">x{recipe.result_quantity}</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline" className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600">Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintDetailModal;