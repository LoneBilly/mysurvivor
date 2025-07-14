import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2, Hammer, Download, XCircle, Trash2, PlusCircle } from 'lucide-react';
import { BaseConstruction, Item, CraftingRecipe, CraftingJob } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import ItemIcon from './ItemIcon';
import CountdownTimer from './CountdownTimer';
import { cn } from '@/lib/utils';

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void; // Callback to refresh player data
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  const { playerData, getIconUrl, items } = useGame();
  const { inventory, workbenchItems, craftingJobs } = playerData;

  const [craftingRecipes, setCraftingRecipes] = useState<CraftingRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [crafting, setCrafting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('inventory');
  const [filterText, setFilterText] = useState('');

  const currentJob = craftingJobs?.find(job => job.workbench_id === construction?.id);
  const outputItem = construction?.output_item_id ? items.find(item => item.id === construction.output_item_id) : null;

  const workbenchInventory = useMemo(() => {
    return workbenchItems.filter(wi => wi.workbench_id === construction?.id);
  }, [workbenchItems, construction]);

  const playerInventory = useMemo(() => {
    return inventory.filter(invItem => invItem.slot_position !== null);
  }, [inventory]);

  const loadCraftingRecipes = async () => {
    setLoadingRecipes(true);
    const { data, error } = await supabase
      .from('crafting_recipes')
      .select(`
        *,
        result_item:items!result_item_id (name, icon, description, type, stackable),
        ingredient1:items!ingredient1_id (name, icon, description, type, stackable),
        ingredient2:items!ingredient2_id (name, icon, description, type, stackable),
        ingredient3:items!ingredient3_id (name, icon, description, type, stackable)
      `);

    if (error) {
      showError("Erreur lors du chargement des recettes.");
      console.error(error);
    } else {
      setCraftingRecipes(data || []);
    }
    setLoadingRecipes(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadCraftingRecipes();
    }
  }, [isOpen]);

  const getAvailableQuantity = useCallback((itemId: number) => {
    return workbenchInventory.find(wi => wi.item_id === itemId)?.quantity || 0;
  }, [workbenchInventory]);

  const canCraft = useCallback((recipe: CraftingRecipe) => {
    if (currentJob || construction?.output_item_id) return false; // Cannot craft if busy or has output

    let hasIngredients = true;
    if (recipe.ingredient1_id) {
      if (getAvailableQuantity(recipe.ingredient1_id) < recipe.ingredient1_quantity) hasIngredients = false;
    }
    if (recipe.ingredient2_id) {
      if (getAvailableQuantity(recipe.ingredient2_id) < recipe.ingredient2_quantity) hasIngredients = false;
    }
    if (recipe.ingredient3_id) {
      if (getAvailableQuantity(recipe.ingredient3_id) < recipe.ingredient3_quantity) hasIngredients = false;
    }
    return hasIngredients;
  }, [currentJob, construction?.output_item_id, getAvailableQuantity]);

  const handleStartCraft = async (recipeId: number) => {
    if (!construction) return;
    setCrafting(true);
    const { error } = await supabase.rpc('start_craft', { p_workbench_id: construction.id, p_recipe_id: recipeId });
    if (error) {
      showError(error.message || "Erreur lors du démarrage du craft.");
      console.error(error);
    } else {
      showSuccess("Fabrication lancée !");
      onUpdate(); // Refresh data to show crafting job
    }
    setCrafting(false);
  };

  const handleCollectOutput = async () => {
    if (!construction || !construction.output_item_id) return;
    setCollecting(true);
    const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: construction.id });
    if (error) {
      showError(error.message || "Erreur lors de la collecte de l'objet.");
      console.error(error);
    } else {
      showSuccess("Objet collecté !");
      onUpdate(); // Refresh data to clear output
    }
    setCollecting(false);
  };

  const handleMoveItemToWorkbench = async (inventoryItemId: number, quantity: number, targetSlot: number) => {
    if (!construction) return;
    const { error } = await supabase.rpc('move_item_to_workbench', {
      p_inventory_id: inventoryItemId,
      p_workbench_id: construction.id,
      p_quantity_to_move: quantity,
      p_target_slot: targetSlot,
    });
    if (error) {
      showError(error.message || "Erreur lors du déplacement de l'objet vers l'établi.");
      console.error(error);
    } else {
      onUpdate();
    }
  };

  const handleMoveItemFromWorkbench = async (workbenchItemId: number, quantity: number, targetSlot: number) => {
    if (!construction) return;
    const { error } = await supabase.rpc('move_item_from_workbench', {
      p_workbench_item_id: workbenchItemId,
      p_quantity_to_move: quantity,
      p_target_slot: targetSlot,
    });
    if (error) {
      showError(error.message || "Erreur lors du déplacement de l'objet depuis l'établi.");
      console.error(error);
    } else {
      onUpdate();
    }
  };

  const handleSwapWorkbenchItems = async (fromSlot: number, toSlot: number) => {
    if (!construction) return;
    const { error } = await supabase.rpc('swap_workbench_items', {
      p_workbench_id: construction.id,
      p_from_slot: fromSlot,
      p_to_slot: toSlot,
    });
    if (error) {
      showError(error.message || "Erreur lors de l'échange d'objets dans l'établi.");
      console.error(error);
    } else {
      onUpdate();
    }
  };

  const filteredRecipes = useMemo(() => {
    return craftingRecipes.filter(recipe => 
      recipe.result_item?.name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [craftingRecipes, filterText]);

  if (!construction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Établi ({construction.x}, {construction.y})</DialogTitle>
          <DialogDescription>
            Gérez les objets de votre établi et lancez des fabrications.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="craft" className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="craft">Fabrication</TabsTrigger>
            <TabsTrigger value="inventory">Inventaire Établi</TabsTrigger>
          </TabsList>

          <TabsContent value="craft" className="flex-grow flex flex-col overflow-hidden">
            {currentJob ? (
              <div className="relative flex flex-col items-center justify-center w-full h-full">
                <p className="text-sm text-gray-400 mb-2">Fabrication en cours...</p>
                <div className="relative w-20 h-20 flex items-center justify-center bg-gray-700 rounded-lg">
                  <ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} className="grayscale opacity-50" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                </div>
                <div className="text-center text-sm text-gray-300 font-mono mt-2">
                  <CountdownTimer endTime={currentJob.ends_at} onComplete={onUpdate} />
                </div>
              </div>
            ) : (
              <>
                {construction.output_item_id ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <p className="text-sm text-gray-400 mb-2">Objet fabriqué :</p>
                    <div className="relative w-20 h-20 flex items-center justify-center bg-gray-700 rounded-lg">
                      <ItemIcon iconName={getIconUrl(outputItem?.icon) || outputItem?.icon} alt={outputItem?.name || ''} />
                      <span className="absolute bottom-1 right-1 text-xs font-bold text-white bg-black/50 rounded-full px-1">
                        {construction.output_quantity}
                      </span>
                    </div>
                    <Button
                      onClick={handleCollectOutput}
                      className="mt-4 w-full max-w-[200px]"
                      disabled={collecting}
                    >
                      {collecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      {collecting ? 'Collecte...' : 'Collecter'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-grow overflow-hidden">
                    <Input
                      placeholder="Filtrer les recettes..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="mb-4"
                    />
                    <ScrollArea className="flex-grow pr-4">
                      {loadingRecipes ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredRecipes.map((recipe) => (
                            <div key={recipe.id} className="bg-gray-800 p-4 rounded-lg flex flex-col">
                              <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                                <ItemIcon iconName={getIconUrl(recipe.result_item?.icon) || recipe.result_item?.icon} alt={recipe.result_item?.name || ''} className="mr-2" />
                                {recipe.result_item?.name} ({recipe.result_quantity})
                              </h3>
                              <p className="text-sm text-gray-400 mb-3">{recipe.result_item?.description}</p>
                              <div className="text-sm text-gray-300 mb-3">
                                <p className="font-semibold mb-1">Coût :</p>
                                <ul className="list-disc list-inside">
                                  {recipe.ingredient1_id && (
                                    <li className={cn({ 'text-red-400': getAvailableQuantity(recipe.ingredient1_id) < recipe.ingredient1_quantity })}>
                                      {recipe.ingredient1?.name}: {getAvailableQuantity(recipe.ingredient1_id)}/{recipe.ingredient1_quantity}
                                    </li>
                                  )}
                                  {recipe.ingredient2_id && (
                                    <li className={cn({ 'text-red-400': getAvailableQuantity(recipe.ingredient2_id) < recipe.ingredient2_quantity })}>
                                      {recipe.ingredient2?.name}: {getAvailableQuantity(recipe.ingredient2_id)}/{recipe.ingredient2_quantity}
                                    </li>
                                  )}
                                  {recipe.ingredient3_id && (
                                    <li className={cn({ 'text-red-400': getAvailableQuantity(recipe.ingredient3_id) < recipe.ingredient3_quantity })}>
                                      {recipe.ingredient3?.name}: {getAvailableQuantity(recipe.ingredient3_id)}/{recipe.ingredient3_quantity}
                                    </li>
                                  )}
                                </ul>
                                <p className="mt-2">Temps de fabrication: {recipe.craft_time_seconds}s</p>
                              </div>
                              <Button
                                onClick={() => handleStartCraft(recipe.id)}
                                disabled={crafting || !canCraft(recipe)}
                                className="mt-auto"
                              >
                                {crafting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hammer className="mr-2 h-4 w-4" />}
                                {crafting ? 'Fabrication...' : 'Fabriquer'}
                              </Button>
                            </div>
                          ))}
                          {filteredRecipes.length === 0 && !loadingRecipes && (
                            <p className="text-center text-gray-500 col-span-full">Aucune recette trouvée.</p>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="flex-grow flex flex-col overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-2">Inventaire de l'établi</h3>
            <ScrollArea className="flex-grow pr-4 mb-4">
              <div className="grid grid-cols-3 gap-2 p-2 bg-gray-900 rounded-lg min-h-[100px]">
                {[0, 1, 2].map(slot => {
                  const itemInSlot = workbenchInventory.find(item => item.slot_position === slot);
                  return (
                    <div
                      key={slot}
                      className="relative w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedItemData = JSON.parse(e.dataTransfer.getData('text/plain'));
                        if (draggedItemData.type === 'player_inventory') {
                          handleMoveItemToWorkbench(draggedItemData.id, draggedItemData.quantity, slot);
                        } else if (draggedItemData.type === 'workbench_inventory' && draggedItemData.slot !== slot) {
                          handleSwapWorkbenchItems(draggedItemData.slot, slot);
                        }
                      }}
                    >
                      {itemInSlot ? (
                        <div
                          className="relative w-full h-full flex items-center justify-center cursor-grab"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({
                              id: itemInSlot.id,
                              item_id: itemInSlot.item_id,
                              quantity: itemInSlot.quantity,
                              slot: itemInSlot.slot_position,
                              type: 'workbench_inventory'
                            }));
                          }}
                        >
                          <ItemIcon iconName={getIconUrl(itemInSlot.items?.icon) || itemInSlot.items?.icon} alt={itemInSlot.items?.name || ''} />
                          <span className="absolute bottom-1 right-1 text-xs font-bold text-white bg-black/50 rounded-full px-1">
                            {itemInSlot.quantity}
                          </span>
                        </div>
                      ) : (
                        <PlusCircle className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <h3 className="text-lg font-bold text-white mb-2">Votre inventaire</h3>
            <ScrollArea className="flex-grow pr-4">
              <div className="grid grid-cols-5 gap-2 p-2 bg-gray-900 rounded-lg min-h-[100px]">
                {playerInventory.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        id: item.id,
                        item_id: item.item_id,
                        quantity: item.quantity,
                        slot: item.slot_position,
                        type: 'player_inventory'
                      }));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedItemData = JSON.parse(e.dataTransfer.getData('text/plain'));
                      if (draggedItemData.type === 'workbench_inventory') {
                        handleMoveItemFromWorkbench(draggedItemData.id, draggedItemData.quantity, item.slot_position!);
                      } else if (draggedItemData.type === 'player_inventory' && draggedItemData.slot !== item.slot_position) {
                        supabase.rpc('swap_inventory_items', { p_from_slot: draggedItemData.slot, p_to_slot: item.slot_position }).then(() => onUpdate());
                      }
                    }}
                  >
                    <ItemIcon iconName={getIconUrl(item.items?.icon) || item.items?.icon} alt={item.items?.name || ''} />
                    <span className="absolute bottom-1 right-1 text-xs font-bold text-white bg-black/50 rounded-full px-1">
                      {item.quantity}
                    </span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, playerData.playerState.unlocked_slots - playerInventory.length) }).map((_, index) => (
                  <div
                    key={`empty-player-slot-${index}`}
                    className="relative w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 border-dashed"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedItemData = JSON.parse(e.dataTransfer.getData('text/plain'));
                      const targetSlot = playerInventory.length + index; // Calculate the actual slot position
                      if (draggedItemData.type === 'workbench_inventory') {
                        handleMoveItemFromWorkbench(draggedItemData.id, draggedItemData.quantity, targetSlot);
                      } else if (draggedItemData.type === 'player_inventory') {
                        supabase.rpc('swap_inventory_items', { p_from_slot: draggedItemData.slot, p_to_slot: targetSlot }).then(() => onUpdate());
                      }
                    }}
                  >
                    <PlusCircle className="w-6 h-6 text-gray-500" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button variant="destructive" onClick={() => onDemolish(construction)}>
            <Trash2 className="mr-2 h-4 w-4" /> Démolir l'établi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchModal;