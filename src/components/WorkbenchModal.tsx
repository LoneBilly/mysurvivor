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
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import WorkbenchInventorySelectorModal from "./WorkbenchInventorySelectorModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ActionModal from "./ActionModal";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => void;
  onOpenInventory: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate, onOpenInventory }: WorkbenchModalProps) => {
  const { playerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'crafting' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [currentJob, setCurrentJob] = useState<CraftingJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [craftQuantity, setCraftQuantity] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState('');
  const timerCompletedRef = useRef(false);
  const lastJobRef = useRef<CraftingJob | null>(null);
  const [isInventorySelectorOpen, setIsInventorySelectorOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  const [inventoryFullModal, setInventoryFullModal] = useState(false);

  const optimisticWorkbenchItems = useMemo(() => 
    playerData.workbenchItems.filter(item => item.workbench_id === construction?.id),
    [playerData.workbenchItems, construction]
  );

  const optimisticOutputItem = useMemo(() => {
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
        };
      }
    }
    return null;
  }, [playerData.baseConstructions, construction, items]);

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
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

  useEffect(() => {
    if (isOpen && construction) {
      const job = playerData.craftingJobs?.find(j => j.workbench_id === construction.id);
      setCurrentJob(job || null);
      fetchRecipes();
    } else {
      setCurrentJob(null);
    }
  }, [isOpen, construction, playerData.craftingJobs, fetchRecipes]);

  useEffect(() => {
    if (currentJob) {
      lastJobRef.current = currentJob;
    }
  }, [currentJob]);

  const handleStartBatchCraft = useCallback(async () => {
    if (!matchedRecipe || !construction || craftQuantity <= 0) return;
    
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', { 
      p_workbench_id: construction.id, 
      p_recipe_id: matchedRecipe.id,
      p_quantity: craftQuantity
    });
    setIsLoadingAction(false);
    
    if (error) {
      showError(error.message);
    } else {
      onUpdate();
    }
  }, [matchedRecipe, construction, craftQuantity, onUpdate]);

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
            setIsLoadingAction(true);
            refreshPlayerData().finally(() => setIsLoadingAction(false));
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
          setIsLoadingAction(true);
          refreshPlayerData().finally(() => setIsLoadingAction(false));
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

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentJob, refreshPlayerData]);

  useEffect(() => {
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

      if (isMatch) {
        setMatchedRecipe(recipe);
        return;
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
    if (resultItemDef && !resultItemDef.stackable && optimisticOutputItem) return 0;

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
  }, [matchedRecipe, ingredientSlots, optimisticOutputItem, items]);

  useEffect(() => {
    if (craftQuantity > maxCraftQuantity) setCraftQuantity(maxCraftQuantity > 0 ? maxCraftQuantity : 1);
    if (maxCraftQuantity === 0 && craftQuantity !== 1) setCraftQuantity(1);
  }, [maxCraftQuantity, craftQuantity]);

  const handleCancelCraft = async () => {
    if (!construction) return;
    setIsLoadingAction(true);
    setCurrentJob(null);
    const { error } = await supabase.rpc('cancel_crafting_job', { p_workbench_id: construction.id });
    if (error) showError(error.message);
    else showSuccess("Fabrication annulée.");
    await refreshPlayerData();
    setIsLoadingAction(false);
  };

  const handleCollectOutput = async () => {
    if (!construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: construction.id });
    setIsLoadingAction(false);
    if (error) {
      if (error.message.includes("Votre inventaire est plein")) {
        setInventoryFullModal(true);
      } else {
        showError(error.message);
      }
    } else {
      showSuccess("Objet récupéré !");
      onUpdate();
    }
  };

  const handleDiscardOutput = async () => {
    if (!construction) return;
    setInventoryFullModal(false);
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('discard_workbench_output', { p_workbench_id: construction.id });
    setIsLoadingAction(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet jeté.");
      onUpdate();
    }
  };

  const handleTransferFromWorkbench = async (item: InventoryItem, quantity: number) => {
    setDetailedItem(null);
    const { error } = await supabase.rpc('move_item_from_workbench', { p_workbench_item_id: item.id, p_quantity_to_move: quantity, p_target_slot: -1 });
    if (error) showError(error.message);
    else {
      showSuccess("Transfert réussi.");
      await onUpdate();
    }
  };

  const handleOpenInventorySelector = (slotIndex: number) => {
    setTargetSlot(slotIndex);
    setIsInventorySelectorOpen(true);
  };

  const handleItemSelectForWorkbench = async (item: InventoryItem, quantity: number) => {
    if (targetSlot === null || !construction) return;
    setIsInventorySelectorOpen(false);
    
    const { error } = await supabase.rpc('move_item_to_workbench', {
      p_inventory_id: item.id,
      p_workbench_id: construction.id,
      p_quantity_to_move: quantity,
      p_target_slot: targetSlot
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet transféré.");
      onUpdate();
    }
    setTargetSlot(null);
  };

  const handleRemoveItemFromWorkbench = async (item: InventoryItem) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('move_item_from_workbench_to_inventory', {
      p_workbench_item_id: item.id,
      p_quantity_to_move: item.quantity,
    });
    setIsLoadingAction(false);

    if (error) {
      showError(error.message || "Erreur lors du retrait de l'objet.");
    } else {
      showSuccess("Objet retourné à l'inventaire.");
      onUpdate();
    }
  };

  const displayJob = currentJob || (isLoadingAction ? lastJobRef.current : null);

  if (!isOpen || !construction) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Hammer className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Établi</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-black/20 rounded-lg p-3 border border-slate-700 space-y-3">
              <div className="flex flex-row items-center justify-center gap-2">
                {/* Ingredients */}
                <div className="grid grid-cols-3 gap-1">
                  {ingredientSlots.map((item, index) => (
                    <div key={item?.id || index} className="w-12 h-12">
                      <InventorySlot
                        item={item}
                        index={index}
                        isUnlocked={true}
                        onDragStart={() => {}}
                        onItemClick={() => handleOpenInventorySelector(index)}
                        isBeingDragged={false}
                        isDragOver={false}
                        isLocked={!!currentJob}
                        onRemove={handleRemoveItemFromWorkbench}
                      />
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-5 h-5 text-gray-500 shrink-0" />

                {/* Result */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={optimisticOutputItem && !currentJob ? handleCollectOutput : undefined}
                    disabled={isLoadingAction || !!currentJob || !optimisticOutputItem}
                    className={cn(
                      "relative w-14 h-14 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center",
                      optimisticOutputItem && !currentJob && "cursor-pointer hover:bg-slate-900/80 hover:border-slate-500 transition-colors"
                    )}
                  >
                    {displayJob ? (
                      <>
                        <ItemIcon iconName={getIconUrl(displayJob.result_item_icon) || displayJob.result_item_icon} alt={displayJob.result_item_name} className="grayscale opacity-50" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg text-white">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          {displayJob.initial_quantity > 1 && (
                            <span className="text-xs font-mono mt-1">
                              {displayJob.initial_quantity - displayJob.quantity + 1}/{displayJob.initial_quantity}
                            </span>
                          )}
                        </div>
                      </>
                    ) : optimisticOutputItem ? (
                      <>
                        <ItemIcon iconName={getIconUrl(optimisticOutputItem.items?.icon) || optimisticOutputItem.items?.icon} alt={optimisticOutputItem.items?.name || ''} />
                        <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                          x{optimisticOutputItem.quantity}
                        </span>
                      </>
                    ) : resultItem ? (
                      <>
                        <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                        <div className="absolute inset-0 bg-black/30 rounded-lg"></div>
                      </>
                    ) : null}
                  </button>
                </div>
              </div>
              
              <div className="pt-3 border-t border-slate-700">
                <div className="h-auto flex flex-col justify-center items-center space-y-2">
                  {currentJob ? (
                    <div className="w-full space-y-2 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="flex-grow" indicatorClassName="transition-none" />
                        <Button size="icon" variant="destructive" onClick={handleCancelCraft} disabled={isLoadingAction}>
                          <Square className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-center text-sm text-gray-300 font-mono h-5 flex items-center justify-center gap-x-3">
                        {isLoadingAction && !currentJob ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {timeRemaining && <span>{timeRemaining}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {matchedRecipe && maxCraftQuantity > 0 ? (
                        <div className="w-full px-4 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>Quantité: <span className="font-bold text-white">{craftQuantity}</span></span>
                          </div>
                          <Slider value={[craftQuantity]} onValueChange={(value) => setCraftQuantity(value[0])} min={1} max={maxCraftQuantity} step={1} disabled={isLoadingAction} />
                          <Button onClick={handleStartBatchCraft} disabled={!matchedRecipe || isLoadingAction || craftQuantity === 0} className="w-full">
                            {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : `Fabriquer ${craftQuantity}x`}
                          </Button>
                        </div>
                      ) : matchedRecipe ? (
                        <p className="text-center text-xs text-yellow-400 px-4">
                          {resultItem && !resultItem.stackable && optimisticOutputItem ? "Collectez l'objet pour fabriquer." : "Ressources insuffisantes."}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Placez des ingrédients pour voir les recettes.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsBlueprintModalOpen(true)}>
              <BookOpen className="w-4 h-4 mr-2" /> Blueprints
            </Button>
            <Button variant="destructive" onClick={() => onDemolish(construction)}>
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
        onDropOne={() => {}}
        onDropAll={() => {}}
        onUpdate={onUpdate}
        onTransferFromWorkbench={handleTransferFromWorkbench}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
      <WorkbenchInventorySelectorModal
        isOpen={isInventorySelectorOpen}
        onClose={() => setIsInventorySelectorOpen(false)}
        inventory={playerData.inventory}
        onSelectItem={handleItemSelectForWorkbench}
      />
      <ActionModal
        isOpen={inventoryFullModal}
        onClose={() => setInventoryFullModal(false)}
        title="Inventaire plein"
        description="Votre inventaire est plein. Vous pouvez faire de la place ou jeter l'objet fabriqué pour continuer."
        actions={[
          { label: "Faire de la place", onClick: () => { setInventoryFullModal(false); onOpenInventory(); }, variant: "default" },
          { label: "Jeter l'objet", onClick: handleDiscardOutput, variant: "destructive" },
        ]}
      />
    </>
  );
};

export default WorkbenchModal;