import { useGame } from '@/contexts/GameContext';
import { useCallback } from 'react';

export const usePlayerState = () => {
  const { playerData, refreshPlayerData } = useGame();

  const fetchPlayerState = useCallback(async () => {
    await refreshPlayerData(true); // Using silent refresh
  }, [refreshPlayerData]);

  return {
    playerState: playerData.playerState,
    fetchPlayerState,
  };
};