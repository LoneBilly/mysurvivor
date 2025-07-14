import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapCell, Item } from '@/types/game';
import LoadingScreen from '@/components/LoadingScreen';
import GameUI from '@/components/game/GameUI';
import { showError } from '@/utils/toast';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { preloadImages } from '@/utils/preloadImages';
import { getPublicIconUrl } from '@/utils/imageUrls';

const Game = () => {
  const [loadingStaticData, setLoadingStaticData] = useState(true);
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [iconUrlMap, setIconUrlMap] = useState<Map<string, string>>(new Map());

  const loadStaticGameData = useCallback(async () => {
    setLoadingStaticData(true);

    const [mapDataRes, itemsDataRes] = await Promise.all([
      supabase.from('map_layout').select('*'),
      supabase.from('items').select('*'),
    ]);

    if (mapDataRes.error || itemsDataRes.error) {
      showError("Erreur critique lors du chargement des données statiques de jeu.");
      console.error(mapDataRes.error || itemsDataRes.error);
      setLoadingStaticData(false);
      return;
    }
    
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
    
    setLoadingStaticData(false);
  }, []);

  useEffect(() => {
    loadStaticGameData();
  }, [loadStaticGameData]);

  if (loadingStaticData) {
    return <LoadingScreen />;
  }

  if (!mapLayout.length || !items.length) {
    return <div>Erreur de chargement des données statiques de jeu. Veuillez rafraîchir la page.</div>;
  }

  return (
    <GameProvider 
      initialMapLayout={mapLayout} 
      initialItems={items}
      iconUrlMap={iconUrlMap}
    >
      <GameContent />
    </GameProvider>
  );
};

const GameContent = () => {
  const { playerData, loadingGameData } = useGame();

  if (loadingGameData) {
    return <LoadingScreen />;
  }

  if (!playerData) {
    return <div>Erreur de chargement des données du joueur. Veuillez rafraîchir la page.</div>;
  }

  return <GameUI />;
}

export default Game;