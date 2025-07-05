import { useEffect } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

const GameInterface = () => {
  const { user, signOut } = useAuth();
  const { gameState, loading, discoverCell, updateStats } = useGameState();

  const handleCellSelect = async (x: number, y: number) => {
    if (!gameState) return;

    const isDefinedZone = (x === 1 && y === 1) || (x === 5 && y === 5);

    if (!isDefinedZone) {
      showError("Rien à découvrir dans cette zone.");
      return;
    }
    
    // Vérifier si la case est déjà découverte
    if (gameState.grille_decouverte[y] && gameState.grille_decouverte[y][x]) {
      showSuccess(`Case déjà découverte : ${x}, ${y}`);
      return;
    }

    await discoverCell(x, y);
  };

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

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400">Chargement du jeu...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Erreur lors du chargement du jeu</p>
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
    <div className="h-dvh flex flex-col bg-gray-900">
      <GameHeader
        joursSurvecus={gameState.jours_survecus}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
      />
      
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-900 min-h-0">
        <GameGrid 
          onCellSelect={handleCellSelect}
          discoveredGrid={gameState.grille_decouverte}
        />
      </main>
      
      <GameFooter
        stats={{
          vie: gameState.vie,
          faim: gameState.faim,
          soif: gameState.soif,
          energie: gameState.energie,
        }}
        onInventaire={handleInventaire}
      />
    </div>
  );
};

export default GameInterface;