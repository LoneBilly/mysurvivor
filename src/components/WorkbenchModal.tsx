import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, Item, CraftingJob } from "@/types/game";
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
import CountdownTimer from "./CountdownTimer";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { user } = useAuth();
  const { playerData, items, getIconUrl, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<InventoryItem[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'inventory' | 'crafting' | 'output' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  
  const [activeJob, setActiveJob] = useState<CraftingJob | null>(null);
  const [outputItem, setOutputItem] = useState<InventoryItem | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ item: InventoryItem; from: 'inventory' | 'crafting' | 'output'; fromIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ target: 'inventory' | 'crafting'; index: number } | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase.from('crafting_recipes').select('*');
    if (error) showError("Impossible de charger les recettes.");
    else setRecipes(data || []);
  }, []);

  const fetchWorkbenchState = useCallback(async () => {
    if (!construction) return;
    const { data: wbItems, error: itemsError } = await supabase.from('workbench_items').select('*, items(*)').eq('workbench_id', construction.id);
    if (itemsError) { showError("Erreur de chargement du contenu de l'établi."); return; }
    setWorkbenchItems(wbItems as InventoryItem[]);

    const { data: job, error: jobError } = await supabase.from('crafting_jobs').select('*').eq('workbench_id', construction.id).single();
    setActiveJob(job);

    const { data: wbData, error: wbError } = await supabase.from('base_constructions').select('output_item_id, output_quantity, items:output_item_id(*)').eq('id', construction.id).single();
    if (wbData?.output_item_id) {
      setOutputItem({
        id: -1,
        item_id: wbData.output_item_id,
        quantity: wbData.output_quantity,
        slot_position: -1,
        items: wbData.items as Item
      });
    } else {
      setOutputItem(null);
    }
  }, [construction]);

  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
      fetchWorkbenchState();
    }
  }, [isOpen, fetchRecipes, fetchWorkbenchState]);

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
    if (activeJob) {
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
  }, [ingredientSlots, recipes, activeJob]);

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
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication lancée !");
      await fetchWorkbenchState();
      await onUpdate();
    }
  };

  const handleCollect = async (targetSlot: number | null = null) => {
    if (!construction) return;
    const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: construction.id, p_target_slot: targetSlot });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet collecté !");
      setOutputItem(null);
      await onUpdate();
    }
  };

  const handleDragStart = (item: InventoryItem, from: 'inventory' | 'crafting' | 'output', fromIndex: number, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    if (activeJob) return;
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
  
    const { from, fromIndex } = draggedItem;
    const { target, index: toIndex } = dragOver;
  
    setDraggedItem(null);
    setDragOver(null);
  
    if (from === target && fromIndex === toIndex) return;
  
    let rpcPromise;
  
    if (from === 'output' && target === 'inventory') {
      await handleCollect(toIndex);
      return;
    }
  
    if (from === 'inventory' && target === 'inventory') {
      rpcPromise = supabase.rpc('swap_inventory_items', { p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (from === 'crafting' && target === 'crafting') {
      if (!construction) return;
      rpcPromise = supabase.rpc('swap_workbench_items', { p_workbench_id: construction.id, p_from_slot: fromIndex, p_to_slot: toIndex });
    } else if (from === 'inventory' && target === 'crafting') {
      const itemToMove = playerData.inventory.find(i => i.slot_position === fromIndex);
      if (!itemToMove || !construction) return;
      rpcPromise = supabase.rpc('move_item_to_workbench', {
          p_inventory_id: itemToMove.id,
          p_workbench_id: construction.id,
          p_quantity_to_move: itemToMove.quantity,
          p_target_slot: toIndex
      });
    } else if (from === 'crafting' && target === 'inventory') {
      const itemToMove = workbenchItems.find(i => i.slot_position === fromIndex);
      if (!itemToMove) return;
      rpcPromise = supabase.rpc('move_item_from_workbench', {
          p_workbench_item_id: itemToMove.id,
          p_quantity_to_move: itemToMove.quantity,
          p_target_slot: toIndex
      });
    }
  
    if (rpcPromise) {
        const { error } = await rpcPromise;
        if (error) {
            showError(error.message);
        }
        await onUpdate(true);
        await fetchWorkbenchState();
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
              {outputItem ? (
                <InventorySlot 
                  item={outputItem} 
                  index={0} 
                  isUnlocked={true} 
                  onDragStart={(idx, node, e) => outputItem && handleDragStart(outputItem, 'output', idx, node, e)} 
                  onItemClick={() => handleCollect()}
                  isBeingDragged={draggedItem?.from === 'output'}
                  isDragOver={false}
                />
              ) : resultItem ? (
                <>
                  <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                  {matchedRecipe && (
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
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-300">
                <span>Fabrication en cours...</span>
                <CountdownTimer endTime={activeJob.ends_at} onComplete={fetchWorkbenchState} />
              </div>
              <Progress value={100} className="animate-pulse" />
            </div>
          ) : (
            <Button onClick={handleStartCraft} disabled={!matchedRecipe} className="w-full">
              <Hammer className="w-4 h-4 mr-2" /> Fabriquer
            </Button>
          )}
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
        onSplit={() => {}}
        onUpdate={onUpdate}
        onTransferToWorkbench={handleTransferToWorkbench}
        onTransferFromWorkbench={handleTransferFromWorkbench}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
    </>
  );
};

export default WorkbenchModal;