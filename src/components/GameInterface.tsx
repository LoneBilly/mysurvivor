import { useState } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import ActionModal from "./ActionModal";
import BaseView from "./BaseView";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { MapCell } from "@/types/game";

const GameInterface = () => {
  const { user } = useAuth();
  const { gameState, loading, saveGameState } = useGameState();
  const [isInBase, setIsInBase] = useState(false);
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

  const handleBuildBase = async () => {
    closeModal();
    if (!gameState) return;

    if (gameState.base_position_x !== null && gameState.base_position_y !== null) {
      showError("Vous avez déjà un campement.");
      return;
    }

    await saveGameState({
      base_position_x: gameState.position_x,
      base_position_y: gameState.position_y,
    });

    showSuccess("Votre campement a été installé !");
  };

  const handleCellSelect = async (x: number, y: number, type: MapCell['type']) => {
    if (!gameState) return;

    const isDiscovered = gameState.grille_decouverte[y]?.[x];
    const isCurrentPosition = gameState.position_x === x && gameState.position_y === y;

    if (isCurrentPosition) {
      const actions: { label: string; onClick: () => void; variant?: "default" | "secondary" }[] = [
        { label: "Explorer", onClick: handleExploreAction, variant: "default" },
      ];

      const hasBase = gameState.base_position_x !== null;
      const isAtBase = hasBase && gameState.base_position_x === x && gameState.base_position_y === y;

      if (!hasBase) {
        actions.push({ label: "Installer mon campement", onClick: handleBuildBase, variant: "default" });
      }

      if (isAtBase) {
        actions.push({ label: "Entrer dans la base", onClick: () => {
          setIsInBase(true);
          closeModal();
        }, variant: "default" });
      }
      
      actions.push({ label: "Annuler", onClick: closeModal, variant: "secondary" });

      setModalState({
        isOpen: true,
        title: `Zone Actuelle (${x}, ${y})`,
        description: "Que souhaitez-vous faire ici ?",
        actions,
      });
    } else if (isDiscovered) {
      const distance = Math.abs(gameState.position_x - x) + Math.abs(gameState.position_y - y);
      const energyCost = distance * 10;

      const handleMoveAction = async () => {
        closeModal();
        if (!gameState || gameState.energie < energyCost) {
          showError("Pas assez d'énergie pour vous déplacer.");
          return;
        }
        
        await saveGameState({
          position_x: x,
          position_y: y,
          energie: gameState.energie - energyCost,
        });

        showSuccess(`Déplacement réussi !`);
      };

      setModalState({
        isOpen: true,
        title: `Se déplacer vers cette zone`,
        description: (
          <>
            Voulez-vous vous déplacer vers cette zone ? Ce trajet vous coûtera{" "}
            <span className="font-bold text-yellow-400">{energyCost}</span> points d'énergie.
          </>
        ),
        actions: [
          { label: "Se déplacer", onClick: handleMoveAction, variant: "default" },
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
        {isInBase ? (
          <BaseView onExit={() => setIsInBase(false)} />
        ) : (
          <GameGrid 
            onCellSelect={handleCellSelect}
            discoveredGrid={gameState.grille_decouverte}
            playerPosition={{ x: gameState.position_x, y: gameState.position_y }}
            basePosition={gameState.base_position_x !== null && gameState.base_position_y !== null ? { x: gameState.base_position_x, y: gameState.base_position_y } : null}
          />
        )}
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