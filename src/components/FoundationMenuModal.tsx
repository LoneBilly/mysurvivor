import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2, Zap, Clock, Hammer, Box, BrickWall, TowerControl, AlertTriangle, CookingPot, X } from 'lucide-react';
import { showError } from '@/utils/toast';
import ItemIcon from './ItemIcon';
import { ScrollArea } from './ui/scroll-area';

const buildingIcons: { [key: string]: React.ElementType } = {
  chest: Box,
  wall: BrickWall,
  turret: TowerControl,
  generator: Zap,
  trap: AlertTriangle,
  workbench: Hammer,
  furnace: CookingPot,
};

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string;
  level: number;
  upgrade_time_seconds: number;
  upgrade_cost_energy: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_cost_metal_ingots: number;
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

const FoundationMenuModal = ({ isOpen, onClose, x, y, onBuild, onDemolish, playerResources, items }: FoundationMenuModalProps) => {
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchBuildings = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('building_levels')
          .select(`
            building_type,
            level,
            upgrade_time_seconds,
            upgrade_cost_energy,
            upgrade_cost_wood,
            upgrade_cost_metal,
            upgrade_cost_components,
            upgrade_cost_metal_ingots
          `)
          .eq('level', 1);

        if (error) {
          showError("Impossible de charger les définitions de bâtiments.");
          setBuildings([]);
        } else {
          const buildingTypes = data.map(d => d.building_type);
          const { data: defs, error: defsError } = await supabase
            .from('building_definitions')
            .select('type, name, icon')
            .in('type', buildingTypes);
          
          if (defsError) {
            showError("Impossible de charger les noms des bâtiments.");
            setBuildings([]);
          } else {
            const merged = data.map(level => {
              const def = defs.find(d => d.type === level.building_type);
              return { ...level, type: level.building_type, name: def?.name || 'Inconnu', icon: def?.icon || '' };
            });
            setBuildings(merged);
          }
        }
        setLoading(false);
      };
      fetchBuildings();
    }
  }, [isOpen]);

  const handleDemolishClick = () => {
    if (x !== null && y !== null) {
      onDemolish(x, y);
      onClose();
    }
  };

  const handleBuildClick = (building: BuildingDefinition) => {
    if (x !== null && y !== null) {
      onBuild(x, y, building);
      onClose();
    }
  };

  const resourceItems = useMemo(() => ({
    wood: items.find(i => i.id === 9),
    metal: items.find(i => i.id === 4),
    components: items.find(i => i.id === 38),
    metal_ingots: items.find(i => i.id === 12),
  }), [items]);

  const renderResourceCost = (cost: number, resourceName: string, item: any) => {
    if (cost === 0) return null;
    return (
      <div className="flex items-center gap-1 text-xs">
        {item && <ItemIcon iconName={item.icon} alt={item.name} className="w-4 h-4" />}
        <span>{cost}</span>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Construire sur la fondation" containerClassName="max-w-2xl">
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buildings.map((building) => {
                const Icon = buildingIcons[building.type] || Hammer;
                const hasEnoughResources = 
                  playerResources.energie >= building.upgrade_cost_energy &&
                  playerResources.wood >= building.upgrade_cost_wood &&
                  playerResources.metal >= building.upgrade_cost_metal &&
                  playerResources.components >= building.upgrade_cost_components &&
                  playerResources.metal_ingots >= building.upgrade_cost_metal_ingots;

                return (
                  <div key={building.type} className="bg-white/5 p-3 rounded-lg flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-8 h-8 text-gray-300" />
                      <h3 className="text-lg font-semibold flex-1">{building.name}</h3>
                    </div>
                    <div className="text-sm text-gray-400 mb-3 flex-1">
                      Description du bâtiment à ajouter ici.
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-300 mb-3">
                      <div className="flex items-center gap-1 text-xs"><Zap size={14} className="text-yellow-400" /> {building.upgrade_cost_energy}</div>
                      <div className="flex items-center gap-1 text-xs"><Clock size={14} /> {building.upgrade_time_seconds}s</div>
                      {renderResourceCost(building.upgrade_cost_wood, 'Bois', resourceItems.wood)}
                      {renderResourceCost(building.upgrade_cost_metal, 'Pierre', resourceItems.metal)}
                      {renderResourceCost(building.upgrade_cost_components, 'Composants', resourceItems.components)}
                      {renderResourceCost(building.upgrade_cost_metal_ingots, 'Lingots', resourceItems.metal_ingots)}
                    </div>
                    <Button onClick={() => handleBuildClick(building)} disabled={!hasEnoughResources}>
                      Construire
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="border-t border-white/10 pt-4">
            <Button variant="destructive" onClick={handleDemolishClick} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Détruire la fondation
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default FoundationMenuModal;