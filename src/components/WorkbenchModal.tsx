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
  const { playerData, items } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
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
  const [outputSlot, setOutputSlot] = useState<InventoryItem | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [potentialOutputQuantity, setPotentialOutputQuantity] = useState(0);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; from: 'inventory' | 'crafting' | 'output'; fromIndex: number } | null>(null);
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
    } else {
      setIngredientSlots([null, null, null]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setOutputSlot(null);
      setIsContinuousCrafting(false);
      if (craftTimerRef.current) clearInterval(craftTimerRef.current);
    }
  }, [isOpen, fetchRecipes]);

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

  const handleStartContinuousCraft = () => {
    if (!matchedRecipe || potentialOutputQuantity === 0) return;
    const maxPossible = potentialOutputQuantity / matchedRecipe.result_quantity;
    setMaxCraftCount(maxPossible);
    setCurrentCraftCount(0);
    setIsContinuousCrafting(true);
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
    if (!isContinuousCrafting || !matchedRecipe) return;

    const craftNextItem = () => {
      if (currentCraftCount >= maxCraftCount) {
        setIsContinuousCrafting(false);
        showSuccess("Fabrication en série terminée !");
        return;
      }

      const craftTime = matchedRecipe.craft_time_seconds * 1000;
      const startTime = Date.now();
      
      craftTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(100, (elapsed / craftTime) * 100);
        setProgress(newProgress);

        if (elapsed >= craftTime) {
          if (craftTimerRef.current) clearInterval(craftTimerRef.current);
          
          setIngredientSlots(prevSlots => {
            const newSlots = JSON.parse(JSON.stringify(prevSlots));
            if (matchedRecipe.ingredient1_id) {
                const idx = newSlots.findIndex((i: InventoryItem | null) => i?.item_id === matchedRecipe.ingredient1_id);
                if(idx > -1) newSlots[idx]!.quantity -= matchedRecipe.ingredient1_quantity;
            }
            if (matchedRecipe.ingredient2_id) {
                const idx = newSlots.findIndex((i: InventoryItem | null) => i?.item_id === matchedRecipe.ingredient2_id);
                if(idx > -1) newSlots[idx]!.quantity -= matchedRecipe.ingredient2_quantity;
            }
            if (matchedRecipe.ingredient3_id) {
                const idx = newSlots.findIndex((i: InventoryItem | null) => i?.item_id === matchedRecipe.ingredient3_id);
                if(idx > -1) newSlots[idx]!.quantity -= matchedRecipe.ingredient3_quantity;
            }
            return newSlots.map((s: InventoryItem | null) => s && s.quantity > 0 ? s : null);
          });

          setOutputSlot(prevOutput => {
            const resultItemDef = items.find(i => i.id === matchedRecipe.result_item_id);
            if (!resultItemDef) return prevOutput;
            if (!prevOutput) {
              return { id: -1, item_id: resultItemDef.id, quantity: matchedRecipe.result_quantity, slot_position: -1, items: resultItemDef };
            }
            return { ...prevOutput, quantity: prevOutput.quantity + matchedRecipe.result_quantity };
          });

          setCurrentCraftCount(prev => prev + 1);
        }
      }, 100);
    };

    craftNextItem();

    return () => {
      if (craftTimerRef.current) clearInterval(craftTimerRef.current);
    };
  }, [isContinuousCrafting, currentCraftCount, maxCraftCount, matchedRecipe, items]);

  const handleFinalizeAndCollect = async () => {
    if (!outputSlot || !matchedRecipe || !user || isCollecting) return;
    setIsCollecting(true);

    const quantityToCraft = outputSlot.quantity / matchedRecipe.result_quantity;
    const ingredientsToConsume = [];
    if (matchedRecipe.ingredient1_id) ingredientsToConsume.push({ id: matchedRecipe.ingredient1_id, quantity: matchedRecipe.ingredient1_quantity * quantityToCraft });
    if (matchedRecipe.ingredient2_id) ingredientsToConsume.push({ id: matchedRecipe.ingredient2_id, quantity: matchedRecipe.ingredient2_quantity * quantityToCraft });
    if (matchedRecipe.ingredient3_id) ingredientsToConsume.push({ id: matchedRecipe.ingredient3_id, quantity: matchedRecipe.ingredient3_quantity * quantityToCraft });

    const consumptionPromises = ingredientsToConsume.map(ing => 
      supabase.rpc('consume_inventory_item', { p_player_id: user.id, p_item_id: ing.id, p_quantity_to_consume: ing.quantity })
    );

    const results = await Promise.all(consumptionPromises);
    const error = results.find(r => r.error);

    if (error) {
      showError(`Erreur lors de la consommation des ingrédients: ${error.error.message}`);
      setIsCollecting(false);
      return;
    }

    const { error: addError } = await supabase.rpc('add_item_to_inventory', { p_player_id: user.id, p_item_id: outputSlot.item_id, p_quantity: outputSlot.quantity });

    if (addError) {
      showError(`Erreur lors de l'ajout de l'objet à l'inventaire: ${addError.message}`);
      setIsCollecting(false);
      return;
    }

    showSuccess(`${outputSlot.quantity} ${outputSlot.items.name} ajoutés à l'inventaire.`);
    setOutputSlot(null);
    onUpdate();
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

    const { item: dragged, from, fromIndex } = draggedItem;
    const { target, index: toIndex } = dragOver;

    setDraggedItem(null);
    setDragOver(null);

    if (from === target && fromIndex === toIndex) return;

    if (from === 'output' && target === 'inventory') {
      await handleFinalizeAndCollect();
      return;
    }

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
      
      const oldSlotIndex = newSlots.findIndex((s, i) => i !== toIndex && s?.id === itemToMoveIn.id);
      if (oldSlotIndex > -1) {
        newSlots[oldSlotIndex] = itemToMoveOut;
      }
    } else if (from === 'crafting' && target === 'inventory') {
      const itemToMoveOut = newSlots[fromIndex];
      if (!itemToMoveOut) return;

      const itemInTargetInventorySlot = displayedInventory.find(i => i.slot_position === toIndex);
      
      newSlots[fromIndex] = itemInTargetInventorySlot || null;
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
                  onItemClick={handleFinalizeAndCollect}
                  isBeingDragged={draggedItem?.from === 'output'}
                  isDragOver={false}
                />
              ) : !isContinuousCrafting && resultItem ? (
                <>
                  <ItemIcon iconName={useGame().getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
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
            const item = displayedInventory.find(i => i.slot_position === index);
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