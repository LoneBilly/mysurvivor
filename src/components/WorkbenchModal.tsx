import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hammer, Package, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
import { ItemIcon } from "./ItemIcon";
import { Progress } from "./ui/progress";
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { WorkbenchSlot } from "./WorkbenchSlot";

type Recipe = any;

export function WorkbenchModal({ isOpen, onClose, workbenchId }: { isOpen: boolean, onClose: () => void, workbenchId: number | null }) {
  const { playerData, refreshPlayerData, allRecipes, allItems, learnedBlueprints } = useGame();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isCrafting, setIsCrafting] = useState(false);

  const workbench = useMemo(() => 
    playerData?.baseConstructions.find(bc => bc.id === workbenchId),
    [playerData?.baseConstructions, workbenchId]
  );

  const workbenchItems = useMemo(() => 
    playerData?.workbenchItems?.filter(wi => wi.workbench_id === workbenchId) || [],
    [playerData?.workbenchItems, workbenchId]
  );

  const craftingJob = useMemo(() => 
    playerData?.craftingJobs.find(job => job.workbench_id === workbenchId),
    [playerData?.craftingJobs, workbenchId]
  );

  const outputItem = useMemo(() => {
    if (!workbench || !workbench.output_item_id) return null;
    const item = allItems.find(i => i.id === workbench.output_item_id);
    return item ? { ...item, quantity: workbench.output_quantity } : null;
  }, [workbench, allItems]);

  useEffect(() => {
    if (craftingJob) {
      const interval = setInterval(() => {
        const endsAt = new Date(craftingJob.ends_at);
        const now = new Date();
        if (now >= endsAt) {
          setTimeLeft("Terminé");
          setProgress(100);
          clearInterval(interval);
          refreshPlayerData();
        } else {
          const totalDuration = endsAt.getTime() - new Date(craftingJob.started_at).getTime();
          const elapsed = now.getTime() - new Date(craftingJob.started_at).getTime();
          setProgress((elapsed / totalDuration) * 100);
          setTimeLeft(formatDistanceToNowStrict(endsAt, { addSuffix: true, locale: fr }));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [craftingJob, refreshPlayerData]);

  const handleCraft = async () => {
    if (!selectedRecipe || !workbench) return;
    setIsCrafting(true);
    const toastId = toast.loading("Lancement de la fabrication...");
    const { error } = await supabase.rpc('start_craft', {
      p_workbench_id: workbench.id,
      p_recipe_id: selectedRecipe.id
    });
    setIsCrafting(false);
    if (error) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    } else {
      toast.success("Fabrication lancée !", { id: toastId });
      await refreshPlayerData();
      setSelectedRecipe(null);
    }
  };

  const handleCollect = async () => {
    if (!workbench) return;
    const toastId = toast.loading("Récupération de l'objet...");
    const { error } = await supabase.rpc('collect_workbench_output', {
      p_workbench_id: workbench.id
    });
    if (error) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    } else {
      toast.success("Objet récupéré !", { id: toastId });
      await refreshPlayerData();
    }
  };

  const learnedRecipes = useMemo(() => {
    const learnedRecipeIds = new Set(learnedBlueprints.map(lb => lb.recipe_id));
    return allRecipes.filter(r => learnedRecipeIds.has(r.id));
  }, [allRecipes, learnedBlueprints]);

  const craftableRecipes = useMemo(() => {
    return learnedRecipes.filter(recipe => {
      const ingredients = [
        { id: recipe.ingredient1_id, quantity: recipe.ingredient1_quantity },
        { id: recipe.ingredient2_id, quantity: recipe.ingredient2_quantity },
        { id: recipe.ingredient3_id, quantity: recipe.ingredient3_quantity },
      ].filter(ing => ing.id != null);

      return ingredients.every(ing => {
        const totalInWorkbench = workbenchItems
          .filter(wi => wi.item_id === ing.id)
          .reduce((sum, current) => sum + current.quantity, 0);
        return totalInWorkbench >= ing.quantity;
      });
    });
  }, [learnedRecipes, workbenchItems]);

  const getIngredientItem = (id: number) => allItems.find(item => item.id === id);

  if (!isOpen || !workbench) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Hammer className="w-7 h-7 text-white" />
            <DialogTitle>Établi</DialogTitle>
          </div>
          <DialogDescription>
            Utilisez les matériaux dans l'établi pour fabriquer de nouveaux objets.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="flex flex-col gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <h3 className="font-bold text-lg text-yellow-400">Fabrication</h3>
            
            {craftingJob ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p>Fabrication de: <span className="font-bold">{craftingJob.result_item_name}</span></p>
                <div className="w-full">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-sm text-slate-400 mt-2">{timeLeft}</p>
                </div>
              </div>
            ) : outputItem ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="font-bold">Fabrication terminée !</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-slate-700 rounded-md flex items-center justify-center p-2">
                    <ItemIcon iconName={outputItem.icon} alt={outputItem.name} />
                  </div>
                  <p>{outputItem.name} x{outputItem.quantity}</p>
                </div>
                <Button onClick={handleCollect} className="w-full bg-green-600 hover:bg-green-700">
                  <Package className="mr-2 h-4 w-4" /> Récupérer
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-grow overflow-y-auto max-h-60 pr-2">
                  <p className="text-sm text-slate-400 mb-2">Recettes disponibles :</p>
                  <div className="space-y-2">
                    {craftableRecipes.map(recipe => (
                      <Button 
                        key={recipe.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left h-auto",
                          selectedRecipe?.id === recipe.id && "bg-slate-700"
                        )}
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-md flex items-center justify-center p-1">
                            <ItemIcon iconName={getIngredientItem(recipe.result_item_id)?.icon} />
                          </div>
                          <span>{getIngredientItem(recipe.result_item_id)?.name}</span>
                        </div>
                      </Button>
                    ))}
                     {craftableRecipes.length === 0 && <p className="text-slate-500 text-center py-4">Aucune recette fabricable avec les objets présents.</p>}
                  </div>
                </div>

                {selectedRecipe && (
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-600">
                    <h4 className="font-bold mb-2">Recette : {getIngredientItem(selectedRecipe.result_item_id)?.name}</h4>
                    <p className="text-sm text-slate-400 mb-3">Ingrédients requis :</p>
                    <div className="space-y-2 mb-3">
                      {[
                        { id: selectedRecipe.ingredient1_id, qty: selectedRecipe.ingredient1_quantity },
                        { id: selectedRecipe.ingredient2_id, qty: selectedRecipe.ingredient2_quantity },
                        { id: selectedRecipe.ingredient3_id, qty: selectedRecipe.ingredient3_quantity },
                      ].filter(ing => ing.id).map((ing, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6"><ItemIcon iconName={getIngredientItem(ing.id)?.icon} /></div>
                          <span>{getIngredientItem(ing.id)?.name}</span>
                          <span className="ml-auto font-mono">x{ing.qty}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center text-sm text-slate-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Temps: {selectedRecipe.craft_time_seconds} secondes</span>
                    </div>
                    <Button onClick={handleCraft} disabled={isCrafting} className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-black">
                      <Hammer className="mr-2 h-4 w-4" /> Fabriquer
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <h3 className="font-bold text-lg text-cyan-400">Contenu de l'établi</h3>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(slotIndex => {
                const itemInSlot = workbenchItems.find(i => i.slot_position === slotIndex);
                return (
                  <WorkbenchSlot
                    key={slotIndex}
                    slotIndex={slotIndex}
                    item={itemInSlot}
                    workbenchId={workbench.id}
                  />
                );
              })}
            </div>
            <div className="text-center text-xs text-slate-500 p-2 border-t border-slate-700 mt-auto">
              <p>Glissez des objets de votre inventaire vers l'établi pour les utiliser.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}