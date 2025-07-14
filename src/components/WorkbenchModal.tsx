import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, CraftingJob, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, Check, BookOpen, Clock } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
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
  const { playerData, setPlayerData, items, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isCrafting, setIsCrafting] = useState(false);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; from: 'inventory' | 'crafting'; fromIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'crafting'; index: number } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const displayedInventory = useMemo(() => {
    const itemsInCraftingIds = new Set(ingredientSlots.filter(Boolean).map(item => item!.id));
    return playerData.inventory.filter(item => !itemsInCraftingIds.has(item.id));
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

  const handleCraft = async () => {
    if (!matchedRecipe || !construction) return;
    setIsCrafting(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
      setIsCrafting(false);
    } else {
      showSuccess("Fabrication lancée !");
      setIngredientSlots([null, null, null]);
      onUpdate();
      setIsCrafting(false);
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
    const newInventory = [...playerData.inventory];

    const invItemIndex = newInventory.findIndex(i => i.id === item.id);
    if (invItemIndex === -1 || newInventory[invItemIndex].quantity < quantity) {
      showError("Erreur ou quantité insuffisante.");
      return;
    }
    
    newInventory[invItemIndex].quantity -= quantity;
    if (newInventory[invItemIndex].quantity === 0) {
      newInventory.splice(invItemIndex, 1);
    }

    const existingSlotIndex = newSlots.findIndex(slot => slot?.item_id === item.item_id);
    if (existingSlotIndex !== -1) {
      newSlots[existingSlotIndex]!.quantity += quantity;
    } else {
      const emptySlotIndex = newSlots.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        showError("L'établi est plein.");
        return; // Revert logic would be needed for production
      }
      newSlots[emptySlotIndex] = { ...item, quantity };
    }
    
    setIngredientSlots(newSlots);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
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

  const handleDragEnd = () => {
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

    const newIngredients = [...ingredientSlots];
    const newInventory = [...playerData.inventory];

    const fromItem = from === 'crafting' ? newIngredients[fromIndex] : newInventory.find(i => i.id === dragged.id);
    const toItem = target === 'crafting' ? newIngredients[toIndex] : newInventory.find(i => i.slot_position === toIndex);

    if (!fromItem) return;

    // Remove from source
    if (from === 'crafting') {
      newIngredients[fromIndex] = null;
    } else {
      const idx = newInventory.findIndex(i => i.id === fromItem.id);
      if (idx > -1) newInventory.splice(idx, 1);
    }

    // Remove from target if exists
    if (toItem) {
      if (target === 'crafting') {
        newIngredients[toIndex] = null;
      } else {
        const idx = newInventory.findIndex(i => i.id === toItem.id);
        if (idx > -1) newInventory.splice(idx, 1);
      }
    }

    // Add to target
    if (target === 'crafting') {
      newIngredients[toIndex] = fromItem;
    } else {
      fromItem.slot_position = toIndex;
      newInventory.push(fromItem);
    }

    // Add swapped item back to source
    if (toItem) {
      if (from === 'crafting') {
        const emptyInvSlot = newInventory.findIndex(i => i.slot_position === fromItem.slot_position);
        if (emptyInvSlot === -1) {
          newInventory.push(toItem);
        } else {
          // This case is complex, for now just add it back
          newInventory.push(toItem);
        }
      } else {
        newIngredients[fromIndex] = toItem;
      }
    }

    setIngredientSlots(newIngredients);
    setPlayerData(prev => ({ ...prev, inventory: newInventory }));
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
                  isBeingDragged={draggedItem?.from === 'crafting' && draggedItem?.fromIndex === index}
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
          {matchedRecipe && (
            <div className="text-center text-sm text-gray-300">
              <p>Temps: {matchedRecipe.craft_time_seconds}s</p>
            </div>
          )}
          <Button onClick={handleCraft} disabled={!matchedRecipe || isCrafting} className="w-full">
            {isCrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Hammer className="w-4 h-4 mr-2" /> Fabriquer</>}
          </Button>
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
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;