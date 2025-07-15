import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen, Square } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";
import CountdownTimer from "./CountdownTimer";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, setPlayerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<InventoryItem[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' | 'output' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [currentJob, setCurrentJob] = useState<CraftingJob | null>(null);
  const [itemToCollect, setItemToCollect] = useState<InventoryItem | null>(null);
  const [isDraggingOutput, setIsDraggingOutput] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAutoCrafting, setIsAutoCrafting] = useState(false);
  const wasCrafting = useRef(false);
  const [draggedItem, setDraggedItem] = useState<{ index: number; source: 'inventory' | 'crafting' } | null>(null);
  const [dragOver, setDragOver] = useState<{ index: number; target: 'inventory' | 'crafting' } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
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
      const newSlots = Array(3).fill(null);
      fetchedItems.forEach(item => {
        if (item.slot_position >= 0 && item.slot_position < 3) {
          newSlots[item.slot_position] = item;
        }
      });
      setIngredientSlots(newSlots);
    }
  }, [construction]);

  useEffect(() => {
    if (isOpen && construction) {
      const job = playerData.craftingJobs?.find(j => j.workbench_id === construction.id);
      setCurrentJob(job || null);

      const currentConstructionState = playerData.baseConstructions.find(c => c.id === construction.id);
      if (currentConstructionState?.output_item_id) {
        const outputItemDef = items.find(i => i.id === currentConstructionState.output_item_id);
        if (outputItemDef) {
          setItemToCollect({
            id: -1,
            item_id: outputItemDef.id,
            quantity: currentConstructionState.output_quantity || 1,
            slot_position: -1,
            items: outputItemDef
          });
        }
      } else {
        setItemToCollect(null);
      }

      fetchRecipes();
      fetchWorkbenchContents();
    } else {
      setIngredientSlots([null, null, null]);
      setWorkbenchItems([]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setCurrentJob(null);
      setItemToCollect(null);
      setProgress(0);
      setIsAutoCrafting(false);
    }
  }, [isOpen, construction, playerData.craftingJobs, playerData.baseConstructions, items, fetchRecipes, fetchWorkbenchContents]);

  useEffect(() => {
    if (currentJob) {
      const interval = setInterval(() => {
        const startTime = new Date(currentJob.started_at).getTime();
        const endTime = new Date(currentJob.ends_at).getTime();
        const now = Date.now();
        
        if (now >= endTime) {
          setProgress(100);
          clearInterval(interval);
          return;
        }

        const totalDuration = endTime - startTime;
        const elapsedTime = now - startTime;
        const newProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
        setProgress(newProgress);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
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

  const startNextCraftInLoop = useCallback(async () => {
    if (!matchedRecipe || !construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
      setIsAutoCrafting(false);
    } else {
      await refreshPlayerData();
    }
    setIsLoadingAction(false);
  }, [matchedRecipe, construction, refreshPlayerData]);

  const handleStartCraftingLoop = () => {
    if (!matchedRecipe) return;
    setIsAutoCrafting(true);
    startNextCraftInLoop();
  };

  const handleStopCraftingLoop = () => {
    setIsAutoCrafting(false);
  };

  const handleCancelCraft = async () => {
    if (!construction) return;
    handleStopCraftingLoop();
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('cancel_crafting_job', { p_workbench_id: construction.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication annulée.");
      await refreshPlayerData();
    }
    setIsLoadingAction(false);
  };

  useEffect(() => {
    if (wasCrafting.current && !currentJob && isAutoCrafting) {
      if (matchedRecipe) {
        startNextCraftInLoop();
      } else {
        setIsAutoCrafting(false);
        showSuccess("Fabrication en série terminée (ressources épuisées).");
      }
    }
    wasCrafting.current = !!currentJob;
  }, [currentJob, isAutoCrafting, matchedRecipe, startNextCraftInLoop]);

  const handleDragStartOutput = (e: React.DragEvent<HTMLDivElement>) => {
    if (!itemToCollect) return;
    setIsDraggingOutput(true);
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'workbench_output', constructionId: construction?.id }));
  };

  const handleDropOnInventory = async (e: React.DragEvent<HTMLDivElement>, targetSlot: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const parsedData = JSON.parse(data);
    if (parsedData.type !== 'workbench_output' || parsedData.constructionId !== construction?.id) return;
    
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('collect_workbench_output', { 
      p_workbench_id: construction.id,
      p_target_slot: targetSlot
    });
    setIsLoadingAction(false);

    if (error) {
      showError(error.message);
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
  
    let rpcPromise;
  
    if (source === 'inventory' && target === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'crafting' && target === 'crafting') {
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_workbench_items', { p_workbench_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (source === 'inventory' && target === 'crafting') {
      const itemToMove = playerData.inventory.find(i => i.slot_position === fromIndex);
      if (!itemToMove || !construction) return;
      rpcPromise = supabase.rpc('move_item_to_workbench', { p_inventory_id: itemToMove.id, p_workbench_id: construction.id, p_quantity_to_move: itemToMove.quantity, p_target_slot: toIndex });
    } else if (source === 'crafting' && target === 'inventory') {
      const itemToMove = workbenchItems.find(i => i.slot_position === fromIndex);
      if (!itemToMove) return;
      rpcPromise = supabase.rpc('move_item_from_workbench', { p_workbench_item_id: itemToMove.id, p_quantity_to_move: itemToMove.quantity, p_target_slot: toIndex });
    }
  
    if (rpcPromise) {
      const { error } = await rpcPromise;
      if (error) {
        showError(error.message || "Erreur de transfert.");
      } else {
        await onUpdate();
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

  const isResultStackable = resultItem?.stackable ?? false;
  const canCraftLoop = isResultStackable || !itemToCollect;

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
                        itemToCollect && "cursor-grab active:cursor-grabbing"
                      )}
                      draggable={!!itemToCollect}
                      onDragStart={handleDragStartOutput}
                      onDragEnd={() => setIsDraggingOutput(false)}
                    >
                      {currentJob ? (
                        <>
                          <ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} className="grayscale opacity-50" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        </>
                      ) : itemToCollect ? (
                        <>
                          <ItemIcon iconName={getIconUrl(itemToCollect.items?.icon) || itemToCollect.items?.icon} alt={itemToCollect.items?.name || ''} />
                          <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                            x{itemToCollect.quantity}
                          </span>
                        </>
                      ) : resultItem && (
                        <>
                          <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                          {matchedRecipe && (
                            <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                              x{matchedRecipe.result_quantity}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="col-span-2" />
                  </div>
                  
                  <div className="h-[60px] flex flex-col justify-center items-center">
                    {currentJob ? (
                      <div className="w-full space-y-2 px-4">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="flex-grow" />
                          <Button size="icon" variant="destructive" onClick={handleCancelCraft} disabled={isLoadingAction}>
                            <Square className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-center text-sm text-gray-300 font-mono">
                          <CountdownTimer endTime={currentJob.ends_at} onComplete={onUpdate} />
                        </div>
                      </div>
                    ) : (
                      <>
                        {matchedRecipe && (
                          <div className="text-center text-sm text-gray-300 mb-2">
                            <p>Temps: {matchedRecipe.craft_time_seconds}s</p>
                            {!canCraftLoop && <p className="text-xs text-yellow-400">Non empilable, fabrication en série impossible.</p>}
                          </div>
                        )}
                        <Button onClick={handleStartCraftingLoop} disabled={!matchedRecipe || isLoadingAction || isAutoCrafting || !canCraftLoop}>
                          {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : isAutoCrafting ? "Fabrication en cours..." : "Fabriquer"}
                        </Button>
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