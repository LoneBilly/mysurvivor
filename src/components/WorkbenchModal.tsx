import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import { useGameData } from "@/context/GameDataContext";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Anvil, ArrowRight, X, GripVertical } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import type { BaseConstruction, CraftingJob, CraftingRecipe, Item, WorkbenchItem } from "@/types/database";

interface SortableItemProps {
  item: WorkbenchItem & { items: Item };
  onItemClick: (item: Workbench_item & { items: Item }) => void;
}

function SortableItem({ item, onItemClick }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative aspect-square touch-none">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="relative flex h-full w-full cursor-pointer items-center justify-center rounded-md border bg-gray-800/50 p-2"
              onClick={() => onItemClick(item)}
            >
              <img src={item.items.icon || ""} alt={item.items.name} className="h-8 w-8 object-contain" />
              {item.quantity > 1 && (
                <Badge variant="secondary" className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-xs">
                  {item.quantity}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-bold">{item.items.name}</p>
            <p className="text-xs">{item.items.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <button {...attributes} {...listeners} className="absolute -top-1 -left-1 cursor-grab p-1 text-gray-400 hover:text-white active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
    </div>
  );
}

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbench: BaseConstruction;
}

export function WorkbenchModal({ isOpen, onClose, workbench }: WorkbenchModalProps) {
  const { data, refreshData, supabase } = useGameData();
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [workbenchItems, setWorkbenchItems] = useState<(WorkbenchItem & { items: Item })[]>([]);
  const [isAutoCrafting, setIsAutoCrafting] = useState(false);
  const [lastRecipeId, setLastRecipeId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const serverJob = useMemo(() => data?.craftingJobs.find((j) => j.workbench_id === workbench.id), [data?.craftingJobs, workbench.id]);
  const [displayedJob, setDisplayedJob] = useState<CraftingJob | undefined | null>(serverJob);
  const [progress, setProgress] = useState(0);

  const workbenchState = useMemo(() => data?.baseConstructions.find((b) => b.id === workbench.id), [data?.baseConstructions, workbench.id]);

  const recipes = useMemo(() => {
    if (!data) return [];
    return data.crafting_recipes;
  }, [data]);

  useEffect(() => {
    if (data?.workbenchItems) {
      const items = data.workbenchItems
        .filter((item) => item.workbench_id === workbench.id)
        .sort((a, b) => a.slot_position - b.slot_position);
      setWorkbenchItems(items);
    }
  }, [data?.workbenchItems, workbench.id]);

  useEffect(() => {
    if (serverJob) {
      setDisplayedJob(serverJob);
      if (serverJob.recipe_id !== lastRecipeId) {
        setLastRecipeId(serverJob.recipe_id);
      }
    } else if (displayedJob && progress >= 100 && !isAutoCrafting) {
      const timer = setTimeout(() => setDisplayedJob(null), 500);
      return () => clearTimeout(timer);
    } else if (!serverJob && !isAutoCrafting) {
      setDisplayedJob(null);
    }
  }, [serverJob, displayedJob, progress, isAutoCrafting, lastRecipeId]);

  useEffect(() => {
    if (!displayedJob) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(displayedJob.started_at).getTime();
      const end = new Date(displayedJob.ends_at).getTime();
      const duration = end - start;
      const elapsed = now - start;
      const newProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(newProgress);
    }, 100);
    return () => clearInterval(interval);
  }, [displayedJob]);

  useEffect(() => {
    const handleAutoCraft = async () => {
      if (isAutoCrafting && workbenchState?.output_item_id && lastRecipeId && !serverJob && !isLoadingAction) {
        setIsLoadingAction(true);
        try {
          await supabase.rpc("collect_workbench_output", { p_workbench_id: workbench.id });
          await supabase.rpc("start_craft", { p_workbench_id: workbench.id, p_recipe_id: lastRecipeId });
          await refreshData();
        } catch (error: any) {
          toast.error(`Arrêt de l'artisanat auto: ${error.message}`);
          setIsAutoCrafting(false);
        } finally {
          setIsLoadingAction(false);
        }
      }
    };
    handleAutoCraft();
  }, [isAutoCrafting, workbenchState, lastRecipeId, serverJob, isLoadingAction, supabase, workbench.id, refreshData]);

  const handleStartCraft = async (recipe: CraftingRecipe) => {
    if (!recipe) return;
    setIsLoadingAction(true);
    setLastRecipeId(recipe.id);
    const { error } = await supabase.rpc("start_craft", {
      p_workbench_id: workbench.id,
      p_recipe_id: recipe.id,
    });
    if (error) {
      toast.error("Erreur lors du lancement de la fabrication", { description: error.message });
    } else {
      toast.success("Fabrication lancée !");
      setSelectedRecipe(null);
      await refreshData();
    }
    setIsLoadingAction(false);
  };

  const handleCancelCraft = async () => {
    if (!displayedJob) return;
    setIsLoadingAction(true);
    const { error } = await supabase.rpc("cancel_crafting_job", { p_workbench_id: workbench.id });
    if (error) {
      toast.error("Erreur lors de l'annulation", { description: error.message });
    } else {
      toast.warning("Fabrication annulée.");
      setDisplayedJob(null);
      await refreshData();
    }
    setIsLoadingAction(false);
  };

  const handleCollectOutput = async () => {
    setIsLoadingAction(true);
    const { error } = await supabase.rpc("collect_workbench_output", { p_workbench_id: workbench.id });
    if (error) {
      toast.error("Impossible de collecter l'objet", { description: error.message });
    } else {
      toast.success("Objet collecté !");
      await refreshData();
    }
    setIsLoadingAction(false);
  };

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldItems = [...workbenchItems];
      const activeIndex = oldItems.findIndex((item) => item.id === active.id);
      const overIndex = oldItems.findIndex((item) => item.id === over.id);

      if (activeIndex === -1 || overIndex === -1) return;

      const newItems = arrayMove(oldItems, activeIndex, overIndex);
      setWorkbenchItems(newItems); // Optimistic update

      const fromSlot = oldItems[activeIndex].slot_position;
      const toSlot = oldItems[overIndex].slot_position;

      const { error } = await supabase.rpc("swap_workbench_items", {
        p_workbench_id: workbench.id,
        p_from_slot: fromSlot,
        p_to_slot: toSlot,
      });

      if (error) {
        toast.error("Erreur lors du déplacement de l'objet.");
        setWorkbenchItems(oldItems); // Revert
      }
      await refreshData();
    }
  }

  const getIngredientCount = (itemId: number) => {
    return workbenchItems.filter((item) => item.item_id === itemId).reduce((sum, item) => sum + item.quantity, 0);
  };

  const canCraft = (recipe: CraftingRecipe) => {
    if (!recipe) return false;
    const hasIngredient1 = !recipe.ingredient1_id || getIngredientCount(recipe.ingredient1_id) >= recipe.ingredient1_quantity;
    const hasIngredient2 = !recipe.ingredient2_id || getIngredientCount(recipe.ingredient2_id) >= recipe.ingredient2_quantity;
    const hasIngredient3 = !recipe.ingredient3_id || getIngredientCount(recipe.ingredient3_id) >= recipe.ingredient3_quantity;
    return hasIngredient1 && hasIngredient2 && hasIngredient3;
  };

  const resultItem = useMemo(() => {
    if (!displayedJob) return null;
    const recipe = recipes.find((r) => r.id === displayedJob.recipe_id);
    if (!recipe) return null;
    return data?.items.find((i) => i.id === recipe.result_item_id);
  }, [displayedJob, recipes, data?.items]);

  const outputItem = useMemo(() => {
    if (!workbenchState?.output_item_id) return null;
    return data?.items.find((i) => i.id === workbenchState.output_item_id);
  }, [workbenchState, data?.items]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Anvil /> Établi
          </DialogTitle>
          <DialogDescription>Utilisez les matériaux pour fabriquer de nouveaux objets.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side: Inventory & Crafting */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contenu de l'établi</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={workbenchItems.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-2 rounded-md bg-black/20 p-2">
                  {workbenchItems.map((item) => (
                    <SortableItem key={item.id} item={item} onItemClick={() => {}} />
                  ))}
                  {Array.from({ length: 3 - workbenchItems.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-md border border-dashed bg-gray-800/30" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-semibold">Fabrication</h3>
              {displayedJob ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center text-center text-sm">
                    <p>Fabrication de: <span className="font-bold">{resultItem?.name}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="flex-grow" />
                    <Button size="icon" variant="destructive" onClick={handleCancelCraft} disabled={isLoadingAction}>
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ) : workbenchState?.output_item_id && outputItem ? (
                <div className="flex items-center justify-between rounded-md bg-green-900/50 p-2">
                  <div className="flex items-center gap-2">
                    <img src={outputItem.icon || ""} alt={outputItem.name} className="h-8 w-8" />
                    <div>
                      <p className="font-bold">{outputItem.name}</p>
                      <p className="text-xs text-gray-400">Prêt à être collecté</p>
                    </div>
                  </div>
                  <Button onClick={handleCollectOutput} disabled={isLoadingAction}>
                    Collecter
                  </Button>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-400 py-4">Aucune fabrication en cours.</div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox id="auto-craft" checked={isAutoCrafting} onCheckedChange={(checked) => setIsAutoCrafting(Boolean(checked))} disabled={!lastRecipeId} />
                <label htmlFor="auto-craft" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Artisanat en boucle
                </label>
              </div>
            </div>
          </div>

          {/* Right Side: Recipes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Recettes disponibles</h3>
            <ScrollArea className="h-96 rounded-md border">
              <div className="p-4 space-y-2">
                {recipes.map((recipe) => {
                  const ingredient1 = data?.items.find((i) => i.id === recipe.ingredient1_id);
                  const ingredient2 = data?.items.find((i) => i.id === recipe.ingredient2_id);
                  const ingredient3 = data?.items.find((i) => i.id === recipe.ingredient3_id);
                  const result = data?.items.find((i) => i.id === recipe.result_item_id);
                  const isCraftable = canCraft(recipe);

                  return (
                    <div
                      key={recipe.id}
                      className={`rounded-lg p-3 transition-colors ${selectedRecipe?.id === recipe.id ? "bg-blue-900/50 ring-2 ring-blue-500" : "bg-gray-800/50 hover:bg-gray-700/50"}`}
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result && <img src={result.icon || ""} alt={result.name} className="h-10 w-10" />}
                          <div>
                            <p className="font-bold">{result?.name}</p>
                            <p className="text-xs text-gray-400">{recipe.craft_time_seconds} secondes</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCraft(recipe);
                          }}
                          disabled={!isCraftable || isLoadingAction || !!displayedJob || !!workbenchState?.output_item_id}
                        >
                          Fabriquer
                        </Button>
                      </div>
                      {selectedRecipe?.id === recipe.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-sm font-semibold mb-2">Ingrédients :</p>
                          <div className="flex items-center gap-4 text-xs">
                            {[
                              { item: ingredient1, qty: recipe.ingredient1_quantity },
                              { item: ingredient2, qty: recipe.ingredient2_quantity },
                              { item: ingredient3, qty: recipe.ingredient3_quantity },
                            ].map(
                              (ing, index) =>
                                ing.item && (
                                  <div key={index} className="flex items-center gap-1.5">
                                    <img src={ing.item.icon || ""} alt={ing.item.name} className="h-5 w-5" />
                                    <span>{ing.qty}x {ing.item.name}</span>
                                    <span className={getIngredientCount(ing.item.id) >= ing.qty ? "text-green-400" : "text-red-400"}>
                                      ({getIngredientCount(ing.item.id)})
                                    </span>
                                  </div>
                                )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}