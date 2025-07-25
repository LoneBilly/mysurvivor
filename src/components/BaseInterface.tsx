"use client";

import { useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadCrossbowModal } from './LoadCrossbowModal';
import { FullPlayerData, BaseConstruction } from '@/types/types';
import { RotateCcw, Trash2, ChevronsUp, Zap, Hammer, Shield, Package, HelpCircle } from 'lucide-react';

const BASE_GRID_SIZE = 10;

interface BaseInterfaceProps {
  playerData: FullPlayerData | null;
  refetchPlayerData: () => void;
  isLoading: boolean;
}

export function BaseInterface({ playerData, refetchPlayerData, isLoading }: BaseInterfaceProps) {
  const [selectedConstruction, setSelectedConstruction] = useState<{ x: number; y: number } | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<{x: number, y: number}[]>([]);
  const [isLoadCrossbowModalOpen, setLoadCrossbowModalOpen] = useState(false);
  const { toast } = useToast();

  const baseConstructions = playerData?.baseConstructions || [];

  const grid = useMemo(() => {
    const newGrid: (BaseConstruction | null)[][] = Array(BASE_GRID_SIZE).fill(null).map(() => Array(BASE_GRID_SIZE).fill(null));
    baseConstructions.forEach(c => {
      if (c.x >= 0 && c.x < BASE_GRID_SIZE && c.y >= 0 && c.y < BASE_GRID_SIZE) {
        newGrid[c.y][c.x] = c;
      }
    });
    return newGrid;
  }, [baseConstructions]);

  const getConstructionAt = (x: number, y: number) => {
    return baseConstructions.find(c => c.x === x && c.y === y);
  };

  const handleCellClick = (x: number, y: number) => {
    const construction = getConstructionAt(x, y);
    setSelectedConstruction(construction ? { x, y } : null);

    if (construction?.type === 'arbalete') {
      const newHighlighted: {x: number, y: number}[] = [];
      const { rotation } = construction;
      const range = 3;
      
      let dx = 0, dy = 0;
      if (rotation === 0) dy = -1; // Up
      else if (rotation === 1) dx = 1; // Right
      else if (rotation === 2) dy = 1; // Down
      else if (rotation === 3) dx = -1; // Left

      for (let i = 1; i <= range; i++) {
        const hx = x + i * dx;
        const hy = y + i * dy;
        if (hx >= 0 && hx < BASE_GRID_SIZE && hy >= 0 && hy < BASE_GRID_SIZE) {
          newHighlighted.push({ x: hx, y: hy });
        }
      }
      setHighlightedCells(newHighlighted);
    } else {
      setHighlightedCells([]);
    }
  };

  const handleRpcCall = async (rpcName: string, params: any, successMessage: string) => {
    const { error } = await supabase.rpc(rpcName, params);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: successMessage });
      refetchPlayerData();
    }
  };

  const handleRotate = (c: BaseConstruction) => handleRpcCall('rotate_building', { p_construction_id: c.id, p_direction: (c.rotation + 1) % 4 }, 'Rotation effectuée.');
  const handleDemolish = (c: BaseConstruction) => handleRpcCall('demolish_building_to_foundation', { p_x: c.x, p_y: c.y }, 'Bâtiment démoli.');
  const handleUpgrade = (c: BaseConstruction) => handleRpcCall('start_building_upgrade', { p_construction_id: c.id }, 'Amélioration démarrée.');
  const handleArmCrossbow = (c: BaseConstruction) => handleRpcCall('arm_crossbow', { p_construction_id: c.id }, 'Arbalète armée.');
  const handleArmTrap = (c: BaseConstruction) => handleRpcCall('arm_trap', { p_construction_id: c.id }, 'Piège armé.');
  const handleClaimTrapLoot = (c: BaseConstruction) => handleRpcCall('claim_trap_loot', { p_construction_id: c.id }, 'Butin récupéré.');

  const selectedConstructionData = selectedConstruction ? getConstructionAt(selectedConstruction.x, selectedConstruction.y) : null;

  const getBuildingIcon = (type: string) => {
      switch(type) {
          case 'foundation': return <div className="w-8 h-8 bg-gray-500 rounded-sm" />;
          case 'workbench': return <Hammer className="w-8 h-8 text-yellow-600" />;
          case 'chest': return <Package className="w-8 h-8 text-amber-700" />;
          case 'campfire': return <Zap className="w-8 h-8 text-orange-500" />;
          case 'arbalete': return <Shield className="w-8 h-8 text-red-600" />;
          case 'piège': return <div className="w-8 h-8 text-green-600">T</div>;
          default: return <HelpCircle className="w-8 h-8 text-gray-400" />;
      }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Votre Base</CardTitle>
            <CardDescription>Cliquez sur une case pour interagir avec une construction.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {grid.map((row, y) => (
                <div key={y} className="flex">
                  {row.map((cell, x) => {
                    const isHighlighted = highlightedCells.some(hCell => hCell.x === x && hCell.y === y);
                    const isSelected = selectedConstruction?.x === x && selectedConstruction?.y === y;
                    return (
                      <button
                        key={`${x}-${y}`}
                        onClick={() => handleCellClick(x, y)}
                        className={cn(
                          "w-12 h-12 sm:w-16 sm:h-16 border border-gray-700 flex items-center justify-center bg-gray-800/50 hover:bg-gray-700/50 transition-colors",
                          isHighlighted && 'bg-red-500/30',
                          isSelected && 'ring-2 ring-blue-400 z-10'
                        )}
                      >
                        {cell && (
                            <div style={{ transform: `rotate(${cell.rotation * 90}deg)` }}>
                                {getBuildingIcon(cell.type)}
                            </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
            <CardDescription>Informations sur la construction sélectionnée.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedConstructionData ? (
              <div>
                <h3 className="font-bold text-lg capitalize">{selectedConstructionData.type} (Niv. {selectedConstructionData.level})</h3>
                
                {selectedConstructionData.type === 'arbalete' && (
                  <div className="mt-2 space-y-3">
                    <p>Flèches: <span className="font-bold">{selectedConstructionData.building_state?.arrow_quantity || 0}</span></p>
                    <p>Statut: <span className="font-bold">{selectedConstructionData.building_state?.is_armed ? 'Armée' : 'Désarmée'}</span></p>
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => setLoadCrossbowModalOpen(true)}>Charger des flèches</Button>
                      <Button onClick={() => handleArmCrossbow(selectedConstructionData)} disabled={(selectedConstructionData.building_state?.arrow_quantity || 0) === 0 || selectedConstructionData.building_state?.is_armed}>Armer</Button>
                      <Button onClick={() => handleRotate(selectedConstructionData)}><RotateCcw className="w-4 h-4 mr-2" />Pivoter</Button>
                      <Button onClick={() => handleUpgrade(selectedConstructionData)}><ChevronsUp className="w-4 h-4 mr-2" />Améliorer</Button>
                      <Button variant="destructive" onClick={() => handleDemolish(selectedConstructionData)}><Trash2 className="w-4 h-4 mr-2" />Détruire</Button>
                    </div>
                  </div>
                )}

                {selectedConstructionData.type === 'piège' && (
                  <div className="mt-2 space-y-3">
                    <p>Statut: <span className="font-bold capitalize">{selectedConstructionData.building_state?.status || 'Prêt'}</span></p>
                    {selectedConstructionData.output_item_id && <p>Butin: <span className="font-bold">Prêt à être collecté</span></p>}
                    <div className="flex flex-col gap-2">
                      {(!selectedConstructionData.building_state || selectedConstructionData.building_state?.status === 'disarmed') && <Button onClick={() => handleArmTrap(selectedConstructionData)}>Armer le piège</Button>}
                      {selectedConstructionData.output_item_id && <Button onClick={() => handleClaimTrapLoot(selectedConstructionData)}>Récupérer le butin</Button>}
                      <Button onClick={() => handleUpgrade(selectedConstructionData)}><ChevronsUp className="w-4 h-4 mr-2" />Améliorer</Button>
                      <Button variant="destructive" onClick={() => handleDemolish(selectedConstructionData)}><Trash2 className="w-4 h-4 mr-2" />Détruire</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>Aucune construction sélectionnée.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <LoadCrossbowModal
        isOpen={isLoadCrossbowModalOpen}
        onClose={() => setLoadCrossbowModalOpen(false)}
        playerData={playerData}
        crossbow={selectedConstructionData}
        refetchPlayerData={refetchPlayerData}
      />
    </div>
  );
}