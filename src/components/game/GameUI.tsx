import { useState, useEffect, useMemo, useRef } from "react";
import GameHeader from "../GameHeader";
import GameGrid from "../GameGrid";
import GameFooter from "../GameFooter";
import ActionModal from "../ActionModal";
import BaseInterface from "../BaseInterface";
import BaseHeader from "../BaseHeader";
import LeaderboardModal from "../LeaderboardModal";
import OptionsModal from "../OptionsModal";
import InventoryModal from "../InventoryModal";
import { showSuccess, showError, showInfo } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { FullPlayerData, MapCell, BaseConstruction } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import MarketModal from "../MarketModal";
import PurchaseCreditsModal from "../PurchaseCreditsModal";
import FactionScoutsModal from "../FactionScoutsModal";
import { useGame } from "@/contexts/GameContext";
import ExplorationModal from "../ExplorationModal";
import MetroModal from "../MetroModal";
import BankModal from "../BankModal";
import BountyModal from "../BountyModal";
import WorkbenchModal from "../WorkbenchModal";
import MoreOptionsModal from "../MoreOptionsModal";
import HotelModal from '../HotelModal';
import CasinoModal from '../CasinoModal';
import GuideModal from "../GuideModal";
import PatchnoteModal from "../PatchnoteModal";
import BedModal from "../BedModal";
import TrapModal from "../TrapModal";
import CrossbowModal from "../CrossbowModal";

const formatZoneName = (name: string): string => {
  if (!name) return "Zone Inconnue";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const RESOURCE_IDS = {
  WOOD: 9,
  STONE: 4,
  METAL_INGOT: 12,
  COMPONENTS: 38,
};

const GameUI = () => {
  const { playerData, setPlayerData, mapLayout, items, refreshPlayerData, refreshResources, refreshInventoryAndChests, refreshBaseState } = useGame();
  
  const [currentView, setCurrentView] = useState<'map' | 'base'>('map');
  const [inspectedConstruction, setInspectedConstruction] = useState<BaseConstruction | null>(null);
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
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPatchnoteOpen, setIsPatchnoteOpen] = useState(false);
  const [isHotelOpen, setIsHotelOpen] = useState(false);
  const [isCasinoOpen, setIsCasinoOpen] = useState(false);
  const [selectedZoneForAction, setSelectedZoneForAction] = useState<MapCell | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const isInitialMount = useRef(true);

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
    refreshBaseState();
  };

  const handleHeaderBack = () => {
    setCurrentView('map');
  };

  const handleInspectBuilding = (construction: BaseConstruction) => {
    setInspectedConstruction(construction);
  };

  const handleDemolishBuilding = async (construction: BaseConstruction) => {
    const { x, y } = construction;
    setInspectedConstruction(null);
    const { error } = await supabase.rpc('demolish_building_to_foundation', { p_x: x, p_y: y });
    if (error) {
      showError(error.message || "Erreur de démolition.");
    } else {
      refreshBaseState();
    }
  };

  const handleCellSelect = async (cell: MapCell) => {
    const { x, y, type, id, interaction_type, id_name } = cell;

    const isDiscovered = playerData.playerState.zones_decouvertes.includes(id);
    const isCurrentPosition = playerData.playerState.position_x === x && playerData.playerState.position_y === y;
    const isBaseLocation = playerData.playerState.base_position_x === x && playerData.playerState.base_position_y === y;

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
      setSelectedZoneForAction(cell);
      switch (interaction_type) {
        case 'Action':
          if (id_name?.toLowerCase().includes('metro') || type.toLowerCase().includes('métro')) {
            setIsMetroOpen(true);
          } else if (type.toLowerCase().includes('casino')) {
            setIsCasinoOpen(true);
          } else if (type.toLowerCase().includes('hôtel')) {
            setIsHotelOpen(true);
          } else if (id === 10) { // Marché
            setIsMarketOpen(true);
          } else if (id === 2) { // Commissariat
            setIsBountyOpen(true);
          } else if (id === 12) { // Faction: Scouts
            setIsFactionScoutsModalOpen(true);
          } else if (type.toLowerCase().includes('banque')) { // Bank (still using type for generic bank)
            setIsBankOpen(true);
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
          const hasNoBase = playerData.playerState.base_position_x === null;
          
          if (hasBase) {
            actions.push({ label: "Aller au campement", onClick: handleEnterBase });
          }
          
          actions.push({ label: "Explorer", onClick: () => handleExploreAction(cell) });
          
          if (hasNoBase) {
            actions.push({ label: "Installer mon campement", onClick: handleBuildBase });
          }

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
      const distance = Math.abs(playerData.playerState.position_x - x) + Math.abs(playerData.playerState.position_y - y);
      const energyCost = distance * 10;

      const handleMoveAction = async () => {
        setIsMoving(true);
        const { error } = await supabase.rpc('move_player', { target_x: x, target_y: y });
        
        setIsMoving(false);
        closeModal();

        if (error) {
          showError(error.message || "Déplacement impossible.");
        } else {
          await refreshPlayerData();
        }
      };

      setModalState({
        isOpen: true,
        title: `Aller à ${formatZoneName(type)}`,
        description: `Ce trajet vous coûtera ${energyCost} points d'énergie.`,
        actions: [
          { label: isMoving ? "Déplacement..." : "Confirmer", onClick: handleMoveAction },
          { label: "Annuler", onClick: closeModal, variant: "secondary" }
        ],
      });
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isMoving) {
      const currentZone = mapLayout.find(z => z.x === playerData.playerState.position_x && z.y === playerData.playerState.position_y);
      if (currentZone) {
        handleCellSelect(currentZone);
      }
    }
  }, [playerData.playerState.position_x, playerData.playerState.position_y]);

  const scoutingMissions = useMemo(() => ({
    inProgress: playerData.scoutingMissions.filter(m => m.status === 'in_progress'),
    completed: playerData.scoutingMissions.filter(m => m.status === 'completed'),
  }), [playerData.scoutingMissions]);

  const totalResources = useMemo(() => {
    const resourceCounter = (itemId: number) => {
      const inventoryQty = playerData.inventory
        .filter(i => i.item_id === itemId)
        .reduce((sum, i) => sum + i.quantity, 0);
      const chestQty = playerData.chestItems
        ?.filter(i => i.item_id === itemId)
        .reduce((sum, i) => sum + i.quantity, 0) || 0;
      return inventoryQty + chestQty;
    };
    
    return {
      wood: resourceCounter(RESOURCE_IDS.WOOD),
      metal: resourceCounter(RESOURCE_IDS.STONE),
      components: resourceCounter(RESOURCE_IDS.COMPONENTS),
      metal_ingots: resourceCounter(RESOURCE_IDS.METAL_INGOT),
    };
  }, [playerData.inventory, playerData.chestItems]);

  const resourceItems = useMemo(() => ({
    wood: items.find(i => i.id === RESOURCE_IDS.WOOD),
    metal: items.find(i => i.id === RESOURCE_IDS.STONE),
    real_metal: items.find(i => i.id === RESOURCE_IDS.METAL_INGOT),
    components: items.find(i => i.id === RESOURCE_IDS.COMPONENTS),
  }), [items]);

  if (!isViewReady) return <div className="h-full flex items-center justify-center bg-gray-950"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  const currentZone = mapLayout.find(z => z.x === playerData.playerState.position_x && z.y === playerData.playerState.position_y);

  return (
    <div className="h-full flex flex-col text-white">
      <GameHeader
        spawnDate={playerData.playerState.spawn_date}
        onLeaderboard={() => setIsLeaderboardOpen(true)}
        onOptions={() => setIsOptionsOpen(true)}
        currentView={currentView}
        onBackToMap={handleHeaderBack}
        credits={playerData.playerState.credits}
        onPurchaseCredits={() => setIsPurchaseModalOpen(true)}
      />
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <div className={cn("w-full h-full flex items-center justify-center p-4", currentView !== 'map' && "hidden")}>
          <GameGrid mapLayout={mapLayout} onCellSelect={handleCellSelect} discoveredZones={playerData.playerState.zones_decouvertes} playerPosition={{ x: playerData.playerState.position_x, y: playerData.playerState.position_y }} basePosition={playerData.playerState.base_position_x !== null ? { x: playerData.playerState.base_position_x, y: playerData.playerState.base_position_y! } : null} />
        </div>
        <div className={cn("relative w-full h-full", currentView !== 'base' && "hidden")}>
          <BaseHeader resources={totalResources} resourceItems={resourceItems} />
          <BaseInterface
            isActive={currentView === 'base'}
            onInspectWorkbench={handleInspectBuilding}
            onDemolishBuilding={handleDemolishBuilding}
          />
        </div>
      </main>
      <GameFooter stats={playerData.playerState} credits={playerData.playerState.credits} onInventaire={() => setIsInventoryOpen(true)} onPurchaseCredits={() => setIsPurchaseModalOpen(true)} onMoreOptions={() => setIsMoreOptionsOpen(true)} />
      <ActionModal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} description={modalState.description} actions={modalState.actions} />
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <OptionsModal isOpen={isOptionsOpen} onClose={() => setIsOptionsOpen(false)} />
      <InventoryModal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} inventory={playerData.inventory} unlockedSlots={playerData.playerState.unlocked_slots} onUpdate={refreshPlayerData} />
      <MarketModal isOpen={isMarketOpen} onClose={() => setIsMarketOpen(false)} inventory={playerData.inventory} credits={playerData.playerState.credits} saleSlots={playerData.playerState.sale_slots} onUpdate={refreshPlayerData} onPurchaseCredits={() => setIsPurchaseModalOpen(true)} zoneName={selectedZoneForAction?.type || "Marché"} />
      <PurchaseCreditsModal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} />
      <FactionScoutsModal isOpen={isFactionScoutsModalOpen} onClose={() => setIsFactionScoutsModalOpen(false)} credits={playerData.playerState.credits} onUpdate={refreshPlayerData} scoutingMissions={scoutingMissions} loading={false} refreshScoutingData={() => refreshPlayerData()} onPurchaseCredits={() => setIsPurchaseModalOpen(true)} zoneName={selectedZoneForAction?.type || "Faction Éclaireurs"} />
      <ExplorationModal isOpen={isExplorationModalOpen} onClose={() => setIsExplorationModalOpen(false)} zone={selectedZoneForExploration} onUpdate={refreshPlayerData} onOpenInventory={() => setIsInventoryOpen(true)} />
      <MetroModal isOpen={isMetroOpen} onClose={() => setIsMetroOpen(false)} mapLayout={mapLayout} discoveredZones={playerData.playerState.zones_decouvertes} currentZoneId={currentZone?.id || 0} credits={playerData.playerState.credits} onUpdate={refreshPlayerData} onPurchaseCredits={() => setIsPurchaseModalOpen(true)} zoneName={selectedZoneForAction?.type || "Métro"} />
      <BankModal isOpen={isBankOpen} onClose={() => setIsBankOpen(false)} credits={playerData.playerState.credits} bankBalance={playerData.playerState.bank_balance || 0} onUpdate={refreshResources} zoneName={selectedZoneForAction?.type || "Banque"} />
      <BountyModal isOpen={isBountyOpen} onClose={() => setIsBountyOpen(false)} credits={playerData.playerState.credits} onUpdate={refreshResources} zoneName={selectedZoneForAction?.type || "Commissariat"} />
      <WorkbenchModal
        isOpen={!!inspectedConstruction && inspectedConstruction.type === 'workbench'}
        onClose={() => setInspectedConstruction(null)}
        construction={inspectedConstruction}
        onDemolish={handleDemolishBuilding}
        onUpdate={refreshBaseState}
        onOpenInventory={() => setIsInventoryOpen(true)}
      />
      <BedModal
        isOpen={!!inspectedConstruction && inspectedConstruction.type === 'lit'}
        onClose={() => setInspectedConstruction(null)}
        construction={inspectedConstruction}
        onDemolish={handleDemolishBuilding}
      />
      <TrapModal
        isOpen={!!inspectedConstruction && inspectedConstruction.type === 'trap'}
        onClose={() => setInspectedConstruction(null)}
        construction={inspectedConstruction}
        onDemolish={handleDemolishBuilding}
        onUpdate={refreshPlayerData}
      />
      <CrossbowModal
        isOpen={!!inspectedConstruction && inspectedConstruction.type === 'crossbow'}
        onClose={() => setInspectedConstruction(null)}
        construction={inspectedConstruction}
        onDemolish={handleDemolishBuilding}
        onUpdate={refreshPlayerData}
      />
      <HotelModal
        isOpen={isHotelOpen}
        onClose={() => setIsHotelOpen(false)}
        zone={selectedZoneForAction}
        credits={playerData.playerState.credits}
        onUpdate={refreshPlayerData}
        onPurchaseCredits={() => setIsPurchaseModalOpen(true)}
        zoneName={selectedZoneForAction?.type || "Hôtel"}
      />
      <CasinoModal
        isOpen={isCasinoOpen}
        onClose={() => setIsCasinoOpen(false)}
        credits={playerData.playerState.credits}
        onUpdate={refreshPlayerData}
        onPurchaseCredits={() => setIsPurchaseModalOpen(true)}
        zoneName={selectedZoneForAction?.type || "Casino"}
        onOpenInventory={() => setIsInventoryOpen(true)}
      />
      <MoreOptionsModal isOpen={isMoreOptionsOpen} onClose={() => setIsMoreOptionsOpen(false)} onOpenGuide={() => setIsGuideOpen(true)} onOpenPatchnotes={() => setIsPatchnoteOpen(true)} />
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <PatchnoteModal isOpen={isPatchnoteOpen} onClose={() => setIsPatchnoteOpen(false)} />
    </div>
  );
};

export default GameUI;