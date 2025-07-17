import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { FullPlayerData, MapCell, Item } from '@/types/game';
import LoadingScreen from '@/components/LoadingScreen';
import GameUI from '@/components/game/GameUI';
import { showError } from '@/utils/toast';
import { GameProvider } from '@/contexts/GameContext';
import { preloadImages } from '@/utils/preloadImages';
import { getPublicIconUrl } from '@/utils/imageUrls';

const Game = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [iconUrlMap, setIconUrlMap] = useState<Map<string, string>>(new Map());
  const dataLoaded = useRef(false);

  const refreshPlayerData = useCallback(async (silent = false) => {
    if (!user) return;
    const { data: fullPlayerData, error: playerDataError } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });

    if (playerDataError) {
      if (!silent) showError("Erreur lors de la mise à jour des données.");
      console.error(playerDataError);
    } else {
      setPlayerData(fullPlayerData);
    }
  }, [user]);

  const loadGameData = useCallback(async (user: User) => {
    setLoading(true);

    const [playerDataRes, mapDataRes, itemsDataRes] = await Promise.all([
      supabase.rpc('get_full_player_data', { p_user_id: user.id }),
      supabase.from('map_layout').select('*'),
      supabase.from('items').select('*'),
    ]);

    if (playerDataRes.error || mapDataRes.error || itemsDataRes.error) {
      showError("Erreur critique lors du chargement des données de jeu.");
      console.error(playerDataRes.error || mapDataRes.error || itemsDataRes.error);
      setLoading(false);
      return;
    }
    
    const fullPlayerData = playerDataRes.data;
    setMapLayout(mapDataRes.data);
    const itemsData = itemsDataRes.data as Item[];
    setItems(itemsData);

    const urlMap = new Map<string, string>();
    const urlsToPreload: string[] = [];
    for (const item of itemsData) {
      if (item.icon) {
        const publicUrl = getPublicIconUrl(item.icon);
        if (publicUrl) {
          urlMap.set(item.icon, publicUrl);
          urlsToPreload.push(publicUrl);
        }
      }
    }
    setIconUrlMap(urlMap);

    await preloadImages(urlsToPreload);
    
    setPlayerData(fullPlayerData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !dataLoaded.current) {
      dataLoaded.current = true;
      loadGameData(user);
    }
  }, [user, loadGameData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          refreshPlayerData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshPlayerData]);

  useEffect(() => {
    const jobCheckInterval = setInterval(() => {
      if (playerData?.craftingJobs && playerData.craftingJobs.length > 0) {
        const now = Date.now();
        const hasCompletedJob = playerData.craftingJobs.some(job => new Date(job.ends_at).getTime() < now);
        if (hasCompletedJob) {
          refreshPlayerData(true);
        }
      }
      if (playerData?.constructionJobs && playerData.constructionJobs.length > 0) {
        const now = Date.now();
        const hasCompletedJob = playerData.constructionJobs.some(job => new Date(job.ends_at).getTime() < now);
        if (hasCompletedJob) {
          refreshPlayerData(true);
        }
      }
    }, 1000);

    return () => clearInterval(jobCheckInterval);
  }, [playerData, refreshPlayerData]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!playerData || !mapLayout.length || !items.length) {
    return <div>Erreur de chargement des données de jeu. Veuillez rafraîchir la page.</div>;
  }

  return (
    <GameProvider 
      initialData={{ playerData, mapLayout, items }} 
      refreshPlayerData={refreshPlayerData}
      iconUrlMap={iconUrlMap}
    >
      <GameUI />
    </GameProvider>
  );
};

export default Game;