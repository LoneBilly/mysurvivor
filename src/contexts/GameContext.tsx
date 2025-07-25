import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { FullPlayerData, Item, MapLayout, GameData } from '@/types/game';
import { toast } from '@/utils/toast';

type GameContextType = {
  playerData: FullPlayerData | null;
  gameData: GameData | null;
  isLoading: boolean;
  setPlayerData: React.Dispatch<React.SetStateAction<FullPlayerData | null>>;
  refreshAllData: () => Promise<void>;
  refreshBase: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshVitals: () => Promise<void>;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const playerRes = await supabase.rpc('get_full_player_data', { p_user_id: user.id });

      if (playerRes.error) throw playerRes.error;
      
      setPlayerData(playerRes.data);

    } catch (error: any) {
      console.error('Error fetching initial game data:', error);
      toast.error("Erreur lors du chargement des données du jeu.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchInitialData();
    }
  }, [user, fetchInitialData]);

  const refreshAllData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });
      if (error) throw error;
      if (data) {
        setPlayerData(data);
      }
    } catch (error: any) {
      console.error('Error refreshing all player data:', error);
      toast.error("Erreur lors de la mise à jour des données.");
    }
  }, [user]);

  const refreshBase = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_base_state', { p_user_id: user.id });
      if (error) throw error;
      if (data) {
        setPlayerData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            baseConstructions: data.baseConstructions,
            constructionJobs: data.constructionJobs,
            craftingJobs: data.craftingJobs,
            workbenchItems: data.workbenchItems,
          };
        });
      }
    } catch (error: any) {
      console.error('Error refreshing base state:', error);
      toast.error("Erreur lors de la mise à jour de la base.");
    }
  }, [user]);

  const refreshInventory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_inventory_and_chests', { p_user_id: user.id });
      if (error) throw error;
      if (data) {
        setPlayerData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            inventory: data.inventory,
            chestItems: data.chestItems,
          };
        });
      }
    } catch (error: any) {
      console.error('Error refreshing inventory:', error);
      toast.error("Erreur lors de la mise à jour de l'inventaire.");
    }
  }, [user]);

  const refreshVitals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_player_vitals', { p_user_id: user.id });
      if (error) throw error;
      if (data && data.playerState) {
        setPlayerData(prevData => {
          if (!prevData || !prevData.playerState) return prevData;
          return {
            ...prevData,
            playerState: {
              ...prevData.playerState,
              ...data.playerState,
            },
          };
        });
      }
    } catch (error: any) {
      console.error('Error refreshing player vitals:', error);
      toast.error("Erreur lors de la mise à jour des statistiques.");
    }
  }, [user]);

  const value = {
    playerData,
    gameData,
    isLoading,
    setPlayerData,
    refreshAllData,
    refreshBase,
    refreshInventory,
    refreshVitals,
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