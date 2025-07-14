import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, CraftingJob, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, Clock, Check, BookOpen } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const CraftingSlot = ({ item, onClear, isDragOver, onClick }: { item: InventoryItem | null, onClear: () => void, isDragOver: boolean, onClick: () => void }) => {
  const { getIconUrl } = useGame();

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center",
        "bg-slate-900/50 border-slate-700",
        isDragOver && "bg-slate-700/80 ring-2 ring-slate-400 border-slate-400",
        item && "cursor-pointer"
      )}
    >
      {item && (
        <>
          <ItemIcon iconName={getIconUrl(item.items?.icon) || item.items?.icon} alt={item.items?.name || ''} />
          <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
            x{item.quantity}
          </span>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  );
};

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, setPlayerData, items, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; originalIndex: number } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const inventoryGridRef = useRef<HTMLDivElement | null>(null);

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

  const handleClearSlot = (index: number) => {
    const itemToReturn = ingredientSlots[index];
    if (!itemToReturn) return;

    // Optimistic update: return item to inventory
    const newInventory = [...playerData.inventory];
    const existingStack = newInventory.find(i => i.item_id === itemToReturn.item_id && i.items?.stackable);

    if (existingStack) {
        newInventory.map(i => i.id === existingStack.id ? { ...i, quantity: i.quantity + itemToReturn.quantity } : i);
    } else {
        // Find first empty slot
        let newSlotPosition = -1;
        for (let i = 0; i < playerData.playerState.unlocked_slots; i++) {
            if (!newInventory.some(invItem => invItem.slot_position === i)) {
                newSlotPosition = i;
                break;
            }
        }
        if (newSlotPosition !== -1) {
            newInventory.push({ ...itemToReturn, slot_position: newSlotPosition });
        } else {
            showError("Inventaire plein, impossible de remettre l'objet.");
            // Do not clear slot if inventory is full
            return;
        }
    }
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));

    const newSlots = [...ingredientSlots];
    newSlots[index] = null;
    setIngredientSlots(newSlots);
    // No server call needed here, as items are only consumed on craft start
  };

  const handleCraft = async () => {
    if (!matchedRecipe || !construction) return;
    
    // Optimistic update: consume ingredients from inventory
    const originalInventory = JSON.parse(JSON.stringify(playerData.inventory));
    const newInventory = [...playerData.inventory];

    const recipeIngredients = [
        matchedRecipe.ingredient1_id && { id: matchedRecipe.ingredient1_id, quantity: matchedRecipe.ingredient1_quantity },
        matchedRecipe.ingredient2_id && { id: matchedRecipe.ingredient2_id, quantity: matchedRecipe.ingredient2_quantity },
        matchedRecipe.ingredient3_id && { id: matchedRecipe.ingredient3_id, quantity: matchedRecipe.ingredient3_quantity },
    ].filter(Boolean) as { id: number, quantity: number }[];

    for (const req of recipeIngredients) {
        let quantityToConsume = req.quantity;
        for (let i = newInventory.length - 1; i >= 0 && quantityToConsume > 0; i--) {
            const invItem = newInventory[i];
            if (invItem.item_id === req.id) {
                if (invItem.quantity <= quantityToConsume) {
                    quantityToConsume -= invItem.quantity;
                    newInventory.splice(i, 1); // Remove item
                } else {
                    invItem.quantity -= quantityToConsume;
                    quantityToConsume = 0;
                }
            }
        }
    }
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    setIngredientSlots([null, null, null]); // Clear crafting slots

    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
      setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
    } else {
      showSuccess("Fabrication lancée !");
      onUpdate(); // Refresh player data to get new crafting job
    }
  };

  const handleCollect = async () => {
    if (!craftingJob) return;
    
    // Optimistic update: add crafted item to inventory
    const originalInventory = JSON.parse(JSON.stringify(playerData.inventory));
    const recipe = recipes.find(r => r.id === craftingJob.recipe_id);
    const resultItemDetails = items.find(i => i.id === recipe?.result_item_id);

    if (recipe && resultItemDetails) {
        const newInventory = [...playerData.inventory];
        const existingStack = newInventory.find(i => i.item_id === resultItemDetails.id && resultItemDetails.stackable);

        if (existingStack) {
            newInventory.map(i => i.id === existingStack.id ? { ...i, quantity: i.quantity + recipe.result_quantity } : i);
        } else {
            let newSlotPosition = -1;
            for (let i = 0; i < playerData.playerState.unlocked_slots; i++) {
                if (!newInventory.some(invItem => invItem.slot_position === i)) {
                    newSlotPosition = i;
                    break;
                }
            }
            if (newSlotPosition !== -1) {
                newInventory.push({
                    id: -1, // Temp ID
                    item_id: resultItemDetails.id,
                    quantity: recipe.result_quantity,
                    slot_position: newSlotPosition,
                    items: resultItemDetails
                });
            } else {
                showError("Inventaire plein, impossible de récupérer l'objet.");
                return; // Do not proceed with server call if inventory is full
            }
        }
        setPlayerData(prev => ({ ...prev, inventory: newInventory }));
    }

    const { error } = await supabase.rpc('collect_crafted_item', { p_job_id: craftingJob.id });
    if (error) {
      showError(error.message);
      setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
    } else {
      showSuccess("Objet récupéré !");
      onUpdate(); // Refresh player data to remove crafting job
    }
  };

  const handleDropItem = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    
    // Optimistic update
    const originalInventory = [...playerData.inventory];
    const newInventory = playerData.inventory.map(invItem => {
        if (invItem.id === item.id) {
            return { ...invItem, quantity: invItem.quantity - quantity };
        }
        return invItem;
    }).filter(invItem => invItem.quantity > 0);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));

    let error;
    if (item.quantity > quantity) {
        ({ error } = await supabase
            .from('inventories')
            .update({ quantity: item.quantity - quantity })
            .eq('id', item.id));
    } else {
        ({ error } = await supabase
            .from('inventories')
            .delete()
            .eq('id', item.id));
    }

    if (error) {
        showError("Erreur lors de la suppression de l'objet.");
        setPlayerData(prev => ({ ...prev, inventory: originalInventory })); // Revert
    } else {
        showSuccess("Objet jeté.");
        onUpdate();
    }
  };

  const handleDragStart = useCallback((item: InventoryItem, index: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    setDraggedItem({ item, originalIndex: index });
    
    const ghostNode = node.querySelector('.item-visual')?.cloneNode(true) as HTMLDivElement;
    if (!ghostNode) return;

    ghostNode.style.position = 'fixed';
    ghostNode.style.pointerEvents = 'none';
    ghostNode.style.zIndex = '5000';
    ghostNode.style.width = `${node.offsetWidth}px`;
    ghostNode.style.height = `${node.offsetHeight}px`;
    ghostNode.style.opacity = '0.85';
    ghostNode.style.transform = 'scale(1.1)';
    document.body.appendChild(ghostNode);
    draggedItemNode.current = ghostNode;

    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    handleDragMove(clientX, clientY);
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggedItemNode.current) {
      draggedItemNode.current.style.left = `${clientX - draggedItemNode.current.offsetWidth / 2}px`;
      draggedItemNode.current.style.top = `${clientY - draggedItemNode.current.offsetHeight / 2}px`;
    }

    let newDragOverIndex: number | null = null;
    const craftingSlotElements = document.querySelectorAll('[data-crafting-slot-index]');
    for (const slot of craftingSlotElements) {
        const rect = slot.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          newDragOverIndex = parseInt((slot as HTMLElement).dataset.craftingSlotIndex || '-1', 10);
          break;
        }
    }
    setDragOverSlot(newDragOverIndex);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }

    if (!draggedItem) {
        setDragOverSlot(null);
        return;
    }

    const { item: fromItem, originalIndex: fromIndex } = draggedItem;
    const toIndex = dragOverSlot;

    setDraggedItem(null);
    setDragOverSlot(null);

    if (toIndex === null) { // Dropped outside crafting slots, return to original inventory slot
        // No explicit optimistic update needed here, as the item was never removed from inventory state
        // It was just visually hidden. A refresh will ensure consistency.
        refreshPlayerData();
        return;
    }

    // Optimistic update: move item from inventory to crafting slot
    const originalInventory = JSON.parse(JSON.stringify(playerData.inventory));
    const newInventory = playerData.inventory.filter(invItem => invItem.id !== fromItem.id);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));

    const newIngredientSlots = [...ingredientSlots];
    newIngredientSlots[toIndex] = fromItem;
    setIngredientSlots(newIngredientSlots);

    // No server call here, as items are only consumed when craft starts
    // The item is now "in" the crafting slot from a UI perspective.
  }, [draggedItem, dragOverSlot, playerData.inventory, ingredientSlots, refreshPlayerData, setPlayerData]);

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItem !== null) {
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
        <p className="text-sm text-gray-400">Se termine dans <Clock className="inline w-3 h-3" /> <Countdown endsAt={craftingJob.ends_at} onComplete={onUpdate} /></p>
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
          <div className="grid grid-cols-5 gap-2">
            <div />
            {ingredientSlots.map((item, index) => (
              <div 
                key={index} 
                data-crafting-slot-index={index}
                onDrop={() => handleDrop(index)} 
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragOverSlot(index)}
                onDragLeave={() => setDragOverSlot(null)}
              >
                <CraftingSlot 
                  item={item} 
                  onClear={() => handleClearSlot(index)} 
                  isDragOver={dragOverSlot === index}
                  onClick={() => item && setDetailedItem(item)}
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
          {matchedRecipe && (
            <div className="text-center text-sm text-gray-300">
              <p>Temps: {matchedRecipe.craft_time_seconds}s</p>
            </div>
          )}
          <Button onClick={handleCraft} disabled={!matchedRecipe} className="w-full">
            <Hammer className="w-4 h-4 mr-2" /> Fabriquer
          </Button>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-center mb-2">Inventaire</h3>
        <div ref={inventoryGridRef} className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto no-scrollbar">
          {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
            const item = displayedInventory.find(i => i.slot_position === index);
            return (
              <InventorySlot 
                key={index} 
                item={item} 
                index={index} 
                isUnlocked={true} 
                onDragStart={handleDragStart} 
                onItemClick={(item) => setDetailedItem(item)} 
                isBeingDragged={draggedItem?.originalIndex === index} 
                isDragOver={false} 
              />
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
        item={detailedItem}
        onUse={() => showError("Vous ne pouvez pas utiliser un objet depuis l'établi.")}
        onDropOne={() => detailedItem && handleDropItem(detailedItem, 1)}
        onDropAll={() => detailedItem && handleDropItem(detailedItem, detailedItem.quantity)}
        onUpdate={() => onUpdate()}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

const Countdown = ({ endsAt, onComplete }: { endsAt: string; onComplete: () => void }) => {
  const calculateRemaining = useCallback(() => new Date(endsAt).getTime() - Date.now(), [endsAt]);
  const [remaining, setRemaining] = useState(calculateRemaining());

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const timer = setInterval(() => setRemaining(calculateRemaining()), 1000);
    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  return <>{`${minutes}m ${seconds}s`}</>;
};

export default WorkbenchModal;