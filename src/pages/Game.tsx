import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { FullPlayerData, MapCell, Item, InventoryItem, ConstructionJob } from '@/types/game';
import LoadingScreen from '@/components/LoadingScreen';
import GameUI from '@/components/game/GameUI';
import { showError } from '@/utils/toast';
import { GameProvider } from '@/contexts/GameContext';
import { getCachedSignedUrl } from '@/utils/iconCache';

const Game = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const loadGameData = async (user: User) => {
    setLoading(true);

    // Fetch all game data in parallel
    const [playerDataRes, mapDataRes, itemsDataRes, constructionJobsRes] = await Promise.all([
      supabase.rpc('get_full_player_data', { p_user_id: user.id }),
      supabase.from('map_layout').select('*'),
      supabase.from('items').select('*'),
      supabase.from('construction_jobs').select('*').eq('player_id', user.id)
    ]);

    // Handle Player Data
    if (playerDataRes.error) {
      showError("Erreur critique lors du chargement des données du joueur.");
      console.error(playerDataRes.error);
      setLoading(false);
      return;
    }
    const fullPlayerData = playerDataRes.data;
    fullPlayerData.constructionJobs = constructionJobsRes.data || [];

    // Handle Map Data
    if (mapDataRes.error) {
      showError("Erreur critique lors du chargement de la carte.");
      console.error(mapDataRes.error);
      setLoading(false);
      return;
    }
    setMapLayout(mapDataRes.data);

    // Handle Items Data and Preload Icons
    if (itemsDataRes.error) {
      showError("Erreur critique lors du chargement des objets.");
      console.error(itemsDataRes.error);
      setLoading(false);
      return;
    }
    const itemsData = itemsDataRes.data;
    setItems(itemsData);

    // Preload all item icons from storage to warm up the cache
    const iconPreloadPromises = itemsData
      .filter(item => item.icon && item.icon.includes('.'))
      .map(item => getCachedSignedUrl(item.icon!));
    await Promise.all(iconPreloadPromises);

    // Now that cache is warm, populate inventory with signed URLs
    if (fullPlayerData.inventory) {
      fullPlayerData.inventory = await Promise.all(
        fullPlayerData.inventory.map(async (item: InventoryItem) => {
          if (item.items?.icon && item.items.icon.includes('.')) {
            const signedUrl = await getCachedSignedUrl(item.items.icon);
            return { ...item, items: { ...item.items, signedIconUrl: signedUrl || undefined } };
          }
          return item;
        })
      );
    }
    setPlayerData(fullPlayerData);

    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadGameData(user);
    }
  }, [user]);

  const refreshPlayerData = async () => {
    if (!user) return;
    const { data: fullPlayerData, error: playerDataError } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });
    const { data: constructionJobs, error: jobsError } = await supabase.from('construction_jobs').select('*').eq('player_id', user.id);

    if (playerDataError || jobsError) {
      showError("Erreur lors de la mise à jour des données.");
      console.error(playerDataError || jobsError);
    } else {
       if (fullPlayerData.inventory) {
        fullPlayerData.inventory = await Promise.all(
          fullPlayerData.inventory.map(async (item: InventoryItem) => {
            if (item.items?.icon && item.items.icon.includes('.')) {
              const signedUrl = await getCachedSignedUrl(item.items.icon);
              return { ...item, items: { ...item.items, signedIconUrl: signedUrl || undefined } };
            }
            return item;
          })
        );
      }
      fullPlayerData.constructionJobs = constructionJobs || [];
      setPlayerData(fullPlayerData);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!playerData || !mapLayout.length || !items.length) {
    return <div>Erreur de chargement des données de jeu. Veuillez rafraîchir la page.</div>;
  }

  return (
    <GameProvider initialData={{ playerData, mapLayout, items }} refreshPlayerData={refreshPlayerData}>
      <GameUI />
    </GameProvider>
  );
};

export default Game;