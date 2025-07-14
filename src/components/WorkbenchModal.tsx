import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, CraftingJob, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, Check, BookOpen, Clock, Square } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showInfo } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import { Progress } from "./ui/progress";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";
import CountdownTimer from "./CountdownTimer";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, items, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  
  const [isContinuousCrafting, setIsContinuousCrafting] = useState(false);
  const [maxCraftCount, setMaxCraftCount] = useState(0);
  const [currentCraftCount, setCurrentCraftCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const craftTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; from: 'inventory' | 'crafting'; fromIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'crafting'; index: number } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const displayedInventory = useMemo(() => {
    const itemsInCrafting = new Map<number, number>();
    ingredientSlots.forEach(item => {
      if (item) {
        const currentQty = itemsInCrafting.get(item.item_id) || 0;
        itemsInCrafting.set(item.item_id, currentQty + item.quantity);
      }
    });

    return playerData.inventory.map(invItem => {
      const usedQuantity = itemsInCrafting.get(invItem.item_id) || 0;
      return { ...invItem, quantity: invItem.quantity - usedQuantity };
    }).filter(item => item.quantity > 0);
  }, [playerData.inventory, ingredientSlots]);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
      const job = playerData.craftingJobs?.find(j => j.workbench_id === construction?.id) || null;
      setCraftingJob(job);
    } else {
      setIngredientSlots([null, null, null]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setIsContinuousCrafting(false);
      if (craftTimerRef.current) clearInterval(craftTimerRef.current);
    }
  }, [isOpen, construction, playerData.craftingJobs, fetchRecipes]);

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

  const handleStartContinuousCraft = () => {
    if (!matchedRecipe) return;

    const craftableCounts = [
      matchedRecipe.ingredient1_id ? Math.floor((ingredientSlots.find(i => i?.item_id === matchedRecipe.ingredient1_id)?.quantity || 0) / matchedRecipe.ingredient1_quantity) : Infinity,
      matchedRecipe.ingredient2_id ? Math.floor((ingredientSlots.find(i => i?.item_id === matchedRecipe.ingredient2_id)?.quantity || 0) / matchedRecipe.ingredient2_quantity) : Infinity,
      matchedRecipe.ingredient3_id ? Math.floor((ingredientSlots.find(i => i?.item_id === matchedRecipe.ingredient3_id)?.quantity || 0) / matchedRecipe.ingredient3_quantity) : Infinity,
    ];
    const maxPossible = Math.min(...craftableCounts);
    
    if (maxPossible > 0) {
      setMaxCraftCount(maxPossible);
      setCurrentCraftCount(0);
      setIsContinuousCrafting(true);
    } else {
      showError("Ressources insuffisantes pour fabriquer cet objet.");
    }
  };

  const handleStopCrafting = () => {
    setIsContinuousCrafting(false);
    if (craftTimerRef.current) {
      clearInterval(craftTimerRef.current);
      craftTimerRef.current = null;
    }
    setProgress(0);
    showInfo("Fabrication arrêtée.");
  };

  useEffect(() => {
    if (!isContinuousCrafting || !matchedRecipe) {
      return;
    }

    const craftNextItem = async () => {
      if (currentCraftCount >= maxCraftCount) {
        setIsContinuousCrafting(false);
        showSuccess("Fabrication en série terminée !");
        return;
      }

      const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction!.id, p_recipe_id: matchedRecipe.id });
      if (error) {
        showError(error.message);
        setIsContinuousCrafting(false);
        return;
      }

      const newSlots = [...ingredientSlots];
      if (matchedRecipe.ingredient1_id) newSlots.find(i => i?.item_id === matchedRecipe.ingredient1_id)!.quantity -= matchedRecipe.ingredient1_quantity;
      if (matchedRecipe.ingredient2_id) newSlots.find(i => i?.item_id === matchedRecipe.ingredient2_id)!.quantity -= matchedRecipe.ingredient2_quantity;
      if (matchedRecipe.ingredient3_id) newSlots.find(i => i?.item_id === matchedRecipe.ingredient3_id)!.quantity -= matchedRecipe.ingredient3_quantity;
      setIngredientSlots(newSlots.filter(s => s && s.quantity > 0));

      const craftTime = matchedRecipe.craft_time_seconds * 1000;
      const startTime = Date.now();
      craftTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(100, (elapsed / craftTime) * 100);
        setProgress(newProgress);

        if (elapsed >= craftTime) {
          if (craftTimerRef.current) clearInterval(craftTimerRef.current);
          onUpdate();
          setCurrentCraftCount(prev => prev + 1);
        }
      }, 100);
    };

    craftNextItem();

    return () => {
      if (craftTimerRef.current) {
        clearInterval(craftTimerRef.current);
      }
    };
  }, [isContinuousCrafting, currentCraftCount, maxCraftCount, matchedRecipe, construction, onUpdate]);

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

  const handleTransferToWorkbench = (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    const newSlots = [...ingredientSlots];
    
    const itemInInventory = playerData.inventory.find(i => i.id === item.id);
    if (!itemInInventory) return;
    const alreadyInWorkbench = newSlots.filter(s => s?.item_id === item.item_id).reduce((acc, curr) => acc + (curr?.quantity || 0), 0);
    if (itemInInventory.quantity < alreadyInWorkbench + quantity) {
        showError("Quantité insuffisante dans l'inventaire.");
        return;
    }

    const itemToMove = { ...item, quantity };

    const existingSlotIndex = newSlots.findIndex(slot => slot?.item_id === item.item_id);
    if (existingSlotIndex !== -1) {
      newSlots[existingSlotIndex]!.quantity += quantity;
    } else {
      const emptySlotIndex = newSlots.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        showError("L'établi est plein.");
        return;
      }
      newSlots[emptySlotIndex] = itemToMove;
    }
    
    setIngredientSlots(newSlots);
  };

  const handleTransferFromWorkbench = (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    const newSlots = [...ingredientSlots];
    const slotIndex = newSlots.findIndex(slot => slot?.id === item.id);

    if (slotIndex === -1) return;

    const itemInSlot = newSlots[slotIndex]!;
    if (quantity > itemInSlot.quantity) return;

    if (quantity === itemInSlot.quantity) {
      newSlots[slotIndex] = null;
    } else {
      newSlots[slotIndex] = { ...itemInSlot, quantity: itemInSlot.quantity - quantity };
    }
    
    setIngredientSlots(newSlots);
  };

  const handleDragStart = (item: InventoryItem, from: 'inventory' | 'crafting', fromIndex: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
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

    const { item: dragged, from, fromIndex } = draggedItem;
    const { target, index: toIndex } = dragOver;

    setDraggedItem(null);
    setDragOver(null);

    if (from === target && fromIndex === toIndex) return;

    if (from === 'inventory' && target === 'inventory') {
      const fromItem = playerData.inventory.find(i => i.slot_position === fromIndex);
      if (!fromItem) return;
      const { error } = await supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
      if (error) {
        showError(error.message);
      } else {
        await onUpdate(true);
      }
      return;
    }

    const newSlots = [...ingredientSlots];

    if (from === 'inventory' && target === 'crafting') {
      const itemToMoveIn = playerData.inventory.find(i => i.slot_position === fromIndex);
      if (!itemToMoveIn) return;
      const itemToMoveOut = newSlots[toIndex];
      
      newSlots[toIndex] = itemToMoveIn;
      
      const oldSlotIndex = newSlots.findIndex((slot, i) => i !== toIndex && slot?.id === itemToMoveIn.id);
      if (oldSlotIndex > -1) {
        newSlots[oldSlotIndex] = itemToMoveOut;
      }
    } else if (from === 'crafting' && target === 'inventory') {
      const itemToMoveOut = newSlots[fromIndex];
      if (!itemToMoveOut) return;
      const itemToMoveIn = displayedInventory.find(i => i.slot_position === toIndex);

      newSlots[fromIndex] = itemToMoveIn || null;
    } else if (from === 'crafting' && target === 'crafting') {
      const temp = newSlots[fromIndex];
      newSlots[fromIndex] = newSlots[toIndex];
      newSlots[toIndex] = temp;
    }

    setIngredientSlots(newSlots);
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

  const renderCraftingProgress = () => {
    if (!craftingJob) return null;
    const recipe = recipes.find(r => r.id === craftingJob.recipe_id);
    const item = items.find(i => i.id === recipe?.result_item_id);
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

    return (
      <div className="text-center space-y-4">
        <p>Fabrication de <span className="font-bold">{item?.name}</span> en cours...</p>
        <div className="w-20 h-20 mx-auto bg-slate-700/50 rounded-lg border border-slate-600 flex items-center justify-center relative">
          {item && <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />}
        </div>
        <Progress value={0} />
        <p className="text-sm text-gray-400"><Clock className="inline w-3 h-3 mr-1" /><CountdownTimer endTime={craftingJob.ends_at} onComplete={onUpdate} /></p>
      </div>
    );
  };

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
              <div key={index} data-slot-index={index}>
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
              {resultItem && <ItemIcon iconName={useGame().getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />}
            </div>
            <div className="col-span-2" />
          </div>
          {matchedRecipe && !isContinuousCrafting && (
            <div className="text-center text-sm text-gray-300">
              <p>Temps: {matchedRecipe.craft_time_seconds}s</p>
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
            </div>
          ) : (
            <Button onClick={handleStartContinuousCraft} disabled={!matchedRecipe} className="w-full">
              <Hammer className="w-4 h-4 mr-2" /> Fabriquer
            </Button>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-center mb-2">Inventaire</h3>
        <div className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto" data-slot-target="inventory">
          {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
            const item = displayedInventory.find(i => i.slot_position === index);
            return (
              <div key={index} data-slot-index={index}>
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
            {craftingJob ? renderCraftingProgress() : renderCraftingInterface()}
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
        onUse={() => showError("Vous ne pouvez pas utiliser un objet depuis l'établi.")}
        onDropOne={() => detailedItem && handleDropItem(detailedItem.item, 1)}
        onDropAll={() => detailedItem && handleDropItem(detailedItem.item, detailedItem.item.quantity)}
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