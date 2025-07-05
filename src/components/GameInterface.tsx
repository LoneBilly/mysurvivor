import { useEffect } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useGame } from "@/hooks/useGame"; // Import du hook useGame

const GameInterface = () => {
  const { user, signOut } = useAuth();
  const { gameState, loading: gameStateLoading } = useGameState(); // Renommé pour éviter le conflit
  const {
    handleDiscoverCell, // Récupérer handleDiscoverCell du hook useGame
    handleNextDay, // Récupérer handleNextDay du hook useGame
    handleMove, // Récupérer handleMove du hook useGame
    handleInteract, // Récupérer handleInteract du hook useGame
    handleUseItem, // Récupérer handleUseItem du hook useGame
    currentDay,
    health,
    hunger,
    thirst,
    energy,
    inventory,
    loading: gameLogicLoading, // Chargement de la logique de jeu
  } = useGame(); // Appel du hook useGame

  const handleLeaderboard = () => {
    showSuccess("Ouverture du classement");
    // TODO: Implémenter le leaderboard
  };

  const handleOptions = () => {
    showSuccess("Ouverture des options");
    // TODO: Implémenter les options
  };

  const handleInventaire = () => {
    showSuccess("Ouverture de l'inventaire");
    // TODO: Implémenter l'inventaire
  };

  // Utiliser le chargement combiné
  if (gameStateLoading || gameLogicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Chargement du jeu...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Erreur lors du chargement du jeu</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <GameHeader
        joursSurvecus={currentDay} // Utiliser currentDay du hook useGame
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
      />
      
      <main className="flex-1 flex flex-col">
        <GameGrid /> {/* Plus besoin de passer onCellSelect et discoveredGrid */}
      </main>
      
      <GameFooter
        stats={{
          vie: health, // Utiliser health du hook useGame
          faim: hunger, // Utiliser hunger du hook useGame
          soif: thirst, // Utiliser thirst du hook useGame
          energie: energy, // Utiliser energy du hook useGame
        }}
        onInventaire={handleInventaire}
      />
    </div>
  );
};

export default GameInterface;