import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen, Square } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showInfo } from "@/utils/toast";
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
  const { playerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<InventoryItem[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' | 'output' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isCrafting, setIsCrafting] = useState(false);

  const activeJob = useMemo(() => 
    playerData.craftingJobs?.find(job => job.workbench_id === construction?.id),
    [playerData.craftingJobs, construction]
  );

  const currentConstructionState = useMemo(() => 
    playerData.baseConstructions.find(c => c.id === construction?.id),
    [playerData.baseConstructions, construction]
  );

  const outputItem = useMemo(() => {
    if (!currentConstructionState || !currentConstructionState.output_item_id) return null;
    const itemDetails = items.find(i => i.id === currentConstructionState.output_item_id);
    if (!itemDetails) return null;
    return {
        id: -1, // Not a real inventory item
        item_id: itemDetails.id,
        quantity: currentConstructionState.output_quantity || 0,
        slot_position: -1,
        items: itemDetails
    };
  }, [currentConstructionState, items]);

  const fetchInitialData = useCallback(async () => {
    if (!construction) return;
    const [recipesRes, workbenchItemsRes] = await Promise.all([
      supabase.from('crafting_recipes').select('*'),
      supabase.from('workbench_items').select('*, items(*)').eq('workbench_id', construction.id)
    ]);
    if (recipesRes.error) showError("Impossible de charger les recettes.");
    else setRecipes(recipesRes.data || []);
    if (workbenchItemsRes.error) showError("Impossible de charger le contenu de l'établi.");
    else setWorkbenchItems(workbenchItemsRes.data as InventoryItem[] || []);
  }, [construction]);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen, fetchInitialData]);

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
    setIsCrafting(true);
    const { error } = await supabase.rpc('start_craft', {
      p_workbench_id: construction.id,
      p_recipe_id: matchedRecipe.id,
    });
    setIsCrafting(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication lancée !");
      onUpdate();
      fetchInitialData();
    }
  };

  const handleCollect = async (targetSlot: number | null = null) => {
    if (!construction || !outputItem) return;
    setDetailedItem(null);
    const { error } = await supabase.rpc('collect_workbench_output', {
      p_workbench_id: construction.id,
      p_target_slot: targetSlot
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet récupéré !");
      onUpdate();
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
            <div className="relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center">
              {outputItem ? (
                <InventorySlot 
                  item={outputItem} 
                  index={0} 
                  isUnlocked={true} 
                  onDragStart={() => {}} 
                  onItemClick={() => setDetailedItem({ item: outputItem, source: 'output' })}
                  isBeingDragged={false}
                  isDragOver={false}
                />
              ) : resultItem ? (
                <>
                  <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                  {matchedRecipe && matchedRecipe.result_quantity > 1 && (
                    <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                      x{matchedRecipe.result_quantity}
                    </span>
                  )}
                </>
              ) : null}
            </div>
            <div className="col-span-2" />
          </div>
          {activeJob ? (
            <div className="text-center text-sm text-gray-300">
              <p>Fabrication en cours...</p>
              <p className="font-bold"><CountdownTimer endTime={activeJob.ends_at} onComplete={refreshPlayerData} /></p>
            </div>
          ) : matchedRecipe ? (
            <div className="text-center text-sm text-gray-300">
              <p>Temps: {matchedRecipe.craft_time_seconds}s</p>
            </div>
          ) : null}
          <Button onClick={handleStartCraft} disabled={!matchedRecipe || isCrafting || !!activeJob || !!outputItem} className="w-full">
            {isCrafting || activeJob ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Hammer className="w-4 h-4 mr-2" />}
            {activeJob ? 'En cours...' : 'Fabriquer'}
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
                  onDragStart={() => {}} 
                  onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'inventory' })} 
                  isBeingDragged={false}
                  isDragOver={false}
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
            handleCollect();
          } else {
            showError("Vous ne pouvez pas utiliser un objet depuis l'établi.");
          }
        }}
        onDropOne={() => {}}
        onDropAll={() => {}}
        onUpdate={onUpdate}
        onTransferToWorkbench={(item, quantity) => {
          // This logic is now handled by drag and drop, but can be implemented if needed
        }}
        onTransferFromWorkbench={(item, quantity) => {
          // This logic is now handled by drag and drop, but can be implemented if needed
        }}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;