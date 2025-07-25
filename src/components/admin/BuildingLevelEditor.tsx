import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BuildingLevel } from "@/types/BuildingLevel";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BuildingLevelEditorProps {
  buildingType: string;
}

export const BuildingLevelEditor = ({ buildingType }: BuildingLevelEditorProps) => {
  const [levels, setLevels] = useState<BuildingLevel[]>([]);
  const [editedLevels, setEditedLevels] = useState<BuildingLevel[]>([]);

  useEffect(() => {
    const fetchLevels = async () => {
      if (!buildingType) return;
      const { data, error } = await supabase
        .from("building_levels")
        .select("*")
        .eq("building_type", buildingType)
        .order("level", { ascending: true });

      if (error) {
        toast.error("Erreur lors de la récupération des niveaux de bâtiment.");
        console.error(error);
      } else {
        setLevels(data as BuildingLevel[]);
        setEditedLevels(JSON.parse(JSON.stringify(data))); // Deep copy
      }
    };

    fetchLevels();
  }, [buildingType]);

  const handleLevelChange = (index: number, field: keyof Omit<BuildingLevel, 'stats' | 'id' | 'created_at' | 'building_type'>, value: string) => {
    const newLevels = [...editedLevels];
    const level = newLevels[index];
    (level[field] as any) = value === '' ? null : (typeof level[field] === 'number' ? Number(value) : value);
    setEditedLevels(newLevels);
  };

  const handleStatChange = (index: number, key: string, value: string) => {
    const newLevels = [...editedLevels];
    const currentStats = newLevels[index].stats || {};
    newLevels[index] = {
      ...newLevels[index],
      stats: {
        ...currentStats,
        [key]: value === '' ? undefined : Number(value),
      },
    };
    setEditedLevels(newLevels);
  };

  const handleSave = async () => {
    const upsertLevels = editedLevels.map(level => {
      const { id, created_at, ...rest } = level;
      if (typeof id === 'string' && id.startsWith('new-')) {
        return { ...rest, building_type: buildingType };
      }
      return { id, ...rest, building_type: buildingType };
    });

    const { error } = await supabase.from("building_levels").upsert(upsertLevels, { onConflict: 'id' });

    if (error) {
      toast.error("Erreur lors de la sauvegarde des niveaux.", { description: error.message });
      console.error(error);
    } else {
      toast.success("Niveaux sauvegardés avec succès !");
      const { data, error: fetchError } = await supabase
        .from("building_levels")
        .select("*")
        .eq("building_type", buildingType)
        .order("level", { ascending: true });
      if (fetchError) {
        toast.error("Erreur lors de la récupération des niveaux de bâtiment.");
      } else {
        setLevels(data as BuildingLevel[]);
        setEditedLevels(JSON.parse(JSON.stringify(data)));
      }
    }
  };

  const handleAddNewLevel = () => {
    const newLevel: BuildingLevel = {
      id: `new-${Date.now()}`, // Temporary ID
      building_type: buildingType,
      level: editedLevels.length > 0 ? Math.max(...editedLevels.map(l => l.level)) + 1 : 1,
      upgrade_cost_wood: 0,
      upgrade_cost_metal: 0,
      upgrade_cost_components: 0,
      upgrade_cost_metal_ingots: 0,
      upgrade_cost_energy: 0,
      upgrade_time_seconds: 0,
      stats: { health: 100 },
      created_at: new Date().toISOString(),
    };
    setEditedLevels([...editedLevels, newLevel]);
  };

  const handleDeleteLevel = async (id: number | string, index: number) => {
    if (typeof id === 'string' && id.startsWith('new-')) {
      const newLevels = editedLevels.filter((_, i) => i !== index);
      setEditedLevels(newLevels);
      return;
    }

    const { error } = await supabase.from("building_levels").delete().match({ id });
    if (error) {
      toast.error("Erreur lors de la suppression du niveau.", { description: error.message });
      console.error(error);
    } else {
      toast.success("Niveau supprimé.");
      const newLevels = editedLevels.filter(l => l.id !== id);
      setEditedLevels(newLevels);
      setLevels(levels.filter(l => l.id !== id));
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Éditeur de Niveaux pour: <span className="font-bold text-primary">{buildingType}</span></CardTitle>
        <CardDescription>Modifiez les niveaux, les coûts et les statistiques pour ce type de bâtiment.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="flex justify-end mb-4 gap-2">
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Sauvegarder</Button>
          <Button onClick={handleAddNewLevel}><PlusCircle className="w-4 h-4 mr-2" /> Ajouter un niveau</Button>
        </div>
        <div className="space-y-6">
          {editedLevels.map((level, index) => (
            <div key={level.id} className="border p-4 rounded-lg bg-background/50 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Niveau {level.level}</h3>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteLevel(level.id, index)}>
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Supprimer le niveau</span>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`level-${index}`}>Niveau</Label>
                  <Input
                    id={`level-${index}`}
                    type="number"
                    value={level.level || ''}
                    onChange={(e) => handleLevelChange(index, 'level', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`health-${index}`}>Points de vie</Label>
                  <Input
                    id={`health-${index}`}
                    type="number"
                    value={level.stats?.health || ''}
                    onChange={(e) => handleStatChange(index, 'health', e.target.value)}
                    placeholder="Ex: 100"
                  />
                </div>
                <div>
                  <Label htmlFor={`time-${index}`}>Temps d'amélioration (s)</Label>
                  <Input
                    id={`time-${index}`}
                    type="number"
                    value={level.upgrade_time_seconds || ''}
                    onChange={(e) => handleLevelChange(index, 'upgrade_time_seconds', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`energy-${index}`}>Coût Énergie</Label>
                  <Input
                    id={`energy-${index}`}
                    type="number"
                    value={level.upgrade_cost_energy || ''}
                    onChange={(e) => handleLevelChange(index, 'upgrade_cost_energy', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`wood-${index}`}>Coût Bois</Label>
                  <Input
                    id={`wood-${index}`}
                    type="number"
                    value={level.upgrade_cost_wood || ''}
                    onChange={(e) => handleLevelChange(index, 'upgrade_cost_wood', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`metal-${index}`}>Coût Pierre</Label>
                  <Input
                    id={`metal-${index}`}
                    type="number"
                    value={level.upgrade_cost_metal || ''}
                    onChange={(e) => handleLevelChange(index, 'upgrade_cost_metal', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`components-${index}`}>Coût Composants</Label>
                  <Input
                    id={`components-${index}`}
                    type="number"
                    value={level.upgrade_cost_components || ''}
                    onChange={(e) => handleLevelChange(index, 'upgrade_cost_components', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`metal-ingots-${index}`}>Coût Lingots de métal</Label>
                  <Input
                    id={`metal-ingots-${index}`}
                    type="number"
                    value={level.upgrade_cost_metal_ingots || ''}
                    onChange={(e) => handleLevelChange(index, 'upgrade_cost_metal_ingots', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};