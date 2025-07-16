import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { CraftingRecipe, Item } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import ItemIcon from './ItemIcon';

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

  const getIngredientName = (id: number | null) => {
    if (!id) return '';
    return allItems.find(item => item.id === id)?.name || 'Objet inconnu';
  };

  const getIngredientIcon = (id: number | null) => {
    if (!id) return null;
    const item = allItems.find(item => item.id === id);
    return getIconUrl(item?.icon || null) || item?.icon || null;
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
              const ingredients = [
                { id: recipe.slot1_item_id, quantity: recipe.slot1_quantity },
                { id: recipe.slot2_item_id, quantity: recipe.slot2_quantity },
                { id: recipe.slot3_item_id, quantity: recipe.slot3_quantity },
              ].filter(ing => ing.id !== null);

              return (
                <div key={recipe.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      {ingredients.map((ing, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 relative"><ItemIcon iconName={getIngredientIcon(ing.id)} alt="" /></div>
                          <span>{getIngredientName(ing.id)} x{ing.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 relative"><ItemIcon iconName={getIngredientIcon(resultItem?.id || null)} alt="" /></div>
                      <span className="font-bold">{resultItem?.name || 'Objet final'} x{recipe.result_quantity}</span>
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