import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { FullPlayerData, MapCell, Item } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface GameContextType {
  playerData: FullPlayerData;
  mapLayout: MapCell[];
  items: Item[];
  refreshPlayerData: (silent?: boolean) => Promise<void>;
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
  };
  refreshPlayerData: (silent?: boolean) => Promise<void>;
  iconUrlMap: Map<string, string>;
}

export const GameProvider = ({ children, initialData, refreshPlayerData, iconUrlMap }: GameProviderProps) => {
  const [playerData, setPlayerData] = useState<FullPlayerData>(initialData.playerData);
  const { user } = useAuth();

  useEffect(() => {
    setPlayerData(initialData.playerData);
  }, [initialData.playerData]);

  const handlePartialUpdate = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc('finalize_craft_and_get_changes', { p_user_id: user.id });

    if (error) {
      console.error("Error during partial update:", error);
      refreshPlayerData(true);
      return;
    }

    if (data) {
      setPlayerData(prevData => ({
        ...prevData,
        craftingJobs: data.craftingJobs,
        baseConstructions: data.baseConstructions,
      }));
    }
  }, [user, refreshPlayerData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      
      const hasCompletedCraftingJob = playerData.craftingJobs && playerData.craftingJobs.some(job => new Date(job.ends_at).getTime() < now);
      if (hasCompletedCraftingJob) {
        handlePartialUpdate();
      }

      const hasCompletedConstructionJob = playerData.constructionJobs && playerData.constructionJobs.some(job => new Date(job.ends_at).getTime() < now);
      if (hasCompletedConstructionJob) {
        refreshPlayerData(true);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [playerData.craftingJobs, playerData.constructionJobs, refreshPlayerData, handlePartialUpdate]);


  const getIconUrl = useCallback((iconName: string | null): string | undefined => {
    if (!iconName) return undefined;
    return iconUrlMap.get(iconName);
  }, [iconUrlMap]);

  const value = useMemo(() => ({
    playerData,
    mapLayout: initialData.mapLayout,
    items: initialData.items,
    refreshPlayerData,
    setPlayerData,
    getIconUrl,
  }), [playerData, initialData.mapLayout, initialData.items, refreshPlayerData, getIconUrl]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};