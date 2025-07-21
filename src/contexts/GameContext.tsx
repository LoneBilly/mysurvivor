import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { FullPlayerData, MapCell, Item, ConstructionJob, BuildingLevel } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface GameContextType {
  playerData: FullPlayerData;
  mapLayout: MapCell[];
  items: Item[];
  buildingLevels: BuildingLevel[];
  refreshPlayerData: (silent?: boolean) => Promise<void>;
  refreshResources: () => Promise<void>;
  refreshInventoryAndChests: () => Promise<void>;
  refreshBaseState: () => Promise<void>;
  addConstructionJob: (job: ConstructionJob) => void;
  setPlayerData: React.Dispatch<React.SetStateAction<FullPlayerData>>;
  getIconUrl: (iconName: string | null) => string | undefined;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
  initialData: {
    playerData: FullPlayerData;
    mapLayout: MapCell[];
    items: Item[];
    buildingLevels: BuildingLevel[];
  };
  iconUrlMap: Map<string, string>;
}

export const GameProvider = ({ children, initialData, iconUrlMap }: GameProviderProps) => {
  const [playerData, setPlayerData] = useState<FullPlayerData>(initialData.playerData);
  const { user } = useAuth();

  const refreshPlayerData = useCallback(async (silent = false) => {
    if (!user) return;
    const { data: fullPlayerData, error: playerDataError } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });

    if (playerDataError) {
      if (!silent) showError("Erreur lors de la mise à jour des données.");
      console.error(playerDataError);
    } else {
      setPlayerData(fullPlayerData);
    }
  }, [user]);

  const refreshResources = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_player_resources', { p_user_id: user.id });
    if (error) {
      showError("Erreur de mise à jour des ressources.");
    } else {
      setPlayerData(prev => ({ ...prev, playerState: { ...prev.playerState, ...data.playerState } }));
    }
  }, [user]);

  const refreshInventoryAndChests = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_inventory_and_chests', { p_user_id: user.id });
    if (error) {
      showError("Erreur de mise à jour de l'inventaire.");
    } else {
      setPlayerData(prev => ({ ...prev, ...data }));
    }
  }, [user]);

  const refreshBaseState = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_base_state', { p_user_id: user.id });
    if (error) {
      showError("Erreur de mise à jour de la base.");
    } else {
      setPlayerData(prev => ({ ...prev, ...data }));
    }
  }, [user]);

  const addConstructionJob = (job: ConstructionJob) => {
    setPlayerData(prev => ({
      ...prev,
      constructionJobs: [...(prev.constructionJobs || []), job],
    }));
  };

  useEffect(() => {
    setPlayerData(initialData.playerData);
  }, [initialData.playerData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      
      const hasCompletedCraftingJob = playerData.craftingJobs && playerData.craftingJobs.some(job => new Date(job.ends_at).getTime() < now);
      if (hasCompletedCraftingJob) {
        refreshBaseState();
      }

      const hasCompletedConstructionJob = playerData.constructionJobs && playerData.constructionJobs.some(job => new Date(job.ends_at).getTime() < now);
      if (hasCompletedConstructionJob) {
        refreshBaseState();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [playerData.craftingJobs, playerData.constructionJobs, refreshBaseState]);


  const getIconUrl = useCallback((iconName: string | null): string | undefined => {
    if (!iconName) return undefined;
    return iconUrlMap.get(iconName);
  }, [iconUrlMap]);

  const value = useMemo(() => ({
    playerData,
    mapLayout: initialData.mapLayout,
    items: initialData.items,
    buildingLevels: initialData.buildingLevels,
    refreshPlayerData,
    refreshResources,
    refreshInventoryAndChests,
    refreshBaseState,
    addConstructionJob,
    setPlayerData,
    getIconUrl,
  }), [playerData, initialData.mapLayout, initialData.items, initialData.buildingLevels, refreshPlayerData, refreshResources, refreshInventoryAndChests, refreshBaseState, addConstructionJob, getIconUrl]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};