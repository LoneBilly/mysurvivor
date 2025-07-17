import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import { BaseConstruction, CraftingRecipe, InventoryItem, CraftingJob } from "@/types/game";

export const useWorkbench = (construction: BaseConstruction | null, onUpdate: (silent?: boolean) => void) => {
  const { playerData, setPlayerData, items, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

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
    if (!currentJob || !currentJob.craft_time_seconds) {
      setProgress(0);
      setTimeRemaining('');
      return;
    }
    
    const currentItemEndTime = new Date(currentJob.ends_at).getTime();
    const currentItemDuration = currentJob.craft_time_seconds * 1000;
    const currentItemStartTime = currentItemEndTime - currentItemDuration;

    if (currentItemDuration <= 0) {
        setProgress(100);
        setTimeRemaining('');
        return;
    }

    let animationFrameId: number;
    const updateTimer = () => {
      const now = Date.now();
      const elapsedTime = now - currentItemStartTime;
      const diff = currentItemEndTime - now;

      if (diff <= 0) {
        cancelAnimationFrame(animationFrameId);
        setProgress(100);
        setTimeRemaining('');
        return;
      }

      const newProgress = Math.min(100, (elapsedTime / currentItemDuration) * 100);
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
  }, [currentJob]);

  const startCraft = useCallback(async (quantity: number) => {
    if (!matchedRecipe || !construction || quantity <= 0 || !resultItem) return;
    
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    // Optimistic UI Update
    const tempJobId = Date.now();
    const newJob: CraftingJob = {
      id: tempJobId,
      workbench_id: construction.id,
      player_id: playerData.playerState.id,
      recipe_id: matchedRecipe.id,
      started_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + matchedRecipe.craft_time_seconds * 1000).toISOString(),
      status: 'in_progress',
      result_item_id: resultItem.id,
      result_quantity: matchedRecipe.result_quantity,
      result_item_name: resultItem.name,
      result_item_icon: resultItem.icon || '',
      quantity: quantity,
      initial_quantity: quantity,
      craft_time_seconds: matchedRecipe.craft_time_seconds,
    };

    const newWorkbenchItems = [...playerData.workbenchItems];
    const recipeSlots = [
      { id: matchedRecipe.slot1_item_id, quantity: matchedRecipe.slot1_quantity },
      { id: matchedRecipe.slot2_item_id, quantity: matchedRecipe.slot2_quantity },
      { id: matchedRecipe.slot3_item_id, quantity: matchedRecipe.slot3_quantity },
    ];

    for (let i = 0; i < 3; i++) {
      const recipeSlot = recipeSlots[i];
      if (recipeSlot.id && recipeSlot.quantity) {
        const itemIndex = newWorkbenchItems.findIndex(item => item.slot_position === i);
        if (itemIndex !== -1) {
          newWorkbenchItems[itemIndex].quantity -= recipeSlot.quantity * quantity;
        }
      }
    }

    setPlayerData(prev => ({
      ...prev,
      craftingJobs: [...(prev.craftingJobs || []), newJob],
      workbenchItems: newWorkbenchItems.filter(item => item.quantity > 0),
    }));

    const { error } = await supabase.rpc('start_craft', { 
      p_workbench_id: construction.id, 
      p_recipe_id: matchedRecipe.id,
      p_quantity: quantity
    });
    
    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData); // Revert on error
    } else {
      onUpdate(true); // Refresh with real data
    }
  }, [matchedRecipe, construction, onUpdate, playerData, setPlayerData, resultItem]);

  const cancelCraft = async () => {
    if (!construction || !currentJob) return;
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    setPlayerData(prev => ({
      ...prev,
      craftingJobs: prev.craftingJobs?.filter(job => job.id !== currentJob.id)
    }));

    const { error } = await supabase.rpc('cancel_crafting_job', { p_workbench_id: construction.id });
    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      showSuccess("Fabrication annulée.");
      onUpdate(true);
    }
  };

  const collectOutput = async () => {
    if (!construction || !outputItem || !outputItem.items) return { inventoryFull: false };

    const isStackable = outputItem.items.stackable;
    const existingStackIndex = playerData.inventory.findIndex(invItem => invItem.item_id === outputItem.item_id);
    const hasEmptySlot = playerData.inventory.length < playerData.playerState.unlocked_slots;

    if (!hasEmptySlot && !(isStackable && existingStackIndex !== -1)) {
        showError("Votre inventaire est plein. Libérez de l'espace pour récupérer votre butin.");
        return { inventoryFull: true };
    }

    const originalPlayerData = JSON.parse(JSON.stringify(playerData));

    // Optimistic UI Update
    const newPlayerData = JSON.parse(JSON.stringify(playerData));
    const constructionIndex = newPlayerData.baseConstructions.findIndex((c: BaseConstruction) => c.id === construction.id);
    if (constructionIndex !== -1) {
      newPlayerData.baseConstructions[constructionIndex].output_item_id = null;
      newPlayerData.baseConstructions[constructionIndex].output_quantity = null;
    }
    if (isStackable && existingStackIndex !== -1) {
      newPlayerData.inventory[existingStackIndex].quantity += outputItem.quantity;
    } else {
      const firstEmptySlot = Array.from({ length: newPlayerData.playerState.unlocked_slots }, (_, i) => i)
                                  .find(slot => !newPlayerData.inventory.some((item: InventoryItem) => item.slot_position === slot));
      if (firstEmptySlot !== undefined) {
        newPlayerData.inventory.push({ ...outputItem, slot_position: firstEmptySlot });
      }
    }
    setPlayerData(newPlayerData);

    const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: construction.id });
    
    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
      if (error.message.includes("Votre inventaire est plein")) return { inventoryFull: true };
    } else {
      showSuccess("Objet récupéré !");
      onUpdate(true);
    }
    return { inventoryFull: false };
  };

  const discardOutput = async () => {
    if (!construction) return;
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    
    setPlayerData(prev => ({
      ...prev,
      baseConstructions: prev.baseConstructions.map(c => c.id === construction.id ? { ...c, output_item_id: null, output_quantity: null } : c)
    }));

    const { error } = await supabase.rpc('discard_workbench_output', { p_workbench_id: construction.id });
    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      showSuccess("Objet jeté.");
      onUpdate(true);
    }
  };

  const moveItemToInventory = async (workbenchItemId: number, quantity: number) => {
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const itemToMove = playerData.workbenchItems.find(item => item.id === workbenchItemId);
    if (!itemToMove) return;

    setPlayerData(prev => {
      const newWorkbenchItems = prev.workbenchItems.filter(item => item.id !== workbenchItemId);
      const newInventory = [...prev.inventory, { ...itemToMove, slot_position: -1 }]; // Placeholder slot
      return { ...prev, workbenchItems: newWorkbenchItems, inventory: newInventory };
    });

    const { error } = await supabase.rpc('move_item_from_workbench_to_inventory', {
      p_workbench_item_id: workbenchItemId,
      p_quantity_to_move: quantity,
    });
    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      showSuccess("Objet retourné à l'inventaire.");
      onUpdate(true);
    }
  };

  const moveItemFromInventory = async (inventoryItemId: number, quantity: number, targetSlot: number) => {
    if (!construction) return;
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const itemToMove = playerData.inventory.find(item => item.id === inventoryItemId);
    if (!itemToMove) return;

    setPlayerData(prev => {
      const newInventory = prev.inventory.filter(item => item.id !== inventoryItemId);
      const newWorkbenchItems = [...prev.workbenchItems, { ...itemToMove, slot_position: targetSlot, workbench_id: construction.id }];
      return { ...prev, inventory: newInventory, workbenchItems: newWorkbenchItems };
    });

    const { error } = await supabase.rpc('move_item_to_workbench', {
      p_inventory_id: inventoryItemId,
      p_workbench_id: construction.id,
      p_quantity_to_move: quantity,
      p_target_slot: targetSlot
    });
    if (error) {
      showError(error.message);
      setPlayerData(originalPlayerData);
    } else {
      showSuccess("Objet transféré.");
      onUpdate(true);
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