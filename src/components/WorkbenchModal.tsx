import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const { playerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<InventoryItem[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [currentJob, setCurrentJob] = useState<CraftingJob | null>(null);
  const [itemToCollect, setItemToCollect] = useState<InventoryItem | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; source: 'output' } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);
  const inventoryGridRef = useRef<HTMLDivElement | null>(null);

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
      fetchWorkbenchItems();
    } else {
      setIngredientSlots([null, null, null]);
      setWorkbenchItems([]);
      setMatchedRecipe(null);
      setResultItem(null);
      setDetailedItem(null);
      setCurrentJob(null);
      setItemToCollect(null);
    }
  }, [isOpen, construction, playerData.craftingJobs, playerData.baseConstructions, items, fetchRecipes, fetchWorkbenchItems]);

  useEffect(() => {
    const newSlots = Array(3).fill(null);
    workbenchItems.forEach(item => {
        if (item.slot_position >= 0 && item.slot_position < 3) {
            newSlots[item.slot_position] = item;
        }
    });
    setIngredientSlots(newSlots);
  }, [workbenchItems]);

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
    if (currentJob || itemToCollect) {
      setMatchedRecipe(null);
      return;
    }

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
  }, [ingredientSlots, recipes, currentJob, itemToCollect]);

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
    } else {
      showSuccess("Fabrication lancée !");
      await onUpdate();
    }
    setIsLoadingAction(false);
  };

  const handleDragStart = (item: InventoryItem, source: 'output', node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem({ item, source });
    
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

    let newDragOverIndex: number | null = null;
    if (inventoryGridRef.current) {
      const slotElements = Array.from(inventoryGridRef.current.children);
      for (const slot of slotElements) {
        const rect = slot.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const potentialIndex = parseInt((slot as HTMLElement).dataset.slotIndex || '-1', 10);
          if (potentialIndex !== -1 && potentialIndex < playerData.playerState.unlocked_slots) {
            newDragOverIndex = potentialIndex;
          }
          break;
        }
      }
    }
    setDragOverIndex(newDragOverIndex);
  }, [playerData.playerState.unlocked_slots]);

  const handleDragEnd = useCallback(async () => {
    if (draggedItemNode.current) {
      document.body.removeChild(draggedItemNode.current);
      draggedItemNode.current = null;
    }

    if (!draggedItem || dragOverIndex === null || !construction) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const toIndex = dragOverIndex;
    setDraggedItem(null);
    setDragOverIndex(null);

    const originalItemToCollect = itemToCollect;
    setItemToCollect(null);

    const { error } = await supabase.rpc('collect_workbench_output', {
        p_workbench_id: construction.id,
        p_target_slot: toIndex,
    });

    if (error) {
        showError(error.message);
        setItemToCollect(originalItemToCollect);
    } else {
        showSuccess("Objet récupéré !");
        await onUpdate();
    }
  }, [draggedItem, dragOverIndex, construction, itemToCollect, onUpdate]);

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

  const renderCraftingInterface = () => {
    if (currentJob) {
      return (
        <div className="text-center space-y-3 p-4 bg-black/20 rounded-lg">
          <p className="font-semibold">Fabrication en cours...</p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 relative"><ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} /></div>
            <p className="font-bold text-lg">{currentJob.result_item_name}</p>
          </div>
          <div className="text-sm text-gray-300 font-mono">
            <CountdownTimer endTime={currentJob.ends_at} onComplete={onUpdate} />
          </div>
        </div>
      );
    }

    if (itemToCollect) {
      return (
        <div className="text-center space-y-3 p-4 bg-black/20 rounded-lg">
          <p className="font-semibold">Objet prêt</p>
          <div className="flex items-center justify-center">
            <InventorySlot
              item={itemToCollect}
              index={-1}
              isUnlocked={true}
              onDragStart={(index, node, e) => handleDragStart(itemToCollect, 'output', node, e)}
              onItemClick={() => {}}
              isBeingDragged={draggedItem?.source === 'output'}
              isDragOver={false}
            />
          </div>
          <p className="text-xs text-gray-400">Glissez-déposez dans votre inventaire pour récupérer.</p>
        </div>
      );
    }

    return (
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
                <p>Temps: {matchedRecipe.craft_time_seconds}s</p>
                {maxCraftableQuantity > 1 && <p>Temps total pour {maxCraftableQuantity} crafts: {maxCraftableQuantity * matchedRecipe.craft_time_seconds}s</p>}
              </div>
            )}
            <Button onClick={handleStartCraft} disabled={!matchedRecipe || isLoadingAction} className="w-full">
              {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Hammer className="w-4 h-4 mr-2" /> Fabriquer</>}
            </Button>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-center mb-2">Inventaire</h3>
          <div ref={inventoryGridRef} className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
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
                    isDragOver={dragOverIndex === index}
                  />
                </div>
              );
            })}
          </div>
        </div>
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