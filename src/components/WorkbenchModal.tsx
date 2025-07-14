"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen, Square } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showInfo } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import { Progress } from "./ui/progress";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";
import { useAuth } from "@/contexts/AuthContext";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { user } = useAuth();
  const { playerData, setPlayerData, items, getIconUrl } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<InventoryItem[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' | 'output' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  
  const [isContinuousCrafting, setIsContinuousCrafting] = useState(false);
  const [maxCraftCount, setMaxCraftCount] = useState(0);
  const [currentCraftCount, setCurrentCraftCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const craftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [remainingTimeInCurrentCraft, setRemainingTimeInCurrentCraft] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  const [potentialOutputQuantity, setPotentialOutputQuantity] = useState(0);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; from: 'inventory' | 'crafting' | 'output'; fromIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'crafting'; index: number } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

  const fetchWorkbenchItems = useCallback(async () => {
    if (!construction) return;
    const { data, error } = await supabase
        .from('workbench_items')
        .select('*, items(*)')
        .eq('workbench_id', construction.id);
    
    if (error) {
        showError("Impossible de charger le contenu de l'établi.");
    } else {
        setWorkbenchItems(data as InventoryItem[]);
    }
  }, [construction]);

  // Derived state for outputSlot from construction prop
  const outputSlot: InventoryItem | null = useMemo(() => {
    if (!construction || !construction.output_item_id || !construction.output_quantity) {
        return null;
    }
    const itemDef = items.find(i => i.id === construction.output_item_id);
    if (!itemDef) return null;

    return {
        id: -1, // Dummy ID as it's not a real inventory item yet
        item_id: itemDef.id,
        quantity: construction.output_quantity,
        slot_position: -1, // Dummy slot position
        items: itemDef,
    };
  }, [construction, items]);

  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
      fetchWorkbenchItems();
    } else {
      setIngredientSlots([null, null, null]);
      setWorkbenchItems([]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setIsContinuousCrafting(false);
      if (craftTimerRef.current) clearInterval(craftTimerRef.current);
      setRemainingTimeInCurrentCraft(0);
      setProgress(0);
    }
  }, [isOpen, fetchRecipes, fetchWorkbenchItems]);

  useEffect(() => {
    const newSlots = Array(3).fill(null);
    workbenchItems.forEach(item => {
        if (item.slot_position >= 0 && item.slot_position < 3) {
            newSlots[item.slot_position] = item;
        }
    });
    setIngredientSlots(newSlots);
  }, [workbenchItems]);

  useEffect(() => {
    if (isContinuousCrafting) return;

    const ingredients = ingredientSlots.filter(Boolean) as InventoryItem[];
    if (ingredients.length === 0) {
      setMatchedRecipe(null);
      setPotentialOutputQuantity(0);
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
          const craftableCounts = [
            recipe.ingredient1_id ? Math.floor((ingredients.find(i => i.item_id === recipe.ingredient1_id)?.quantity || 0) / recipe.ingredient1_quantity) : Infinity,
            recipe.ingredient2_id ? Math.floor((ingredients.find(i => i.item_id === recipe.ingredient2_id)?.quantity || 0) / recipe.ingredient2_quantity) : Infinity,
            recipe.ingredient3_id ? Math.floor((ingredients.find(i => i.item_id === recipe.ingredient3_id)?.quantity || 0) / recipe.ingredient3_quantity) : Infinity,
          ].filter(c => isFinite(c));
          const maxPossible = craftableCounts.length > 0 ? Math.min(...craftableCounts) : 0;
          setPotentialOutputQuantity(maxPossible * recipe.result_quantity);
          return;
        }
      }
    }
    setMatchedRecipe(null);
    setPotentialOutputQuantity(0);
  }, [ingredientSlots, recipes, isContinuousCrafting]);

  useEffect(() => {
    if (matchedRecipe) {
      const item = items.find(i => i.id === matchedRecipe.result_item_id);
      setResultItem(item || null);
    } else {
      setResultItem(null);
    }
  }, [matchedRecipe, items]);

  const handleStopCrafting = () => {
    setIsContinuousCrafting(false);
    if (craftTimerRef.current) {
      clearInterval(craftTimerRef.current);
      craftTimerRef.current = null;
    }
    setProgress(0);
    setRemainingTimeInCurrentCraft(0);
    showInfo("Fabrication arrêtée.");
  };

  const startCraftingCycle = useCallback(async () => {
    if (!matchedRecipe || !construction || !user) {
        handleStopCrafting();
        return;
    }

    // Check if we have enough ingredients for the next craft
    const hasEnough = [
        matchedRecipe.ingredient1_id && { id: matchedRecipe.ingredient1_id, quantity: matchedRecipe.ingredient1_quantity },
        matchedRecipe.ingredient2_id && { id: matchedRecipe.ingredient2_id, quantity: matchedRecipe.ingredient2_quantity },
        matchedRecipe.ingredient3_id && { id: matchedRecipe.ingredient3_id, quantity: matchedRecipe.ingredient3_quantity },
    ].filter(Boolean).every(req => {
        const slotItem = ingredientSlots.find(i => i?.item_id === req.id);
        return slotItem && slotItem.quantity >= req.quantity;
    });

    if (!hasEnough) {
        showInfo("Ingrédients insuffisants pour continuer la fabrication.");
        handleStopCrafting();
        return;
    }

    // Attempt to start the craft via RPC
    const { error: craftError } = await supabase.rpc('start_craft', {
        p_workbench_id: construction.id,
        p_recipe_id: matchedRecipe.id,
    });

    if (craftError) {
        showError(`Erreur lors du lancement de la fabrication: ${craftError.message}`);
        handleStopCrafting();
        return;
    }

    // Craft started successfully, update UI optimistically and refresh data
    setCurrentCraftCount(prev => prev + 1);
    setProgress(0); // Reset progress for the new cycle
    setRemainingTimeInCurrentCraft(matchedRecipe.craft_time_seconds); // Reset countdown

    // Refresh data after a short delay to allow DB to process job
    setTimeout(() => {
        onUpdate();
        fetchWorkbenchItems();
    }, 500); // Small delay to allow Supabase trigger to run
}, [matchedRecipe, construction, user, ingredientSlots, onUpdate, fetchWorkbenchItems]);

  const handleStartContinuousCraft = () => {
    if (!matchedRecipe || potentialOutputQuantity === 0) return;
    const maxPossible = potentialOutputQuantity / matchedRecipe.result_quantity;
    setMaxCraftCount(maxPossible);
    setCurrentCraftCount(0);
    setIsContinuousCrafting(true);
  };

  useEffect(() => {
    if (isContinuousCrafting && matchedRecipe && construction) {
        if (craftTimerRef.current) clearInterval(craftTimerRef.current); // Clear any existing timer

        let currentCycleStartTime = Date.now();
        const craftTime = matchedRecipe.craft_time_seconds * 1000;

        // Initial call
        startCraftingCycle();

        craftTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - currentCycleStartTime;
            const newProgress = Math.min(100, (elapsed / craftTime) * 100);
            setProgress(newProgress);
            setRemainingTimeInCurrentCraft(Math.max(0, Math.ceil((craftTime - elapsed) / 1000)));

            if (elapsed >= craftTime) {
                currentCycleStartTime = Date.now(); // Reset timer for next cycle
                startCraftingCycle(); // Start the next craft
            }
        }, 1000); // Update every second for countdown

    } else {
        if (craftTimerRef.current) {
            clearInterval(craftTimerRef.current);
            craftTimerRef.current = null;
        }
        setProgress(0);
        setRemainingTimeInCurrentCraft(0);
    }

    return () => {
        if (craftTimerRef.current) clearInterval(craftTimerRef.current);
    };
}, [isContinuousCrafting, matchedRecipe, construction, startCraftingCycle]);

  const handleFinalizeAndCollect = async (targetSlot: number | null = null) => {
    if (!outputSlot || !user || isCollecting || !construction) return;
    setIsCollecting(true);

    const { error: collectError } = await supabase.rpc('collect_workbench_output', { 
      p_workbench_id: construction.id, 
      p_target_slot: targetSlot
    });

    if (collectError) {
      showError(`Erreur lors de la collecte de l'objet: ${collectError.message}`);
      setIsCollecting(false);
      return;
    }

    showSuccess(`${outputSlot.quantity} ${outputSlot.items.name} ajoutés à l'inventaire.`);
    await onUpdate(); // Refresh player data and construction
    setIsCollecting(false);
  };

  const handleDropItem = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    let error;
    if (item.quantity > quantity) {
        ({ error } = await supabase.from('inventories').update({ quantity: item.quantity - quantity }).eq('id', item.id));
    } else {
        ({ error } = await supabase.from('inventories').delete().eq('id', item.id));
    }
    if (error) showError("Erreur lors de la suppression de l'objet.");
    else {
      showSuccess("Objet jeté.");
      onUpdate();
    }
  };

  const handleSplitItem = async (item: InventoryItem, quantity: number) => {
    if (!item) return;
    setDetailedItem(null);
    const { error } = await supabase.rpc('split_inventory_item', { p_inventory_id: item.id, p_split_quantity: quantity });
    if (error) showError(error.message || "Erreur lors de la division de l'objet.");
    else {
      showSuccess("La pile d'objets a été divisée.");
      onUpdate();
    }
  };

  const handleTransferToWorkbench = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    if (!construction) return;

    const existingSlot = workbenchItems.find(i => i.item_id === item.item_id);
    let targetSlot: number;

    if (existingSlot) {
        targetSlot = existingSlot.slot_position;
    } else {
        const existingSlots = workbenchItems.map(i => i.slot_position);
        let emptySlot = -1;
        for (let i = 0; i < 3; i++) {
            if (!existingSlots.includes(i)) {
                emptySlot = i;
                break;
            }
        }
        if (emptySlot === -1) {
            showError("L'établi est plein.");
            return;
        }
        targetSlot = emptySlot;
    }

    const { error } = await supabase.rpc('move_item_to_workbench', {
        p_inventory_id: item.id,
        p_workbench_id: construction.id,
        p_quantity_to_move: quantity,
        p_target_slot: targetSlot
    });

    if (error) {
        showError(error.message);
    } else {
        await onUpdate();
        await fetchWorkbenchItems();
    }
  };

  const handleTransferFromWorkbench = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    
    const usedInventorySlots = playerData.inventory.map(i => i.slot_position);
    let targetSlot = -1;
    for (let i = 0; i < playerData.playerState.unlocked_slots; i++) {
        if (!usedInventorySlots.includes(i)) {
            targetSlot = i;
            break;
        }
    }

    if (targetSlot === -1) {
        showError("Votre inventaire est plein.");
        return;
    }

    const { error } = await supabase.rpc('move_item_from_workbench', {
        p_workbench_item_id: item.id,
        p_quantity_to_move: quantity,
        p_target_slot: targetSlot
    });

    if (error) {
        showError(error.message);
    } else {
        await onUpdate();
        await fetchWorkbenchItems();
    }
  };

  const handleDragStart = (item: InventoryItem, from: 'inventory' | 'crafting' | 'output', fromIndex: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    if (isContinuousCrafting) return;
    e.preventDefault();
    setDraggedItem({ item, from, fromIndex });
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = '56px';
    ghostNode.style.height = '56px';
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  };

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }
    const elements = document.elementsFromPoint(clientX, clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index'));
    if (slotElement) {
      const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1', 10);
      const targetElement = (slotElement as HTMLElement).closest('[data-slot-target]');
      const target = targetElement?.getAttribute('data-slot-target') as 'inventory' | 'crafting' | undefined;
      if (index !== -1 && target) {
        setDragOver({ index, target });
        return;
      }
    }
    setDragOver(null);
  }, []);

  const handleDragEnd = async () => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }
    if (!draggedItem || !dragOver) {
      setDraggedItem(null);
      setDragOver(null);
      return;
    }
  
    const { from, fromIndex } = draggedItem;
    const { target, index: toIndex } = dragOver;
  
    setDraggedItem(null);
    setDragOver(null);
  
    if (from === target && fromIndex === toIndex) return;
  
    if (from === 'output' && target === 'inventory') {
      await handleFinalizeAndCollect(toIndex);
      return;
    }
  
    // --- Optimistic Update ---
    const originalInventory = playerData.inventory;
    const originalWorkbenchItems = workbenchItems;
  
    let newInventory = [...originalInventory];
    let newWorkbenchItems = [...originalWorkbenchItems];
  
    const fromItem = from === 'inventory' ? newInventory.find(i => i.slot_position === fromIndex) : newWorkbenchItems.find(i => i.slot_position === fromIndex);
    if (!fromItem) return;
  
    const toItem = target === 'inventory' ? newInventory.find(i => i.slot_position === toIndex) : newWorkbenchItems.find(i => i.slot_position === toIndex);
  
    // Remove from source
    if (from === 'inventory') newInventory = newInventory.filter(i => i.id !== fromItem.id);
    else newWorkbenchItems = newWorkbenchItems.filter(i => i.id !== fromItem.id);
  
    // Handle target item
    if (toItem) {
      if (target === 'inventory') newInventory = newInventory.filter(i => i.id !== toItem.id);
      else newWorkbenchItems = newWorkbenchItems.filter(i => i.id !== toItem.id);
      
      // Move target item to source slot
      if (from === 'inventory') newInventory.push({ ...toItem, slot_position: fromIndex });
      else newWorkbenchItems.push({ ...toItem, slot_position: fromIndex });
    }
  
    // Move dragged item to target slot
    if (target === 'inventory') newInventory.push({ ...fromItem, slot_position: toIndex });
    else newWorkbenchItems.push({ ...fromItem, slot_position: toIndex });
  
    // Apply optimistic update to UI
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setWorkbenchItems(newWorkbenchItems);
    // --- End Optimistic Update ---
  
    let rpcPromise;
    if (from === 'inventory' && target === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (from === 'crafting' && target === 'crafting') {
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_workbench_items', { p_workbench_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (from === 'inventory' && target === 'crafting') {
      if (!construction) return;
      rpcPromise = supabase.rpc('move_item_to_workbench', {
          p_inventory_id: fromItem.id,
          p_workbench_id: construction.id,
          p_quantity_to_move: fromItem.quantity,
          p_target_slot: toIndex
      });
    } else if (from === 'crafting' && target === 'inventory') {
      rpcPromise = supabase.rpc('move_item_from_workbench', {
          p_workbench_item_id: fromItem.id,
          p_quantity_to_move: fromItem.quantity,
          p_target_slot: toIndex
      });
    }
  
    if (rpcPromise) {
        const { error } = await rpcPromise;
        if (error) {
            showError(error.message);
            // Revert on error
            setPlayerData(prev => ({ ...prev, inventory: originalInventory }));
            setWorkbenchItems(originalWorkbenchItems);
        } else {
            // On success, re-fetch to ensure sync, especially for merges
            await onUpdate();
            await fetchWorkbenchItems();
        }
    }
  };

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();
    if (draggedItem) {
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
    }
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [draggedItem, handleDragMove, handleDragEnd]);

  // Calculate total craft time
  const totalCraftTimeSeconds = useMemo(() => {
    if (!matchedRecipe || potentialOutputQuantity === 0) return 0;
    const craftsPossible = potentialOutputQuantity / matchedRecipe.result_quantity;
    return craftsPossible * matchedRecipe.craft_time_seconds;
  }, [matchedRecipe, potentialOutputQuantity]);

  const renderCraftingInterface = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-center">Établi</h3>
          <Button variant="outline" size="sm" onClick={() => setIsBlueprintModalOpen(true)}>
            <BookOpen className="w-4 h-4 mr-2" /> Blueprints
          </Button>
        </div>
        <div className="bg-black/20 rounded-lg p-4 border border-slate-700 space-y-4">
          <div className="grid grid-cols-5 gap-2" data-slot-target="crafting">
            <div />
            {ingredientSlots.map((item, index) => (
              <div key={item?.id || index} data-slot-index={index}>
                <InventorySlot
                  item={item}
                  index={index}
                  isUnlocked={true}
                  onDragStart={(idx, node, e) => item && handleDragStart(item, 'crafting', idx, node, e)}
                  onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'crafting' })}
                  isBeingDragged={draggedItem?.from === 'crafting' && item?.id === draggedItem.item.id}
                  isDragOver={dragOver?.target === 'crafting' && dragOver?.index === index}
                />
              </div>
            ))}
            <div />
          </div>
          <div className="grid grid-cols-5 items-center gap-2">
            <div className="col-span-2 flex justify-end">
                <ArrowRight className="w-8 h-8 text-gray-500" />
            </div>
            <div className="relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center">
              {outputSlot ? (
                <InventorySlot 
                  item={outputSlot} 
                  index={0} 
                  isUnlocked={true} 
                  onDragStart={(idx, node, e) => outputSlot && handleDragStart(outputSlot, 'output', idx, node, e)} 
                  onItemClick={() => handleFinalizeAndCollect()}
                  isBeingDragged={draggedItem?.from === 'output'}
                  isDragOver={dragOver?.target === 'inventory' && dragOver?.index === 0} // Allow dropping output to first inventory slot
                />
              ) : !isContinuousCrafting && resultItem ? (
                <>
                  <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                  {potentialOutputQuantity > 0 && (
                    <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                      x{potentialOutputQuantity}
                    </span>
                  )}
                </>
              ) : null}
            </div>
            <div className="col-span-2" />
          </div>
          {matchedRecipe && !isContinuousCrafting && (
            <div className="text-center text-sm text-gray-300">
              <p>Temps total estimé: {totalCraftTimeSeconds}s</p>
            </div>
          )}
          {isContinuousCrafting ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-300">
                <span>Fabrication en cours...</span>
                <span>{currentCraftCount} / {maxCraftCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="flex-grow" />
                <Button variant="destructive" size="icon" onClick={handleStopCrafting} className="w-8 h-8 flex-shrink-0">
                  <Square className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-center text-sm text-gray-400">
                Prochain cycle dans: {remainingTimeInCurrentCraft}s
              </div>
            </div>
          ) : (
            <Button onClick={handleStartContinuousCraft} disabled={!matchedRecipe || potentialOutputQuantity === 0} className="w-full">
              <Hammer className="w-4 h-4 mr-2" /> Fabriquer
            </Button>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-center mb-2">Inventaire</h3>
        <div className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto" data-slot-target="inventory">
          {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
            const item = playerData.inventory.find(i => i.slot_position === index);
            return (
              <div key={item?.id || index} data-slot-index={index}>
                <InventorySlot 
                  item={item || null} 
                  index={index} 
                  isUnlocked={true} 
                  onDragStart={(idx, node, e) => item && handleDragStart(item, 'inventory', idx, node, e)} 
                  onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'inventory' })} 
                  isBeingDragged={draggedItem?.from === 'inventory' && item?.id === draggedItem.item.id}
                  isDragOver={dragOver?.target === 'inventory' && dragOver?.index === index}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

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
            {renderCraftingInterface()}
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => construction && onDemolish(construction)}>
              <Trash2 className="w-4 h-4 mr-2" /> Détruire l'établi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem?.item || null}
        source={detailedItem?.source}
        onUse={() => {
          if (detailedItem?.source === 'output') {
            handleFinalizeAndCollect();
          } else {
            showError("Vous ne pouvez pas utiliser un objet depuis l'établi.");
          }
        }}
        onDropOne={() => detailedItem?.source === 'inventory' && handleDropItem(detailedItem.item, 1)}
        onDropAll={() => detailedItem?.source === 'inventory' && handleDropItem(detailedItem.item, detailedItem.item.quantity)}
        onSplit={handleSplitItem}
        onUpdate={onUpdate}
        onTransferToWorkbench={handleTransferToWorkbench}
        onTransferFromWorkbench={handleTransferFromWorkbench}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;