import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building, BuildingLevel } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowUp, X, Heart } from 'lucide-react';
import { useGameStore } from '@/stores/use-game-store';
import { showSuccess, showError } from '@/utils/toast';
import { formatTime } from '@/utils/format-time';
import { ResourceList } from './ResourceList';

interface BuildingDetailsProps {
  building: Building;
  onClose: () => void;
}

const BuildingDetails = ({ building, onClose }: BuildingDetailsProps) => {
  const [levelData, setLevelData] = useState<BuildingLevel | null>(null);
  const [nextLevelData, setNextLevelData] = useState<BuildingLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { resources, subtractResources, fetchResources } = useGameStore();

  useEffect(() => {
    const fetchLevelData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('building_levels')
        .select('*')
        .eq('building_type', building.type)
        .in('level', [building.level, building.level + 1]);

      if (error) {
        showError("Erreur de chargement des données du bâtiment.");
      } else {
        setLevelData(data.find(d => d.level === building.level) || null);
        setNextLevelData(data.find(d => d.level === building.level + 1) || null);
      }
      setLoading(false);
    };

    fetchLevelData();
  }, [building.type, building.level]);

  const upgradeCost = useMemo(() => {
    if (!nextLevelData) return [];
    return [
      { resource: 'energy', amount: nextLevelData.upgrade_cost_energy },
      { resource: 'wood', amount: nextLevelData.upgrade_cost_wood },
      { resource: 'metal', amount: nextLevelData.upgrade_cost_metal },
      { resource: 'components', amount: nextLevelData.upgrade_cost_components },
      { resource: 'metal_ingots', amount: nextLevelData.upgrade_cost_metal_ingots },
    ].filter(c => c.amount > 0);
  }, [nextLevelData]);

  const canAffordUpgrade = useMemo(() => {
    if (!nextLevelData) return false;
    return upgradeCost.every(cost => (resources[cost.resource] || 0) >= cost.amount);
  }, [upgradeCost, resources, nextLevelData]);

  const handleUpgrade = async () => {
    if (!nextLevelData || !canAffordUpgrade) return;
    setIsUpgrading(true);
    
    try {
      await subtractResources(upgradeCost);
      
      const { error } = await supabase
        .from('buildings')
        .update({ 
          level: building.level + 1,
          upgrade_finish_time: new Date(Date.now() + nextLevelData.upgrade_time_seconds * 1000).toISOString()
        })
        .eq('id', building.id);

      if (error) throw error;

      showSuccess("Amélioration lancée !");
      fetchResources(); // Refresh resources in UI
      onClose(); // Close modal after starting upgrade
    } catch (error: any) {
      showError(error.message || "Erreur lors de l'amélioration.");
      // TODO: Implement resource refund logic if upgrade fails after subtraction
    } finally {
      setIsUpgrading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!levelData) {
    return <div className="p-4">Données du bâtiment introuvables.</div>;
  }

  return (
    <Card className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{levelData.name} - Nv. {building.level}</CardTitle>
            <CardDescription>{levelData.description}</CardDescription>
          </div>
          {levelData.stats?.health && (
            <div className="flex items-center gap-2 text-lg font-bold text-red-400 bg-black/20 px-3 py-1 rounded-lg">
              <Heart className="w-5 h-5" />
              <span>{levelData.stats.health}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {nextLevelData ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Prochain niveau: {nextLevelData.level}</h3>
              <p className="text-sm text-slate-300 mb-2">{nextLevelData.description}</p>
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-slate-400">Coût de l'amélioration :</h4>
                  <ResourceList costs={upgradeCost} resources={resources} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-400">Temps d'amélioration :</h4>
                  <p className="text-slate-200">{formatTime(nextLevelData.upgrade_time_seconds)}</p>
                </div>
              </div>
            </div>
            <Button onClick={handleUpgrade} disabled={!canAffordUpgrade || isUpgrading} className="w-full">
              {isUpgrading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUp className="w-4 h-4 mr-2" />}
              {canAffordUpgrade ? "Lancer l'amélioration" : "Ressources insuffisantes"}
            </Button>
          </div>
        ) : (
          <p className="text-center font-semibold text-green-400">Niveau maximum atteint !</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BuildingDetails;