import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item, CraftingRecipe } from '@/types/game';
import { Loader2, AlertTriangle } from 'lucide-react';

interface RecipeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipeData: Partial<CraftingRecipe> & { id?: number }) => void;
  resultItem: Item;
  recipeId: number | null;
  isNewItem: boolean;
}

const RecipeEditorModal = ({ isOpen, onClose, onSave, resultItem, recipeId, isNewItem }: RecipeEditorModalProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Partial<CraftingRecipe>>({});
  const [loading, setLoading] = useState(false);
  const [duplicateRecipeInfo, setDuplicateRecipeInfo] = useState<any>(null);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from('items').select('*').order('name');
      setItems(data || []);
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (recipeId && !isNewItem) {
        setLoading(true);
        const { data } = await supabase.from('crafting_recipes').select('*').eq('id', recipeId).single();
        setEditingRecipe(data || {});
        setLoading(false);
      } else {
        setEditingRecipe({
          result_item_id: resultItem.id,
          result_quantity: 1,
          craft_time_seconds: 10,
          slot1_item_id: null,
          slot1_quantity: null,
          slot2_item_id: null,
          slot2_quantity: null,
          slot3_item_id: null,
          slot3_quantity: null,
        });
      }
    };
    if (isOpen) {
      fetchRecipe();
      setDuplicateRecipeInfo(null); // Clear duplicate info on open
    }
  }, [isOpen, recipeId, resultItem.id, isNewItem]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    const recipeDataToSave: Partial<CraftingRecipe> = {
      result_item_id: resultItem.id,
      result_quantity: editingRecipe.result_quantity || 1,
      craft_time_seconds: editingRecipe.craft_time_seconds || 10,
      slot1_item_id: editingRecipe.slot1_item_id || null,
      slot1_quantity: editingRecipe.slot1_quantity || null,
      slot2_item_id: editingRecipe.slot2_item_id || null,
      slot2_quantity: editingRecipe.slot2_quantity || null,
      slot3_item_id: editingRecipe.slot3_item_id || null,
      slot3_quantity: editingRecipe.slot3_quantity || null,
    };

    setLoading(true);
    const { data: duplicateCheckData, error: duplicateCheckError } = await supabase.rpc('check_duplicate_recipe_inputs', {
        p_slot1_item_id: recipeDataToSave.slot1_item_id,
        p_slot1_quantity: recipeDataToSave.slot1_quantity,
        p_slot2_item_id: recipeDataToSave.slot2_item_id,
        p_slot2_quantity: recipeDataToSave.slot2_quantity,
        p_slot3_item_id: recipeDataToSave.slot3_item_id,
        p_slot3_quantity: recipeDataToSave.slot3_quantity,
        p_current_recipe_id: editingRecipe.id || null
    });

    if (duplicateCheckError) {
        showError("Erreur lors de la vérification des doublons.");
        console.error(duplicateCheckError);
        setLoading(false);
        return;
    }

    if (duplicateCheckData && duplicateCheckData.length > 0) {
        setDuplicateRecipeInfo(duplicateCheckData[0]);
        setLoading(false);
        return;
    } else {
        setDuplicateRecipeInfo(null);
    }

    if (isNewItem) {
      onSave(recipeDataToSave);
      onClose();
    } else {
      const { data, error } = editingRecipe.id
        ? await supabase.from('crafting_recipes').update(recipeDataToSave).eq('id', editingRecipe.id).select().single()
        : await supabase.from('crafting_recipes').insert(recipeDataToSave).select().single();

      if (error) {
        showError(error.message);
      } else {
        showSuccess(`Recette ${editingRecipe.id ? 'mise à jour' : 'créée'}.`);
        if (!editingRecipe.id && resultItem.id) {
          await supabase.from('items').update({ recipe_id: data.id }).eq('id', resultItem.id);
        }
        onSave(data);
        onClose();
      }
    }
    setLoading(false);
  };

  const getIngredientName = (id: number | null) => {
    if (!id) return 'Vide';
    return items.find(item => item.id === id)?.name || 'Objet inconnu';
  };

  const renderSlotInput = (slot: 1 | 2 | 3) => (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label>{`Slot ${slot}`}</Label>
        <select
          value={editingRecipe?.[`slot${slot}_item_id` as keyof CraftingRecipe] || ''}
          onChange={(e) => setEditingRecipe(prev => {
            const newRecipe = { ...prev } as Partial<CraftingRecipe>;
            const itemId = e.target.value ? parseInt(e.target.value) : undefined;
            (newRecipe as any)[`slot${slot}_item_id`] = itemId;
            if (itemId) {
              (newRecipe as any)[`slot${slot}_quantity`] = (newRecipe as any)[`slot${slot}_quantity`] || 1;
            } else {
              (newRecipe as any)[`slot${slot}_quantity`] = undefined;
            }
            return newRecipe;
          })}
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
          value={editingRecipe?.[`slot${slot}_quantity` as keyof CraftingRecipe] || ''}
          onChange={(e) => setEditingRecipe(prev => ({ ...prev, [`slot${slot}_quantity`]: e.target.value ? parseInt(e.target.value) : 1 }))}
          className="bg-white/5 border-white/20"
          disabled={!editingRecipe?.[`slot${slot}_item_id` as keyof CraftingRecipe]}
          required={!!editingRecipe?.[`slot${slot}_item_id` as keyof CraftingRecipe]}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Gérer le Blueprint de {resultItem.name || 'Nouvel Objet'}</DialogTitle>
          <DialogDescription>Définissez les ingrédients et le résultat.</DialogDescription>
        </DialogHeader>
        {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto my-8" /> : (
          <form onSubmit={handleSave} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Résultat</Label>
                <Input value={resultItem.name} className="bg-white/5 border-white/20" disabled />
              </div>
              <div>
                <Label>Quantité</Label>
                <Input required type="number" min="1" value={editingRecipe?.result_quantity || 1} onChange={(e) => setEditingRecipe(prev => ({ ...prev, result_quantity: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" />
              </div>
            </div>
            {renderSlotInput(1)}
            {renderSlotInput(2)}
            {renderSlotInput(3)}
            <div>
              <Label>Temps de fabrication (secondes)</Label>
              <Input required type="number" min="1" value={editingRecipe?.craft_time_seconds || 10} onChange={(e) => setEditingRecipe(prev => ({ ...prev, craft_time_seconds: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" />
            </div>

            {duplicateRecipeInfo && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Attention: Recette dupliquée !</p>
                  <p className="text-sm">Cette combinaison d'ingrédients est déjà utilisée par l'objet: <span className="font-bold">{duplicateRecipeInfo.result_item_name}</span>.</p>
                  <p className="text-xs mt-1">Ingrédients:
                    {duplicateRecipeInfo.s1_item_id && ` ${getIngredientName(duplicateRecipeInfo.s1_item_id)} x${duplicateRecipeInfo.s1_qty}`}
                    {duplicateRecipeInfo.s2_item_id && `, ${getIngredientName(duplicateRecipeInfo.s2_item_id)} x${duplicateRecipeInfo.s2_qty}`}
                    {duplicateRecipeInfo.s3_item_id && `, ${getIngredientName(duplicateRecipeInfo.s3_item_id)} x${duplicateRecipeInfo.s3_qty}`}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={!!duplicateRecipeInfo}>Sauvegarder</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecipeEditorModal;