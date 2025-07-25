import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Save, XCircle } from "lucide-react";
import { BuildingLevel } from '@/types/database';

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string | null;
}

interface BuildingLevelEditorProps {
  building: BuildingDefinition;
  levels: BuildingLevel[];
  onLevelsChange: (levels: BuildingLevel[]) => void;
  onSave: (levels: BuildingLevel[]) => void;
  onCancel: () => void;
}

const BuildingLevelEditor: React.FC<BuildingLevelEditorProps> = ({ building, levels, onLevelsChange, onSave, onCancel }) => {

  const handleLevelChange = (id: number, field: keyof BuildingLevel, value: any) => {
    const updatedLevels = levels.map(level => {
      if (level.id === id) {
        return { ...level, [field]: value };
      }
      return level;
    });
    onLevelsChange(updatedLevels);
  };

  const handleStatChange = (id: number, stat: string, value: any) => {
    const updatedLevels = levels.map(level => {
      if (level.id === id) {
        const newStats = { ...(level.stats || {}), [stat]: value ? parseInt(value, 10) : undefined };
        // Remove stat if value is empty or not a number
        if (!value || isNaN(parseInt(value, 10))) {
          delete newStats[stat];
        }
        return { ...level, stats: newStats };
      }
      return level;
    });
    onLevelsChange(updatedLevels);
  };

  const handleAddNewLevel = () => {
    const newLevelNumber = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 1;
    const newLevel: BuildingLevel = {
      id: Date.now(), // Temporary ID
      building_type: building.type,
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
    onLevelsChange([...levels, newLevel]);
  };

  const handleRemoveLevel = (id: number) => {
    onLevelsChange(levels.filter(level => level.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col bg-slate-800/80 backdrop-blur-sm border-slate-700 text-white">
        <CardHeader>
          <CardTitle>Édition des Niveaux pour : {building.name}</CardTitle>
          <CardDescription>Modifiez, ajoutez ou supprimez des niveaux pour ce type de bâtiment.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewLevel}><PlusCircle className="w-4 h-4 mr-2" /> Ajouter un niveau</Button>
          </div>
          {levels.sort((a, b) => a.level - b.level).map(level => (
            <div key={level.id} className="border border-slate-700 bg-slate-900/50 p-4 rounded-lg mb-4 relative">
              <Button variant="destructive" size="icon" className="absolute top-4 right-4 w-8 h-8" onClick={() => handleRemoveLevel(level.id)} disabled={level.level === 1}>
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b border-slate-700 pb-4">
                <h3 className="font-bold text-xl mb-2 md:mb-0 text-white">Niveau {level.level}</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`health-${level.id}`} className="font-semibold text-gray-200">Points de vie (HP)</Label>
                  <Input
                    id={`health-${level.id}`}
                    type="number"
                    className="w-32"
                    value={level.stats?.health || ''}
                    onChange={(e) => handleStatChange(level.id, 'health', e.target.value)}
                    placeholder="ex: 500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`wood-${level.id}`}>Coût Bois</Label>
                  <Input id={`wood-${level.id}`} type="number" value={level.upgrade_cost_wood || 0} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_wood', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`metal-${level.id}`}>Coût Pierre</Label>
                  <Input id={`metal-${level.id}`} type="number" value={level.upgrade_cost_metal || 0} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_metal', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`components-${level.id}`}>Coût Composants</Label>
                  <Input id={`components-${level.id}`} type="number" value={level.upgrade_cost_components || 0} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_components', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`metal_ingots-${level.id}`}>Coût Lingots Métal</Label>
                  <Input id={`metal_ingots-${level.id}`} type="number" value={level.upgrade_cost_metal_ingots || 0} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_metal_ingots', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`energy-${level.id}`}>Coût Énergie</Label>
                  <Input id={`energy-${level.id}`} type="number" value={level.upgrade_cost_energy || 0} onChange={(e) => handleLevelChange(level.id, 'upgrade_cost_energy', parseInt(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor={`time-${level.id}`}>Temps (secondes)</Label>
                  <Input id={`time-${level.id}`} type="number" value={level.upgrade_time_seconds || 0} onChange={(e) => handleLevelChange(level.id, 'upgrade_time_seconds', parseInt(e.target.value))} />
                </div>
              </div>

              <h4 className="font-semibold mt-4 mb-2 pt-4 border-t border-slate-700">Autres Statistiques</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                {/* Ajoutez d'autres champs de statistiques ici si nécessaire */}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="p-4 border-t border-slate-700 flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}><XCircle className="w-4 h-4 mr-2" /> Annuler</Button>
          <Button onClick={() => onSave(levels)}><Save className="w-4 h-4 mr-2" /> Sauvegarder</Button>
        </div>
      </Card>
    </div>
  );
};

export default BuildingLevelEditor;