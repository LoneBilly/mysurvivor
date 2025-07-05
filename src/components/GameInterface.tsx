import { useEffect } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";

// Définition de la carte statique du jeu
const gameMap = [
  [{type: 'forest'}, {type: 'forest'}, {type: 'mountain'}, {type: 'mountain'}, {type: 'mountain'}, {type: 'forest'}, {type: 'forest'}],
  [{type: 'forest'}, {type: 'water'}, {type: 'water'}, {type: 'water'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}],
  [{type: 'forest'}, {type: 'water'}, {type: 'empty'}, {type: 'empty'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}],
  [{type: 'start'}, {type: 'empty'}, {type: 'empty'}, {type: 'empty'}, {type: 'empty'}, {type: 'forest'}, {type: 'forest'}],
  [{type: 'forest'}, {type: 'forest'}, {type: 'empty'}, {type: 'empty'}, {type: 'water'}, {type: 'water'}, {type: 'forest'}],
  [{type: 'forest'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}, {type: 'water'}, {type: 'end'}, {type: 'forest'}],
  [{type: 'forest'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}, {type: 'forest'}],
];

const GameInterface = () => {
  const { user, signOut } = useAuth();
  const { gameState, loading, discoverCell, updateStats } = useGameState();

  const handleCellSelect = async (x: number, y: number) => {
    if (!gameState) return;
    
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
        joursSurvecus={gameState.jours_survecus}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
      />
      
      <main className="flex-1 flex items-center justify-center p-4 bg-blue-900">
        <GameGrid 
          grid={gameMap}
          discovered={gameState.grille_decouverte}
          playerPosition={{ x: gameState.position_x, y: gameState.position_y }}
          onCellClick={handleCellSelect}
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