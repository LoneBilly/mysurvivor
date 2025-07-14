import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingRecipe, CraftingJob, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, Clock, Check } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";
import ItemDetailModal from "./ItemDetailModal";

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
  const { playerData, items, refreshPlayerData } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [ingredientSlots, setIngredientSlots] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [detailedItem, setDetailedItem] = useState<InventoryItem | null>(null);

  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const draggedItemNode = useRef<HTMLDivElement | null>(null);

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
    const newSlots = [...ingredientSlots];
    newSlots[index] = null;
    setIngredientSlots(newSlots);
  };

  const handleCraft = async () => {
    if (!matchedRecipe || !construction) return;
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication lancée !");
      onUpdate();
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
    } else {
        showSuccess("Objet jeté.");
        onUpdate();
    }
  };

  const handleDragStart = (item: InventoryItem, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggedItem(item);
    
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

    if (draggedItem && dragOverSlot !== null) {
        const newSlots = [...ingredientSlots];
        newSlots[dragOverSlot] = draggedItem;
        setIngredientSlots(newSlots);
    }

    setDraggedItem(null);
    setDragOverSlot(null);
  }, [draggedItem, dragOverSlot, ingredientSlots]);

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
        <p className="text-sm text-gray-400">Se termine dans <Clock className="inline w-3 h-3" /> <Countdown endsAt={craftingJob.ends_at} onComplete={onUpdate} /></p>
      </div>
    );
  };

  const renderCraftingInterface = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-bold text-center mb-2">Établi</h3>
        <div className="bg-black/20 rounded-lg p-4 border border-slate-700 space-y-4">
          <div className="grid grid-cols-5 gap-2">
            <div />
            {ingredientSlots.map((item, index) => (
              <div key={index} data-crafting-slot-index={index}>
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
        <div className="bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
          {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
            const item = playerData.inventory.find(i => i.slot_position === index);
            return (
              <InventorySlot 
                key={index} 
                item={item} 
                index={index} 
                isUnlocked={true} 
                onDragStart={(idx, node, e) => {
                  const inventoryItem = playerData.inventory.find(i => i.slot_position === idx);
                  if (inventoryItem) handleDragStart(inventoryItem, node, e);
                }} 
                onItemClick={(item) => setDetailedItem(item)} 
                isBeingDragged={draggedItem?.id === item?.id} 
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
      />
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