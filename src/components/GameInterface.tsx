import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

const GameInterface = () => {
  const { user } = useAuth();
  const { gameState, loading: gameStateLoading, saveGameState } = useGameState();
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'map' | 'base' | 'exploration'>('map');
  const [isViewReady, setIsViewReady] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [explorationZone, setExplorationZone] = useState<{ name: string; icon: string | null } | null>(null);
  const [explorationPath, setExplorationPath] = useState<{x: number, y: number}[] | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null }[];
  }>({ isOpen: false, title: "", description: "", actions: [] });

  useEffect(() => {
    const fetchMapLayout = async () => {
      setMapLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
        showError("Impossible de charger la carte.");
      } else {
        setMapLayout(data as MapCell[]);
      }
      setMapLoading(false);
    };
    fetchMapLayout();
  }, []);

  useEffect(() => {
    if (gameState && !gameStateLoading) {
      if (gameState.exploration_x !== null && gameState.exploration_y !== null) {
        const fetchCurrentZoneInfo = async () => {
          const { data: zoneData } = await supabase
            .from('map_layout')
            .select('type, icon')
            .eq('x', gameState.position_x)
            .eq('y', gameState.position_y)
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
    }
  }, [gameState, gameStateLoading]);

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
      const actions: { label: string; onClick: () => void; variant?: any }[] = [];

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

  const handleExplorationCellHover = (x: number, y: number) => {
    if (!gameState || gameState.exploration_x === null || gameState.exploration_y === null || x < 0 || y < 0) {
      setExplorationPath(null);
      return;
    }

    const startPos = { x: gameState.exploration_x, y: gameState.exploration_y };
    const endPos = { x, y };

    if (startPos.x === endPos.x && startPos.y === endPos.y) {
      setExplorationPath(null);
      return;
    }

    const path = findPathBFS(startPos, endPos);
    setExplorationPath(path);
  };

  const handleExplorationCellClick = async (x: number, y: number) => {
    if (!gameState || gameState.exploration_x === null || gameState.exploration_y === null) return;

    const clickedCellIsEntrance = x === ENTRANCE_X && y === ENTRANCE_Y;
    const playerX = gameState.exploration_x;
    const playerY = gameState.exploration_y;
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
        if (cost > 0 && gameState.energie >= cost) {
          await saveGameState({
            exploration_x: targetCell.x,
            exploration_y: targetCell.y,
            energie: gameState.energie - cost,
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
  const handleInventaire = () => showSuccess("Ouverture de l'inventaire");

  if (gameStateLoading || mapLoading || !isViewReady) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-black">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-gray-600">Chargement du jeu...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Erreur lors du chargement du jeu</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-black text-white rounded-none"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 text-black">
      <GameHeader
        joursSurvecus={gameState.jours_survecus}
        spawnDate={gameState.spawn_date}
        onLeaderboard={handleLeaderboard}
        onOptions={handleOptions}
        currentView={currentView}
        onBackToMap={handleBackToMap}
      />
      
      <main className={cn(
        "flex-1 flex items-center justify-center bg-gray-100 min-h-0 overflow-hidden",
        currentView === 'map' && "p-4"
      )}>
        {currentView === 'map' ? (
          <GameGrid 
            mapLayout={mapLayout}
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
              onCellHover={handleExplorationCellHover}
              path={explorationPath}
              currentEnergy={gameState.energie}
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