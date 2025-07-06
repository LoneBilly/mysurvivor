import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameState, GameStats } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';

export const useGameState = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger l'état du jeu
  const loadGameState = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Mapper les données de player_profiles vers GameState
        const mappedData: GameState = {
          id: data.id,
          user_id: data.id,
          jours_survecus: data.jours_survecus,
          vie: data.vie,
          faim: data.faim,
          soif: data.soif,
          energie: data.energie,
          grille_decouverte: data.grille_decouverte || [],
          inventaire: data.inventory || [],
          position_x: data.position_x,
          position_y: data.position_y,
          base_position_x: data.base_position_x,
          base_position_y: data.base_position_y,
          created_at: data.created_at,
          updated_at: data.updated_at,
          wood: data.wood,
          metal: data.metal,
          components: data.components,
        };
        setGameState(mappedData);
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
      // Mapper les updates vers la structure player_profiles
      const mappedUpdates: any = {};
      
      if (updates.vie !== undefined) mappedUpdates.vie = updates.vie;
      if (updates.faim !== undefined) mappedUpdates.faim = updates.faim;
      if (updates.soif !== undefined) mappedUpdates.soif = updates.soif;
      if (updates.energie !== undefined) mappedUpdates.energie = updates.energie;
      if (updates.position_x !== undefined) mappedUpdates.position_x = updates.position_x;
      if (updates.position_y !== undefined) mappedUpdates.position_y = updates.position_y;
      if (updates.base_position_x !== undefined) mappedUpdates.base_position_x = updates.base_position_x;
      if (updates.base_position_y !== undefined) mappedUpdates.base_position_y = updates.base_position_y;
      if (updates.grille_decouverte !== undefined) mappedUpdates.grille_decouverte = updates.grille_decouverte;
      if (updates.wood !== undefined) mappedUpdates.wood = updates.wood;
      if (updates.metal !== undefined) mappedUpdates.metal = updates.metal;
      if (updates.components !== undefined) mappedUpdates.components = updates.components;
      if (updates.jours_survecus !== undefined) mappedUpdates.jours_survecus = updates.jours_survecus;
      if (updates.inventaire !== undefined) mappedUpdates.inventory = updates.inventaire;

      mappedUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('player_profiles')
        .update(mappedUpdates)
        .eq('id', user.id);

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