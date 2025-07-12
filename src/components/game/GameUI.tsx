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
import ExplorationGrid from "../ExplorationGrid";
import ExplorationHeader from "../ExplorationHeader";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import MarketModal from "../MarketModal";
import CreditsDisplay from "../CreditsDisplay";
import PurchaseCreditsModal from "../PurchaseCreditsModal";
import FactionScoutsModal from "../FactionScoutsModal";
import { useGame } from "@/contexts/GameContext";

const formatZoneName = (name: string): string => {
  if (!name) return "Zone Inconnue";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const ENTRANCE_X = 25;
const ENTRANCE_Y = 50;
const GRID_SIZE = 51;

const findPathBFS = (start: {x: number, y: number}, end: {x: number, y: number}): {x: number, y: number}[] | null => {
    const queue: {pos: {x: number, y: number}, path: {x: number, y: number}[]}[] = [{pos: start, path: [start]}];
    const visited = new Set<string>([`${start.x},${start.y}`]);

    while (queue.length > 0) {
        const { pos, path } = queue.shift()!;

        if (pos.x === end.x && pos.y === end.y) {
            return path;
        }

        const neighbors = [
            { x: pos.x + 1, y: pos.y },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x, y: pos.y - 1 },
        ];

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (
                neighbor.x >= 0 && neighbor.x < GRID_SIZE &&
                neighbor.y >= 0 && neighbor.y < GRID_SIZE &&
                !visited.has(key)
            ) {
                visited.add(key);
                const newPath = [...path, neighbor];
                queue.push({ pos: neighbor, path: newPath });
            }
        }
    }
    return null;
};

const GameUI = () => {
  const { playerData, setPlayerData, mapLayout, refreshPlayerData } = useGame();
  
  const [currentView, setCurrentView] = useState<'map' | 'base' | 'exploration'>('map');
  const [isViewReady, setIsViewReady] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isFactionScoutsModalOpen, setIsFactionScoutsModalOpen] = useState(false);
  const [explorationZone, setExplorationZone] = useState<{ name: string; icon: string | null } | null>(null);
  const [explorationPath, setExplorationPath] = useState<{x: number, y: number}[] | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null }[];
  }>({ isOpen: false, title: "", description: "", actions: [] });

  useEffect(() => {
    if (currentView === 'base') {
      setIsViewReady(true);
      return;
    }

    if (playerData.playerState.exploration_x !== null && playerData.playerState.exploration_y !== null) {
      const currentZone = mapLayout.find(z => z.x === playerData.playerState.position_x && z.y === playerData.playerState.position_y);
      if (currentZone) {
        setExplorationZone({ name: formatZoneName(currentZone.type), icon: currentZone.icon });
      }
      setCurrentView('exploration');
      setIsViewReady(true);
    } else {
      setCurrentView('map');
      setIsViewReady(true);
    }
  }, [playerData.playerState.exploration_x, playerData.playerState.exploration_y, playerData.playerState.position_x, playerData.playerState.position_y, currentView, mapLayout]);

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleExploreAction = async (zone: { name: string; icon: string | null }) => {
    closeModal();
    const { error } = await supabase.from('player_states').update({
      exploration_x: playerData.playerState.exploration_x ?? ENTRANCE_X,
      exploration_y: playerData.playerState.exploration_y ?? ENTRANCE_Y,
    }).eq('id', playerData.playerState.id);

    if (error) {
      showError("Impossible d'entrer en exploration.");
    } else {
      refreshPlayerData();
    }
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
    const { x, y, type, id } = cell;

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
      if (type === 'marché') { setIsMarketOpen(true); return; }
      if (type === 'Faction: Scouts') { setIsFactionScoutsModalOpen(true); return; }

      const actions: typeof modalState.actions = [];
      if (isBaseLocation) actions.push({ label: "Aller au campement", onClick: handleEnterBase });
      actions.push({ label: "Explorer", onClick: () => handleExploreAction({ name: formatZoneName(type), icon: cell.icon }) });
      if (currentState.playerState.base_position_x === null) actions.push({ label: "Installer mon campement", onClick: handleBuildBase });

      setModalState({ isOpen: true, title: formatZoneName(type), description: "Que souhaitez-vous faire ici ?", actions });
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

  const handleExplorationCellHover = (x: number, y: number) => {
    if (playerData.playerState.exploration_x === null || x < 0) { setExplorationPath(null); return; }
    const startPos = { x: playerData.playerState.exploration_x, y: playerData.playerState.exploration_y! };
    if (startPos.x === x && startPos.y === y) { setExplorationPath(null); return; }
    setExplorationPath(findPathBFS(startPos, { x, y }));
  };

  const handleExplorationCellClick = async (x: number, y: number) => {
    const { exploration_x, exploration_y, energie } = playerData.playerState;
    if (exploration_x === null || exploration_y === null) return;

    if (x === ENTRANCE_X && y === ENTRANCE_Y) {
        const path = findPathBFS({ x: exploration_x, y: exploration_y }, { x, y });
        if (path) {
            const cost = path.length - 1;
            if (energie >= cost) {
                setModalState({
                    isOpen: true,
                    title: "Quitter la zone ?",
                    description: `Le retour à la sortie vous coûtera ${cost} points d'énergie.`,
                    actions: [{ label: "Quitter", onClick: () => confirmExitExploration(cost), variant: "destructive" }, { label: "Rester", onClick: closeModal, variant: "outline" }]
                });
            } else {
                showError(`Pas assez d'énergie pour retourner à la sortie. Coût: ${cost}, Vous avez: ${energie}`);
            }
        }
        return;
    }

    if (explorationPath) {
      const cost = explorationPath.length - 1;
      if (cost > 0 && energie >= cost) {
        const originalState = { ...playerData };
        setPlayerData(prev => ({ ...prev, playerState: { ...prev.playerState, exploration_x: x, exploration_y: y, energie: prev.playerState.energie - cost }}));
        setExplorationPath(null);

        const { error } = await supabase.rpc('move_in_exploration', { target_x: x, target_y: y });
        if (error) {
          showError(error.message || "Déplacement impossible.");
          setPlayerData(originalState);
        }
      }
    }
  };

  const confirmExitExploration = async (cost: number) => {
    closeModal();
    const originalState = playerData;
    setPlayerData(prev => ({
        ...prev,
        playerState: {
            ...prev.playerState,
            exploration_x: null,
            exploration_y: null,
            energie: prev.playerState.energie - cost
        }
    }));

    const { error } = await supabase.from('player_states').update({ 
        exploration_x: null, 
        exploration_y: null,
        energie: originalState.playerState.energie - cost
    }).eq('id', originalState.playerState.id);

    if (error) {
        showError("Erreur lors de la sortie.");
        setPlayerData(originalState);
    } else {
        refreshPlayerData();
    }
  };

  const scoutingMissions = useMemo(() => ({
    inProgress: playerData.scoutingMissions.filter(m => m.status === 'in_progress'),
    completed: playerData.scoutingMissions.filter(m => m.status === 'completed'),
  }), [playerData.scoutingMissions]);

  if (!isViewReady) return <div className="h-full flex items-center justify-center bg-gray-950"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

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
        <div className={cn("relative w-full h-full", currentView !== 'exploration' && "hidden")}>
          {explorationZone && <ExplorationHeader zoneName={explorationZone.name} zoneIcon={explorationZone.icon} />}
          <ExplorationGrid isActive={currentView === 'exploration'} playerPosition={playerData.playerState.exploration_x !== null ? { x: playerData.playerState.exploration_x, y: playerData.playerState.exploration_y! } : null} onCellClick={handleExplorationCellClick} onCellHover={handleExplorationCellHover} path={explorationPath} currentEnergy={playerData.playerState.energie} />
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
    </div>
  );
};

export default GameUI;