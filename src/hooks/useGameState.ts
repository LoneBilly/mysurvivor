import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameState, GameStats } from '@/types/game';
import { showError } from '@/utils/toast';

export const useGameState = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGameState = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    if (!gameState) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('player_states')
        .select(`
          *,
          current_zone:map_layout!fk_current_zone(x, y),
          base_zone:map_layout!fk_base_zone(x, y)
        `)
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const { current_zone, base_zone, ...restOfData } = data;
        const transformedState: GameState = {
          ...restOfData,
          id: restOfData.id,
          position_x: current_zone.x,
          position_y: current_zone.y,
          base_position_x: base_zone?.x ?? null,
          base_position_y: base_zone?.y ?? null,
          zones_decouvertes: data.zones_decouvertes || [],
          inventaire: [],
          exploration_x: data.exploration_x,
          exploration_y: data.exploration_y,
          unlocked_slots: data.unlocked_slots, // Chargement de la nouvelle donnée
        };
        setGameState(transformedState);
      } else if (error && error.code === 'PGRST116') {
        setTimeout(loadGameState, 2000);
        return;
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'état du jeu:', err);
      showError('Erreur de chargement des données du jeu.');
    } finally {
      setLoading(false);
    }
  }, [user, gameState]);

  const saveGameState = async (updates: Partial<Omit<GameState, 'id'>>) => {
    if (!user || !gameState) return;

    try {
      const dbUpdates: { [key: string]: any } = { ...updates };

      if ('position_x' in updates || 'position_y' in updates) {
        const newX = updates.position_x ?? gameState.position_x;
        const newY = updates.position_y ?? gameState.position_y;
        const { data: zone } = await supabase.from('map_layout').select('id').eq('x', newX).eq('y', newY).single();
        if (zone) dbUpdates.current_zone_id = zone.id;
        delete dbUpdates.position_x;
        delete dbUpdates.position_y;
      }

      if ('base_position_x' in updates || 'base_position_y' in updates) {
        const newX = updates.base_position_x;
        const newY = updates.base_position_y;
        if (newX !== null && newY !== null) {
          const { data: zone } = await supabase.from('map_layout').select('id').eq('x', newX).eq('y', newY).single();
          if (zone) dbUpdates.base_zone_id = zone.id;
        } else {
          dbUpdates.base_zone_id = null;
        }
        delete dbUpdates.base_position_x;
        delete dbUpdates.base_position_y;
      }

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase.from('player_states').update(dbUpdates).eq('id', user.id);
      if (error) throw error;

      setGameState(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      showError('Erreur de sauvegarde.');
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
    updateStats,
    reload: loadGameState,
  };
};