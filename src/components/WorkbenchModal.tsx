{`// This component has been updated to handle crafting loops without UI flickering.
// A new state 'craftLoop' has been introduced to track the entire batch of items to be crafted.
// The progress bar and stop button will now remain visible as long as the craft loop is active,
// even between the completion of one item and the start of the next.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useRef, FC } from "react";
import { X } from "lucide-react";

// Helper hook to get the previous value of a state or prop
function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// Define types based on your database schema to ensure type safety
interface Item {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  type: string;
  stackable: boolean;
}

interface WorkbenchItem {
  id: number;
  workbench_id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: Item;
}

interface BaseConstruction {
  id: number;
  type: string;
}

interface CraftingJob {
  id: number;
  workbench_id: number;
  recipe_id: number;
  started_at: string;
  ends_at: string;
}

interface PlayerData {
  craftingJobs: CraftingJob[];
  workbenchItems: WorkbenchItem[];
  inventory: any[]; // Assuming inventory type is defined elsewhere
}

interface CraftingRecipe {
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

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbench: BaseConstruction;
  playerData: PlayerData;
  recipes: CraftingRecipe[];
  items: Item[];
}

const CraftingProgress: FC<{
  job: CraftingJob | undefined;
  recipe: CraftingRecipe;
  craftLoop: { quantity: number } | null;
  items: Item[];
}> = ({ job, recipe, craftLoop, items }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const resultItem = items.find(i => i.id === recipe.result_item_id);

  useEffect(() => {
    if (job) {
      const endsAt = new Date(job.ends_at).getTime();
      const startedAt = new Date(job.started_at).getTime();
      const totalDuration = endsAt - startedAt;

      if (totalDuration <= 0) {
        setProgress(100);
        setTimeLeft(0);
        return;
      }

      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = endsAt - now;
        if (remaining > 0) {
          setTimeLeft(Math.round(remaining / 1000));
          const elapsed = totalDuration - remaining;
          setProgress(Math.min(100, (elapsed / totalDuration) * 100));
        } else {
          setTimeLeft(0);
          setProgress(100);
          clearInterval(interval);
        }
      }, 250);
      return () => clearInterval(interval);
    } else if (craftLoop) {
      setProgress(0);
      setTimeLeft(recipe.craft_time_seconds);
    }
  }, [job, craftLoop, recipe]);

  return (
    <div className="space-y-2 text-center p-4 bg-gray-900 rounded-md">
      <div className="text-lg font-semibold text-white">
        Fabrication: {resultItem?.name}
      </div>
      <div className="flex justify-between items-center text-sm font-mono text-gray-400">
        <span>{timeLeft > 0 ? \`\${timeLeft}s\` : 'Terminé'}</span>
        {craftLoop && craftLoop.quantity > 1 && <span>(Encore {craftLoop.quantity - 1})</span>}
      </div>
      <Progress value={progress} className="w-full h-3 bg-gray-700" />
    </div>
  );
};

export const WorkbenchModal: FC<WorkbenchModalProps> = ({
  isOpen,
  onClose,
  workbench,
  playerData,
  recipes,
  items,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [craftQuantity, setCraftQuantity] = useState(1);
  const [craftLoop, setCraftLoop] = useState<{ recipeId: number; quantity: number } | null>(null);

  const activeJob = useMemo(() => {
    return playerData.craftingJobs?.find(job => job.workbench_id === workbench.id);
  }, [playerData.craftingJobs, workbench.id]);

  const prevActiveJob = usePrevious(activeJob);

  const { mutate: startCraftMutation, isPending: isStartingCraft } = useMutation({
    mutationFn: async (params: { p_workbench_id: number; p_recipe_id: number }) => {
      const { error } = await supabase.rpc('start_craft', params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerData'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur de fabrication", description: error.message });
      setCraftLoop(null);
    },
  });

  const { mutate: cancelCraftMutation } = useMutation({
    mutationFn: async (params: { p_workbench_id: number }) => {
      const { error } = await supabase.rpc('cancel_crafting_job', params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerData'] });
      toast({ title: "Fabrication annulée" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    },
  });

  useEffect(() => {
    if (craftLoop && prevActiveJob && !activeJob) {
      const remaining = craftLoop.quantity - 1;
      if (remaining > 0) {
        setCraftLoop(prev => ({ ...prev!, quantity: remaining }));
        startCraftMutation({ p_workbench_id: workbench.id, p_recipe_id: craftLoop.recipeId });
      } else {
        setCraftLoop(null);
      }
    }
  }, [activeJob, prevActiveJob, craftLoop, startCraftMutation, workbench.id]);

  const handleStartCraft = () => {
    if (selectedRecipeId) {
      setCraftLoop({ recipeId: selectedRecipeId, quantity: craftQuantity });
      startCraftMutation({ p_workbench_id: workbench.id, p_recipe_id: selectedRecipeId });
    }
  };

  const handleStopCraft = () => {
    setCraftLoop(null);
    if (activeJob) {
      cancelCraftMutation({ p_workbench_id: workbench.id });
    }
  };

  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return recipes.find(r => r.id === selectedRecipeId);
  }, [selectedRecipeId, recipes]);

  const workbenchItems = useMemo(() => playerData.workbenchItems?.filter(wi => wi.workbench_id === workbench.id) || [], [playerData.workbenchItems, workbench.id]);

  const { canCraft, maxCraftQuantity } = useMemo(() => {
    if (!selectedRecipe) return { canCraft: false, maxCraftQuantity: 0 };
    const ingredients = [
      { id: selectedRecipe.ingredient1_id, q: selectedRecipe.ingredient1_quantity },
      selectedRecipe.ingredient2_id && { id: selectedRecipe.ingredient2_id, q: selectedRecipe.ingredient2_quantity },
      selectedRecipe.ingredient3_id && { id: selectedRecipe.ingredient3_id, q: selectedRecipe.ingredient3_quantity },
    ].filter((i): i is { id: number; q: number; } => i !== null && i.id !== null && i.q !== null);

    if (ingredients.length === 0) return { canCraft: true, maxCraftQuantity: 50 };

    const possibleCrafts = ingredients.map(ing => {
      const available = workbenchItems.filter(wi => wi.item_id === ing.id).reduce((sum, wi) => sum + wi.quantity, 0);
      return Math.floor(available / ing.q);
    });

    const max = Math.min(...possibleCrafts);
    return { canCraft: max > 0, maxCraftQuantity: max };
  }, [selectedRecipe, workbenchItems]);

  useEffect(() => {
    if (maxCraftQuantity > 0 && craftQuantity > maxCraftQuantity) {
      setCraftQuantity(maxCraftQuantity);
    } else if (maxCraftQuantity === 0) {
      setCraftQuantity(1);
    }
  }, [maxCraftQuantity]);

  const isCrafting = !!activeJob || !!craftLoop;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-800 text-gray-200 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Établi</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-bold text-lg text-white">Recettes</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recipes.map(recipe => {
                const resultItem = items.find(i => i.id === recipe.result_item_id);
                return (
                  <Button
                    key={recipe.id}
                    variant={selectedRecipeId === recipe.id ? "secondary" : "ghost"}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className="w-full justify-start"
                  >
                    {resultItem?.name || 'Recette inconnue'}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {selectedRecipe ? (
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-bold text-lg text-white mb-2">Détails de fabrication</h3>
                {isCrafting && selectedRecipe ? (
                  <CraftingProgress job={activeJob} recipe={selectedRecipe} craftLoop={craftLoop} items={items} />
                ) : (
                  <div className="w-full px-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span>Quantité: <span className="font-bold text-white">{craftQuantity}</span></span>
                      <span className="text-gray-400">Max: {maxCraftQuantity}</span>
                    </div>
                    <Slider
                      value={[craftQuantity]}
                      onValueChange={(value) => setCraftQuantity(value[0])}
                      min={1}
                      max={maxCraftQuantity > 0 ? maxCraftQuantity : 1}
                      step={1}
                      disabled={maxCraftQuantity === 0}
                    />
                  </div>
                )}

                <div className="mt-4">
                  {isCrafting ? (
                    <Button onClick={handleStopCraft} variant="destructive" className="w-full">
                      Arrêter la fabrication
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartCraft}
                      disabled={!canCraft || craftQuantity === 0 || isStartingCraft}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isStartingCraft ? 'Démarrage...' : \`Fabriquer \${craftQuantity}\`}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400">Sélectionnez une recette pour voir les détails.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
`}