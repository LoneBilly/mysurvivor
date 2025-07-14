import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  const [loadingAction, setLoadingAction] = useState(false);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; from: 'inventory' | 'crafting'; fromIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'crafting'; index: number } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const currentJob = useMemo(() => 
    playerData.craftingJobs?.find(job => job.workbench_id === construction?.id),
    [playerData.craftingJobs, construction]
  );

  const workbenchConstruction = useMemo(() => 
    playerData.baseConstructions.find(c => c.id === construction?.id),
    [playerData.baseConstructions, construction]
  );

  const outputItem = useMemo(() => {
    if (!workbenchConstruction?.output_item_id) return null;
    const itemDef = items.find(i => i.id === workbenchConstruction.output_item_id);
    if (!itemDef) return null;
    return {
        id: -1,
        item_id: itemDef.id,
        quantity: workbenchConstruction.output_quantity || 0,
        slot_position: -1,
        items: itemDef
    };
  }, [workbenchConstruction, items]);

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

  const { maxCrafts, totalTime } = useMemo(() => {
    const ingredients = ingredientSlots.filter(Boolean) as InventoryItem[];
    if (ingredients.length === 0 || !matchedRecipe) {
      return { maxCrafts: 0, totalTime: 0 };
    }

    const craftableCounts = [
      matchedRecipe.ingredient1_id ? Math.floor((ingredients.find(i => i.item_id === matchedRecipe.ingredient1_id)?.quantity || 0) / matchedRecipe.ingredient1_quantity) : Infinity,
      matchedRecipe.ingredient2_id ? Math.floor((ingredients.find(i => i.item_id === matchedRecipe.ingredient2_id)?.quantity || 0) / matchedRecipe.ingredient2_quantity) : Infinity,
      matchedRecipe.ingredient3_id ? Math.floor((ingredients.find(i => i.item_id === matchedRecipe.ingredient3_id)?.quantity || 0) / matchedRecipe.ingredient3_quantity) : Infinity,
    ].filter(c => isFinite(c));
    
    const maxPossible = craftableCounts.length > 0 ? Math.min(...craftableCounts) : 0;
    return { maxCrafts: maxPossible, totalTime: maxPossible * matchedRecipe.craft_time_seconds };
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
    setLoadingAction(true);
    const { error } = await supabase.rpc('start_craft', {
        p_workbench_id: construction.id,
        p_recipe_id: matchedRecipe.id
    });
    if (error) {
        showError(error.message);
    } else {
        showSuccess("Fabrication lancée !");
        onUpdate();
    }
    setLoadingAction(false);
  };

  const handleCollect = async () => {
    if (!construction) return;
    setLoadingAction(true);
    const { error } = await supabase.rpc('collect_workbench_output', {
        p_workbench_id: construction.id
    });
    if (error) {
        showError(error.message);
    } else {
        showSuccess("Objet récupéré !");
        onUpdate();
    }
    setLoadingAction(false);
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
        await onUpdate(true);
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
        await onUpdate(true);
        await fetchWorkbenchItems();
    }
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
              {resultItem && (
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
          {matchedRecipe && (
            <div className="text-center text-sm text-gray-300">
              <p>Temps par unité: {matchedRecipe.craft_time_seconds}s</p>
              {maxCrafts > 0 && <p>Temps total ({maxCrafts}x): {totalTime}s</p>}
            </div>
          )}
          <Button onClick={handleStartCraft} disabled={!matchedRecipe || loadingAction} className="w-full">
            {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Hammer className="w-4 h-4 mr-2" /> Fabriquer</>}
          </Button>
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

  const renderJobProgress = (job: CraftingJob) => {
    const recipe = recipes.find(r => r.id === job.recipe_id);
    const resultItem = items.find(i => i.id === recipe?.result_item_id);
    return (
      <div className="text-center space-y-4 p-8">
        <h3 className="text-lg font-semibold">Fabrication en cours...</h3>
        {resultItem && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 relative">
              <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
            </div>
            <p className="font-bold">{resultItem.name} x{recipe?.result_quantity}</p>
          </div>
        )}
        <div className="text-lg font-mono">
          <CountdownTimer endTime={job.ends_at} onComplete={refreshPlayerData} />
        </div>
      </div>
    );
  };

  const renderOutput = () => {
    if (!outputItem) return null;
    return (
      <div className="text-center space-y-4 p-8">
        <h3 className="text-lg font-semibold">Fabrication terminée !</h3>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 relative">
            <ItemIcon iconName={getIconUrl(outputItem.items?.icon) || outputItem.items?.icon} alt={outputItem.items?.name || ''} />
          </div>
          <p className="font-bold">{outputItem.items?.name} x{outputItem.quantity}</p>
        </div>
        <Button onClick={handleCollect} disabled={loadingAction}>
          {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Récupérer"}
        </Button>
      </div>
    );
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
            {currentJob ? renderJobProgress(currentJob) : outputItem ? renderOutput() : renderCraftingInterface()}
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