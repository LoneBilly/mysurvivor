import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { FullPlayerData, MapCell, Item, InventoryItem } from '@/types/game';
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

    const { data: fullPlayerData, error: playerDataError } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });
    if (playerDataError) {
      showError("Erreur critique lors du chargement des données du joueur.");
      console.error(playerDataError);
      setLoading(false);
      return;
    }

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

    const { data: mapData, error: mapError } = await supabase.from('map_layout').select('*');
    if (mapError) {
      showError("Erreur critique lors du chargement de la carte.");
      console.error(mapError);
      setLoading(false);
      return;
    }
    setMapLayout(mapData);

    const { data: itemsData, error: itemsError } = await supabase.from('items').select('*');
    if (itemsError) {
      showError("Erreur critique lors du chargement des objets.");
      console.error(itemsError);
      setLoading(false);
      return;
    }
    setItems(itemsData);

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
    if (playerDataError) {
      showError("Erreur lors de la mise à jour des données.");
      console.error(playerDataError);
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