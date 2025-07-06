import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameState } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';

export const useGameState = () => {
  const { user, profile, loading, reloadProfile } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(profile);

  useEffect(() => {
    setGameState(profile);
  }, [profile]);

  const saveGameState = async (updates: Partial<GameState>) => {
    if (!user || !gameState) return;

    try {
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('player_profiles')
        .update(updatesWithTimestamp)
        .eq('id', user.id);

      if (error) throw error;

      await reloadProfile();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showError('Erreur lors de la sauvegarde');
    }
  };

  const discoverCell = async (x: number, y: number) => {
    if (!gameState) return;

    const newGrid = [...gameState.grille_decouverte];
    if (newGrid[y] && newGrid[y][x] !== undefined) {
      newGrid[y][x] = true;
      await saveGameState({ grille_decouverte: newGrid });
      showSuccess(`Case (${x}, ${y}) découverte !`);
    }
  };

  const updateStats = async (newStats: Partial<GameState>) => {
    await saveGameState(newStats);
  };

  return {
    gameState,
    loading,
    saveGameState,
    discoverCell,
    updateStats,
    reload: reloadProfile,
  };
};