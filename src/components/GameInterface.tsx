import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import GameHeader from "./GameHeader";
import GameGrid from "./GameGrid";
import GameFooter from "./GameFooter";
import ActionModal from "./ActionModal";
import BaseInterface from "./BaseInterface";
import BaseHeader from "./BaseHeader";
import LeaderboardModal from "./LeaderboardModal";
import OptionsModal from "./OptionsModal";
import InventoryModal from "./InventoryModal";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { GameState, MapCell } from "@/types/game";
import ExplorationGrid from "./ExplorationGrid";
import ExplorationHeader from "./ExplorationHeader";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import MarketModal from "./MarketModal";
import CreditsDisplay from "./CreditsDisplay";
import PurchaseCreditsModal from "./PurchaseCreditsModal";
import FactionScoutsModal from "./FactionScoutsModal";

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

interface GameInterfaceProps {
  gameState: GameState;
  mapLayout: MapCell[];
  saveGameState: (updates: Partial<Omit<GameState, 'id'>>) => Promise<void>;
  reloadGameState: (silent?: boolean) => Promise<void>;
}

const GameInterface = ({ gameState, mapLayout, saveGameState, reloadGameState }: GameInterfaceProps) => {
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
  const [justMovedTo, setJustMovedTo] = useState<MapCell | null>(null);

  const [localGameState, setLocalGameState] = useState(gameState);

  useEffect(() => {
    setLocalGameState(gameState);
  }, [gameState]);

  useEffect(() => {
    if (currentView === 'base') {
      setIsViewReady(true);
      return;
    }

    if (localGameState.exploration_x !== null && localGameState.exploration_y !== null) {
      const fetchCurrentZoneInfo = async () => {
        const { data: zoneData } = await supabase
          .from('map_layout')
          .select('type, icon')
          .eq('x', localGameState.position_x)
          .eq('y', localGameState.position_y)
          .single();
        
        if (zoneData) {
          setExplorationZone({ name: formatZoneName(zoneData.type), icon: zoneData.icon });
          setCurrentView('exploration');
        }
        setIsViewReady(true);
      };
      fetchCurrentZoneInfo();
    } else {
      setCurrentView('map');
      setIsViewReady(true);
    }
  }, [localGameState, currentView]);

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const handleExploreAction = async (zone: { name: string; icon: string | null }) => {
    closeModal();
    if (!localGameState) return;

    await saveGameState({
      exploration_x: localGameState.exploration_x ?? ENTRANCE_X,
      exploration_y: localGameState.exploration_y ?? ENTRANCE_Y,
    });

    setExplorationZone(zone);
    setCurrentView('exploration');
  };

  const handleBuildBase = async () => {
    closeModal();
    if (!localGameState) return;

    if (localGameState.base_position_x !== null && localGameState.base_position_y !== null) {
      showError("Vous avez déjà un campement.");
      return;
    }

    await saveGameState({
      base_position_x: localGameState.position_x,
      base_position_y: localGameState.position_y,
    });

    showSuccess("Votre campement a été installé !");
  };

  const handleEnterBase = () => {
    closeModal();
    setCurrentView('base');
    reloadGameState(true);
  };

  const handleBackToMap = () => {
    setCurrentView('map');
  };

  const handleCellSelect = async (cell: MapCell) => {
    if (!localGameState) return;

    const { x, y, type, id } = cell;

    const isDiscovered = localGameState.zones_decouvertes.includes(id);
    const isCurrentPosition = localGameState.position_x === x && localGameState.position_y === y;
    const isBaseLocation = localGameState.base_position_x === x && localGameState.base_position_y === y;

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
      if (type === 'marché') {
        setIsMarketOpen(true);
        return;
      }
      if (type === 'Faction: Scouts') {
        setIsFactionScoutsModalOpen(true);
        return;
      }

      const actions: { label: string; onClick: () => void; variant?: any }[] = [];

      if (isBaseLocation) {
        actions.push({ label: "Aller au campement", onClick: handleEnterBase, variant: "default" });
      }
      
      actions.push({ label: "Explorer", onClick: () => handleExploreAction({ name: formatZoneName(type), icon: cell.icon }), variant: "default" });

      if (localGameState.base_position_x === null || localGameState.base_position_y === null) {
        actions.push({ label: "Installer mon campement", onClick: handleBuildBase, variant: "default" });
      }

      setModalState({
        isOpen: true,
        title: formatZoneName(type),
        description: "Que souhaitez-vous faire ici ?",
        actions,
      });
    } else {
      const distance = Math.abs(localGameState.position_x - x) + Math.abs(localGameState.position_y - y);
      const energyCost = distance * 10;

      const handleMoveAction = async () => {
        closeModal();
        if (!localGameState || localGameState.energie < energyCost) {
          showError("Pas assez d'énergie pour vous déplacer.");
          return;
        }
        
        const originalState = { ...localGameState };

        // Optimistic UI update
        setLocalGameState(prev => ({
          ...prev!,
          position_x: x,
          position_y: y,
          energie: prev!.energie - energyCost,
        }));

        try {
          const { error } = await supabase.rpc('move_player', { target_x: x, target_y: y });
          if (error) throw error;
          // Server confirmed, now we officially reload the state from server to be sure
          await reloadGameState(true);
          setJustMovedTo(cell);
        } catch (error: any) {
          // Revert UI on error
          showError(error.message || "Déplacement impossible.");
          setLocalGameState(originalState);
        }
      };

      setModalState({
        isOpen: true,
        title: `Aller à ${formatZoneName(type)}`,
        description: (
          <>
            Ce trajet vous coûtera{" "}
            <span className="font-bold text-yellow-400">{energyCost}</span> points d'énergie.
          </>
        ),
        actions: [
          { label: "Confirmer le déplacement", onClick: handleMoveAction, variant: "default" },
          { label: "Annuler", onClick: closeModal, variant: "secondary" },
        ],
      });
    }
  };

  const handleCellSelectRef = useRef(handleCellSelect);
  handleCellSelectRef.current = handleCellSelect;

  useEffect(() => {
    if (justMovedTo && localGameState && localGameState.position_x === justMovedTo.x && localGameState.position_y === justMovedTo.y) {
        handleCellSelectRef.current(justMovedTo);
        setJustMovedTo(null);
    }
  }, [localGameState, justMovedTo]);

  const handleExplorationCellHover = (x: number, y: number) => {
    if (!localGameState || localGameState.exploration_x === null || localGameState.exploration_y === null || x < 0 || y < 0) {
      setExplorationPath(null);
      return;
    }

    const startPos = { x: localGameState.exploration_x, y: localGameState.exploration_y };
    const endPos = { x, y };

    if (startPos.x === endPos.x && startPos.y === endPos.y) {
      setExplorationPath(null);
      return;
    }

    const path = findPathBFS(startPos, endPos);
    setExplorationPath(path);
  };

  const handleExplorationCellClick = async (x: number, y: number) => {
    if (!localGameState || localGameState.exploration_x === null || localGameState.exploration_y === null) return;

    const clickedCellIsEntrance = x === ENTRANCE_X && y === ENTRANCE_Y;
    const playerX = localGameState.exploration_x;
    const playerY = localGameState.exploration_y;
    const playerIsOnEntrance = playerX === ENTRANCE_X && playerY === ENTRANCE_Y;
    const playerIsAdjacentToEntrance = Math.abs(playerX - ENTRANCE_X) + Math.abs(playerY - ENTRANCE_Y) === 1;

    if (clickedCellIsEntrance && (playerIsOnEntrance || playerIsAdjacentToEntrance)) {
      setModalState({
        isOpen: true,
        title: "Quitter la zone d'exploration ?",
        description: "Vous retournerez à la carte principale. Votre position dans cette zone sera sauvegardée.",
        actions: [
          { label: "Quitter", onClick: confirmExitExploration, variant: "destructive" },
          { label: "Rester", onClick: closeModal, variant: "outline" },
        ],
      });
      return;
    }

    if (explorationPath) {
      const targetCell = explorationPath[explorationPath.length - 1];
      if (targetCell.x === x && targetCell.y === y) {
        const cost = explorationPath.length - 1;
        if (cost > 0 && localGameState.energie >= cost) {
          await saveGameState({
            exploration_x: targetCell.x,
            exploration_y: targetCell.y,
            energie: localGameState.energie - cost,
          });
          setExplorationPath(null);

          if (targetCell.x === ENTRANCE_X && targetCell.y === ENTRANCE_Y) {
            setModalState({
              isOpen: true,
              title: "Quitter la zone d'exploration ?",
              description: "Vous avez atteint la sortie. Vous pouvez retourner à la carte principale.",
              actions: [
                { label: "Quitter", onClick: confirmExitExploration, variant: "destructive" },
                { label: "Rester", onClick: closeModal, variant: "outline" },
              ],
            });
          }
        }
      }
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
  
  const handleInventaire = () => {
    setIsInventoryOpen(true);
    reloadGameState(true);
  };

  const handlePurchaseCredits = () => setIsPurchaseModalOpen(true);

  const scoutingMissions = useMemo(() => {
    const allMissions = localGameState.scoutingMissions || [];
    return {
      inProgress: allMissions.filter(m => m.status === 'in_progress'),
      completed: allMissions.filter(m => m.status === 'completed'),
    };
  }, [localGameState.scoutingMissions]);

  if (!isViewReady) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Préparation de l'interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-white">
      <GameHeader
        spawnDate={localGameState.spawn_date}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
        currentView={currentView}
        onBackToMap={handleBackToMap}
      />
      
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <CreditsDisplay credits={localGameState.credits} onPurchaseClick={handlePurchaseCredits} />

        <div className={cn("w-full h-full flex items-center justify-center p-4", currentView !== 'map' && "hidden")}>
          <GameGrid 
            mapLayout={mapLayout}
            onCellSelect={handleCellSelect}
            discoveredZones={localGameState.zones_decouvertes}
            playerPosition={{ x: localGameState.position_x, y: localGameState.position_y }}
            basePosition={localGameState.base_position_x !== null && localGameState.base_position_y !== null ? { x: localGameState.base_position_x, y: localGameState.base_position_y } : null}
          />
        </div>
        
        <div className={cn("relative w-full h-full", currentView !== 'base' && "hidden")}>
          <BaseHeader
            resources={{
              wood: localGameState.wood,
              metal: localGameState.metal,
              components: localGameState.components,
            }}
          />
          <BaseInterface 
            isActive={currentView === 'base'} 
            initialConstructions={localGameState.base_constructions}
          />
        </div>

        <div className={cn("relative w-full h-full", currentView !== 'exploration' && "hidden")}>
          {explorationZone && (
            <ExplorationHeader
              zoneName={explorationZone.name}
              zoneIcon={explorationZone.icon}
            />
          )}
          <ExplorationGrid
            playerPosition={
              localGameState.exploration_x !== null && localGameState.exploration_y !== null
              ? { x: localGameState.exploration_x, y: localGameState.exploration_y }
              : null
            }
            onCellClick={handleExplorationCellClick}
            onCellHover={handleExplorationCellHover}
            path={explorationPath}
            currentEnergy={localGameState.energie}
          />
        </div>
      </main>
      
      <GameFooter
        stats={{
          vie: localGameState.vie,
          faim: localGameState.faim,
          soif: localGameState.soif,
          energie: localGameState.energie,
        }}
        credits={localGameState.credits}
        onInventaire={handleInventaire}
        onPurchaseCredits={handlePurchaseCredits}
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

      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={localGameState.inventaire}
        unlockedSlots={localGameState.unlocked_slots}
        onUpdate={reloadGameState}
      />

      <MarketModal
        isOpen={isMarketOpen}
        onClose={() => setIsMarketOpen(false)}
        inventory={localGameState.inventaire}
        credits={localGameState.credits}
        saleSlots={localGameState.sale_slots}
        onUpdate={reloadGameState}
        onPurchaseCredits={handlePurchaseCredits}
      />

      <PurchaseCreditsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      <FactionScoutsModal
        isOpen={isFactionScoutsModalOpen}
        onClose={() => setIsFactionScoutsModalOpen(false)}
        credits={localGameState.credits}
        onUpdate={() => reloadGameState(true)}
        scoutingMissions={scoutingMissions}
        loading={false} // Le chargement est géré au niveau supérieur
        refreshScoutingData={() => reloadGameState(true)}
      />
    </div>
  );
};

export default GameInterface;