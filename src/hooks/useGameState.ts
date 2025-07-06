import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerGameState } from '@/types/auth';
import { showError } from '@/utils/toast';

export const useGameState = () => {
  const { user, gameState, refreshData, loading } = useAuth();
  const [localGameState, setLocalGameState] = useState<PlayerGameState | null>(gameState);

  useEffect(() => {
    setLocalGameState(gameState);
  }, [gameState]);

  const saveGameState = async (updates: Partial<PlayerGameState>) => {
    if (!user || !localGameState) return;

    try {
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('player_states')
        .update(updatesWithTimestamp)
        .eq('id', user.id);

      if (error) throw error;

      await refreshData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showError('Erreur lors de la sauvegarde');
    }
  };

  const updateStats = async (newStats: Partial<PlayerGameState>) => {
    await saveGameState(newStats);
  };

  return {
    gameState: localGameState,
    loading,
    saveGameState,
    updateStats,
    reload: refreshData,
  };
};