import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, PlusCircle, Edit, Trash2, Clock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Item } from '@/types/admin';
import CraftingRecipeFormModal from './CraftingRecipeFormModal';
import ActionModal from '../ActionModal';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CraftingRecipe {
  id: number;
  result_item_id: number;
  result_quantity: number;
  ingredient1_id: number;
  ingredient1_quantity: number;
  ingredient2_id: number | null;
  ingredient2_quantity: number | null;
  ingredient3_id: number | null;
  ingredient3_quantity: number | null;
  craft_time_seconds: number;
}

const CraftingManager = () => {
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<CraftingRecipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<CraftingRecipe | null>(null);
  const isMobile = useIsMobile();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesRes, itemsRes] = await Promise.all([
        supabase.from('crafting_recipes').select('*').order('id'),
        supabase.from('items').select('*').order('name')
      ]);
      if (recipesRes.error) throw recipesRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setRecipes(recipesRes.data || []);
      setItems(itemsRes.data || []);
    } catch (error) {
      showError("Impossible de charger les données de craft.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setEditingRecipe(null);
    setIsModalOpen(true);
  };

  const handleEdit = (recipe: CraftingRecipe) => {
    setEditingRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!recipeToDelete) return;
    const { error } = await supabase.from('crafting_recipes').delete().eq('id', recipeToDelete.id);
    if (error) {
      showError("Erreur lors de la suppression.");
    } else {
      showSuccess("Recette supprimée.");
      fetchData();
    }
    setRecipeToDelete(null);
  };

  const getItemName = (id: number | null) => items.find(i => i.id === id)?.name || 'Inconnu';

  const renderIngredients = (recipe: CraftingRecipe) => {
    const ingredients = [
      { id: recipe.ingredient1_id, qty: recipe.ingredient1_quantity },
      { id: recipe.ingredient2_id, qty: recipe.ingredient2_quantity },
      { id: recipe.ingredient3_id, qty: recipe.ingredient3_quantity },
    ];
    return ingredients
      .filter(ing => ing.id && ing.qty)
      .map((ing, index) => (
        <div key={index}>{getItemName(ing.id)} x{ing.qty}</div>
      ));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex justify-end">
          <Button onClick={handleCreate}>
            <PlusCircle className="w-4 h-4 mr-2" /> Créer une recette
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isMobile ? (
            <div className="p-4 space-y-3">
              {recipes.map(recipe => (
                <div key={recipe.id} onClick={() => handleEdit(recipe)} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">{getItemName(recipe.result_item_id)} x{recipe.result_quantity}</p>
                    <div className="flex items-center gap-1 text-sm"><Clock size={14} /> {recipe.craft_time_seconds}s</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700/50 text-sm text-gray-300">
                    <p className="font-semibold mb-1">Ingrédients:</p>
                    <div className="pl-2 space-y-1">
                      {renderIngredients(recipe)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead>Résultat</TableHead>
                  <TableHead>Ingrédients</TableHead>
                  <TableHead>Temps</TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map(recipe => (
                  <TableRow key={recipe.id} className="border-gray-700">
                    <TableCell className="font-medium">{getItemName(recipe.result_item_id)} x{recipe.result_quantity}</TableCell>
                    <TableCell>{renderIngredients(recipe)}</TableCell>
                    <TableCell className="flex items-center gap-2"><Clock className="w-4 h-4" /> {recipe.craft_time_seconds}s</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(recipe)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setRecipeToDelete(recipe)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <CraftingRecipeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchData}
        recipe={editingRecipe}
        items={items}
      />
      <ActionModal
        isOpen={!!recipeToDelete}
        onClose={() => setRecipeToDelete(null)}
        title="Supprimer la recette"
        description={`Êtes-vous sûr de vouloir supprimer la recette pour "${getItemName(recipeToDelete?.result_item_id || null)}"?`}
        actions={[
          { label: "Supprimer", onClick: handleDelete, variant: "destructive" },
          { label: "Annuler", onClick: () => setRecipeToDelete(null), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default CraftingManager;