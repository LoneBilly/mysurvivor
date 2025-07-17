import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { FullPlayerData, MapCell, Item } from '@/types/game';

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

  useEffect(() => {
    setPlayerData(initialData.playerData);
  }, [initialData.playerData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const hasCompletedCraftingJob = playerData.craftingJobs && playerData.craftingJobs.some(job => new Date(job.ends_at).getTime() < now);
      const hasCompletedConstructionJob = playerData.constructionJobs && playerData.constructionJobs.some(job => new Date(job.ends_at).getTime() < now);

      if (hasCompletedCraftingJob || hasCompletedConstructionJob) {
        refreshPlayerData(true);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [playerData.craftingJobs, playerData.constructionJobs, refreshPlayerData]);


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