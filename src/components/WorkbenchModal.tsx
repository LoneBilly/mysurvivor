import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, CraftingJob, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, Check, BookOpen, Clock } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import ItemIcon from "./ItemIcon";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";
import BlueprintModal from "./BlueprintModal";
import CountdownTimer from "./CountdownTimer";
import { ScrollArea } from "./ui/scroll-area";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, items, refreshPlayerData } = useGame();
  const [learnedRecipes, setLearnedRecipes] = useState<CraftingRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

  const fetchLearnedRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: learnedData, error: learnedError } = await supabase
        .from('learned_blueprints')
        .select('recipe_id');
      
      if (learnedError) throw learnedError;

      const recipeIds = learnedData.map(b => b.recipe_id);

      if (recipeIds.length > 0) {
        const { data: recipesData, error: recipesError } = await supabase
          .from('crafting_recipes')
          .select('*')
          .in('id', recipeIds);
        if (recipesError) throw recipesError;
        setLearnedRecipes(recipesData || []);
      } else {
        setLearnedRecipes([]);
      }
    } catch (error) {
      showError("Impossible de charger les recettes apprises.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLearnedRecipes();
      const job = playerData.craftingJobs?.find(j => j.workbench_id === construction?.id) || null;
      setCraftingJob(job);
    } else {
      setSelectedRecipe(null);
    }
  }, [isOpen, construction, playerData.craftingJobs, fetchLearnedRecipes]);

  const handleCraft = async () => {
    if (!selectedRecipe || !construction) return;
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: selectedRecipe.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication lancée !");
      onUpdate();
    }
  };

  const handleCollect = async () => {
    if (!craftingJob) return;
    const { error } = await supabase.rpc('collect_crafted_item', { p_job_id: craftingJob.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet récupéré !");
      onUpdate();
    }
  };

  const haveIngredients = useMemo(() => {
    if (!selectedRecipe) return false;
    const ingredients = [
      { id: selectedRecipe.ingredient1_id, quantity: selectedRecipe.ingredient1_quantity },
      selectedRecipe.ingredient2_id && { id: selectedRecipe.ingredient2_id, quantity: selectedRecipe.ingredient2_quantity },
      selectedRecipe.ingredient3_id && { id: selectedRecipe.ingredient3_id, quantity: selectedRecipe.ingredient3_quantity },
    ].filter(Boolean);

    return ingredients.every(ing => {
      if (!ing) return true;
      const totalInInventory = playerData.inventory
        .filter(item => item.item_id === ing.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      return totalInInventory >= ing.quantity;
    });
  }, [selectedRecipe, playerData.inventory]);

  const renderCraftingProgress = () => {
    if (!craftingJob) return null;
    const recipe = learnedRecipes.find(r => r.id === craftingJob.recipe_id) || items.find(i => i.id === craftingJob.recipe_id);
    const item = items.find(i => i.id === (recipe as CraftingRecipe)?.result_item_id);
    const { getIconUrl } = useGame();

    if (craftingJob.status === 'completed') {
      return (
        <div className="text-center space-y-4">
          <p>Fabrication terminée !</p>
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-lg border border-green-500/50 flex items-center justify-center relative">
            {item && <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />}
          </div>
          <Button onClick={handleCollect} className="w-full"><Check className="w-4 h-4 mr-2" />Récupérer</Button>
        </div>
      );
    }

    const startTime = new Date(craftingJob.started_at).getTime();
    const endTime = new Date(craftingJob.ends_at).getTime();
    const now = Date.now();
    const progress = Math.min(100, ((now - startTime) / (endTime - startTime)) * 100);

    return (
      <div className="text-center space-y-4">
        <p>Fabrication de <span className="font-bold">{item?.name}</span> en cours...</p>
        <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-lg border border-slate-600 flex items-center justify-center relative">
          {item && <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />}
        </div>
        <Progress value={progress} />
        <p className="text-sm text-gray-400">Se termine dans <Clock className="inline w-3 h-3" /> <CountdownTimer endTime={craftingJob.ends_at} onComplete={onUpdate} /></p>
      </div>
    );
  };

  const renderCraftingInterface = () => {
    const { getIconUrl } = useGame();

    const renderIngredientList = (recipe: CraftingRecipe) => {
      const ingredients = [
        { id: recipe.ingredient1_id, quantity: recipe.ingredient1_quantity },
        recipe.ingredient2_id && { id: recipe.ingredient2_id, quantity: recipe.ingredient2_quantity },
        recipe.ingredient3_id && { id: recipe.ingredient3_id, quantity: recipe.ingredient3_quantity },
      ].filter(Boolean);

      return (
        <div className="space-y-2">
          {ingredients.map((ing, index) => {
            if (!ing) return null;
            const itemInfo = items.find(i => i.id === ing.id);
            const totalInInventory = playerData.inventory
              .filter(item => item.item_id === ing.id)
              .reduce((sum, item) => sum + item.quantity, 0);
            const hasEnough = totalInInventory >= ing.quantity;

            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 relative flex-shrink-0"><ItemIcon iconName={getIconUrl(itemInfo?.icon) || itemInfo?.icon} alt={itemInfo?.name || ''} /></div>
                  <span>{itemInfo?.name}</span>
                </div>
                <span className={cn(hasEnough ? "text-gray-300" : "text-red-400")}>
                  {totalInInventory} / {ing.quantity}
                </span>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[50vh]">
        <div className="md:col-span-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Recettes</h3>
            <Button variant="outline" size="sm" onClick={() => setIsBlueprintModalOpen(true)}>
              <BookOpen className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="bg-black/20 rounded-lg border border-slate-700 flex-grow">
            <div className="p-2 space-y-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4" /> :
                learnedRecipes.length > 0 ? learnedRecipes.map(recipe => {
                  const resultItem = items.find(i => i.id === recipe.result_item_id);
                  return (
                    <button key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className={cn("w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors", selectedRecipe?.id === recipe.id ? "bg-slate-600/50" : "hover:bg-slate-700/50")}>
                      <div className="w-8 h-8 relative flex-shrink-0"><ItemIcon iconName={getIconUrl(resultItem?.icon) || resultItem?.icon} alt={resultItem?.name || ''} /></div>
                      <span className="font-semibold">{resultItem?.name}</span>
                    </button>
                  );
                }) : <p className="text-center text-gray-400 text-sm p-4">Aucune recette apprise.</p>
              }
            </div>
          </ScrollArea>
        </div>
        <div className="md:col-span-2 bg-black/20 rounded-lg border border-slate-700 p-4 flex flex-col justify-between">
          {selectedRecipe ? (
            <>
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 mx-auto relative"><ItemIcon iconName={getIconUrl(items.find(i => i.id === selectedRecipe.result_item_id)?.icon) || items.find(i => i.id === selectedRecipe.result_item_id)?.icon} alt="" /></div>
                  <h3 className="text-xl font-bold">{items.find(i => i.id === selectedRecipe.result_item_id)?.name} x{selectedRecipe.result_quantity}</h3>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Ingrédients requis :</h4>
                  {renderIngredientList(selectedRecipe)}
                </div>
                <p className="text-sm text-center text-gray-400">Temps de fabrication: {selectedRecipe.craft_time_seconds}s</p>
              </div>
              <Button onClick={handleCraft} disabled={!haveIngredients} className="w-full mt-4">
                <Hammer className="w-4 h-4 mr-2" /> Fabriquer
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Sélectionnez une recette pour voir les détails.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Hammer className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Établi</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4">
            {craftingJob ? renderCraftingProgress() : renderCraftingInterface()}
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => construction && onDemolish(construction)}>
              <Trash2 className="w-4 h-4 mr-2" /> Détruire l'établi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;