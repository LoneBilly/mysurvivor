import { GameProvider, useGame } from '@/contexts/GameContext';
import GameUI from '@/components/game/GameUI';
import { FullScreenLoader } from '@/components/ui/loader';

const GameContent = () => {
  const { isLoading, playerData } = useGame();

  if (isLoading || !playerData) {
    return <FullScreenLoader />;
  }

  return <GameUI />;
};

const Game = () => {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
};

export default Game;