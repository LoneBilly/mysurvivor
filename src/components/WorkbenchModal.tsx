import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, FullCraftingRecipe, CraftingJob } from "@/types/game";
import { Hammer, Trash2, Loader2, ArrowRight, Clock } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import { Progress } from "./ui/progress";
import ItemIcon from "./ItemIcon";

const MAX_INGREDIENTS = 3;

const Countdown = ({ job, onComplete }: { job: CraftingJob; onComplete: () => void }) => {
  const calculateState = useCallback(() => {
    const startTime = new Date(job.started_at).getTime();
    const endTime = new Date(job.ends_at).getTime();
    const now = Date.now();
    
    if (now >= endTime) return { remaining: 'Terminé', progress: 100, isFinished: true };
    
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const progress = Math.min(100, (elapsed / totalDuration) * 100);
    
    const diff = endTime - now;
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const remaining = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    return { remaining, progress, isFinished: false };
  }, [job]);

  const [state, setState] = useState(calculateState);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (state.isFinished) {
      setTimeout(() => onCompleteRef.current(), 1000);
      return;
    }
    const interval = setInterval(() => setState(calculateState()), 1000);
    return () => clearInterval(interval);
  }, [state.isFinished, calculateState]);

  return (
    <div className="w-full space-y-2">
      <Progress value={state.progress} />
      <div className="flex justify-between text-xs text-gray-400">
        <span>Progression</span>
        <span className="font-mono">{state.remaining}</span>
      </div>
    </div>
  );
};

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, getIconUrl } = useGame();
  const [recipes, setRecipes] = useState<FullCraftingRecipe[]>([]);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>(Array(MAX_INGREDIENTS).fill(null));
  const [matchedRecipe, setMatchedRecipe] = useState<FullCraftingRecipe | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecipesAndJob = useCallback(async () => {
    if (!construction) return;
    setLoading(true);
    try {
      const [recipesRes, jobRes] = await Promise.all([
        supabase.from('crafting_recipes').select('*, result_item:items!result_item_id(*), ingredient1:items!ingredient1_id(*), ingredient2:items!ingredient2_id(*), ingredient3:items!ingredient3_id(*)'),
        supabase.from('crafting_jobs').select('*, crafting_recipes(result_item_id, result_quantity, items(name, icon))').eq('workbench_id', construction.id).maybeSingle()
      ]);

      if (recipesRes.error) throw recipesRes.error;
      if (jobRes.error) throw jobRes.error;

      const formattedRecipes = recipesRes.data.map((r: any) => ({
        id: r.id,
        craft_time_seconds: r.craft_time_seconds,
        result_item_id: r.result_item_id,
        result_quantity: r.result_quantity,
        result_item: r.result_item,
        ingredients: [
          r.ingredient1 && { item_id: r.ingredient1_id, quantity: r.ingredient1_quantity, item: r.ingredient1 },
          r.ingredient2 && { item_id: r.ingredient2_id, quantity: r.ingredient2_quantity, item: r.ingredient2 },
          r.ingredient3 && { item_id: r.ingredient3_id, quantity: r.ingredient3_quantity, item: r.ingredient3 },
        ].filter(Boolean)
      }));
      setRecipes(formattedRecipes);
      setCraftingJob(jobRes.data as CraftingJob | null);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [construction]);

  useEffect(() => {
    if (isOpen) {
      fetchRecipesAndJob();
    } else {
      setIngredientSlots(Array(MAX_INGREDIENTS).fill(null));
      setMatchedRecipe(null);
    }
  }, [isOpen, fetchRecipesAndJob]);

  useEffect(() => {
    const currentIngredients = ingredientSlots.filter(Boolean).map(i => ({ item_id: i!.item_id, quantity: i!.quantity }));
    if (currentIngredients.length === 0) {
      setMatchedRecipe(null);
      return;
    }

    const findRecipe = recipes.find(recipe => {
      if (recipe.ingredients.length !== currentIngredients.length) return false;
      const recipeIngredients = [...recipe.ingredients];
      const tempCurrentIngredients = [...currentIngredients];

      for (let i = 0; i < recipeIngredients.length; i++) {
        const recipeIng = recipeIngredients[i];
        const matchIndex = tempCurrentIngredients.findIndex(currIng => currIng.item_id === recipeIng.item_id && currIng.quantity >= recipeIng.quantity);
        if (matchIndex === -1) return false;
        tempCurrentIngredients.splice(matchIndex, 1);
      }
      return tempCurrentIngredients.length === 0;
    });

    setMatchedRecipe(findRecipe || null);
  }, [ingredientSlots, recipes]);

  const handleDrop = (fromSource: 'inventory' | 'workbench', fromIndex: number, toSource: 'inventory' | 'workbench', toIndex: number) => {
    if (fromSource === 'inventory' && toSource === 'workbench') {
      const item = playerData.inventory.find(i => i.slot_position === fromIndex);
      if (item) {
        const newSlots = [...ingredientSlots];
        newSlots[toIndex] = item;
        setIngredientSlots(newSlots);
      }
    } else if (fromSource === 'workbench' && toSource === 'workbench') {
      const newSlots = [...ingredientSlots];
      const temp = newSlots[fromIndex];
      newSlots[fromIndex] = newSlots[toIndex];
      newSlots[toIndex] = temp;
      setIngredientSlots(newSlots);
    } else if (fromSource === 'workbench' && toSource === 'inventory') {
      const newSlots = [...ingredientSlots];
      newSlots[fromIndex] = null;
      setIngredientSlots(newSlots);
    }
  };

  const handleStartCraft = async () => {
    if (!matchedRecipe || !construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication lancée !");
      setIngredientSlots(Array(MAX_INGREDIENTS).fill(null));
      setMatchedRecipe(null);
      await onUpdate();
      await fetchRecipesAndJob();
    }
    setLoading(false);
  };

  const handleCollectItem = async () => {
    if (!craftingJob) return;
    setLoading(true);
    const { error } = await supabase.rpc('collect_crafted_item', { p_job_id: craftingJob.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet récupéré !");
      setCraftingJob(null);
      await onUpdate();
    }
    setLoading(false);
  };

  const renderGrid = (title: string, items: (InventoryItem | null)[], totalSlots: number, type: 'inventory' | 'workbench') => (
    <div className="flex flex-col">
      <h3 className="text-center font-bold mb-2">{title}</h3>
      <div className="flex-grow bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 content-start">
        {Array.from({ length: totalSlots }).map((_, index) => {
          const item = items.find(i => i?.slot_position === index) || (type === 'workbench' ? ingredientSlots[index] : null);
          return (
            <div key={index} onDrop={(e) => { e.preventDefault(); const data = JSON.parse(e.dataTransfer.getData("application/json")); handleDrop(data.source, data.index, type, index); }} onDragOver={(e) => e.preventDefault()}>
              <InventorySlot
                item={item}
                index={index}
                isUnlocked={type === 'workbench' || index < playerData.playerState.unlocked_slots}
                onDragStart={(idx, node, e) => { const data = JSON.stringify({ source: type, index: idx }); e.dataTransfer.setData("application/json", data); }}
                onItemClick={() => {}}
                isBeingDragged={false}
                isDragOver={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWorkbench = () => (
    <div className="flex flex-col h-full">
      <h3 className="text-center font-bold mb-2">Établi</h3>
      <div className="flex-grow bg-black/20 rounded-lg p-4 border border-slate-700 flex flex-col justify-between items-center gap-4">
        {craftingJob && craftingJob.status === 'in_progress' ? (
          <div className="w-full text-center space-y-4">
            <p>Fabrication en cours...</p>
            <Countdown job={craftingJob} onComplete={fetchRecipesAndJob} />
          </div>
        ) : craftingJob && craftingJob.status === 'completed' ? (
          <div className="w-full text-center space-y-4">
            <p className="font-bold">Fabrication terminée !</p>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-slate-700/50 rounded-md flex items-center justify-center relative">
                <ItemIcon iconName={getIconUrl(craftingJob.crafting_recipes?.items.icon || null) || craftingJob.crafting_recipes?.items.icon} alt={craftingJob.crafting_recipes?.items.name || ''} />
                <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                  x{craftingJob.crafting_recipes?.result_quantity}
                </span>
              </div>
            </div>
            <Button onClick={handleCollectItem} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : "Récupérer"}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: MAX_INGREDIENTS }).map((_, index) => (
                <div key={index} onDrop={(e) => { e.preventDefault(); const data = JSON.parse(e.dataTransfer.getData("application/json")); handleDrop(data.source, data.index, 'workbench', index); }} onDragOver={(e) => e.preventDefault()}>
                  <InventorySlot item={ingredientSlots[index]} index={index} isUnlocked={true} onDragStart={(idx) => { const data = JSON.stringify({ source: 'workbench', index: idx }); e.dataTransfer.setData("application/json", data); }} onItemClick={() => {}} isBeingDragged={false} isDragOver={false} />
                </div>
              ))}
            </div>
            <ArrowRight className="w-8 h-8 text-gray-500" />
            <div className="w-20 h-20 bg-slate-700/50 rounded-md flex items-center justify-center relative">
              {matchedRecipe && (
                <>
                  <ItemIcon iconName={getIconUrl(matchedRecipe.result_item.icon) || matchedRecipe.result_item.icon} alt={matchedRecipe.result_item.name} />
                  <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                    x{matchedRecipe.result_quantity}
                  </span>
                </>
              )}
            </div>
            <div className="w-full text-center space-y-2">
              {matchedRecipe && <div className="flex items-center justify-center gap-2 text-sm text-gray-400"><Clock size={14} /><span>{matchedRecipe.craft_time_seconds}s</span></div>}
              <Button onClick={handleStartCraft} disabled={!matchedRecipe || loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : "Fabriquer"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Hammer className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Établi</DialogTitle>
          </div>
        </DialogHeader>
        <div className="relative flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 min-h-0">
          {renderWorkbench()}
          {renderGrid("Votre inventaire", playerData.inventory, playerData.playerState.unlocked_slots, 'inventory')}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={() => onDemolish(construction!)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Détruire l'établi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchModal;