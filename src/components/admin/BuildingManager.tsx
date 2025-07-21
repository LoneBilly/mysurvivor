"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BuildingDefinition, BuildingLevel } from "@/types/building";
import { toast } from "sonner";
import { getIconComponent } from "@/utils/getIconComponent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BuildingLevelManager from "./BuildingLevelManager";

export default function BuildingManager() {
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);
  const [levels, setLevels] = useState<BuildingLevel[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const buildingsPromise = supabase
      .from('building_definitions')
      .select('*')
      .order('name', { ascending: true });
      
    const levelsPromise = supabase
      .from('building_levels')
      .select('*')
      .order('level', { ascending: true });

    const [{ data: buildingsData, error: buildingsError }, { data: levelsData, error: levelsError }] = await Promise.all([buildingsPromise, levelsPromise]);

    if (buildingsError) {
      toast.error("Erreur lors de la récupération des bâtiments.", { description: buildingsError.message });
    } else {
      setBuildings(buildingsData || []);
    }

    if (levelsError) {
      toast.error("Erreur lors de la récupération des niveaux.", { description: levelsError.message });
    } else {
      setLevels(levelsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectBuilding = (building: BuildingDefinition) => {
    setSelectedBuilding(building);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement des données...</div>;
  }

  const renderBuilding = (building: BuildingDefinition) => {
    const Icon = getIconComponent(building.icon);
    return (
      <Card 
        key={building.type} 
        onClick={() => handleSelectBuilding(building)}
        className={`cursor-pointer transition-all hover:shadow-md hover:border-primary ${selectedBuilding?.type === building.type ? 'border-primary ring-2 ring-primary' : ''}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{building.name}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            Type: {building.type}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Gestion des Bâtiments</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xl font-semibold">Liste des bâtiments</h3>
            <p className="text-sm text-muted-foreground">
                Cliquez sur un bâtiment pour gérer ses niveaux d'amélioration.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {buildings.map(renderBuilding)}
            </div>
        </div>

        <div className="lg:col-span-2">
          {selectedBuilding ? (
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Niveaux pour : <span className="text-primary">{selectedBuilding.name}</span>
              </h3>
              <BuildingLevelManager
                building={selectedBuilding}
                levels={levels.filter(l => l.building_type === selectedBuilding.type)}
                onUpdate={fetchData}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg bg-muted/40 min-h-[300px]">
                <p className="text-muted-foreground text-center">Sélectionnez un bâtiment pour commencer à configurer ses niveaux.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}