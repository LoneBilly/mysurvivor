import { useState, useMemo } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import ActionModal from "./ActionModal";
import BaseInterface from "./BaseInterface";
import BaseHeader from "./BaseHeader";
import LeaderboardModal from "./LeaderboardModal";
import OptionsModal from "./OptionsModal";
import { useGameState } from "@/hooks/useGameState";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { MapCell } from "@/types/game";
import { differenceInDays } from 'date-fns';

const formatZoneName = (name: string): string => {
  if (!name) return "Zone Inconnue";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const GameInterface = () => {
  const { gameState, loading, saveGameState } = useGameState();
  const [currentView, setCurrentView] = useState<'map' | 'base'>('map');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: "default" | "secondary" }[];
  }>({ isOpen: false, title: "", description: "", actions: [] });

  const joursSurvecus = useMemo(() => {
    if (!gameState?.spawn_date) return 0;
    return differenceInDays(new Date(), new Date(gameState.spawn_date));
  }, [gameState?.spawn_date]);

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleExploreAction = () => {
    showSuccess("Exploration en cours...");
    closeModal();
  };

  const handleBuildBase = async () => {
    closeModal();
    if (!gameState) return;

    if (gameState.base_zone_id !== null) {
      showError("Vous avez déjà un campement.");
      return;
    }

    await saveGameState({
      base_zone_id: gameState.current_zone_id,
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
    if (!gameState || !cell) return;

    const { type, id } = cell;
    const isDiscovered = gameState.grille_decouverte.includes(id);
    const isCurrentPosition = gameState.current_zone_id === id;
    const isBaseLocation = gameState.base_zone_id === id;

    if (!isDiscovered) {
      setModalState({
        isOpen: true,
        title: "Zone non découverte",
        description: "Vous devez explorer les cases adjacentes pour révéler cette zone.",
        actions: [{ label: "Compris", onClick: closeModal }],
      });
      return;
    }

    if (isCurrentPosition) {
      const actions: { label: string; onClick: () => void; variant?: "default" | "secondary" }[] = [];
      if (isBaseLocation) {
        actions.push({ label: "Aller au campement", onClick: handleEnterBase, variant: "default" });
      }
      actions.push({ label: "Explorer", onClick: handleExploreAction, variant: "default" });
      if (gameState.base_zone_id === null) {
        actions.push({ label: "Installer mon campement", onClick: handleBuildBase, variant: "default" });
      }
      setModalState({
        isOpen: true,
        title: formatZoneName(type),
        description: "Que souhaitez-vous faire ici ?",
        actions,
      });
    } else {
      const energyCost = 10; // Coût fixe pour se déplacer vers une case adjacente découverte

      const handleMoveAction = async () => {
        closeModal();
        if (!gameState || gameState.energie < energyCost) {
          showError("Pas assez d'énergie pour vous déplacer.");
          return;
        }
        
        await saveGameState({
          current_zone_id: id,
          energie: gameState.energie - energyCost,
        });

        showSuccess(`Déplacement réussi !`);
      };

      setModalState({
        isOpen: true,
        title: `Se déplacer vers ${formatZoneName(type)}`,
        description: `Ce trajet vous coûtera ${energyCost} points d'énergie.`,
        actions: [{ label: "Se déplacer", onClick: handleMoveAction }],
      });
    }
  };

  const handleLeaderboard = () => setIsLeaderboardOpen(true);
  const handleOptions = () => setIsOptionsOpen(true);
  const handleInventaire = () => showSuccess("Ouverture de l'inventaire");

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-900">
        <p className="text-white">Erreur lors du chargement des données du jeu.</p>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-900">
      <GameHeader
        joursSurvecus={joursSurvecus}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
        currentView={currentView}
        onBackToMap={handleBackToMap}
      />
      
      <main className="flex-1 flex items-center justify-center bg-gray-900 min-h-0">
        {currentView === 'map' ? (
          <GameGrid 
            onCellSelect={handleCellSelect}
            discoveredZoneIds={gameState.grille_decouverte}
            currentZoneId={gameState.current_zone_id}
            baseZoneId={gameState.base_zone_id}
          />
        ) : (
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