import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Box, BrickWall, TowerControl, Zap, AlertTriangle, CookingPot, Hammer, Trash2, BedDouble } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import ResourceCost from "./ResourceCost";

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string;
  cost_energy: number;
  cost_wood: number;
  cost_metal: number;
  cost_components: number;
  cost_metal_ingots: number;
}

interface FoundationMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number | null;
  y: number | null;
  onBuild: (x: number, y: number, building: BuildingDefinition) => void;
  onDemolish: (x: number, y: number) => void;
  playerResources: {
    energie: number;
    wood: number;
    metal: number;
    components: number;
    metal_ingots: number;
  };
  items: any[];
}

const buildingIcons: { [key: string]: React.ElementType } = {
  chest: Box,
  wall: BrickWall,
  turret: TowerControl,
  generator: Zap,
  trap: AlertTriangle,
  piège: AlertTriangle,
  crossbow: TowerControl,
  arbalete: TowerControl,
  crossbow_trap: TowerControl,
  workbench: Hammer,
  furnace: CookingPot,
  lit: BedDouble,
};

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish, playerResources, items }: FoundationMenuModalProps) => {
  const { buildingLevels } = useGame();
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);

  useEffect(() => {
    if (buildingLevels) {
      const level1Buildings = buildingLevels
        .filter(bl => bl.level === 1 && bl.building_type !== 'foundation' && bl.building_type !== 'campfire')
        .map(bl => ({
          type: bl.building_type,
          name: bl.building_type.charAt(0).toUpperCase() + bl.building_type.slice(1),
          icon: bl.building_type,
          cost_energy: bl.upgrade_cost_energy,
          cost_wood: bl.upgrade_cost_wood,
          cost_metal: bl.upgrade_cost_metal,
          cost_components: bl.upgrade_cost_components,
          cost_metal_ingots: bl.upgrade_cost_metal_ingots,
        }));
      setBuildings(level1Buildings);
    }
  }, [buildingLevels]);

  const handleBuild = (building: BuildingDefinition) => {
    if (x !== null && y !== null) {
      onBuild(x, y, building);
      onClose();
    }
  };

  const handleDemolish = () => {
    if (x !== null && y !== null) {
      onDemolish(x, y);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Construire sur la fondation</DialogTitle>
          <DialogDescription>
            Choisissez un bâtiment à construire.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
          {buildings.map((building) => {
            const Icon = buildingIcons[building.icon] || Box;
            const hasEnoughResources =
              playerResources.energie >= building.cost_energy &&
              playerResources.wood >= building.cost_wood &&
              playerResources.metal >= building.cost_metal &&
              playerResources.components >= building.cost_components &&
              playerResources.metal_ingots >= building.cost_metal_ingots;

            return (
              <button
                key={building.type}
                onClick={() => handleBuild(building)}
                disabled={!hasEnoughResources}
                className={cn(
                  "p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all",
                  hasEnoughResources
                    ? "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-blue-500"
                    : "bg-slate-800/50 border-slate-700/50 cursor-not-allowed opacity-50"
                )}
              >
                <Icon className="w-10 h-10" />
                <span className="font-mono text-sm capitalize">{building.name}</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  <ResourceCost type="energy" amount={building.cost_energy} />
                  <ResourceCost type="wood" amount={building.cost_wood} />
                  <ResourceCost type="metal" amount={building.cost_metal} />
                  <ResourceCost type="components" amount={building.cost_components} />
                  <ResourceCost type="metal_ingot" amount={building.cost_metal_ingots} />
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDemolish}>
            <Trash2 className="w-4 h-4 mr-2" />
            Démolir la fondation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FoundationMenuModal;