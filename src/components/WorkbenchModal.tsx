import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem, CraftingJob, Item } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from "@/utils/toast";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ActionModal from "./ActionModal";
import { CraftingRecipe } from './admin/CraftingManager';
import ItemIcon from './ItemIcon';
import { Progress } from './ui/progress';

const Countdown = ({ endsAt, onComplete }: { endsAt: string; onComplete: () => void }) => {
  const calculateRemaining = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { totalSeconds: 0, formatted: 'Terminé' };
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { totalSeconds, formatted: `${minutes}m ${seconds}s` };
  }, [endsAt]);

  const [remaining, setRemaining] = useState(calculateRemaining());

  useEffect(() => {
    if (remaining.totalSeconds <= 0) {
      onComplete();
      return;
    }
    const timer = setInterval(() => setRemaining(calculateRemaining()), 1000);
    return () => clearInterval(timer);
  }, [remaining.totalSeconds, calculateRemaining, onComplete]);

  return <span className="text-xs font-mono">{remaining.formatted}</span>;
};

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
  const [ingredients, setIngredients] = useState<(InventoryItem | null)[]>([null, null, null]);
  const [matchedRecipe, setMatchedRecipe] = useState<CraftingRecipe | null>(null);
  const [outputItem, setOutputItem] = useState<Item | null>(null);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [isDemolishModalOpen, setIsDemolishModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase.from('crafting_recipes').select('*');
      setRecipes(data || []);
    };
    if (isOpen) {
      fetchRecipes();
      setIngredients([null, null, null]);
      setMatchedRecipe(null);
      setOutputItem(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const job = playerData.craftingJobs?.find(j => j.workbench_id === construction?.id);
    setCraftingJob(job || null);
  }, [playerData.craftingJobs, construction]);

  useEffect(() => {
    const placedIngredientIds = new Set(ingredients.map(i => i?.item_id).filter(Boolean));
    if (placedIngredientIds.size === 0) {
      setMatchedRecipe(null);
      return;
    }
    const matched = recipes.find(r => {
      const recipeIngredientIds = new Set([r.ingredient1_id, r.ingredient2_id, r.ingredient3_id].filter(Boolean));
      if (recipeIngredientIds.size !== placedIngredientIds.size) return false;
      return [...placedIngredientIds].every(id => recipeIngredientIds.has(id));
    });
    setMatchedRecipe(matched || null);
  }, [ingredients, recipes]);

  useEffect(() => {
    if (matchedRecipe) {
      const item = items.find(i => i.id === matchedRecipe.result_item_id);
      setOutputItem(item || null);
    } else {
      setOutputItem(null);
    }
  }, [matchedRecipe, items]);

  const handleSlotClick = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = null;
    setIngredients(newIngredients);
  };

  const handleInventoryClick = (item: InventoryItem) => {
    const emptyIndex = ingredients.findIndex(i => i === null);
    if (emptyIndex !== -1) {
      const newIngredients = [...ingredients];
      newIngredients[emptyIndex] = item;
      setIngredients(newIngredients);
    } else {
      showError("Tous les emplacements d'ingrédients sont pleins.");
    }
  };

  const handleCraft = async () => {
    if (!matchedRecipe || !construction) return;
    setLoading(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: matchedRecipe.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Fabrication lancée !");
      onUpdate();
    }
    setLoading(false);
  };

  const handleCollect = async () => {
    if (!craftingJob) return;
    setLoading(true);
    const { error } = await supabase.rpc('collect_crafted_item', { p_job_id: craftingJob.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Objet récupéré !");
      onUpdate();
    }
    setLoading(false);
  };

  const canCraft = useMemo(() => {
    if (!matchedRecipe) return false;
    const required = new Map<number, number>();
    if (matchedRecipe.ingredient1_id) required.set(matchedRecipe.ingredient1_id, (required.get(matchedRecipe.ingredient1_id) || 0) + matchedRecipe.ingredient1_quantity);
    if (matchedRecipe.ingredient2_id) required.set(matchedRecipe.ingredient2_id, (required.get(matchedRecipe.ingredient2_id) || 0) + matchedRecipe.ingredient2_quantity);
    if (matchedRecipe.ingredient3_id) required.set(matchedRecipe.ingredient3_id, (required.get(matchedRecipe.ingredient3_id) || 0) + matchedRecipe.ingredient3_quantity);
    
    for (const [itemId, quantity] of required.entries()) {
      const totalInInventory = playerData.inventory.filter(i => i.item_id === itemId).reduce((sum, i) => sum + i.quantity, 0);
      if (totalInInventory < quantity) return false;
    }
    return true;
  }, [matchedRecipe, playerData.inventory]);

  const renderWorkbench = () => (
    <div className="flex flex-col items-center gap-4 p-4 bg-black/20 rounded-lg border border-slate-700">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          {ingredients.map((item, index) => (
            <div key={index} onClick={() => handleSlotClick(index)}>
              <InventorySlot item={item} index={index} isUnlocked={true} onDragStart={() => {}} onItemClick={() => {}} isBeingDragged={false} isDragOver={false} />
            </div>
          ))}
        </div>
        <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
        <InventorySlot item={outputItem ? { ...outputItem, id: 0, item_id: outputItem.id, quantity: matchedRecipe?.result_quantity || 0, slot_position: -1, items: outputItem } : null} index={-1} isUnlocked={true} onDragStart={() => {}} onItemClick={() => {}} isBeingDragged={false} isDragOver={false} />
      </div>
      {matchedRecipe && (
        <div className="text-center text-sm text-gray-300">
          Recette: <span className="font-bold text-white">{outputItem?.name}</span>
        </div>
      )}
      <Button onClick={handleCraft} disabled={!matchedRecipe || !canCraft || loading || !!craftingJob} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fabriquer"}
      </Button>
    </div>
  );

  const renderCraftingProgress = () => {
    if (!craftingJob) return null;
    const recipe = recipes.find(r => r.id === craftingJob.recipe_id);
    const item = items.find(i => i.id === recipe?.result_item_id);

    if (craftingJob.status === 'completed') {
      return (
        <div className="flex flex-col items-center gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <p>Fabrication terminée !</p>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 relative"><ItemIcon iconName={getIconUrl(item?.icon || null)} alt={item?.name || ''} /></div>
            <p className="font-bold">{item?.name} x{recipe?.result_quantity}</p>
          </div>
          <Button onClick={handleCollect} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Récupérer"}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-black/20 rounded-lg border border-slate-700">
        <p>Fabrication en cours...</p>
        <p className="font-bold">{item?.name}</p>
        <Progress value={((new Date().getTime() - new Date(craftingJob.started_at).getTime()) / (new Date(craftingJob.ends_at).getTime() - new Date(craftingJob.started_at).getTime())) * 100} className="w-full" />
        <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4" /><Countdown endsAt={craftingJob.ends_at} onComplete={onUpdate} /></div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3"><Hammer className="w-7 h-7" /><DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Établi</DialogTitle></div>
            <DialogDescription>Combinez des objets pour en créer de nouveaux.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 mt-4 flex-grow min-h-0">
            <div className="flex flex-col gap-4">
              <h3 className="text-center font-bold">Établi</h3>
              {craftingJob ? renderCraftingProgress() : renderWorkbench()}
            </div>
            <div className="flex flex-col">
              <h3 className="text-center font-bold mb-2">Votre Inventaire</h3>
              <div className="flex-grow bg-black/20 rounded-lg p-2 border border-slate-700 grid grid-cols-5 gap-2 content-start overflow-y-auto">
                {Array.from({ length: playerData.playerState.unlocked_slots }).map((_, index) => {
                  const item = playerData.inventory.find(i => i.slot_position === index);
                  return <div key={index} onClick={() => item && handleInventoryClick(item)}><InventorySlot item={item || null} index={index} isUnlocked={true} onDragStart={() => {}} onItemClick={() => {}} isBeingDragged={false} isDragOver={false} /></div>;
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="destructive" onClick={() => setIsDemolishModalOpen(true)}><Trash2 className="w-4 h-4 mr-2" />Détruire l'établi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ActionModal isOpen={isDemolishModalOpen} onClose={() => setIsDemolishModalOpen(false)} title="Détruire l'établi" description="Êtes-vous sûr de vouloir détruire cet établi ? Cette action est irréversible." actions={[{ label: "Confirmer", onClick: () => { onDemolish(construction!); setIsDemolishModalOpen(false); }, variant: "destructive" }, { label: "Annuler", onClick: () => setIsDemolishModalOpen(false), variant: "secondary" }]} />
    </>
  );
};

export default WorkbenchModal;