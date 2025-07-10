import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GameState, GameStats, InventoryItem, BaseConstruction, MapCell } from '@/types/game';
import { showError } from '@/utils/toast';
import { getCachedSignedUrl } from '@/utils/iconCache';

export const useGameState = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Chargement du monde...");

  const loadGameState = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setLoadingMessage("Chargement du monde...");

    try {
      const [mapRes, fullPlayerDataRes] = await Promise.all([
        supabase.from('map_layout').select('*').order('y').order('x'),
        supabase.rpc('get_full_player_data', { p_user_id: user.id })
      ]);

      if (mapRes.error) throw mapRes.error;
      if (fullPlayerDataRes.error) throw fullPlayerDataRes.error;

      setMapLayout(mapRes.data as MapCell[]);
      
      const playerData = fullPlayerDataRes.data;

      if (playerData && playerData.playerState) {
        setLoadingMessage("Préparation de votre aventure...");
        
        const inventoryData = playerData.inventory || [];
        const inventoryWithUrls = await Promise.all(
          inventoryData.map(async (item: InventoryItem) => {
            if (item.items && item.items.icon && item.items.icon.includes('.')) {
              const signedUrl = await getCachedSignedUrl(item.items.icon);
              if (signedUrl) {
                return { ...item, items: { ...item.items, signedIconUrl: signedUrl } };
              }
            }
            return item;
          })
        );

        inventoryWithUrls.forEach((item: InventoryItem) => {
          if (item.items?.signedIconUrl) {
            const img = new Image();
            img.src = item.items.signedIconUrl;
          }
        });

        const { playerState, baseConstructions } = playerData;
        const transformedState: GameState = {
          ...playerState,
          id: playerState.id,
          position_x: playerState.position_x,
          position_y: playerState.position_y,
          base_position_x: playerState.base_position_x,
          base_position_y: playerState.base_position_y,
          zones_decouvertes: playerState.zones_decouvertes || [],
          inventaire: inventoryWithUrls as InventoryItem[],
          base_constructions: (baseConstructions || []) as BaseConstruction[],
          exploration_x: playerState.exploration_x,
          exploration_y: playerState.exploration_y,
          unlocked_slots: playerState.unlocked_slots,
        };
        setGameState(transformedState);
      } else {
        setLoadingMessage("Création de votre survivant...");
        setTimeout(loadGameState, 2000);
        return;
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'état du jeu:', err);
      showError('Erreur de chargement des données du jeu.');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
  }, [user, loadGameState]);

  return {
    gameState,
    mapLayout,
    loading,
    loadingMessage,
    saveGameState,
    updateStats,
    reload: loadGameState,
  };
};