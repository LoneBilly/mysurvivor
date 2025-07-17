import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { FullPlayerData, Item, CraftingRecipe, BuildingDefinition, InventoryItem, BaseConstruction, ScoutingMission, CraftingJob, ConstructionJob } from '@/types/game';
import { showError } from '@/utils/toast';

interface GameContextType {
  playerData: FullPlayerData | null;
  setPlayerData: React.Dispatch<React.SetStateAction<FullPlayerData | null>>;
  items: Item[];
  recipes: CraftingRecipe[];
  buildingDefinitions: BuildingDefinition[];
  isLoading: boolean;
  refreshPlayerData: (silent?: boolean) => Promise<void>;
  inventory: InventoryItem[];
  baseConstructions: BaseConstruction[];
  scoutingMissions: ScoutingMission[];
  craftingJobs: CraftingJob[];
  constructionJobs: ConstructionJob[];
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading: isSessionLoading } = useSession();
  const user = session?.user;
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [buildingDefinitions, setBuildingDefinitions] = useState<BuildingDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPlayerData = useCallback(async (silent = false) => {
    if (!user || isRefreshing) return;
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });
      if (error) {
        console.error("Error refreshing player data:", error);
        showError("Erreur lors de la mise à jour des données du joueur.");
        return;
      }
      setPlayerData(data);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, isRefreshing]);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [playerRes, itemsRes, recipesRes, buildingsRes] = await Promise.all([
        supabase.rpc('get_full_player_data', { p_user_id: user.id }),
        supabase.from('items').select('*'),
        supabase.from('crafting_recipes').select('*'),
        supabase.from('building_definitions').select('*')
      ]);

      if (playerRes.error) throw playerRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (recipesRes.error) throw recipesRes.error;
      if (buildingsRes.error) throw buildingsRes.error;

      setPlayerData(playerRes.data);
      setItems(itemsRes.data || []);
      setRecipes(recipesRes.data || []);
      setBuildingDefinitions(buildingsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching initial data:", error);
      showError("Erreur critique: Impossible de charger les données du jeu.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isSessionLoading && user) {
      fetchInitialData();
    } else if (!isSessionLoading && !user) {
      setIsLoading(false);
      setPlayerData(null);
    }
  }, [user, isSessionLoading, fetchInitialData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerData && (playerData.craftingJobs?.length > 0 || playerData.constructionJobs?.length > 0)) {
        const now = Date.now();
        
        const shouldRefresh = 
          playerData.craftingJobs?.some(job => new Date(job.ends_at).getTime() < now) ||
          playerData.constructionJobs?.some(job => new Date(job.ends_at).getTime() < now);

        if (shouldRefresh) {
          refreshPlayerData(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerData, refreshPlayerData]);

  const inventory = useMemo(() => playerData?.inventory || [], [playerData]);
  const baseConstructions = useMemo(() => playerData?.baseConstructions || [], [playerData]);
  const scoutingMissions = useMemo(() => playerData?.scoutingMissions || [], [playerData]);
  const craftingJobs = useMemo(() => playerData?.craftingJobs || [], [playerData]);
  const constructionJobs = useMemo(() => playerData?.constructionJobs || [], [playerData]);

  const value = {
    playerData,
    setPlayerData,
    items,
    recipes,
    buildingDefinitions,
    isLoading: isLoading || isSessionLoading,
    refreshPlayerData,
    inventory,
    baseConstructions,
    scoutingMissions,
    craftingJobs,
    constructionJobs,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};