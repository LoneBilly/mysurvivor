import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameStats } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';

interface GameState {
  id: string;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  grille_decouverte: boolean[][];
  inventaire: string[];
  position_x: number;
  position_y: number;
}

export const useGameState = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger l'état du jeu
  const loadGameState = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setGameState({
          id: data.id,
          jours_survecus: data.jours_survecus,
          vie: data.vie,
          faim: data.faim,
          soif: data.soif,
          energie: data.energie,
          grille_decouverte: data.grille_decouverte || [],
          inventaire: data.inventaire || [],
          position_x: data.position_x,
          position_y: data.position_y,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état du jeu:', error);
      showError('Erreur lors du chargement du jeu');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder l'état du jeu
  const saveGameState = async (updates: Partial<GameState>) => {
    if (!user || !gameState) return;

    try {
      const { error } = await supabase
        .from('game_states')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setGameState(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showError('Erreur lors de la sauvegarde');
    }
  };

  // Découvrir une case
  const discoverCell = async (x: number, y: number) => {
    if (!gameState) return;

    const newGrid = [...gameState.grille_decouverte];
    if (newGrid[y] && newGrid[y][x] !== undefined) {
      newGrid[y][x] = true;
      await saveGameState({ grille_decouverte: newGrid });
      showSuccess(`Case (${x}, ${y}) découverte !`);
    }
  };

  // Mettre à jour les stats
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