import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";
import CountdownTimer from "./CountdownTimer";
import { cn } from "@/lib/utils";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, items, getIconUrl } = useGame();
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

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

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
    } else {
      setIngredientSlots([null, null, null]);
      setWorkbenchItems([]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setCurrentJob(null);
      setItemToCollect(null);
      setProgress(0);
    }
  }, [isOpen, construction, playerData.craftingJobs, playerData.baseConstructions, items, fetchRecipes]);

  useEffect(() => {
    if (!construction) return;
    const { data, error } = supabase
      .from('workbench_items')
      .select('*, items(*)')
      .eq('workbench_id', construction.id)
      .then(response => {
        if (response.error) {
          showError("Impossible de charger le contenu de l'établi.");
        } else {
          const fetchedItems = response.data as InventoryItem[];
          setWorkbenchItems(fetchedItems);
          const newSlots = Array(3).fill(null);
          fetchedItems.forEach(item => {
            if (item.slot_position >= 0 && item.slot_position < 3) {
              newSlots[item.slot_position] = item;
            }
          });
          setIngredientSlots(newSlots);
        }
      });
  }, [construction, isOpen, onUpdate]);

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

  const maxCraftableQuantity = useMemo(() => {
    if (!matchedRecipe) return 0;
    const ingredients = ingredientSlots.filter(Boolean) as InventoryItem[];
    const craftableCounts = [
      matchedRecipe.ingredient1_id ? Math.floor((ingredients.find(i => i.item_id === matchedRecipe.ingredient1_id)?.quantity || 0) / matchedRecipe.ingredient1_quantity) : Infinity,
      matchedRecipe.ingredient2_id ? Math.floor((ingredients.find(i => i.item_id === matchedRecipe.ingredient2_id)?.quantity || 0) / matchedRecipe.ingredient2_quantity) : Infinity,
      matchedRecipe.ingredient3_id ? Math.floor((ingredients.find(i => i.item_id === matchedRecipe.ingredient3_id)?.quantity || 0) / matchedRecipe.ingredient3_quantity) : Infinity,
    ].filter(c => isFinite(c));
    return craftableCounts.length > 0 ? Math.min(...craftableCounts) : 0;
  }, [ingredientSlots, matchedRecipe]);

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

  const handleStartCraft = async () => {
    if (!matchedRecipe || !construction) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
      setIsLoadingAction(false);
    } else {
      showSuccess("Fabrication lancée !");
      await onUpdate();
      setIsLoadingAction(false);
    }
  };

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
                  <div className="grid grid-cols-5 gap-2">
                    <div />
                    {ingredientSlots.map((item, index) => (
                      <div key={item?.id || index}>
                        <InventorySlot
                          item={item}
                          index={index}
                          isUnlocked={true}
                          onDragStart={() => {}}
                          onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'crafting' })}
                          isBeingDragged={false}
                          isDragOver={false}
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
                        <div className="w-full bg-slate-700 rounded-full h-4 border border-slate-600 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
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
                          </div>
                        )}
                        <Button onClick={handleStartCraft} disabled={!matchedRecipe || isLoadingAction} className="w-full max-w-xs">
                          {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Hammer className="w-4 h-4 mr-2" /> Fabriquer</>}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-center mb-2">Inventaire</h3>
                <div className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
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
                          onDragStart={() => {}}
                          onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'inventory' })} 
                          isBeingDragged={false}
                          isDragOver={isDraggingOutput}
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
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;