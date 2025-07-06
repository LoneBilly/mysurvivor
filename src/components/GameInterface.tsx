import { useState } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import ActionModal from "./ActionModal";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { MapCell } from "@/types/game";

const GameInterface = () => {
  const { user } = useAuth();
  const { gameState, loading, discoverCell } = useGameState();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: "default" | "secondary" }[];
  }>({ isOpen: false, title: "", description: "", actions: [] });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleExploreAction = () => {
    showSuccess("Exploration en cours...");
    closeModal();
  };

  const handleCellSelect = async (x: number, y: number, type: MapCell['type']) => {
    if (!gameState) return;

    const isDiscovered = gameState.grille_decouverte[y]?.[x];

    if (isDiscovered) {
      setModalState({
        isOpen: true,
        title: `Explorer la ${type === 'foret' ? 'Forêt' : 'Plage'}`,
        description: "Voulez-vous passer du temps à explorer cette zone pour trouver des ressources ?",
        actions: [
          { label: "Explorer", onClick: handleExploreAction, variant: "default" },
          { label: "Annuler", onClick: closeModal, variant: "secondary" },
        ],
      });
    } else {
      setModalState({
        isOpen: true,
        title: "Zone non découverte",
        description: "Pour découvrir cette zone, vous devez explorer les cases adjacentes. Chaque tentative a une chance de révéler ce qui s'y cache. La prudence est de mise...",
        actions: [
          { label: "Compris", onClick: closeModal, variant: "default" },
        ],
      });
    }
  };

  const handleLeaderboard = () => showSuccess("Ouverture du classement");
  const handleOptions = () => showSuccess("Ouverture des options");
  const handleInventaire = () => showSuccess("Ouverture de l'inventaire");

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
          playerPosition={{ x: gameState.position_x, y: gameState.position_y }}
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

      <ActionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        actions={modalState.actions}
      />
    </div>
  );
};

export default GameInterface;