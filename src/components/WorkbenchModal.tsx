import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen, Square } from "lucide-react";
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

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => void;
}

const getQueueKey = (id: number | undefined) => id ? `craftingQueue_${id}` : null;

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, setPlayerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [recipesFetched, setRecipesFetched] = useState(false);
  const [workbenchItems, setWorkbenchItems] = useState<InventoryItem[]>([]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' | 'output' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [currentJob, setCurrentJob] = useState<CraftingJob | null>(null);
  const [itemToCollect, setItemToCollect] = useState<InventoryItem | null>(null);
  const [isDraggingOutput, setIsDraggingOutput] = useState(false);
  const [progress, setProgress] = useState(0);
  const [craftQuantity, setCraftQuantity] = useState(1);
  const [craftsRemaining, setCraftsRemaining] = useState(0);
  const [draggedItem, setDraggedItem] = useState<{ index: number; source: 'inventory' | 'crafting' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' | 'crafting' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  
  const [optimisticWorkbenchItems, setOptimisticWorkbenchItems] = useState<InventoryItem[]>([]);
  const [optimisticOutputItem, setOptimisticOutputItem] = useState<InventoryItem | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (isOpen) {
      onUpdate(true);
    }
  }, [isOpen, onUpdate]);

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
    if (error) {
      showError("Impossible de charger les recettes.");
    } else {
      setRecipes(data || []);
      setRecipesFetched(true);
    }
  }, []);

  const fetchWorkbenchContents = useCallback(async () => {
    if (!construction) return;
    const { data, error } = await supabase
      .from('workbench_items')
      .select('*, items(*)')
      .eq('workbench_id', construction.id);
    
    if (error) {
      showError("Impossible de charger le contenu de l'établi.");
    } else {
      const fetchedItems = data as InventoryItem[];
      setWorkbenchItems(fetchedItems);
      setOptimisticWorkbenchItems(fetchedItems);
    }
  }, [construction]);

  useEffect(() => {
    if (isOpen && construction) {
      const job = playerData.craftingJobs?.find(j => j.workbench_id === construction.id);
      setCurrentJob(job || null);

      const queueKey = getQueueKey(construction.id);
      if (queueKey) {
        const savedQueue = localStorage.getItem(queueKey);
        setCraftsRemaining(savedQueue ? parseInt(savedQueue, 10) : 0);
      }

      const currentConstructionState = playerData.baseConstructions.find(c => c.id === construction.id);
      if (currentConstructionState?.output_item_id) {
        const outputItemDef = items.find(i => i.id === currentConstructionState.output_item_id);
        if (outputItemDef) {
          const outputItem = {
            id: -1,
            item_id: outputItemDef.id,
            quantity: currentConstructionState.output_quantity || 1,
            slot_position: -1,
            items: outputItemDef
          };
          setItemToCollect(outputItem);
          setOptimisticOutputItem(outputItem);
        }
      } else {
        setItemToCollect(null);
        setOptimisticOutputItem(null);
      }

      if (!recipesFetched) {
        fetchRecipes();
      }
      fetchWorkbenchContents();
    } else {
      setWorkbenchItems([]);
      setOptimisticWorkbenchItems([]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setCurrentJob(null);
      setItemToCollect(null);
      setOptimisticOutputItem(null);
      setProgress(0);
      setCraftsRemaining(0);
      setTimeRemaining(0);
      if (!isOpen) {
        setRecipesFetched(false);
      }
    }
  }, [isOpen, construction, playerData.craftingJobs, playerData.baseConstructions, items, fetchRecipes, fetchWorkbenchContents, recipesFetched]);

  const startCraft = useCallback(async (recipe: CraftingRecipe) => {
    if (!construction || !recipe) return false;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', { 
      p_workbench_id: construction.id, 
      p_recipe_id: recipe.id 
    });
    setIsLoadingAction(false);
    if (error) {
      showError(error.message);
      return false;
    }
    return true;
  }, [construction]);

  useEffect(() => {
    if (currentJob) {
      const endTime = new Date(currentJob.ends_at).getTime();

      if (Date.now() >= endTime) {
        setProgress(100);
        setTimeRemaining(0);
        return;
      }

      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= endTime) {
          setProgress(100);
          setTimeRemaining(0);
          clearInterval(interval);
        } else {
          const startTime = new Date(currentJob.started_at).getTime();
          const totalDuration = endTime - startTime;
          const elapsedTime = now - startTime;
          const newProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
          const remaining = Math.ceil((endTime - now) / 1000);
          
          setProgress(newProgress);
          setTimeRemaining(Math.max(0, remaining));
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
      setTimeRemaining(0);
    }
  }, [currentJob]);

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
    if (resultItemDef && !resultItemDef.stackable && optimisticOutputItem) {
        return 0;
    }

    const recipeIngredients = [
      { id: matchedRecipe.ingredient1_id, quantity: matchedRecipe.ingredient1_quantity },
      { id: matchedRecipe.ingredient2_id, quantity: matchedRecipe.ingredient2_quantity },
      { id: matchedRecipe.ingredient3_id, quantity: matchedRecipe.ingredient3_quantity },
    ].filter(ing => ing.id !== null && ing.quantity! > 0) as { id: number, quantity: number }[];

    if (recipeIngredients.length === 0) return 99;

    const craftCounts = recipeIngredients.map(req => {
        const totalAvailable = optimisticWorkbenchItems
            .filter(i => i.item_id === req.id)
            .reduce((sum, item) => sum + item.quantity, 0);
        return Math.floor(totalAvailable / req.quantity);
    });

    const max = Math.min(...craftCounts);

    if (resultItemDef && !resultItemDef.stackable) {
        return Math.min(max, 1);
    }

    return max;
  }, [matchedRecipe, optimisticWorkbenchItems, optimisticOutputItem, items]);

  useEffect(() => {
    if (craftQuantity > maxCraftQuantity) {
        setCraftQuantity(maxCraftQuantity > 0 ? maxCraftQuantity : 1);
    }
    if (maxCraftQuantity === 0 && craftQuantity !== 1) {
        setCraftQuantity(1);
    }
  }, [maxCraftQuantity, craftQuantity]);

  const handleStartBatchCraft = useCallback(async () => {
    if (!matchedRecipe || !construction || craftQuantity <= 0) return;
    
    const queueKey = getQueueKey(construction.id);
    if (queueKey) {
      localStorage.setItem(queueKey, String(craftQuantity));
    }
    setCraftsRemaining(craftQuantity);
    
    const success = await startCraft(matchedRecipe);
    if (!success) {
      setCraftsRemaining(0);
      if (queueKey) localStorage.removeItem(queueKey);
      await refreshPlayerData();
    } else {
      await fetchWorkbenchContents();
      const { data: jobs, error: jobsError } = await supabase
        .from('crafting_jobs')
        .select('*')
        .eq('player_id', playerData.playerState.id);
      
      if (jobsError) {
        showError("Erreur de mise à jour des tâches.");
        refreshPlayerData();
      } else {
        setPlayerData(prev => ({
          ...prev,
          craftingJobs: jobs as CraftingJob[]
        }));
      }
    }
  }, [matchedRecipe, construction, craftQuantity, startCraft, refreshPlayerData, fetchWorkbenchContents, playerData.playerState.id, setPlayerData]);

  const handleCancelCraft = async () => {
    setCraftsRemaining(0);
    const queueKey = getQueueKey(construction?.id);
    if (queueKey) {
      localStorage.removeItem(queueKey);
    }
    if (!construction) return;
    
    setIsLoadingAction(true);
    setCurrentJob(null);
    
    const { error } = await supabase.rpc('cancel_crafting_job', { p_workbench_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication annulée.");
    }
    await refreshPlayerData();
    setIsLoadingAction(false);
  };

  const handleDragStartOutput = (e: React.DragEvent<HTMLDivElement>) => {
    if (!optimisticOutputItem) return;
    setIsDraggingOutput(true);
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'workbench_output', constructionId: construction?.id }));
  };

  const handleDropOnInventory = async (e: React.DragEvent<HTMLDivElement>, targetSlot: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const parsedData = JSON.parse(data);
    if (parsedData.type !== 'workbench_output' || parsedData.constructionId !== construction?.id) return;
    
    setOptimisticOutputItem(null);
    setItemToCollect(null);
    
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('collect_workbench_output', { 
      p_workbench_id: construction.id,
      p_target_slot: targetSlot
    });
    setIsLoadingAction(false);

    if (error) {
      showError(error.message);
      await refreshPlayerData();
    } else {
      showSuccess("Objet récupéré !");
      await onUpdate();
    }
    setIsDraggingOutput(false);
  };

  const handleDragStart = (index: number, source: 'inventory' | 'crafting', node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem({ index, source });
    
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
  
    const { source, index: fromIndex } = draggedItem;
    const { target, index: toIndex } = dragOver;
  
    setDraggedItem(null);
    setDragOver(null);
  
    if (source === target && fromIndex === toIndex) return;
  
    const originalPlayerData = JSON.parse(JSON.stringify(playerData));
    const originalWorkbenchItems = JSON.parse(JSON.stringify(optimisticWorkbenchItems));
  
    let newInventory = [...playerData.inventory];
    let newWorkbenchItems = [...optimisticWorkbenchItems];
    let rpcPromise;
  
    const fromItem = source === 'inventory' ? newInventory.find(i => i.slot_position === fromIndex) : newWorkbenchItems.find(i => i.slot_position === fromIndex);
    const toItem = target === 'inventory' ? newInventory.find(i => i.slot_position === toIndex) : newWorkbenchItems.find(i => i.slot_position === toIndex);
  
    if (!fromItem) return;
  
    if (toItem && fromItem.item_id === toItem.item_id && fromItem.items?.stackable) {
      if (source === 'inventory') newInventory = newInventory.filter(i => i.id !== fromItem.id);
      else newWorkbenchItems = newWorkbenchItems.filter(i => i.id !== fromItem.id);
  
      if (target === 'inventory') newInventory = newInventory.map(i => i.id === toItem.id ? { ...i, quantity: i.quantity + fromItem.quantity } : i);
      else newWorkbenchItems = newWorkbenchItems.map(i => i.id === toItem.id ? { ...i, quantity: i.quantity + fromItem.quantity } : i);
    } else {
      const fromItemInSourceIdx = source === 'inventory' ? newInventory.findIndex(i => i.id === fromItem.id) : newWorkbenchItems.findIndex(i => i.id === fromItem.id);
      const [movedItem] = source === 'inventory' ? newInventory.splice(fromItemInSourceIdx, 1) : newWorkbenchItems.splice(fromItemInSourceIdx, 1);
      movedItem.slot_position = toIndex;
  
      if (toItem) {
        const toItemInTargetIdx = target === 'inventory' ? newInventory.findIndex(i => i.id === toItem.id) : newWorkbenchItems.findIndex(i => i.id === toItem.id);
        const [itemToSwap] = target === 'inventory' ? newInventory.splice(toItemInTargetIdx, 1) : newWorkbenchItems.splice(toItemInTargetIdx, 1);
        itemToSwap.slot_position = fromIndex;
        if (source === 'inventory') newInventory.push(itemToSwap);
        else newWorkbenchItems.push(itemToSwap);
      }
  
      if (target === 'inventory') newInventory.push(movedItem);
      else newWorkbenchItems.push(movedItem);
    }
  
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setOptimisticWorkbenchItems(newWorkbenchItems);
  
    if (source === 'inventory' && target === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'crafting' && target === 'crafting') {
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_workbench_items', { p_workbench_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'inventory' && target === 'crafting') {
      const itemToMove = originalPlayerData.inventory.find(i => i.slot_position === fromIndex);
      if (!itemToMove || !construction) return;
      rpcPromise = supabase.rpc('move_item_to_workbench', { p_inventory_id: itemToMove.id, p_workbench_id: construction.id, p_quantity_to_move: itemToMove.quantity, p_target_slot: toIndex });
    } else if (source === 'crafting' && target === 'inventory') {
      const itemToMove = originalWorkbenchItems.find(i => i.slot_position === fromIndex);
      if (!itemToMove) return;
      rpcPromise = supabase.rpc('move_item_from_workbench', { p_workbench_item_id: itemToMove.id, p_quantity_to_move: itemToMove.quantity, p_target_slot: toIndex });
    }
  
    if (rpcPromise) {
      const { error } = await rpcPromise;
      if (error) {
        showError(error.message || "Erreur de transfert.");
        setPlayerData(originalPlayerData);
        setOptimisticWorkbenchItems(originalWorkbenchItems);
      } else {
        await onUpdate(true);
        await fetchWorkbenchContents();
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

  const handleTransferToWorkbench = async (item: InventoryItem, quantity: number) => {
    if (!construction) return;
    setDetailedItem(null);
    const { error } = await supabase.rpc('move_item_to_workbench', { p_inventory_id: item.id, p_workbench_id: construction.id, p_quantity_to_move: quantity, p_target_slot: -1 });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Transfert réussi.");
      await onUpdate();
      await fetchWorkbenchContents();
    }
  };

  const handleTransferFromWorkbench = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    const { error } = await supabase.rpc('move_item_from_workbench', { p_workbench_item_id: item.id, p_quantity_to_move: quantity, p_target_slot: -1 });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Transfert réussi.");
      await onUpdate();
      await fetchWorkbenchContents();
    }
  };

  const displayedOutputItem = optimisticOutputItem || itemToCollect;

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
                      <div key={item?.id || index}>
                        <InventorySlot
                          item={item}
                          index={index}
                          isUnlocked={true}
                          onDragStart={(idx, node, e) => handleDragStart(idx, 'crafting', node, e)}
                          onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'crafting' })}
                          isBeingDragged={draggedItem?.source === 'crafting' && draggedItem?.index === index}
                          isDragOver={dragOver?.target === 'crafting' && dragOver?.index === index}
                          isLocked={!!currentJob || craftsRemaining > 0}
                        />
                      </div>
                    ))}
                    <div />
                  </div>
                  <div className="grid grid-cols-5 items-center gap-2">
                    <div className="col-span-2 flex justify-end">
                        <ArrowRight className="w-8 h-8 text-gray-500" />
                    </div>
                    <div 
                      className={cn(
                        "relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center",
                        displayedOutputItem && "cursor-grab active:cursor-grabbing"
                      )}
                      draggable={!!displayedOutputItem}
                      onDragStart={handleDragStartOutput}
                      onDragEnd={() => setIsDraggingOutput(false)}
                    >
                      {currentJob ? (
                        <>
                          <ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} className="grayscale opacity-50" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                              {displayedOutputItem && (
                                <span className="text-sm font-bold text-white">
                                  x{displayedOutputItem.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : displayedOutputItem ? (
                        <>
                          <ItemIcon iconName={getIconUrl(displayedOutputItem.items?.icon) || displayedOutputItem.items?.icon} alt={displayedOutputItem.items?.name || ''} />
                          <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                            x{displayedOutputItem.quantity}
                          </span>
                        </>
                      ) : resultItem && (
                        <>
                          <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                          {matchedRecipe && resultItem.stackable && (
                            <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                              x{craftQuantity * matchedRecipe.result_quantity}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="col-span-2" />
                  </div>
                  
                  <div className="h-[120px] flex flex-col justify-center items-center space-y-2">
                    {currentJob || craftsRemaining > 0 ? (
                      <div className="w-full space-y-2 px-4">
                        <div className="flex items-center gap-2">
                          <Progress value={currentJob ? progress : 0} className="flex-grow" />
                          <Button size="icon" variant="destructive" onClick={handleCancelCraft} disabled={isLoadingAction}>
                            <Square className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-center text-sm text-gray-300 font-mono">
                          {currentJob && timeRemaining > 0 ? `${timeRemaining}s` : (currentJob ? 'Terminé...' : 'Démarrage...')}
                          {craftsRemaining > 1 && (
                            <span className="ml-2 text-yellow-400">({craftsRemaining - 1} en file)</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {matchedRecipe && maxCraftQuantity > 0 ? (
                          <div className="w-full px-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span>Quantité: <span className="font-bold text-white">{craftQuantity}</span></span>
                            </div>
                            <Slider
                                value={[craftQuantity]}
                                onValueChange={(value) => setCraftQuantity(value[0])}
                                min={1}
                                max={maxCraftQuantity}
                                step={1}
                                disabled={isLoadingAction}
                            />
                            <Button 
                              onClick={handleStartBatchCraft} 
                              disabled={!matchedRecipe || isLoadingAction || craftQuantity === 0}
                              className="w-full"
                            >
                              {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : `Fabriquer ${craftQuantity}x`}
                            </Button>
                          </div>
                        ) : matchedRecipe ? (
                          <p className="text-center text-xs text-yellow-400 px-4">
                            {resultItem && !resultItem.stackable && displayedOutputItem ? "Collectez l'objet pour fabriquer." : "Ressources insuffisantes."}
                          </p>
                        ) : (
                            <p className="text-sm text-gray-400">Placez des ingrédients pour voir les recettes.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-center mb-2">Inventaire</h3>
                <div className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto" data-slot-target="inventory">
                  {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
                    const item = playerData.inventory.find(i => i.slot_position === index);
                    return (
                      <div 
                        key={item?.id || index}
                        onDrop={(e) => handleDropOnInventory(e, index)}
                        onDragOver={(e) => {
                          if (isDraggingOutput) e.preventDefault();
                        }}
                      >
                        <InventorySlot 
                          item={item || null} 
                          index={index} 
                          isUnlocked={true} 
                          onDragStart={(idx, node, e) => handleDragStart(idx, 'inventory', node, e)}
                          onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'inventory' })} 
                          isBeingDragged={draggedItem?.source === 'inventory' && draggedItem?.index === index}
                          isDragOver={isDraggingOutput || (dragOver?.target === 'inventory' && dragOver?.index === index)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
          showError("Vous ne pouvez pas utiliser un objet depuis l'établi.");
        }}
        onDropOne={() => {}}
        onDropAll={() => {}}
        onUpdate={onUpdate}
        onTransferToWorkbench={handleTransferToWorkbench}
        onTransferFromWorkbench={handleTransferFromWorkbench}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;