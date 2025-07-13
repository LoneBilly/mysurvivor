import { useState, useEffect, useMemo } from "react";
import GameHeader from "../GameHeader";
import GameGrid from "../GameGrid";
import GameFooter from "../GameFooter";
import ActionModal from "../ActionModal";
import BaseInterface from "../BaseInterface";
import BaseHeader from "../BaseHeader";
import LeaderboardModal from "../LeaderboardModal";
import OptionsModal from "../OptionsModal";
import InventoryModal from "../InventoryModal";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { FullPlayerData, MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import MarketModal from "../MarketModal";
import CreditsDisplay from "../CreditsDisplay";
import PurchaseCreditsModal from "../PurchaseCreditsModal";
import FactionScoutsModal from "../FactionScoutsModal";
import { useGame } from "@/contexts/GameContext";
import ExplorationModal from "../ExplorationModal";
import MetroModal from "../MetroModal";
import BankModal from "../BankModal";
import BountyModal from "../BountyModal";

const formatZoneName = (name: string): string => {
  if (!name) return "Zone Inconnue";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const GameUI = () => {
  const { playerData, setPlayerData, mapLayout, refreshPlayerData } = useGame();
  
  const [currentView, setCurrentView] = useState<'map' | 'base'>('map');
  const [isViewReady, setIsViewReady] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isFactionScoutsModalOpen, setIsFactionScoutsModalOpen] = useState(false);
  const [isExplorationModalOpen, setIsExplorationModalOpen] = useState(false);
  const [selectedZoneForExploration, setSelectedZoneForExploration] = useState<MapCell | null>(null);
  const [isMetroOpen, setIsMetroOpen] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isBountyOpen, setIsBountyOpen] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null }[];
  }>({ isOpen: false, title: "", description: "", actions: [] });

  useEffect(() => {
    setIsViewReady(true);
  }, []);

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleExploreAction = (zone: MapCell) => {
    closeModal();
    setSelectedZoneForExploration(zone);
    setIsExplorationModalOpen(true);
  };

  const handleBuildBase = async () => {
    closeModal();
    if (playerData.playerState.base_position_x !== null) {
      showError("Vous avez déjà un campement.");
      return;
    }
    const currentZone = mapLayout.find(z => z.x === playerData.playerState.position_x && z.y === playerData.playerState.position_y);
    if (!currentZone) return;

    const { error } = await supabase.from('player_states').update({ base_zone_id: currentZone.id }).eq('id', playerData.playerState.id);
    if (error) {
      showError("Impossible d'installer le campement ici.");
    } else {
      showSuccess("Votre campement a été installé !");
      refreshPlayerData();
    }
  };

  const handleEnterBase = () => {
    closeModal();
    setCurrentView('base');
    refreshPlayerData();
  };

  const handleBackToMap = () => {
    setCurrentView('map');
  };

  const handleCellSelect = async (cell: MapCell, stateOverride?: FullPlayerData) => {
    const currentState = stateOverride || playerData;
    const { x, y, type, id, interaction_type } = cell;

    const isDiscovered = currentState.playerState.zones_decouvertes.includes(id);
    const isCurrentPosition = currentState.playerState.position_x === x && currentState.playerState.position_y === y;
    const isBaseLocation = currentState.playerState.base_position_x === x && currentState.playerState.base_position_y === y;

    if (!isDiscovered) {
      setModalState({
        isOpen: true,
        title: "Zone non découverte",
        description: "Pour découvrir cette zone, vous devez explorer les cases adjacentes.",
        actions: [{ label: "Compris", onClick: closeModal }],
      });
      return;
    }

    if (isCurrentPosition) {
      switch (interaction_type) {
        case 'Action':
          const lowerCaseType = type.toLowerCase();
          if (lowerCaseType === 'marché') {
            setIsMarketOpen(true);
          } else if (lowerCaseType === 'faction: scouts') {
            setIsFactionScoutsModalOpen(true);
          } else if (lowerCaseType === 'metro' || lowerCaseType === 'métro') {
            setIsMetroOpen(true);
          } else if (lowerCaseType === 'banque') {
            setIsBankOpen(true);
          } else if (lowerCaseType === 'commissariat') {
            setIsBountyOpen(true);
          } else {
            setModalState({
              isOpen: true,
              title: formatZoneName(type),
              description: "Cette action n'est pas encore configurée.",
              actions: [{ label: "Compris", onClick: closeModal }],
            });
          }
          break;
        
        case 'Ressource':
          const actions: typeof modalState.actions = [];
          const hasBase = isBaseLocation;
          const hasNoBase = currentState.playerState.base_position_x === null;
          
          if (hasBase) {
            actions.push({ label: "Aller au campement", onClick: handleEnterBase });
          }
          
          actions.push({ label: "Explorer", onClick: () => handleExploreAction(cell) });
          
          if (hasNoBase) {
            actions.push({ label: "Installer mon campement", onClick: handleBuildBase });
          }

          // Si il n'y a qu'une seule action possible (explorer), ouvrir directement la modale d'exploration
          if (actions.length === 1 && actions[0].label === "Explorer") {
            handleExploreAction(cell);
          } else {
            setModalState({
              isOpen: true,
              title: formatZoneName(type),
              description: "Que souhaitez-vous faire ici ?",
              actions,
            });
          }
          break;

        case 'Non défini':
        default:
          setModalState({
            isOpen: true,
            title: formatZoneName(type),
            description: "Cette zone est pour le moment indisponible.",
            actions: [{ label: "Compris", onClick: closeModal }],
          });
          break;
      }
    } else {
      const distance = Math.abs(currentState.playerState.position_x - x) + Math.abs(currentState.playerState.position_y - y);
      const energyCost = distance * 10;

      const handleMoveAction = async () => {
        closeModal();
        if (playerData.playerState.energie < energyCost) {
          showError("Pas assez d'énergie.");
          return;
        }
        
        const originalState = { ...playerData };
        const newState = { ...playerData, playerState: { ...playerData.playerState, position_x: x, position_y: y, energie: playerData.playerState.energie - energyCost }};
        setPlayerData(newState);
        handleCellSelect(cell, newState);

        const { error } = await supabase.rpc('move_player', { target_x: x, target_y: y });
        if (error) {
          showError(error.message || "Déplacement impossible.");
          setPlayerData(originalState);
        } else {
          refreshPlayerData();
        }
      };

      setModalState({
        isOpen: true,
        title: `Aller à ${formatZoneName(type)}`,
        description: `Ce trajet vous coûtera ${energyCost} points d'énergie.`,
        actions: [{ label: "Confirmer", onClick: handleMoveAction }, { label: "Annuler", onClick: closeModal, variant: "secondary" }],
      });
    }
  };

  const scoutingMissions = useMemo(() => ({
    inProgress: playerData.scoutingMissions.filter(m => m.status === 'in_progress'),
    completed: playerData.scoutingMissions.filter(m => m.status === 'completed'),
  }), [playerData.scoutingMissions]);

  if (!isViewReady) return <div className="h-full flex items-center justify-center bg-gray-950"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  const currentZone = mapLayout.find(z => z.x === playerData.playerState.position_x && z.y === playerData.playerState.position_y);

  return (
    <div className="h-full flex flex-col text-white">
      <GameHeader spawnDate={playerData.playerState.spawn_date} onLeaderboard={() => setIsLeaderboardOpen(true)} onOptions={() => setIsOptionsOpen(true)} currentView={currentView} onBackToMap={handleBackToMap} />
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <CreditsDisplay credits={playerData.playerState.credits} onPurchaseClick={() => setIsPurchaseModalOpen(true)} />
        <div className={cn("w-full h-full flex items-center justify-center p-4", currentView !== 'map' && "hidden")}>
          <GameGrid mapLayout={mapLayout} onCellSelect={handleCellSelect} discoveredZones={playerData.playerState.zones_decouvertes} playerPosition={{ x: playerData.playerState.position_x, y: playerData.playerState.position_y }} basePosition={playerData.playerState.base_position_x !== null ? { x: playerData.playerState.base_position_x, y: playerData.playerState.base_position_y! } : null} />
        </div>
        <div className={cn("relative w-full h-full", currentView !== 'base' && "hidden")}>
          <BaseHeader resources={{ wood: playerData.playerState.wood, metal: playerData.playerState.metal, components: playerData.playerState.components }} />
          <BaseInterface isActive={currentView === 'base'} initialConstructions={playerData.baseConstructions} />
        </div>
      </main>
      <GameFooter stats={playerData.playerState} credits={playerData.playerState.credits} onInventaire={() => setIsInventoryOpen(true)} onPurchaseCredits={() => setIsPurchaseModalOpen(true)} />
      <ActionModal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} description={modalState.description} actions={modalState.actions} />
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <OptionsModal isOpen={isOptionsOpen} onClose={() => setIsOptionsOpen(false)} />
      <InventoryModal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} inventory={playerData.inventory} unlockedSlots={playerData.playerState.unlocked_slots} onUpdate={() => refreshPlayerData()} />
      <MarketModal isOpen={isMarketOpen} onClose={() => setIsMarketOpen(false)} inventory={playerData.inventory} credits={playerData.playerState.credits} saleSlots={playerData.playerState.sale_slots} onUpdate={() => refreshPlayerData()} onPurchaseCredits={() => setIsPurchaseModalOpen(true)} />
      <PurchaseCreditsModal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} />
      <FactionScoutsModal isOpen={isFactionScoutsModalOpen} onClose={() => setIsFactionScoutsModalOpen(false)} credits={playerData.playerState.credits} onUpdate={() => refreshPlayerData()} scoutingMissions={scoutingMissions} loading={false} refreshScoutingData={() => refreshPlayerData()} />
      <ExplorationModal isOpen={isExplorationModalOpen} onClose={() => setIsExplorationModalOpen(false)} zone={selectedZoneForExploration} onUpdate={refreshPlayerData} onOpenInventory={() => setIsInventoryOpen(true)} />
      <MetroModal isOpen={isMetroOpen} onClose={() => setIsMetroOpen(false)} mapLayout={mapLayout} discoveredZones={playerData.playerState.zones_decouvertes} currentZoneId={currentZone?.id || 0} onUpdate={refreshPlayerData} />
      <BankModal isOpen={isBankOpen} onClose={() => setIsBankOpen(false)} credits={playerData.playerState.credits} bankBalance={playerData.playerState.bank_balance || 0} onUpdate={refreshPlayerData} />
      <BountyModal isOpen={isBountyOpen} onClose={() => setIsBountyOpen(false)} credits={playerData.playerState.credits} onUpdate={refreshPlayerData} />
    </div>
  );
};

export default GameUI;