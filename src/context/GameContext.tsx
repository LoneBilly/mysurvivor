import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerData } from '@/types/supabase';
import { Session } from '@supabase/supabase-js';

interface GameContextType {
  playerData: PlayerData | null;
  loading: boolean;
  session: Session | null;
  fetchInitialData: () => Promise<void>;
  refreshBaseState: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshVitals: () => Promise<void>;
  refreshScouting: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: userId });
    if (error) {
      console.error('Error fetching initial player data:', error);
      setPlayerData(null);
    } else {
      setPlayerData(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchInitialData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchInitialData(session.user.id);
      } else {
        setPlayerData(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchInitialData]);

  const refreshBaseState = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase.rpc('get_base_state', { p_user_id: session.user.id });
    if (error) {
      console.error('Error refreshing base state:', error);
    } else {
      setPlayerData(prev => prev ? {
        ...prev,
        baseConstructions: data.baseConstructions,
        constructionJobs: data.constructionJobs,
        craftingJobs: data.craftingJobs,
        workbenchItems: data.workbenchItems,
      } : null);
    }
  }, [session]);

  const refreshInventory = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase.rpc('get_inventory_and_chests', { p_user_id: session.user.id });
    if (error) {
      console.error('Error refreshing inventory:', error);
    } else {
      setPlayerData(prev => prev ? {
        ...prev,
        inventory: data.inventory,
        chestItems: data.chestItems,
      } : null);
    }
  }, [session]);

  const refreshVitals = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase.rpc('get_player_vitals', { p_user_id: session.user.id });
    if (error) {
      console.error('Error refreshing vitals:', error);
    } else {
        setPlayerData(prev => {
            if (!prev || !prev.playerState) return prev;
            return {
                ...prev,
                playerState: {
                    ...prev.playerState,
                    ...data.playerState,
                }
            };
        });
    }
  }, [session]);

  const refreshScouting = useCallback(async () => {
    if (!session) return;
    // Note: check_and_get_scouting_data does not require p_user_id as it uses auth.uid()
    const { data, error } = await supabase.rpc('check_and_get_scouting_data');
    if (error) {
      console.error('Error refreshing scouting missions:', error);
    } else {
      setPlayerData(prev => prev ? {
        ...prev,
        scoutingMissions: data,
      } : null);
    }
  }, [session]);

  return (
    <GameContext.Provider value={{ 
        session, 
        playerData, 
        loading, 
        fetchInitialData: () => session ? fetchInitialData(session.user.id) : Promise.resolve(),
        refreshBaseState,
        refreshInventory,
        refreshVitals,
        refreshScouting
    }}>
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