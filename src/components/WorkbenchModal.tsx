"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlayer } from '@/hooks/usePlayer';
import { useCraftingRecipes } from '@/hooks/useCraftingRecipes';
import { useSupabase } from '@/components/SupabaseProvider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Item } from '@/types/types';

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbench: {
    id: number;
    x: number;
    y: number;
    type: string;
    output_item_id: number | null;
    output_quantity: number | null;
  };
  workbenchItems: Item[];
  craftingJobs: any[];
}

const WorkbenchModal: React.FC<WorkbenchModalProps> = ({ isOpen, onClose, workbench, workbenchItems, craftingJobs }) => {
  const { supabase } = useSupabase();
  const { player, refetchPlayer } = usePlayer();
  const { recipes, refetchRecipes } = useCraftingRecipes();

  const [selectedRecipe, setSelectedRecipe] = React.useState<any | null>(null);
  const [isCrafting, setIsCrafting] = React.useState(false);
  const [isCollecting, setIsCollecting] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const currentCraftingJob = craftingJobs.find(job => job.workbench_id === workbench.id);
  const displayedOutputItem = workbench.output_item_id ? {
    id: workbench.output_item_id,
    quantity: workbench.output_quantity,
    name: "Crafted Item", // Placeholder, actual name would come from items table
    icon: "/icons/items/default.png", // Placeholder, actual icon would come from items table
    description: "",
    type: "Crafted",
    stackable: true,
  } : null;

  // Fetch item details for output if available
  React.useEffect(() => {
    const fetchOutputItemDetails = async () => {
      if (workbench.output_item_id && displayedOutputItem) {
        const { data, error } = await supabase
          .from('items')
          .select('name, icon, description, type, stackable')
          .eq('id', workbench.output_item_id)
          .single();

        if (error) {
          console.error("Error fetching output item details:", error);
          toast.error("Failed to load output item details.");
        } else if (data) {
          displayedOutputItem.name = data.name;
          displayedOutputItem.icon = data.icon || "/icons/items/default.png";
          displayedOutputItem.description = data.description;
          displayedOutputItem.type = data.type;
          displayedOutputItem.stackable = data.stackable;
        }
      }
    };
    fetchOutputItemDetails();
  }, [workbench.output_item_id, supabase, displayedOutputItem]);


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, slotPosition: number) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));

    if (data.type === "inventory-item") {
      try {
        const { error } = await supabase.rpc('move_item_to_workbench', {
          p_inventory_id: data.id,
          p_workbench_id: workbench.id,
          p_quantity_to_move: data.quantity,
          p_target_slot: slotPosition,
        });

        if (error) {
          throw error;
        }
        toast.success("Item moved to workbench!");
        refetchPlayer();
      } catch (error: any) {
        console.error("Error moving item to workbench:", error);
        toast.error(error.message || "Failed to move item to workbench.");
      }
    } else if (data.type === "workbench-item") {
      try {
        const { error } = await supabase.rpc('swap_workbench_items', {
          p_workbench_id: workbench.id,
          p_from_slot: data.slotPosition,
          p_to_slot: slotPosition,
        });

        if (error) {
          throw error;
        }
        toast.success("Items swapped in workbench!");
        refetchPlayer();
      } catch (error: any) {
        console.error("Error swapping workbench items:", error);
        toast.error(error.message || "Failed to swap items in workbench.");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, item: Item, slotPosition: number) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      type: "workbench-item",
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity,
      slotPosition: slotPosition,
      workbenchId: workbench.id,
    }));
    e.dataTransfer.effectAllowed = "move";

    // Set custom drag image to the item's icon
    const imgElement = e.currentTarget.querySelector('img');
    if (imgElement) {
      e.dataTransfer.setDragImage(imgElement, imgElement.offsetWidth / 2, imgElement.offsetHeight / 2);
    }
  };

  const handleCollectOutput = async () => {
    if (!displayedOutputItem) return;
    setIsCollecting(true);
    try {
      const { error } = await supabase.rpc('collect_workbench_output', {
        p_workbench_id: workbench.id,
      });
      if (error) {
        throw error;
      }
      toast.success("Output collected!");
      refetchPlayer();
    } catch (error: any) {
      console.error("Error collecting output:", error);
      toast.error(error.message || "Failed to collect output.");
    } finally {
      setIsCollecting(false);
    }
  };

  const handleStartCraft = async () => {
    if (!selectedRecipe || !player) return;
    setIsCrafting(true);
    try {
      const { error } = await supabase.rpc('start_craft', {
        p_workbench_id: workbench.id,
        p_recipe_id: selectedRecipe.id,
      });
      if (error) {
        throw error;
      }
      toast.success("Crafting started!");
      refetchPlayer();
    } catch (error: any) {
      console.error("Error starting craft:", error);
      toast.error(error.message || "Failed to start crafting.");
    } finally {
      setIsCrafting(false);
    }
  };

  const handleCancelCraft = async () => {
    if (!currentCraftingJob) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_crafting_job', {
        p_workbench_id: workbench.id,
      });
      if (error) {
        throw error;
      }
      toast.success("Crafting cancelled!");
      refetchPlayer();
    } catch (error: any) {
      console.error("Error cancelling craft:", error);
      toast.error(error.message || "Failed to cancel crafting.");
    } finally {
      setIsCancelling(false);
    }
  };

  const getRecipeRequirements = (recipe: any) => {
    const requirements = [];
    if (recipe.ingredient1_id) {
      requirements.push({ id: recipe.ingredient1_id, quantity: recipe.ingredient1_quantity });
    }
    if (recipe.ingredient2_id) {
      requirements.push({ id: recipe.ingredient2_id, quantity: recipe.ingredient2_quantity });
    }
    if (recipe.ingredient3_id) {
      requirements.push({ id: recipe.ingredient3_id, quantity: recipe.ingredient3_quantity });
    }
    return requirements;
  };

  const canCraft = (recipe: any) => {
    const requirements = getRecipeRequirements(recipe);
    for (const req of requirements) {
      const workbenchItem = workbenchItems.find(item => item.item_id === req.id);
      if (!workbenchItem || workbenchItem.quantity < req.quantity) {
        return false;
      }
    }
    return true;
  };

  const getIngredientName = (itemId: number) => {
    const item = player?.inventory.find((invItem: any) => invItem.items.id === itemId)?.items ||
                 workbenchItems.find(wbItem => wbItem.item_id === itemId)?.items;
    return item ? item.name : `Item ${itemId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-slate-800 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Établi ({workbench.x}, {workbench.y})</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Input Slots */}
          {[0, 1, 2].map(slotPosition => {
            const itemInSlot = workbenchItems.find(item => item.slot_position === slotPosition);
            return (
              <div
                key={slotPosition}
                className="relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, slotPosition)}
                draggable={!!itemInSlot}
                onDragStart={(e) => itemInSlot && handleDragStart(e, itemInSlot, slotPosition)}
              >
                {itemInSlot ? (
                  <div className="flex flex-col items-center">
                    <img src={itemInSlot.items.icon} alt={itemInSlot.items.name} className="w-12 h-12" />
                    <span className="text-xs text-white mt-1">{itemInSlot.items.name}</span>
                    <span className="text-xs text-white">x{itemInSlot.quantity}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-sm">Ingrédient {slotPosition + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center items-center my-4">
          {currentCraftingJob ? (
            <div className="text-center">
              <p className="text-lg font-semibold">Fabrication en cours...</p>
              <p className="text-sm text-slate-400">
                {currentCraftingJob.result_item_name} (x{currentCraftingJob.result_quantity})
              </p>
              <p className="text-sm text-slate-400">
                Fin dans: {Math.max(0, Math.ceil((new Date(currentCraftingJob.ends_at).getTime() - new Date().getTime()) / 1000))}s
              </p>
              <Button
                onClick={handleCancelCraft}
                disabled={isCancelling}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStartCraft}
              disabled={!selectedRecipe || isCrafting || !!currentCraftingJob || (workbench.output_item_id && (workbench.output_item_id !== selectedRecipe?.result_item_id || !recipes.find(r => r.id === selectedRecipe?.id)?.result_item_stackable))}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCrafting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lancer la fabrication
            </Button>
          )}
        </div>

        {/* Output Slot */}
        <div className="grid grid-cols-1 gap-4 p-4 border-t border-slate-700 pt-4">
          <div
            className={cn(
              "relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center",
              displayedOutputItem && "cursor-grab active:cursor-grabbing"
            )}
            onDragStart={(e) => {
              if (displayedOutputItem) {
                e.dataTransfer.setData("text/plain", JSON.stringify({
                  type: "workbench-output",
                  item: displayedOutputItem,
                  workbenchId: workbench.id,
                }));
                e.dataTransfer.effectAllowed = "move";

                // Set custom drag image to the item's icon
                const imgElement = e.currentTarget.querySelector('img');
                if (imgElement) {
                  e.dataTransfer.setDragImage(imgElement, imgElement.offsetWidth / 2, imgElement.offsetHeight / 2);
                }
              }
            }}
            draggable={!!displayedOutputItem}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              // Allow dropping items from inventory to output slot if it's empty or same stackable item
              const data = JSON.parse(e.dataTransfer.getData("text/plain"));
              if (data.type === "inventory-item") {
                // This scenario is not directly handled by collect_workbench_output,
                // but rather by add_item_to_inventory with a target slot.
                // For now, we'll prevent dropping inventory items into the output slot
                // unless it's specifically for merging.
                // If the output slot is meant to be only for crafted items, this drop should be prevented.
                // For simplicity, let's assume output slot is only for collecting crafted items.
                toast.error("Cannot drop items into the output slot directly.");
              }
            }}
          >
            {displayedOutputItem ? (
              <div className="flex flex-col items-center">
                <img src={displayedOutputItem.icon} alt={displayedOutputItem.name} className="w-12 h-12" />
                <span className="text-xs text-white mt-1">{displayedOutputItem.name}</span>
                <span className="text-xs text-white">x{displayedOutputItem.quantity}</span>
              </div>
            ) : (
              <span className="text-slate-500 text-sm">Sortie</span>
            )}
          </div>
          {displayedOutputItem && (
            <Button
              onClick={handleCollectOutput}
              disabled={isCollecting}
              className="mt-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isCollecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Collecter
            </Button>
          )}
        </div>

        {/* Recipes List */}
        <div className="mt-4 p-4 border-t border-slate-700">
          <h3 className="text-lg font-semibold mb-2">Recettes disponibles</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {recipes.filter(recipe => player?.learned_blueprints.some((bp: any) => bp.recipe_id === recipe.id)).map((recipe: any) => (
              <div
                key={recipe.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer",
                  selectedRecipe?.id === recipe.id ? "border-blue-500 bg-blue-900/20" : "border-slate-700 bg-slate-900/50",
                  !canCraft(recipe) && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => canCraft(recipe) && setSelectedRecipe(recipe)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{recipe.result_item_name} (x{recipe.result_quantity})</span>
                  <span className="text-sm text-slate-400">{recipe.craft_time_seconds}s</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Coût:
                  {getRecipeRequirements(recipe).map((req, index) => (
                    <span key={index} className="ml-1">
                      {getIngredientName(req.id)} x{req.quantity}
                      {index < getRecipeRequirements(recipe).length - 1 ? "," : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchModal;