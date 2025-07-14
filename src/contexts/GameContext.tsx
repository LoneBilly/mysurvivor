import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { FullPlayerData, MapCell, Item } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/utils/toast';

interface GameContextType {
  playerData: FullPlayerData | null;
  mapLayout: MapCell[];
  items: Item[];
  refreshPlayerData: () => Promise<void>;
  getIconUrl: (iconName: string | null) => string | undefined;
  loadingGameData: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
  initialMapLayout: MapCell[];
  initialItems: Item[];
  iconUrlMap: Map<string, string>;
}

export const GameProvider = ({ children, initialMapLayout, initialItems, iconUrlMap }: GameProviderProps) => {
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState<FullPlayerData | null>(null);
  const [loadingGameData, setLoadingGameData] = useState(true);

  const getIconUrl = useCallback((iconName: string | null): string | undefined => {
    if (!iconName) return undefined;
    return iconUrlMap.get(iconName);
  }, [iconUrlMap]);

  const refreshPlayerData = useCallback(async () => {
    if (!user) return;
    setLoadingGameData(true);
    const { data: fullPlayerData, error: playerDataError } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });

    if (playerDataError) {
      showError("Erreur lors de la mise à jour des données.");
      console.error(playerDataError);
      setPlayerData(null);
    } else {
      setPlayerData(fullPlayerData);
    }
    setLoadingGameData(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshPlayerData();
    }
  }, [user, refreshPlayerData]);

  const value = useMemo(() => ({
    playerData,
    mapLayout: initialMapLayout,
    items: initialItems,
    refreshPlayerData,
    getIconUrl,
    loadingGameData,
  }), [playerData, initialMapLayout, initialItems, refreshPlayerData, getIconUrl, loadingGameData]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};