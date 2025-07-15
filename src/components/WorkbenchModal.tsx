"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { FullPlayerState } from "@/lib/types";

type Recipe = {
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
  items: {
    name: string;
    icon: string;
  };
  ingredient1: {
    name: string;
    icon: string;
  } | null;
  ingredient2: {
    name: string;
    icon: string;
  } | null;
  ingredient3: {
    name: string;
    icon: string;
  } | null;
};

type Workbench = {
  id: number;
  type: string;
};

type WorkbenchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  workbench: Workbench | null;
  recipes: Recipe[];
  playerState: FullPlayerState | null;
  onAction: () => void;
};

export function WorkbenchModal({
  isOpen,
  onClose,
  workbench,
  recipes,
  playerState,
  onAction,
}: WorkbenchModalProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const { toast } = useToast();
  const isSubmitting = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedRecipeId(null);
      isSubmitting.current = false;
    }
  }, [isOpen]);

  const matchedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return recipes.find((r) => r.id === selectedRecipeId) ?? null;
  }, [selectedRecipeId, recipes]);

  const workbenchItems = playerState?.workbenchItems?.filter(item => item.workbench_id === workbench?.id) || [];

  const getIngredientCount = (itemId: number) => {
    return workbenchItems
      .filter(item => item.item_id === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const canCraft = useMemo(() => {
    if (!matchedRecipe) return false;
    if (matchedRecipe.ingredient1_id && getIngredientCount(matchedRecipe.ingredient1_id) < matchedRecipe.ingredient1_quantity) return false;
    if (matchedRecipe.ingredient2_id && matchedRecipe.ingredient2_quantity && getIngredientCount(matchedRecipe.ingredient2_id) < matchedRecipe.ingredient2_quantity) return false;
    if (matchedRecipe.ingredient3_id && matchedRecipe.ingredient3_quantity && getIngredientCount(matchedRecipe.ingredient3_id) < matchedRecipe.ingredient3_quantity) return false;
    return true;
  }, [matchedRecipe, workbenchItems]);

  const handleStartCrafting = async () => {
    if (!workbench || !matchedRecipe || !canCraft) return;

    if (isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;
    setIsLoadingAction(true);

    try {
      const { error } = await supabase.rpc('start_craft', {
        p_workbench_id: workbench.id,
        p_recipe_id: matchedRecipe.id,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Fabrication démarrée.",
        });
        onAction();
        onClose();
      }
    } catch (e: any) {
      toast({
        title: "Erreur inattendue",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAction(false);
      isSubmitting.current = false;
    }
  };

  const renderRecipe = (recipe: Recipe) => {
    const isSelected = selectedRecipeId === recipe.id;
    return (
      <div
        key={recipe.id}
        onClick={() => setSelectedRecipeId(recipe.id)}
        className={`p-2 border rounded-md cursor-pointer ${isSelected ? 'border-primary' : ''}`}
      >
        <div className="flex items-center gap-2">
          <img src={recipe.items.icon} alt={recipe.items.name} className="w-8 h-8" />
          <span>{recipe.items.name} x{recipe.result_quantity}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Établi</DialogTitle>
          <DialogDescription>
            Sélectionnez une recette pour fabriquer un objet. Les ingrédients doivent être dans l'établi.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto p-1">
            {recipes.map(renderRecipe)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {matchedRecipe && (
            <Button onClick={handleStartCrafting} disabled={!canCraft || isLoadingAction}>
              {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fabriquer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}