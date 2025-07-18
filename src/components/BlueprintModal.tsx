import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { BookOpen, Loader2 } from 'lucide-react';
import { Item, CraftingRecipe } from '@/types/game';
import { getPublicIconUrl } from '@/utils/imageUrls';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlueprintModal = ({ isOpen, onClose }: BlueprintModalProps) => {
  const [learnedBlueprints, setLearnedBlueprints] = useState<CraftingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]); // Need to fetch all items

  useEffect(() => {
    const fetchBlueprints = async () => {
      setLoading(true);
      const { data: learnedData, error: learnedError } = await supabase
        .from('learned_blueprints')
        .select('recipe_id');

      if (learnedError) {
        showError(learnedError.message);
        setLoading(false);
        return;
      }

      const recipeIds = learnedData.map(bp => bp.recipe_id);

      if (recipeIds.length > 0) {
        const { data: recipesData, error: recipesError } = await supabase
          .from('crafting_recipes')
          .select(`
            *,
            result_item:items!crafting_recipes_result_item_id_fkey(name, icon)
          `)
          .in('id', recipeIds);

        if (recipesError) {
          showError(recipesError.message);
          setLoading(false);
          return;
        }
        setLearnedBlueprints(recipesData || []);
      } else {
        setLearnedBlueprints([]);
      }

      // Fetch all items for ingredient display
      const { data: allItems, error: itemsError } = await supabase.from('items').select('*');
      if (itemsError) {
        console.error("Error fetching all items:", itemsError);
      } else {
        setItems(allItems || []);
      }

      setLoading(false);
    };

    if (isOpen) {
      fetchBlueprints();
    }
  }, [isOpen]);

  const getItemName = (itemId: number | null) => {
    if (!itemId) return 'N/A';
    const item = items.find(i => i.id === itemId);
    return item ? item.name : 'Objet inconnu';
  };

  const getItemIcon = (itemId: number | null) => {
    if (!itemId) return null;
    const item = items.find(i => i.id === itemId);
    return item?.icon ? getPublicIconUrl(item.icon) : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <BookOpen className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Blueprints</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            {learnedBlueprints.length === 0 ? (
              <p className="text-center text-gray-400">Vous n'avez appris aucun blueprint pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {learnedBlueprints.map(recipe => (
                  <div key={recipe.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={getPublicIconUrl(recipe.result_item.icon || '')} alt={recipe.result_item.name} className="w-12 h-12 object-contain" />
                      <div>
                        <h3 className="font-semibold text-lg">{recipe.result_item.name}</h3>
                        <p className="text-sm text-gray-400">Quantité: {recipe.result_quantity}</p>
                        <p className="text-sm text-gray-400">Temps de fabrication: {recipe.craft_time_seconds}s</p>
                        <div className="mt-2 text-sm text-gray-300">
                          <p className="font-medium">Ingrédients:</p>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {[1, 2, 3].map(slot => {
                              const itemId = recipe[`slot${slot}_item_id` as keyof CraftingRecipe];
                              const quantity = recipe[`slot${slot}_quantity` as keyof CraftingRecipe];
                              if (itemId && quantity) {
                                return (
                                  <div key={slot} className="flex items-center gap-1 bg-white/10 p-2 rounded-md">
                                    <img src={getItemIcon(itemId) || ''} alt={getItemName(itemId)} className="w-6 h-6 object-contain" />
                                    <span>{getItemName(itemId)} x{quantity}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintModal;