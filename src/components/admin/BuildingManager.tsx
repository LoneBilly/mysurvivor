import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Wrench } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { useIsMobile } from '@/hooks/use-is-mobile';
import BuildingLevelEditor from './BuildingLevelEditor';

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string | null;
  build_time_seconds: number;
  cost_energy: number;
  cost_wood: number;
  cost_metal: number;
  cost_components: number;
}

interface BuildingManagerProps {
  buildings: BuildingDefinition[];
  onBuildingsUpdate: () => void;
}

const BuildingManager = ({ buildings, onBuildingsUpdate }: BuildingManagerProps) => {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDefinition | null>(null);
  const isMobile = useIsMobile();

  const handleManageLevels = (building: BuildingDefinition) => {
    setSelectedBuilding(building);
  };

  const handleBackToList = () => {
    setSelectedBuilding(null);
    onBuildingsUpdate();
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Wrench;
    const Icon = (LucideIcons as any)[iconName];
    return Icon && typeof Icon.render === 'function' ? Icon : Wrench;
  };

  if (selectedBuilding) {
    return <BuildingLevelEditor building={selectedBuilding} onBack={handleBackToList} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex-grow overflow-y-auto">
        {isMobile ? (
          <div className="p-4 space-y-3">
            {buildings.map(building => {
              const Icon = getIconComponent(building.icon);
              return (
                <div key={building.type} onClick={() => handleManageLevels(building)} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6" />
                      <p className="font-bold text-white">{building.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleManageLevels(building); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-300">
                    <p>Temps: {building.build_time_seconds}s</p>
                    <p>Énergie: {building.cost_energy}</p>
                    <p>Bois: {building.cost_wood}</p>
                    <p>Pierre: {building.cost_metal}</p>
                    <p>Composants: {building.cost_components}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                <TableHead>Nom</TableHead>
                <TableHead>Temps</TableHead>
                <TableHead>Énergie</TableHead>
                <TableHead>Bois</TableHead>
                <TableHead>Pierre</TableHead>
                <TableHead>Composants</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map(building => (
                <TableRow key={building.type} className="border-gray-700">
                  <TableCell className="font-medium flex items-center gap-2">
                    {(() => { const Icon = getIconComponent(building.icon); return <Icon className="w-5 h-5" />; })()}
                    {building.name}
                  </TableCell>
                  <TableCell>{building.build_time_seconds}s</TableCell>
                  <TableCell>{building.cost_energy}</TableCell>
                  <TableCell>{building.cost_wood}</TableCell>
                  <TableCell>{building.cost_metal}</TableCell>
                  <TableCell>{building.cost_components}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleManageLevels(building)}>
                      <Wrench className="w-4 h-4 mr-2" /> Gérer les niveaux
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default BuildingManager;