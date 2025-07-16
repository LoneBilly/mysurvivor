import { useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Edit, PlusCircle, Trash2, ArrowRight } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Item, CraftingRecipe } from '@/types/game';
import ActionModal from '../ActionModal';

const CraftingManager = () => {
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<CraftingRecipe> | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; recipe: CraftingRecipe | null }>({ isOpen: false, recipe: null });

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
      showError("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (recipe: CraftingRecipe) => {
    setEditingRecipe({ ...recipe });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingRecipe({
      result_item_id: undefined,
      result_quantity: 1,
      ingredient1_id: undefined,
      ingredient1_quantity: 1,
      craft_time_seconds: 10,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    const { id, ...recipeData } = editingRecipe;

    // Clean up optional fields
    if (!recipeData.ingredient2_id) {
      recipeData.ingredient2_id = null;
      recipeData.ingredient2_quantity = null;
    }
    if (!recipeData.ingredient3_id) {
      recipeData.ingredient3_id = null;
      recipeData.ingredient3_quantity = null;
    }

    const promise = id
      ? supabase.from('crafting_recipes').update(recipeData).eq('id', id)
      : supabase.from('crafting_recipes').insert(recipeData);

    const { error } = await promise;
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Recette ${id ? 'mise à jour' : 'créée'}.`);
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.recipe) return;
    const { error } = await supabase.from('crafting_recipes').delete().eq('id', deleteModal.recipe.id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Recette supprimée.");
      setDeleteModal({ isOpen: false, recipe: null });
      fetchData();
    }
  };

  const getItemName = (id: number | null | undefined) => items.find(i => i.id === id)?.name || 'N/A';

  const renderIngredient = (prefix: 'ingredient1' | 'ingredient2' | 'ingredient3') => (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label>{`Ingrédient ${prefix.slice(-1)}`}</Label>
        <select
          value={editingRecipe?.[`${prefix}_id`] || ''}
          onChange={(e) => setEditingRecipe(prev => ({ ...prev, [`${prefix}_id`]: e.target.value ? parseInt(e.target.value) : undefined }))}
          className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg"
        >
          <option value="">Aucun</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div>
        <Label>Quantité</Label>
        <Input
          type="number"
          min="1"
          value={editingRecipe?.[`${prefix}_quantity`] || ''}
          onChange={(e) => setEditingRecipe(prev => ({ ...prev, [`${prefix}_quantity`]: e.target.value ? parseInt(e.target.value) : 1 }))}
          className="bg-white/5 border-white/20"
          disabled={!editingRecipe?.[`${prefix}_id`]}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex justify-end">
          <Button onClick={handleCreate}><PlusCircle className="w-4 h-4 mr-2" />Créer une recette</Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95">
                  <TableHead>Résultat</TableHead>
                  <TableHead>Ingrédients</TableHead>
                  <TableHead>Temps</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map(recipe => (
                  <TableRow key={recipe.id} className="border-gray-700">
                    <TableCell>{getItemName(recipe.result_item_id)} x{recipe.result_quantity}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        <li>{getItemName(recipe.ingredient1_id)} x{recipe.ingredient1_quantity}</li>
                        {recipe.ingredient2_id && <li>{getItemName(recipe.ingredient2_id)} x{recipe.ingredient2_quantity}</li>}
                        {recipe.ingredient3_id && <li>{getItemName(recipe.ingredient3_id)} x{recipe.ingredient3_quantity}</li>}
                      </ul>
                    </TableCell>
                    <TableCell>{recipe.craft_time_seconds}s</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(recipe)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteModal({ isOpen: true, recipe })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
            <DialogHeader>
              <DialogTitle>{editingRecipe?.id ? 'Modifier' : 'Créer'} une recette</DialogTitle>
              <DialogDescription>Définissez les ingrédients et le résultat.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Résultat</Label>
                  <select required value={editingRecipe?.result_item_id || ''} onChange={(e) => setEditingRecipe(prev => ({ ...prev, result_item_id: parseInt(e.target.value) }))} className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg">
                    <option value="" disabled>Choisir...</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Quantité</Label>
                  <Input required type="number" min="1" value={editingRecipe?.result_quantity || 1} onChange={(e) => setEditingRecipe(prev => ({ ...prev, result_quantity: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" />
                </div>
              </div>
              {renderIngredient('ingredient1')}
              {renderIngredient('ingredient2')}
              {renderIngredient('ingredient3')}
              <div>
                <Label>Temps de fabrication (secondes)</Label>
                <Input required type="number" min="1" value={editingRecipe?.craft_time_seconds || 10} onChange={(e) => setEditingRecipe(prev => ({ ...prev, craft_time_seconds: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" />
              </div>
              <DialogFooter>
                <Button type="submit">Sauvegarder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, recipe: null })}
        title="Supprimer la recette"
        description="Êtes-vous sûr ? La suppression de la recette supprimera également l'objet blueprint associé."
        actions={[{ label: "Supprimer", onClick: handleDelete, variant: "destructive" }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, recipe: null }), variant: "secondary" }]}
      />
    </>
  );
};

export default CraftingManager;