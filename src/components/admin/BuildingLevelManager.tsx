import { useState } from 'react';
import { BuildingDefinition, BuildingLevel } from '@/types/building';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Edit } from 'lucide-react';

interface Props {
  building: BuildingDefinition;
  levels: BuildingLevel[];
  onUpdate: () => void;
}

const emptyLevel: Omit<BuildingLevel, 'id' | 'stats'> & { stats: any } = {
  building_type: '',
  level: 2,
  upgrade_cost_wood: 0,
  upgrade_cost_metal: 0,
  upgrade_cost_components: 0,
  upgrade_time_seconds: 0,
  stats: {},
};

export default function BuildingLevelManager({ building, levels, onUpdate }: Props) {
  const [editingLevel, setEditingLevel] = useState<BuildingLevel | (Omit<BuildingLevel, 'id'> & { stats: any }) | null>(null);
  const [statsJson, setStatsJson] = useState('');

  const handleAddNew = () => {
    const nextLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 2;
    const newLevel = {
      ...emptyLevel,
      building_type: building.type,
      level: nextLevel,
    };
    setEditingLevel(newLevel);
    setStatsJson(JSON.stringify(newLevel.stats, null, 2));
  };

  const handleEdit = (level: BuildingLevel) => {
    setEditingLevel(level);
    setStatsJson(JSON.stringify(level.stats, null, 2));
  };

  const handleDelete = async (levelId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce niveau ?')) return;

    const { error } = await supabase.from('building_levels').delete().eq('id', levelId);

    if (error) {
      toast.error('Erreur lors de la suppression du niveau.', { description: error.message });
    } else {
      toast.success('Niveau supprimé avec succès.');
      onUpdate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;

    let stats;
    try {
      stats = JSON.parse(statsJson);
    } catch (error) {
      toast.error('Le JSON des statistiques est invalide.');
      return;
    }

    const { id, ...levelData } = 'id' in editingLevel ? editingLevel : { id: null, ...editingLevel };

    const dataToUpsert = { ...levelData, stats };

    const promise = id
      ? supabase.from('building_levels').update(dataToUpsert).eq('id', id)
      : supabase.from('building_levels').insert(dataToUpsert);

    toast.promise(promise, {
        loading: 'Enregistrement en cours...',
        success: () => {
            onUpdate();
            setEditingLevel(null);
            setStatsJson('');
            return 'Niveau enregistré avec succès.';
        },
        error: (err) => `Erreur: ${err.message}`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Niveaux existants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {levels.map(level => (
              <div key={level.id} className="flex items-center justify-between p-2 border rounded-md bg-background">
                <p className="font-semibold">Niveau {level.level}</p>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(level)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(level.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {levels.length === 0 && <p className="text-muted-foreground">Aucun niveau d'amélioration défini pour ce bâtiment.</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddNew}>Ajouter un niveau</Button>
        </CardFooter>
      </Card>

      {editingLevel && (
        <Card>
          <CardHeader>
            <CardTitle>{'id' in editingLevel ? `Modifier le niveau ${editingLevel.level}` : 'Ajouter un nouveau niveau'}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="level">Niveau</Label>
                <Input
                  id="level"
                  type="number"
                  value={editingLevel.level}
                  onChange={(e) => setEditingLevel({ ...editingLevel, level: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cost_wood">Coût Bois</Label>
                  <Input
                    id="cost_wood"
                    type="number"
                    value={editingLevel.upgrade_cost_wood}
                    onChange={(e) => setEditingLevel({ ...editingLevel, upgrade_cost_wood: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_metal">Coût Pierre</Label>
                  <Input
                    id="cost_metal"
                    type="number"
                    value={editingLevel.upgrade_cost_metal}
                    onChange={(e) => setEditingLevel({ ...editingLevel, upgrade_cost_metal: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_components">Coût Composants</Label>
                  <Input
                    id="cost_components"
                    type="number"
                    value={editingLevel.upgrade_cost_components}
                    onChange={(e) => setEditingLevel({ ...editingLevel, upgrade_cost_components: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="upgrade_time">Temps d'amélioration (secondes)</Label>
                <Input
                  id="upgrade_time"
                  type="number"
                  value={editingLevel.upgrade_time_seconds}
                  onChange={(e) => setEditingLevel({ ...editingLevel, upgrade_time_seconds: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="stats">Statistiques (JSON)</Label>
                <Textarea
                  id="stats"
                  rows={8}
                  value={statsJson}
                  onChange={(e) => setStatsJson(e.target.value)}
                  placeholder='{ "slots": 15, "craft_speed_multiplier": 1.2 }'
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Ex: {`{"slots": 20}`} pour un coffre, {`{"craft_speed_multiplier": 1.5}`} pour un établi.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button type="button" variant="ghost" onClick={() => setEditingLevel(null)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}