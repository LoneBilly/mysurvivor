import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CraftingRecipe, Item } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import ItemIcon from '../ItemIcon';
import { useGame } from '@/contexts/GameContext';

const CraftingManager = () => {
  const { items, getIconUrl } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<CraftingRecipe> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecipes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('crafting_recipes').select('*').order('id', { ascending: true });
    if (error) {
      showError('Erreur lors de la récupération des recettes.');
    } else {
      setRecipes(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleAddNew = () => {
    setEditingRecipe({
      result_item_id: undefined,
      result_quantity: 1,
      slot1_item_id: null,
      slot1_quantity: 1,
      slot2_item_id: null,
      slot2_quantity: 1,
      slot3_item_id: null,
      slot3_quantity: 1,
      craft_time_seconds: 10,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (recipe: CraftingRecipe) => {
    setEditingRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
      const { error } = await supabase.from('crafting_recipes').delete().eq('id', id);
      if (error) {
        showError(error.message);
      } else {
        showSuccess('Recette supprimée.');
        fetchRecipes();
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    const recipeToSave = {
      ...editingRecipe,
      slot1_item_id: editingRecipe.slot1_item_id || null,
      slot1_quantity: editingRecipe.slot1_item_id ? editingRecipe.slot1_quantity : null,
      slot2_item_id: editingRecipe.slot2_item_id || null,
      slot2_quantity: editingRecipe.slot2_item_id ? editingRecipe.slot2_quantity : null,
      slot3_item_id: editingRecipe.slot3_item_id || null,
      slot3_quantity: editingRecipe.slot3_item_id ? editingRecipe.slot3_quantity : null,
    };

    const { error } = await supabase.from('crafting_recipes').upsert(recipeToSave);

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Recette sauvegardée.');
      setIsModalOpen(false);
      fetchRecipes();
    }
  };

  const handleFieldChange = (field: keyof CraftingRecipe, value: any) => {
    setEditingRecipe(prev => prev ? { ...prev, [field]: value } : null);
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  const renderRecipeIngredients = (recipe: CraftingRecipe) => {
    const ingredients = [
      { id: recipe.slot1_item_id, qty: recipe.slot1_quantity },
      { id: recipe.slot2_item_id, qty: recipe.slot2_quantity },
      { id: recipe.slot3_item_id, qty: recipe.slot3_quantity },
    ].filter(ing => ing.id);

    return (
      <div className="flex gap-2 items-center">
        {ingredients.map((ing, index) => {
          const item = items.find(i => i.id === ing.id);
          return (
            <div key={index} className="flex items-center gap-1 text-xs p-1 bg-slate-700 rounded">
              <ItemIcon iconName={getIconUrl(item?.icon)} alt={item?.name} className="w-4 h-4" />
              <span>{ing.qty}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 bg-slate-900 text-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gestion des Recettes</h2>
        <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead>Ingrédients (par emplacement)</TableHead>
                <TableHead>Temps</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map(recipe => {
                const resultItem = items.find(i => i.id === recipe.result_item_id);
                return (
                  <TableRow key={recipe.id}>
                    <TableCell>{recipe.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ItemIcon iconName={getIconUrl(resultItem?.icon)} alt={resultItem?.name} className="w-6 h-6" />
                        <span>{recipe.result_quantity}x {resultItem?.name || 'Inconnu'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{renderRecipeIngredients(recipe)}</TableCell>
                    <TableCell>{recipe.craft_time_seconds}s</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(recipe)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(recipe.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <DialogTitle>{editingRecipe?.id ? 'Modifier' : 'Créer'} une recette</DialogTitle>
            <DialogDescription>Définissez les ingrédients par emplacement et le résultat.</DialogDescription>
          </DialogHeader>
          {editingRecipe && (
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="result_item_id">Objet Résultat</Label>
                  <Select onValueChange={value => handleFieldChange('result_item_id', parseInt(value))} value={String(editingRecipe.result_item_id || '')}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un objet" /></SelectTrigger>
                    <SelectContent>
                      {sortedItems.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="result_quantity">Quantité Résultat</Label>
                  <Input id="result_quantity" type="number" value={editingRecipe.result_quantity || 1} onChange={e => handleFieldChange('result_quantity', parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="craft_time_seconds">Temps de fabrication (secondes)</Label>
                  <Input id="craft_time_seconds" type="number" value={editingRecipe.craft_time_seconds || 10} onChange={e => handleFieldChange('craft_time_seconds', parseInt(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-t border-slate-700">
                {[1, 2, 3].map(slotNum => (
                  <div key={slotNum} className="space-y-2 p-2 border border-slate-600 rounded-md">
                    <h4 className="font-bold text-center">Emplacement {slotNum}</h4>
                    <div>
                      <Label htmlFor={`slot${slotNum}_item_id`}>Objet</Label>
                      <Select onValueChange={value => handleFieldChange(`slot${slotNum}_item_id`, value ? parseInt(value) : null)} value={String(editingRecipe[`slot${slotNum}_item_id` as keyof CraftingRecipe] || '')}>
                        <SelectTrigger><SelectValue placeholder="Vide" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Vide</SelectItem>
                          {sortedItems.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {editingRecipe[`slot${slotNum}_item_id` as keyof CraftingRecipe] && (
                      <div>
                        <Label htmlFor={`slot${slotNum}_quantity`}>Quantité</Label>
                        <Input id={`slot${slotNum}_quantity`} type="number" value={editingRecipe[`slot${slotNum}_quantity` as keyof CraftingRecipe] as number || 1} onChange={e => handleFieldChange(`slot${slotNum}_quantity`, parseInt(e.target.value))} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="submit">Sauvegarder</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CraftingManager;