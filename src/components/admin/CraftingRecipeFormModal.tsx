import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { CraftingRecipe } from './CraftingManager';
import { Loader2 } from 'lucide-react';

interface CraftingRecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  recipe: CraftingRecipe | null;
  items: Item[];
}

const CraftingRecipeFormModal = ({ isOpen, onClose, onSave, recipe, items }: CraftingRecipeFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CraftingRecipe>>({});

  useEffect(() => {
    if (recipe) {
      setFormData(recipe);
    } else {
      setFormData({
        result_quantity: 1,
        ingredient1_quantity: 1,
        craft_time_seconds: 10,
      });
    }
  }, [recipe, isOpen]);

  const handleInputChange = (field: keyof CraftingRecipe, value: string) => {
    const numValue = parseInt(value, 10);
    setFormData(prev => ({ ...prev, [field]: isNaN(numValue) ? null : numValue }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = {
      ...formData,
      ingredient2_id: formData.ingredient2_id || null,
      ingredient2_quantity: formData.ingredient2_id ? formData.ingredient2_quantity || 1 : null,
      ingredient3_id: formData.ingredient3_id || null,
      ingredient3_quantity: formData.ingredient3_id ? formData.ingredient3_quantity || 1 : null,
    };

    const promise = recipe
      ? supabase.from('crafting_recipes').update(dataToSave).eq('id', recipe.id)
      : supabase.from('crafting_recipes').insert(dataToSave);

    const { error } = await promise;
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Recette ${recipe ? 'mise à jour' : 'créée'}.`);
      onSave();
      onClose();
    }
    setLoading(false);
  };

  const renderIngredientFields = (index: 1 | 2 | 3) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Ingrédient {index}</Label>
        <select
          value={formData[`ingredient${index}_id`] || ''}
          onChange={(e) => handleInputChange(`ingredient${index}_id`, e.target.value)}
          className="w-full mt-1 bg-white/5 border-white/20 rounded-lg px-3 h-10 text-white"
        >
          <option value="">-- Aucun --</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div>
        <Label>Quantité</Label>
        <Input
          type="number"
          value={formData[`ingredient${index}_quantity`] || ''}
          onChange={(e) => handleInputChange(`ingredient${index}_quantity`, e.target.value)}
          className="mt-1 bg-white/5 border-white/20"
          disabled={!formData[`ingredient${index}_id`]}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Modifier' : 'Créer'} une recette</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Objet résultant</Label>
              <select
                value={formData.result_item_id || ''}
                onChange={(e) => handleInputChange('result_item_id', e.target.value)}
                className="w-full mt-1 bg-white/5 border-white/20 rounded-lg px-3 h-10 text-white"
                required
              >
                <option value="" disabled>Choisir un objet</option>
                {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantité produite</Label>
              <Input
                type="number"
                value={formData.result_quantity || ''}
                onChange={(e) => handleInputChange('result_quantity', e.target.value)}
                className="mt-1 bg-white/5 border-white/20"
                required
              />
            </div>
          </div>
          
          {renderIngredientFields(1)}
          {renderIngredientFields(2)}
          {renderIngredientFields(3)}

          <div>
            <Label>Temps de craft (secondes)</Label>
            <Input
              type="number"
              value={formData.craft_time_seconds || ''}
              onChange={(e) => handleInputChange('craft_time_seconds', e.target.value)}
              className="mt-1 bg-white/5 border-white/20"
              required
            />
          </div>
        </form>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CraftingRecipeFormModal;