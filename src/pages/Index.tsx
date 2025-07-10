import { useEffect } from "react";
import GameInterface from "@/components/GameInterface";
import { useGameState } from "@/hooks/useGameState";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { gameState, mapLayout, loadingState, saveGameState } = useGameState();

  useEffect(() => {
    document.body.classList.add('landing-page-bg');
    return () => {
      document.body.classList.remove('landing-page-bg');
    };
  }, []);

  const { isLoading, message } = loadingState;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Erreur lors du chargement des données du joueur.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameInterface
      gameState={gameState}
      mapLayout={mapLayout}
      saveGameState={saveGameState}
    />
  );
};

export default Index;