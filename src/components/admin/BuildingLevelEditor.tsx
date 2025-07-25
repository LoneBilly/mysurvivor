import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Save, XCircle } from "lucide-react";
import { BuildingLevel } from '@/types/database';

interface BuildingLevelEditorProps {
  levels: BuildingLevel[];
  onLevelsChange: (levels: BuildingLevel[]) => void;
  onSave: () => void;
  onCancel: () => void;
  selectedBuildingType: string;
}

const BuildingLevelEditor: React.FC<BuildingLevelEditorProps> = ({ levels, onLevelsChange, onSave, onCancel, selectedBuildingType }) => {

  const handleLevelChange = (id: number, field: keyof BuildingLevel, value: any) => {
    const updatedLevels = (levels || []).map(level => {
      if (level.id === id) {
        return { ...level, [field]: value };
      }
      return level;
    });
    onLevelsChange(updatedLevels);
  };

  const handleStatChange = (id: number, stat: string, value: any) => {
    const updatedLevels = (levels || []).map(level => {
      if (level.id === id) {
        const newStats = { ...(level.stats || {}), [stat]: value ? parseInt(value, 10) : undefined };
        // Remove stat if value is empty
        if (!value) {
          delete newStats[stat];
        }
        return { ...level, stats: newStats };
      }
      return level;
    });
    onLevelsChange(updatedLevels);
  };

  const handleAddNewLevel = () => {
    const currentLevels = levels || [];
    const newLevelNumber = currentLevels.length > 0 ? Math.max(...currentLevels.map(l => l.level)) + 1 : 1;
    const newLevel: BuildingLevel = {
      id: Date.now(), // Temporary ID
      building_type: selectedBuildingType,
      level: newLevelNumber,
      upgrade_cost_wood: 0,
      upgrade_cost_metal: 0,
      upgrade_cost_components: 0,
      upgrade_cost_metal_ingots: 0,
      upgrade_cost_energy: 0,
      upgrade_time_seconds: 0,
      stats: { health: 100 }, // HP par défaut pour les nouveaux niveaux
      created_at: new Date().toISOString(),
    };
    onLevelsChange([...currentLevels, newLevel]);
  };

  const handleRemoveLevel = (id: number) => {
    onLevelsChange((levels || []).filter(level => level.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle>Édition des Niveaux pour : {selectedBuildingType}</CardTitle>
          <CardDescription>Modifiez, ajoutez ou supprimez des niveaux pour ce type de bâtiment.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewLevel}><PlusCircle className="w-4 h-4 mr-2" /> Ajouter un niveau</Button>
          </div>
          {[...(levels || [])].sort((a, b) => a.level - b.level).map(level => (
            <div key={level.id} className="border p-4 rounded-lg mb-4 relative">
              <Button variant="destructive" size="icon" className="absolute top-2 right-2 w-6 h-6" onClick={() => handleRemoveLevel(level.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <h3 className="font-bold text-lg mb-2">Niveau {level.level}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`wood-${level.id}`}>Coût Bois</Label>
                  <Input id={`wood-${level.id}`} type="number" value={level.upgrade_cost_wood} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_wood', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`metal-${level.id}`}>Coût Pierre</Label>
                  <Input id={`metal-${level.id}`} type="number" value={level.upgrade_cost_metal} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_metal', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`components-${level.id}`}>Coût Composants</Label>
                  <Input id={`components-${level.id}`} type="number" value={level.upgrade_cost_components} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_components', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`metal_ingots-${level.id}`}>Coût Lingots Métal</Label>
                  <Input id={`metal_ingots-${level.id}`} type="number" value={level.upgrade_cost_metal_ingots} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_metal_ingots', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`energy-${level.id}`}>Coût Énergie</Label>
                  <Input id={`energy-${level.id}`} type="number" value={level.upgrade_cost_energy} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_energy', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`time-${level.id}`}>Temps (secondes)</Label>
                  <Input id={`time-${level.id}`} type="number" value={level.upgrade_time_seconds} onChange={(e) => handleLevelChange(level.id, 'upgrade_time_seconds', parseInt(e.target.value))} />
                </div>
              </div>

              <h4 className="font-semibold mt-4 mb-2">Statistiques du bâtiment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`health-${level.id}`}>Points de vie (HP)</Label>
                  <Input
                    id={`health-${level.id}`}
                    type="number"
                    value={level.stats?.health || ''}
                    onChange={(e) => handleStatChange(level.id, 'health', e.target.value)}
                    placeholder="ex: 500"
                  />
                </div>
                <div>
                  <Label htmlFor={`energy_regen-${level.id}`}>Régénération Énergie / sec</Label>
                  <Input
                    id={`energy_regen-${level.id}`}
                    type="number"
                    value={level.stats?.energy_regen_per_second || ''}
                    onChange={(e) => handleStatChange(level.id, 'energy_regen_per_second', e.target.value)}
                    placeholder="ex: 1.5"
                  />
                </div>
                {/* Add more stat inputs here as needed */}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="p-4 border-t flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}><XCircle className="w-4 h-4 mr-2" /> Annuler</Button>
          <Button onClick={onSave}><Save className="w-4 h-4 mr-2" /> Sauvegarder</Button>
        </div>
      </Card>
    </div>
  );
};

export default BuildingLevelEditor;