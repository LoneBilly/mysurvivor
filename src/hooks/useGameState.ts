import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameState, GameStats } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';

export const useGameState = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGameState = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setGameState(data as GameState);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état du jeu:', error);
      showError('Erreur lors du chargement du jeu');
    } finally {
      setLoading(false);
    }
  };

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

      setGameState(prev => prev ? { ...prev, ...updates } : null);
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

  const updateStats = async (newStats: Partial<GameStats>) => {
    await saveGameState(newStats);
  };

  useEffect(() => {
    if (user) {
      loadGameState();
    }
  }, [user]);

  return {
    gameState,
    loading,
    saveGameState,
    discoverCell,
    updateStats,
    reload: loadGameState,
  };
};