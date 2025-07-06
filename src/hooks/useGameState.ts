import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/utils/toast';

export const useGameState = () => {
  const { user, userData, refreshData, loading } = useAuth();
  const [localUserData, setLocalUserData] = useState(userData);

  useEffect(() => {
    setLocalUserData(userData);
  }, [userData]);

  const saveGameState = async (updates: any) => {
    if (!user || !localUserData) return;

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

  const updateStats = async (newStats: any) => {
    await saveGameState(newStats);
  };

  return {
    gameState: localUserData,
    loading,
    saveGameState,
    updateStats,
    reload: refreshData,
  };
};