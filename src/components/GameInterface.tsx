import { useState } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import ActionModal from "./ActionModal";
import BaseInterface from "./BaseInterface";
import BaseHeader from "./BaseHeader";
import LeaderboardModal from "./LeaderboardModal";
import OptionsModal from "./OptionsModal";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { MapCell } from "@/types/game";
import ExplorationGrid from "./ExplorationGrid";
import ExplorationHeader from "./ExplorationHeader";

const formatZoneName = (name: string): string => {
  if (!name) return "Zone Inconnue";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;

const GameInterface = () => {
  const { user } = useAuth();
  const { gameState, loading, saveGameState } = useGameState();
  const [currentView, setCurrentView] = useState<'map' | 'base' | 'exploration'>('map');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [explorationZone, setExplorationZone] = useState<{ name: string; icon: string | null } | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: "default" | "secondary" }[];
  }>({ isOpen: false, title: "", description: "", actions: [] });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleExploreAction = async (zone: { name: string; icon: string | null }) => {
    closeModal();
    if (!gameState) return;

    await saveGameState({
      exploration_x: gameState.exploration_x ?? ENTRANCE_X,
      exploration_y: gameState.exploration_y ?? ENTRANCE_Y,
    });

    setExplorationZone(zone);
    setCurrentView('exploration');
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

  const handleEnterBase = () => {
    closeModal();
    setCurrentView('base');
  };

  const handleBackToMap = () => {
    setCurrentView('map');
  };

  const handleCellSelect = async (cell: MapCell) => {
    if (!gameState) return;

    const { x, y, type, id } = cell;

    const isDiscovered = gameState.zones_decouvertes.includes(id);
    const isCurrentPosition = gameState.position_x === x && gameState.position_y === y;
    const isBaseLocation = gameState.base_position_x === x && gameState.base_position_y === y;

    if (!isDiscovered) {
      setModalState({
        isOpen: true,
        title: "Zone non découverte",
        description: "Pour découvrir cette zone, vous devez explorer les cases adjacentes. Chaque tentative a une chance de révéler ce qui s'y cache. La prudence est de mise...",
        actions: [
          { label: "Compris", onClick: closeModal, variant: "default" },
        ],
      });
      return;
    }

    if (isCurrentPosition) {
      const actions: { label: string; onClick: () => void; variant?: "default" | "secondary" }[] = [];

      if (isBaseLocation) {
        actions.push({ label: "Aller au campement", onClick: handleEnterBase, variant: "default" });
      }
      
      actions.push({ label: "Explorer", onClick: () => handleExploreAction({ name: formatZoneName(type), icon: cell.icon }), variant: "default" });

      if (gameState.base_position_x === null || gameState.base_position_y === null) {
        actions.push({ label: "Installer mon campement", onClick: handleBuildBase, variant: "default" });
      }

      setModalState({
        isOpen: true,
        title: formatZoneName(type),
        description: "Que souhaitez-vous faire ici ?",
        actions,
      });
    } else {
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
        title: formatZoneName(type),
        description: (
          <>
            Voulez-vous vous déplacer vers cette zone ? Ce trajet vous coûtera{" "}
            <span className="font-bold text-yellow-400">{energyCost}</span> points d'énergie.
          </>
        ),
        actions: [
          { label: "Se déplacer", onClick: handleMoveAction, variant: "default" },
        ],
      });
    }
  };

  const handleExplorationCellClick = async (x: number, y: number) => {
    if (!gameState || gameState.exploration_x === null || gameState.exploration_y === null) return;

    const isEntrance = x === ENTRANCE_X && y === ENTRANCE_Y;
    const playerIsOnEntrance = gameState.exploration_x === ENTRANCE_X && gameState.exploration_y === ENTRANCE_Y;

    if (isEntrance && playerIsOnEntrance) {
      setModalState({
        isOpen: true,
        title: "Quitter la zone d'exploration ?",
        description: "Vous retournerez à la carte principale. Votre position dans cette zone sera sauvegardée.",
        actions: [
          { label: "Quitter", onClick: confirmExitExploration, variant: "destructive" },
          { label: "Rester", onClick: closeModal, variant: "secondary" },
        ],
      });
      return;
    }

    const distance = Math.abs(gameState.exploration_x - x) + Math.abs(gameState.exploration_y - y);
    if (distance === 1) {
      if (gameState.energie < 1) {
        showError("Pas assez d'énergie pour vous déplacer.");
        return;
      }
      await saveGameState({
        exploration_x: x,
        exploration_y: y,
        energie: gameState.energie - 1,
      });
    }
  };

  const confirmExitExploration = async () => {
    closeModal();
    await saveGameState({
      exploration_x: null,
      exploration_y: null,
    });
    setCurrentView('map');
  };

  const handleLeaderboard = () => setIsLeaderboardOpen(true);
  const handleOptions = () => setIsOptionsOpen(true);
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
        spawnDate={gameState.spawn_date}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
        currentView={currentView}
        onBackToMap={handleBackToMap}
      />
      
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-900 min-h-0">
        {currentView === 'map' ? (
          <GameGrid 
            onCellSelect={handleCellSelect}
            discoveredZones={gameState.zones_decouvertes}
            playerPosition={{ x: gameState.position_x, y: gameState.position_y }}
            basePosition={gameState.base_position_x !== null && gameState.base_position_y !== null ? { x: gameState.base_position_x, y: gameState.base_position_y } : null}
          />
        ) : currentView === 'base' ? (
          <div className="relative w-full h-full">
            <BaseHeader
              resources={{
                wood: gameState.wood,
                metal: gameState.metal,
                components: gameState.components,
              }}
            />
            <BaseInterface />
          </div>
        ) : (
          <div className="relative w-full h-full">
            {explorationZone && (
              <ExplorationHeader
                zoneName={explorationZone.name}
                zoneIcon={explorationZone.icon}
              />
            )}
            <ExplorationGrid
              playerPosition={
                gameState.exploration_x !== null && gameState.exploration_y !== null
                ? { x: gameState.exploration_x, y: gameState.exploration_y }
                : null
              }
              onCellClick={handleExplorationCellClick}
            />
          </div>
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

      <LeaderboardModal 
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <OptionsModal
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
      />
    </div>
  );
};

export default GameInterface;