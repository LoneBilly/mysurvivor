import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen, Square, Download } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showInfo } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

interface WorkbenchViewProps {
  construction: BaseConstruction;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => void;
}

const getQueueKey = (id: number | undefined) => id ? `craftingQueue_${id}` : null;

const WorkbenchView = ({ construction, onDemolish, onUpdate }: WorkbenchViewProps) => {
  const { playerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'crafting' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [currentJob, setCurrentJob] = useState<CraftingJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [craftQuantity, setCraftQuantity] = useState(1);
  const [craftsRemaining, setCraftsRemaining] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const prevCraftingJobsRef = useRef<CraftingJob[]>([]);
  const timerCompletedRef = useRef(false);

  const optimisticWorkbenchItems = useMemo(() => 
    playerData.workbenchItems.filter(item => item.workbench_id === construction.id),
    [playerData.workbenchItems, construction.id]
  );

  const optimisticOutputItem = useMemo(() => {
    const currentConstructionState = playerData.baseConstructions.find(c => c.id === construction.id);
    if (currentConstructionState?.output_item_id) {
      const outputItemDef = items.find(i => i.id === currentConstructionState.output_item_id);
      if (outputItemDef) {
        return {
          id: -1,
          item_id: outputItemDef.id,
          quantity: currentConstructionState.output_quantity || 1,
          slot_position: -1,
          items: outputItemDef,
          workbench_id: construction.id,
        };
      }
    }
    return null;
  }, [playerData.baseConstructions, construction.id, items]);

  const ingredientSlots = useMemo(() => {
    const newSlots = Array(3).fill(null);
    optimisticWorkbenchItems.forEach(item => {
        if (item.slot_position >= 0 && item.slot_position < 3) {
            newSlots[item.slot_position] = item;
        }
    });
    return newSlots;
  }, [optimisticWorkbenchItems]);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

  useEffect(() => {
    if (construction) {
      const job = playerData.craftingJobs?.find(j => j.workbench_id === construction.id);
      setCurrentJob(job || null);

      const queueKey = getQueueKey(construction.id);
      if (queueKey) {
        const savedQueue = localStorage.getItem(queueKey);
        setCraftsRemaining(savedQueue ? parseInt(savedQueue, 10) : 0);
      }
      fetchRecipes();
    }
  }, [construction, playerData.craftingJobs, fetchRecipes]);

  const startCraft = useCallback(async (recipe: CraftingRecipe) => {
    if (!construction || !recipe) return false;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: recipe.id });
    setIsLoadingAction(false);
    if (error) {
      showError(error.message);
      await refreshPlayerData();
      return false;
    }
    return true;
  }, [construction, refreshPlayerData]);

  useEffect(() => {
    const prevJobs = prevCraftingJobsRef.current;
    const currentJobs = playerData.craftingJobs || [];
    const completedJobs = prevJobs.filter(pJob => !currentJobs.some(cJob => cJob.id === pJob.id));

    completedJobs.forEach(async (job) => {
      const queueKey = `craftingQueue_${job.workbench_id}`;
      const savedQueue = localStorage.getItem(queueKey);
      if (savedQueue) {
        const newCraftsRemaining = parseInt(savedQueue, 10) - 1;
        setCraftsRemaining(newCraftsRemaining);
        if (newCraftsRemaining > 0) {
          localStorage.setItem(queueKey, String(newCraftsRemaining));
          const { error } = await supabase.rpc('start_craft', { p_workbench_id: job.workbench_id, p_recipe_id: job.recipe_id });
          if (error) {
            showError(`La fabrication en série s'est arrêtée: ${error.message}`);
            localStorage.removeItem(queueKey);
            setCraftsRemaining(0);
            refreshPlayerData();
          } else {
            refreshPlayerData(true);
          }
        } else {
          localStorage.removeItem(queueKey);
          refreshPlayerData();
        }
      }
    });
    prevCraftingJobsRef.current = playerData.craftingJobs || [];
  }, [playerData.craftingJobs, refreshPlayerData]);

  useEffect(() => {
    if (currentJob) {
      timerCompletedRef.current = false;
      const endTime = new Date(currentJob.ends_at).getTime();
      const interval = setInterval(async () => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
          clearInterval(interval);
          setProgress(100);
          setTimeRemaining('');
          if (!timerCompletedRef.current) {
            timerCompletedRef.current = true;
            setIsLoadingAction(true);
            await refreshPlayerData();
            setIsLoadingAction(false);
          }
          return;
        }
        const startTime = new Date(currentJob.started_at).getTime();
        const totalDuration = endTime - startTime;
        const elapsedTime = now - startTime;
        const newProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
        const remainingSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        setProgress(newProgress);
        setTimeRemaining(`${minutes}m ${String(seconds).padStart(2, '0')}s`);
      }, 1000);
      const now = Date.now();
      const diff = endTime - now;
      if (diff > 0) {
        const remainingSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        setTimeRemaining(`${minutes}m ${String(seconds).padStart(2, '0')}s`);
      } else {
        setTimeRemaining('');
        setProgress(100);
      }
      return () => clearInterval(interval);
    } else {
      setProgress(0);
      setTimeRemaining('');
    }
  }, [currentJob, refreshPlayerData]);

  useEffect(() => {
    const ingredients = ingredientSlots.filter(Boolean) as InventoryItem[];
    if (ingredients.length === 0) {
      setMatchedRecipe(null);
      return;
    }
    const getSignature = (items: { item_id: number }[]) => items.map(i => i.item_id).sort().join(',');
    const slotSignature = getSignature(ingredients);
    for (const recipe of recipes) {
      const recipeIngredients = [
        recipe.ingredient1_id && { item_id: recipe.ingredient1_id, quantity: recipe.ingredient1_quantity },
        recipe.ingredient2_id && { item_id: recipe.ingredient2_id, quantity: recipe.ingredient2_quantity },
        recipe.ingredient3_id && { item_id: recipe.ingredient3_id, quantity: recipe.ingredient3_quantity },
      ].filter(Boolean) as { item_id: number, quantity: number }[];
      if (getSignature(recipeIngredients) === slotSignature) {
        const hasEnough = recipeIngredients.every(req => {
          const slotItem = ingredients.find(i => i.item_id === req.item_id);
          return slotItem && slotItem.quantity >= req.quantity;
        });
        if (hasEnough) {
          setMatchedRecipe(recipe);
          return;
        }
      }
    }
    setMatchedRecipe(null);
  }, [ingredientSlots, recipes]);

  useEffect(() => {
    if (matchedRecipe) {
      const item = items.find(i => i.id === matchedRecipe.result_item_id);
      setResultItem(item || null);
    } else {
      setResultItem(null);
    }
  }, [matchedRecipe, items]);

  const maxCraftQuantity = useMemo(() => {
    if (!matchedRecipe) return 0;
    const resultItemDef = items.find(i => i.id === matchedRecipe.result_item_id);
    if (resultItemDef && !resultItemDef.stackable && optimisticOutputItem) return 0;
    const recipeIngredients = [
      { id: matchedRecipe.ingredient1_id, quantity: matchedRecipe.ingredient1_quantity },
      { id: matchedRecipe.ingredient2_id, quantity: matchedRecipe.ingredient2_quantity },
      { id: matchedRecipe.ingredient3_id, quantity: matchedRecipe.ingredient3_quantity },
    ].filter(ing => ing.id !== null && ing.quantity! > 0) as { id: number, quantity: number }[];
    if (recipeIngredients.length === 0) return 99;
    const craftCounts = recipeIngredients.map(req => {
        const totalAvailable = optimisticWorkbenchItems.filter(i => i.item_id === req.id).reduce((sum, item) => sum + item.quantity, 0);
        return Math.floor(totalAvailable / req.quantity);
    });
    const max = Math.min(...craftCounts);
    if (resultItemDef && !resultItemDef.stackable) return Math.min(max, 1);
    return max;
  }, [matchedRecipe, optimisticWorkbenchItems, optimisticOutputItem, items]);

  useEffect(() => {
    if (craftQuantity > maxCraftQuantity) setCraftQuantity(maxCraftQuantity > 0 ? maxCraftQuantity : 1);
    if (maxCraftQuantity === 0 && craftQuantity !== 1) setCraftQuantity(1);
  }, [maxCraftQuantity, craftQuantity]);

  const handleStartBatchCraft = useCallback(async () => {
    if (!matchedRecipe || !construction || craftQuantity <= 0) return;
    const queueKey = getQueueKey(construction.id);
    if (queueKey) localStorage.setItem(queueKey, String(craftQuantity));
    setCraftsRemaining(craftQuantity);
    const success = await startCraft(matchedRecipe);
    if (!success) {
      setCraftsRemaining(0);
      if (queueKey) localStorage.removeItem(queueKey);
    } else {
      onUpdate();
    }
  }, [matchedRecipe, construction, craftQuantity, startCraft, onUpdate]);

  const handleCancelCraft = async () => {
    setCraftsRemaining(0);
    const queueKey = getQueueKey(construction?.id);
    if (queueKey) localStorage.removeItem(queueKey);
    if (!construction) return;
    setIsLoadingAction(true);
    setCurrentJob(null);
    const { error } = await supabase.rpc('cancel_crafting_job', { p_workbench_id: construction.id });
    if (error) showError(error.message);
    else showSuccess("Fabrication annulée.");
    await refreshPlayerData();
    setIsLoadingAction(false);
  };

  const handleCollectOutput = async () => {
    if (!construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: construction.id });
    setIsLoadingAction(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet récupéré !");
      onUpdate();
    }
  };

  const handleTransferFromWorkbench = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    const { error } = await supabase.rpc('move_item_from_workbench', { p_workbench_item_id: item.id, p_quantity_to_move: quantity, p_target_slot: -1 });
    if (error) showError(error.message);
    else {
      showSuccess("Transfert réussi.");
      await onUpdate();
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-slate-900/50">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hammer className="w-7 h-7 text-white" />
              <h2 className="text-white font-mono tracking-wider uppercase text-xl">Établi</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsBlueprintModalOpen(true)}>
              <BookOpen className="w-4 h-4 mr-2" /> Blueprints
            </Button>
          </div>
        </div>
        <div className="py-4 px-4 flex-grow overflow-y-auto no-scrollbar flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-black/20 rounded-lg p-4 border border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {/* Ingredients */}
                <div className="grid grid-cols-3 gap-2">
                  {ingredientSlots.map((item, index) => (
                    <div key={item?.id || index} className="w-16 h-16">
                      <InventorySlot
                        item={item}
                        index={index}
                        isUnlocked={true}
                        onDragStart={() => {}}
                        onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'crafting' })}
                        isBeingDragged={false}
                        isDragOver={false}
                        isLocked={!!currentJob || craftsRemaining > 0}
                      />
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-6 h-6 text-gray-500 shrink-0 sm:rotate-0 -rotate-90" />

                {/* Result */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-20 h-20 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center">
                    {currentJob ? (
                      <>
                        <ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} className="grayscale opacity-50" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      </>
                    ) : optimisticOutputItem ? (
                      <>
                        <ItemIcon iconName={getIconUrl(optimisticOutputItem.items?.icon) || optimisticOutputItem.items?.icon} alt={optimisticOutputItem.items?.name || ''} />
                        <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                          x{optimisticOutputItem.quantity}
                        </span>
                      </>
                    ) : resultItem ? (
                      <>
                        <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                        {matchedRecipe && resultItem.stackable && (
                          <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                            x{craftQuantity * matchedRecipe.result_quantity}
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                  {optimisticOutputItem && (
                    <Button onClick={handleCollectOutput} disabled={isLoadingAction} size="sm" className="flex items-center gap-2">
                      {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Récupérer
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-700">
                <div className="h-auto flex flex-col justify-center items-center space-y-2">
                  {currentJob || craftsRemaining > 0 ? (
                    <div className="w-full space-y-2 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={currentJob ? progress : 0} className="flex-grow" />
                        <Button size="icon" variant="destructive" onClick={handleCancelCraft} disabled={isLoadingAction}>
                          <Square className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-center text-sm text-gray-300 font-mono h-5 flex items-center justify-center">
                        {isLoadingAction && !currentJob ? <Loader2 className="w-4 h-4 animate-spin" /> : currentJob && timeRemaining ? <span>{timeRemaining}</span> : craftsRemaining > 0 ? <span className="text-xs">En attente ({craftsRemaining})</span> : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      {matchedRecipe && maxCraftQuantity > 0 ? (
                        <div className="w-full px-4 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>Quantité: <span className="font-bold text-white">{craftQuantity}</span></span>
                          </div>
                          <Slider value={[craftQuantity]} onValueChange={(value) => setCraftQuantity(value[0])} min={1} max={maxCraftQuantity} step={1} disabled={isLoadingAction} />
                          <Button onClick={handleStartBatchCraft} disabled={!matchedRecipe || isLoadingAction || craftQuantity === 0} className="w-full">
                            {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : `Fabriquer ${craftQuantity}x`}
                          </Button>
                        </div>
                      ) : matchedRecipe ? (
                        <p className="text-center text-xs text-yellow-400 px-4">
                          {resultItem && !resultItem.stackable && optimisticOutputItem ? "Collectez l'objet pour fabriquer." : "Ressources insuffisantes."}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Placez des ingrédients pour voir les recettes.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 flex-shrink-0 mt-auto">
          <Button variant="destructive" onClick={() => onDemolish(construction)}>
            <Trash2 className="w-4 h-4 mr-2" /> Détruire l'établi
          </Button>
        </div>
      </div>
      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem?.item || null}
        source={detailedItem?.source}
        onUse={() => showError("Vous ne pouvez pas utiliser un objet depuis l'établi.")}
        onDropOne={() => {}}
        onDropAll={() => {}}
        onUpdate={onUpdate}
        onTransferFromWorkbench={handleTransferFromWorkbench}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchView;