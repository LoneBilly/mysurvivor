import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { FullPlayerData, MapCell, Item, BaseConstruction, CraftingJob } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState<FullPlayerData>(initialData.playerData);

  useEffect(() => {
    setPlayerData(initialData.playerData);
  }, [initialData.playerData]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (!user) return;

      const now = new Date().getTime();
      const hasPendingConstruction = playerData.constructionJobs && playerData.constructionJobs.some(job => new Date(job.ends_at).getTime() < now);
      const hasPendingCrafting = playerData.craftingJobs && playerData.craftingJobs.some(job => new Date(job.ends_at).getTime() < now);

      if (hasPendingConstruction) {
        await refreshPlayerData(true);
      }
      
      if (hasPendingCrafting) {
        const { data: updates, error } = await supabase.rpc('check_and_update_crafting_jobs', { p_user_id: user.id });
        if (error) {
          console.error("Error checking crafting jobs:", error);
          return;
        }

        if (updates && updates.length > 0) {
          setPlayerData(prev => {
            const newBaseConstructions = [...prev.baseConstructions];
            let newCraftingJobs = [...(prev.craftingJobs || [])];

            updates.forEach((update: any) => {
              const constructionIndex = newBaseConstructions.findIndex(c => c.id === update.updated_workbench_id);
              if (constructionIndex !== -1) {
                newBaseConstructions[constructionIndex] = {
                  ...newBaseConstructions[constructionIndex],
                  output_item_id: update.result_item_id,
                  output_quantity: (newBaseConstructions[constructionIndex].output_quantity || 0) + update.result_quantity,
                };
              }
              
              const jobIndex = newCraftingJobs.findIndex(j => j.id === update.completed_job_id);
              if (jobIndex !== -1) {
                const job = newCraftingJobs[jobIndex];
                if (job.quantity > 1) {
                  // This part is tricky without full job state from backend, so we'll just refresh for batches for now
                  // A full refresh is better than incorrect state.
                  refreshPlayerData(true);
                } else {
                  newCraftingJobs = newCraftingJobs.filter(j => j.id !== update.completed_job_id);
                }
              }
            });

            return {
              ...prev,
              baseConstructions: newBaseConstructions,
              craftingJobs: newCraftingJobs,
            };
          });
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [user, playerData.constructionJobs, playerData.craftingJobs, refreshPlayerData]);


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