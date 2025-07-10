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
  const [loadingState, setLoadingState] = useState({ isLoading: true, message: 'Initialisation...' });

  const loadGameState = useCallback(async () => {
    if (!user) {
      setLoadingState({ isLoading: false, message: '' });
      return;
    }
    
    setLoadingState({ isLoading: true, message: 'Connexion au serveur...' });

    try {
      setLoadingState(prev => ({ ...prev, message: 'Chargement des zones...' }));
      const mapLayoutRes = await supabase.from('map_layout').select('*').order('y').order('x');
      if (mapLayoutRes.error) throw mapLayoutRes.error;
      setMapLayout(mapLayoutRes.data as MapCell[]);

      setLoadingState(prev => ({ ...prev, message: 'Chargement de l\'état du joueur...' }));
      const playerStateRes = await supabase
        .from('player_states')
        .select(`
          *,
          current_zone:map_layout!fk_current_zone(x, y),
          base_zone:map_layout!fk_base_zone(x, y)
        `)
        .eq('id', user.id)
        .single();

      setLoadingState(prev => ({ ...prev, message: 'Chargement de l\'inventaire...' }));
      const inventoryRes = await supabase
        .from('inventories')
        .select('id, item_id, quantity, slot_position, items(name, description, icon, type)')
        .eq('player_id', user.id);

      setLoadingState(prev => ({ ...prev, message: 'Chargement du campement...' }));
      const baseRes = await supabase
        .from('base_constructions')
        .select('x, y, type')
        .eq('player_id', user.id);

      if (playerStateRes.error && playerStateRes.error.code !== 'PGRST116') throw playerStateRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (baseRes.error) throw baseRes.error;

      if (playerStateRes.data) {
        const { current_zone, base_zone, ...restOfData } = playerStateRes.data;
        
        setLoadingState(prev => ({ ...prev, message: 'Préparation des objets...' }));
        const inventoryData = inventoryRes.data || [];
        const inventoryWithUrls = await Promise.all(
          inventoryData.map(async (item) => {
            if (item.items && item.items.icon && item.items.icon.includes('.')) {
              const signedUrl = await getCachedSignedUrl(item.items.icon);
              if (signedUrl) {
                return { ...item, items: { ...item.items, signedIconUrl: signedUrl } };
              }
            }
            return item;
          })
        );

        inventoryWithUrls.forEach(item => {
          if (item.items?.signedIconUrl) {
            const img = new Image();
            img.src = item.items.signedIconUrl;
          }
        });

        setLoadingState(prev => ({ ...prev, message: 'Finalisation...' }));
        const transformedState: GameState = {
          ...restOfData,
          id: restOfData.id,
          position_x: current_zone.x,
          position_y: current_zone.y,
          base_position_x: base_zone?.x ?? null,
          base_position_y: base_zone?.y ?? null,
          zones_decouvertes: restOfData.zones_decouvertes || [],
          inventaire: inventoryWithUrls as InventoryItem[],
          base_constructions: (baseRes.data || []) as BaseConstruction[],
          exploration_x: restOfData.exploration_x,
          exploration_y: restOfData.exploration_y,
          unlocked_slots: restOfData.unlocked_slots,
        };
        setGameState(transformedState);
      } else if (playerStateRes.error && playerStateRes.error.code === 'PGRST116') {
        setTimeout(loadGameState, 2000);
        return;
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'état du jeu:', err);
      showError('Erreur de chargement des données du jeu.');
    } finally {
      setLoadingState({ isLoading: false, message: '' });
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
    loadingState,
    saveGameState,
    updateStats,
    reload: loadGameState,
  };
};