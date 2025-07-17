import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import { BaseConstruction, CraftingRecipe, InventoryItem } from "@/types/game";

export const useWorkbench = (construction: BaseConstruction | null, onUpdate: (silent?: boolean) => void) => {
  const { playerData, items, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const timerCompletedRef = useRef(false);

  const currentJob = useMemo(() => {
    if (!construction) return null;
    return playerData.craftingJobs?.find(j => j.workbench_id === construction.id) || null;
  }, [playerData.craftingJobs, construction]);

  const workbenchItems = useMemo(() => 
    playerData.workbenchItems.filter(item => item.workbench_id === construction?.id),
    [playerData.workbenchItems, construction]
  );

  const outputItem = useMemo(() => {
    if (!construction) return null;
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
        } as InventoryItem;
      }
    }
    return null;
  }, [playerData.baseConstructions, construction, items]);

  const ingredientSlots = useMemo(() => {
    const slots: (InventoryItem | null)[] = Array(3).fill(null);
    workbenchItems.forEach(item => {
        if (item.slot_position >= 0 && item.slot_position < 3) {
            slots[item.slot_position] = item;
        }
    });
    return slots;
  }, [workbenchItems]);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const matchedRecipe = useMemo(() => {
    for (const recipe of recipes) {
      const recipeSlots = [
        { id: recipe.slot1_item_id, quantity: recipe.slot1_quantity },
        { id: recipe.slot2_item_id, quantity: recipe.slot2_quantity },
        { id: recipe.slot3_item_id, quantity: recipe.slot3_quantity },
      ];

      let isMatch = true;
      for (let i = 0; i < 3; i++) {
        const workbenchItem = ingredientSlots[i];
        const recipeItem = recipeSlots[i];

        if ((recipeItem.id && !workbenchItem) || (!recipeItem.id && workbenchItem)) {
          isMatch = false;
          break;
        }

        if (recipeItem.id && workbenchItem) {
          if (workbenchItem.item_id !== recipeItem.id || workbenchItem.quantity < (recipeItem.quantity || 1)) {
            isMatch = false;
            break;
          }
        }
      }
      if (isMatch) return recipe;
    }
    return null;
  }, [ingredientSlots, recipes]);

  const resultItem = useMemo(() => {
    if (matchedRecipe) {
      return items.find(i => i.id === matchedRecipe.result_item_id) || null;
    }
    return null;
  }, [matchedRecipe, items]);

  const maxCraftQuantity = useMemo(() => {
    if (!matchedRecipe) return 0;
    const resultItemDef = items.find(i => i.id === matchedRecipe.result_item_id);
    if (resultItemDef && !resultItemDef.stackable && outputItem) return 0;

    const recipeSlots = [
        { id: matchedRecipe.slot1_item_id, quantity: matchedRecipe.slot1_quantity },
        { id: matchedRecipe.slot2_item_id, quantity: matchedRecipe.slot2_quantity },
        { id: matchedRecipe.slot3_item_id, quantity: matchedRecipe.slot3_quantity },
    ];

    const craftCounts: number[] = [];
    for (let i = 0; i < 3; i++) {
        const recipeSlot = recipeSlots[i];
        const workbenchSlot = ingredientSlots[i];

        if (recipeSlot.id && recipeSlot.quantity) {
            if (!workbenchSlot || workbenchSlot.item_id !== recipeSlot.id || workbenchSlot.quantity < recipeSlot.quantity) {
                return 0;
            }
            craftCounts.push(Math.floor(workbenchSlot.quantity / recipeSlot.quantity));
        }
    }

    if (craftCounts.length === 0) return 99;

    const max = Math.min(...craftCounts);
    if (resultItemDef && !resultItemDef.stackable) return Math.min(max, 1);
    return max;
  }, [matchedRecipe, ingredientSlots, outputItem, items]);

  useEffect(() => {
    if (!currentJob) {
      setProgress(0);
      setTimeRemaining('');
      return;
    }

    timerCompletedRef.current = false;
    const startTime = new Date(currentJob.started_at).getTime();
    const endTime = new Date(currentJob.ends_at).getTime();
    const totalDuration = endTime - startTime;

    if (totalDuration <= 0) {
        setProgress(100);
        setTimeRemaining('');
        if (!timerCompletedRef.current) {
            timerCompletedRef.current = true;
            refreshPlayerData();
        }
        return;
    }

    let animationFrameId: number;
    const updateTimer = () => {
      const now = Date.now();
      const elapsedTime = now - startTime;
      const diff = endTime - now;

      if (diff <= 0) {
        cancelAnimationFrame(animationFrameId);
        setProgress(100);
        setTimeRemaining('');
        if (!timerCompletedRef.current) {
          timerCompletedRef.current = true;
          refreshPlayerData();
        }
        return;
      }

      const newProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
      setProgress(newProgress);

      const remainingSeconds = Math.ceil(diff / 1000);
      let formattedTime;
      if (remainingSeconds >= 60) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        formattedTime = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
      } else {
        formattedTime = `${remainingSeconds}s`;
      }
      setTimeRemaining(formattedTime);

      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentJob, refreshPlayerData]);

  const startCraft = useCallback(async (quantity: number) => {
    if (!matchedRecipe || !construction || quantity <= 0) return;
    
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', { 
      p_workbench_id: construction.id, 
      p_recipe_id: matchedRecipe.id,
      p_quantity: quantity
    });
    setIsLoadingAction(false);
    
    if (error) showError(error.message);
    else onUpdate();
  }, [matchedRecipe, construction, onUpdate]);

  const cancelCraft = async () => {
    if (!construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('cancel_crafting_job', { p_workbench_id: construction.id });
    if (error) showError(error.message);
    else showSuccess("Fabrication annulée.");
    await refreshPlayerData();
    setIsLoadingAction(false);
  };

  const collectOutput = async () => {
    if (!construction) return { inventoryFull: false };
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: construction.id });
    setIsLoadingAction(false);
    if (error) {
      if (error.message.includes("Votre inventaire est plein")) {
        return { inventoryFull: true };
      }
      showError(error.message);
      return { inventoryFull: false };
    }
    showSuccess("Objet récupéré !");
    onUpdate();
    return { inventoryFull: false };
  };

  const discardOutput = async () => {
    if (!construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('discard_workbench_output', { p_workbench_id: construction.id });
    setIsLoadingAction(false);
    if (error) showError(error.message);
    else {
      showSuccess("Objet jeté.");
      onUpdate();
    }
  };

  const moveItemToInventory = async (workbenchItemId: number, quantity: number) => {
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('move_item_from_workbench_to_inventory', {
      p_workbench_item_id: workbenchItemId,
      p_quantity_to_move: quantity,
    });
    setIsLoadingAction(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet retourné à l'inventaire.");
      onUpdate();
    }
  };

  const moveItemFromInventory = async (inventoryItemId: number, quantity: number, targetSlot: number) => {
    if (!construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('move_item_to_workbench', {
      p_inventory_id: inventoryItemId,
      p_workbench_id: construction.id,
      p_quantity_to_move: quantity,
      p_target_slot: targetSlot
    });
    setIsLoadingAction(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet transféré.");
      onUpdate();
    }
  };

  return {
    isLoadingAction,
    currentJob,
    ingredientSlots,
    outputItem,
    matchedRecipe,
    resultItem,
    maxCraftQuantity,
    progress,
    timeRemaining,
    startCraft,
    cancelCraft,
    collectOutput,
    discardOutput,
    moveItemToInventory,
    moveItemFromInventory,
  };
};