import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { FullPlayerData, Item, CraftingRecipe, InventoryItem } from '@/types/game';
import { showError, showInfo } from '@/utils/toast';

interface GameContextType {
  session: Session | null;
  playerData: FullPlayerData | null;
  setPlayerData: React.Dispatch<React.SetStateAction<FullPlayerData | null>>;
  items: Item[];
  isLoading: boolean;
  lastUpdate: Date | null;
  refreshPlayerData: (silent?: boolean) => Promise<void>;
  getIconUrl: (iconName: string | null | undefined) => string;
  startBatchCraft: (workbenchId: number, recipe: CraftingRecipe, quantity: number) => Promise<void>;
  craftQueues: Record<number, { recipe: CraftingRecipe; remaining: number }>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [craftQueues, setCraftQueues] = useState<Record<number, { recipe: CraftingRecipe; remaining: number }>>({});

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase.from('items').select('*');
    if (error) {
      console.error('Error fetching items:', error);
      showError("Impossible de charger la liste des objets.");
    } else {
      setItems(data);
    }
  }, []);

  const refreshPlayerData = useCallback(async (silent = false) => {
    if (!session?.user) return;
    if (!silent) setIsLoading(true);

    const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: session.user.id });

    if (error) {
      console.error('Error refreshing player data:', error);
      showError(error.message);
    } else if (data) {
      setPlayerData(data);
      setLastUpdate(new Date());
    }
    if (!silent) setIsLoading(false);
  }, [session]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchItems();
        refreshPlayerData();
      } else {
        setPlayerData(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchItems, refreshPlayerData]);

  const getIconUrl = (iconName: string | null | undefined) => {
    if (!iconName) return '/icons/unknown.svg';
    if (iconName.startsWith('http') || iconName.startsWith('/')) return iconName;
    return `/icons/${iconName}.svg`;
  };

  const canContinueCrafting = useCallback((recipe: CraftingRecipe, workbenchItems: InventoryItem[], workbenchOutputId: number | null | undefined, allItems: Item[]) => {
    const recipeIngredients = [
      { id: recipe.ingredient1_id, quantity: recipe.ingredient1_quantity },
      { id: recipe.ingredient2_id, quantity: recipe.ingredient2_quantity },
      { id: recipe.ingredient3_id, quantity: recipe.ingredient3_quantity },
    ].filter(ing => ing.id !== null && ing.quantity !== null) as { id: number, quantity: number }[];

    const hasIngredients = recipeIngredients.every(req => {
      const totalAvailable = workbenchItems
        .filter(i => i.item_id === req.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      return totalAvailable >= req.quantity;
    });

    if (!hasIngredients) return false;

    const resultItemDef = allItems.find(i => i.id === recipe.result_item_id);
    if (!resultItemDef) return false;

    if (workbenchOutputId) {
        if (!resultItemDef.stackable) return false;
        if (workbenchOutputId !== resultItemDef.id) return false;
    }

    return true;
  }, []);

  const startBatchCraft = useCallback(async (workbenchId: number, recipe: CraftingRecipe, quantity: number) => {
    if (!playerData) return;

    const { error } = await supabase.rpc('start_craft', {
        p_workbench_id: workbenchId,
        p_recipe_id: recipe.id,
    });

    if (error) {
        showError(error.message);
        return;
    }

    if (quantity > 1) {
        setCraftQueues(prev => ({
            ...prev,
            [workbenchId]: { recipe, remaining: quantity - 1 },
        }));
    }
    
    await refreshPlayerData(true);
  }, [playerData, refreshPlayerData]);

  useEffect(() => {
    const craftInterval = setInterval(async () => {
        if (!session?.user || Object.keys(craftQueues).length === 0) {
            return;
        }

        const { data: fullData, error: rpcError } = await supabase.rpc('get_full_player_data', { p_user_id: session.user.id });
        if (rpcError || !fullData) {
            console.error("File d'attente de fabrication: Impossible de récupérer les données du joueur", rpcError);
            return;
        }
        
        const currentCraftingJobs = fullData.craftingJobs || [];
        const activeWorkbenchIds = new Set(currentCraftingJobs.map(j => j.workbench_id));

        for (const workbenchIdStr in craftQueues) {
            const workbenchId = parseInt(workbenchIdStr, 10);
            const queue = craftQueues[workbenchId];

            if (!queue || queue.remaining <= 0) {
                setCraftQueues(prev => {
                    const newQueues = { ...prev };
                    delete newQueues[workbenchId];
                    return newQueues;
                });
                continue;
            }

            if (!activeWorkbenchIds.has(workbenchId)) {
                const workbenchItems = fullData.workbenchItems.filter(i => i.workbench_id === workbenchId);
                const workbench = fullData.baseConstructions.find(c => c.id === workbenchId);
                
                if (canContinueCrafting(queue.recipe, workbenchItems, workbench?.output_item_id, items)) {
                    const { error: startError } = await supabase.rpc('start_craft', {
                        p_workbench_id: workbenchId,
                        p_recipe_id: queue.recipe.id,
                    });

                    if (startError) {
                        showError(`La fabrication en série s'est arrêtée: ${startError.message}`);
                        setCraftQueues(prev => {
                            const newQueues = { ...prev };
                            delete newQueues[workbenchId];
                            return newQueues;
                        });
                    } else {
                        setCraftQueues(prev => ({
                            ...prev,
                            [workbenchId]: { ...queue, remaining: queue.remaining - 1 },
                        }));
                        await refreshPlayerData(true);
                    }
                } else {
                    showInfo("La fabrication en série s'est arrêtée. Vérifiez les ressources ou l'objet en sortie.");
                    setCraftQueues(prev => {
                        const newQueues = { ...prev };
                        delete newQueues[workbenchId];
                        return newQueues;
                    });
                }
            }
        }
    }, 5000);

    return () => clearInterval(craftInterval);
  }, [session, craftQueues, items, canContinueCrafting, refreshPlayerData]);

  const value = {
    session,
    playerData,
    setPlayerData,
    items,
    isLoading,
    lastUpdate,
    refreshPlayerData,
    getIconUrl,
    startBatchCraft,
    craftQueues,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};