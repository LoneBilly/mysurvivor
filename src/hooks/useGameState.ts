import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerState } from '@/types/game';
import { showError } from '@/utils/toast';

export const useGameState = () => {
  const { user, profile, loading, reloadProfile } = useAuth();
  const [gameState, setGameState] = useState<PlayerState | null>(profile);

  useEffect(() => {
    setGameState(profile);
  }, [profile]);

  const saveGameState = async (updates: Partial<PlayerState>) => {
    if (!user || !gameState) return;

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

      await reloadProfile();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showError('Erreur lors de la sauvegarde');
    }
  };

  const updateStats = async (newStats: Partial<PlayerState>) => {
    await saveGameState(newStats);
  };

  return {
    gameState,
    loading,
    saveGameState,
    updateStats,
    reload: reloadProfile,
  };
};