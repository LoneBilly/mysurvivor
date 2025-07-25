import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Wrench, Loader2, ArrowLeft } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { useIsMobile } from '@/hooks/use-is-mobile';
import BuildingLevelEditor from './BuildingLevelEditor';
import { BuildingLevel } from '@/types/game';
import { showError, showSuccess } from '@/utils/toast';
import CampfireManager from './CampfireManager';
import { Item } from '@/types/admin';

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string | null;
}

interface BuildingManagerProps {
  buildings: BuildingDefinition[];
  onBuildingsUpdate: () => void;
  allItems: Item[];
}

const BuildingManager = ({ buildings, onBuildingsUpdate, allItems }: BuildingManagerProps) => {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDefinition | null>(null);
  const [selectedBuildingLevels, setSelectedBuildingLevels] = useState<BuildingLevel[]>([]);
  const [loadingBuildingLevels, setLoadingBuildingLevels] = useState(false);
  const isMobile = useIsMobile();
  const [levelsData, setLevelsData] = useState<Record<string, BuildingLevel>>({});
  const [loadingLevels, setLoadingLevels] = useState(true);

  useEffect(() => {
    const fetchLevel1Data = async () => {
      setLoadingLevels(true);
      const { data, error } = await supabase
        .from('building_levels')
        .select('*')
        .eq('level', 1);
      
      if (error) {
        showError("Impossible de charger les données de niveau 1.");
      } else {
        const level1Map = data.reduce((acc, level) => {
          acc[level.building_type] = level;
          return acc;
        }, {} as Record<string, BuildingLevel>);
        setLevelsData(level1Map);
      }
      setLoadingLevels(false);
    };
    fetchLevel1Data();
  }, []);

  const handleManageLevels = async (building: BuildingDefinition) => {
    setSelectedBuilding(building);
    setLoadingBuildingLevels(true);
    const { data, error } = await supabase
      .from('building_levels')
      .select('*')
      .eq('building_type', building.type)
      .order('level', { ascending: true });
    
    if (error) {
      showError(`Erreur lors du chargement des niveaux pour ${building.name}.`);
      setSelectedBuildingLevels([]);
    } else {
      setSelectedBuildingLevels(data || []);
    }
    setLoadingBuildingLevels(false);
  };

  const handleBackToList = () => {
    setSelectedBuilding(null);
    setSelectedBuildingLevels([]);
    onBuildingsUpdate();
  };

  const handleSaveLevels = async (updatedLevels: BuildingLevel[]) => {
    if (!selectedBuilding) return;

    const { data: originalLevels, error: fetchError } = await supabase
      .from('building_levels')
      .select('id')
      .eq('building_type', selectedBuilding.type);

    if (fetchError) {
      showError("Erreur lors de la récupération des niveaux originaux.");
      return;
    }

    const originalLevelIds = originalLevels.map(l => l.id);
    const updatedLevelIds = updatedLevels.map(l => l.id).filter(id => id < 1000000000); // Filter out temporary new IDs

    const levelsToDelete = originalLevelIds.filter(id => !updatedLevelIds.includes(id));

    const levelsToUpsert = updatedLevels.map(({ id, created_at, ...rest }) => {
      if (id > 1000000000) { // It's a temporary ID (timestamp)
        const { id: tempId, ...restWithoutId } = rest;
        return restWithoutId;
      }
      return { id, ...rest };
    });

    const promises = [];
    if (levelsToDelete.length > 0) {
      promises.push(supabase.from('building_levels').delete().in('id', levelsToDelete));
    }
    if (levelsToUpsert.length > 0) {
      promises.push(supabase.from('building_levels').upsert(levelsToUpsert));
    }

    const results = await Promise.all(promises);
    const errors = results.map(r => r.error).filter(Boolean);

    if (errors.length > 0) {
      showError("Une erreur est survenue lors de la sauvegarde des niveaux.");
      console.error(errors);
    } else {
      showSuccess("Niveaux sauvegardés avec succès.");
      handleBackToList();
    }
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Wrench;
    const Icon = (LucideIcons as any)[iconName];
    return Icon && typeof Icon.render === 'function' ? Icon : Wrench;
  };

  if (selectedBuilding) {
    if (selectedBuilding.type === 'campfire') {
      return (
        <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <Button onClick={handleBackToList} variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux bâtiments
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <CampfireManager allItems={allItems} />
          </div>
        </div>
      );
    }
    if (loadingBuildingLevels) {
      return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
    }
    return <BuildingLevelEditor 
      building={selectedBuilding} 
      levels={selectedBuildingLevels}
      onLevelsChange={setSelectedBuildingLevels}
      onSave={handleSaveLevels}
      onCancel={handleBackToList}
    />;
  }

  if (loadingLevels) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex-grow overflow-y-auto">
        {isMobile ? (
          <div className="p-4 space-y-3">
            {buildings.map(building => {
              const Icon = getIconComponent(building.icon);
              const level1 = levelsData[building.type];
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
                    <p>HP: {level1?.stats?.health || 100}</p>
                    <p>Temps: {level1?.upgrade_time_seconds || 0}s</p>
                    <p>Énergie: {level1?.upgrade_cost_energy || 0}</p>
                    <p>Bois: {level1?.upgrade_cost_wood || 0}</p>
                    <p>Pierre: {level1?.upgrade_cost_metal || 0}</p>
                    <p>Composants: {level1?.upgrade_cost_components || 0}</p>
                    <p>Métal: {level1?.upgrade_cost_metal_ingots || 0}</p>
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
                <TableHead>HP (Lvl 1)</TableHead>
                <TableHead>Temps</TableHead>
                <TableHead>Énergie</TableHead>
                <TableHead>Bois</TableHead>
                <TableHead>Pierre</TableHead>
                <TableHead>Composants</TableHead>
                <TableHead>Métal</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map(building => {
                const level1 = levelsData[building.type];
                return (
                  <TableRow key={building.type} className="border-gray-700">
                    <TableCell className="font-medium flex items-center gap-2">
                      {(() => { const Icon = getIconComponent(building.icon); return <Icon className="w-5 h-5" />; })()}
                      {building.name}
                    </TableCell>
                    <TableCell>{level1?.stats?.health || 100}</TableCell>
                    <TableCell>{level1?.upgrade_time_seconds || 0}s</TableCell>
                    <TableCell>{level1?.upgrade_cost_energy || 0}</TableCell>
                    <TableCell>{level1?.upgrade_cost_wood || 0}</TableCell>
                    <TableCell>{level1?.upgrade_cost_metal || 0}</TableCell>
                    <TableCell>{level1?.upgrade_cost_components || 0}</TableCell>
                    <TableCell>{level1?.upgrade_cost_metal_ingots || 0}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleManageLevels(building)}>
                        <Wrench className="w-4 h-4 mr-2" /> Gérer les niveaux
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default BuildingManager;