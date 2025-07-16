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
import { Loader2 } from 'lucide-react';

interface RecipeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipeId: number) => void;
  resultItem: Item;
  recipeId: number | null;
}

const RecipeEditorModal = ({ isOpen, onClose, onSave, resultItem, recipeId }: RecipeEditorModalProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Partial<CraftingRecipe>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from('items').select('*').order('name');
      setItems(data || []);
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (recipeId) {
        setLoading(true);
        const { data } = await supabase.from('crafting_recipes').select('*').eq('id', recipeId).single();
        setEditingRecipe(data || {});
        setLoading(false);
      } else {
        setEditingRecipe({
          result_item_id: resultItem.id,
          result_quantity: 1,
          craft_time_seconds: 10,
        });
      }
    };
    if (isOpen) {
      fetchRecipe();
    }
  }, [isOpen, recipeId, resultItem.id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;

    const { id, ...recipeData } = editingRecipe;
    recipeData.result_item_id = resultItem.id;

    // Clean up optional fields
    if (!recipeData.slot1_item_id) { recipeData.slot1_item_id = null; recipeData.slot1_quantity = null; }
    if (!recipeData.slot2_item_id) { recipeData.slot2_item_id = null; recipeData.slot2_quantity = null; }
    if (!recipeData.slot3_item_id) { recipeData.slot3_item_id = null; recipeData.slot3_quantity = null; }

    const { data, error } = id
      ? await supabase.from('crafting_recipes').update(recipeData).eq('id', id).select().single()
      : await supabase.from('crafting_recipes').insert(recipeData).select().single();

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Recette ${id ? 'mise à jour' : 'créée'}.`);
      onSave(data.id);
      onClose();
    }
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
          <DialogTitle>Gérer le Blueprint de {resultItem.name}</DialogTitle>
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
            <DialogFooter>
              <Button type="submit">Sauvegarder</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecipeEditorModal;