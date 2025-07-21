import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input';
import { Label } from "@/components/ui/label';
import { BuildingLevel } from '@/types/admin';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2 } from 'lucide-react';

interface LevelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: BuildingLevel | null;
  buildingType: string;
  onSave: () => void;
}

const statKeys = [
  'bonus_recolte_bois_pourcentage',
  'bonus_recolte_pierre_pourcentage',
  'bonus_recolte_viande_pourcentage',
  'extra_slots',
  'max_capacity',
  'production_rate',
  'energy_regen_per_second',
];

const LevelFormModal = ({ isOpen, onClose, levelData, buildingType, onSave }: LevelFormModalProps) => {
  const [level, setLevel] = useState(1);
  const [costs, setCosts] = useState({ wood: 0, metal: 0, components: 0, energy: 0, metal_ingots: 0 });
  const [time, setTime] = useState(0);
  const [stats, setStats] = useState<{ id: number; key: string; value: string; }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (levelData) {
      setLevel(levelData.level);
      setCosts({
        wood: levelData.upgrade_cost_wood,
        metal: levelData.upgrade_cost_metal,
        components: levelData.upgrade_cost_components,
        energy: levelData.upgrade_cost_energy,
        metal_ingots: levelData.upgrade_cost_metal_ingots,
      });
      setTime(levelData.upgrade_time_seconds);
      setStats(levelData.stats ? Object.entries(levelData.stats).map(([key, value], index) => ({ id: index, key, value: String(value) })) : []);
    } else {
      // Reset for new level
      setLevel(1);
      setCosts({ wood: 0, metal: 0, components: 0, energy: 0, metal_ingots: 0 });
      setTime(0);
      setStats([]);
    }
  }, [levelData]);

  const handleStatChange = (id: number, field: 'key' | 'value', value: string) => {
    setStats(stats.map(stat => stat.id === id ? { ...stat, [field]: value } : stat));
  };

  const addStat = () => {
    setStats([...stats, { id: Date.now(), key: '', value: '' }]);
  };

  const removeStat = (id: number) => {
    setStats(stats.filter(stat => stat.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const statsObject = stats.reduce((acc, stat) => {
      if (stat.key) {
        acc[stat.key] = isNaN(Number(stat.value)) ? stat.value : Number(stat.value);
      }
      return acc;
    }, {} as Record<string, string | number>);

    const dataToSave = {
      building_type: buildingType,
      level: level,
      upgrade_cost_wood: costs.wood,
      upgrade_cost_metal: costs.metal,
      upgrade_cost_components: costs.components,
      upgrade_cost_energy: costs.energy,
      upgrade_cost_metal_ingots: costs.metal_ingots,
      upgrade_time_seconds: time,
      stats: statsObject,
    };

    let error;
    if (levelData?.id) {
      const { error: updateError } = await supabase.from('building_levels').update(dataToSave).eq('id', levelData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('building_levels').insert(dataToSave);
      error = insertError;
    }

    if (error) {
      showError(`Erreur lors de la sauvegarde: ${error.message}`);
    } else {
      showSuccess('Niveau sauvegardé avec succès.');
      onSave();
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{levelData ? `Modifier le niveau ${levelData.level}` : 'Ajouter un niveau'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Niveau</Label>
            <Input type="number" value={level} onChange={(e) => setLevel(parseInt(e.target.value))} className="bg-white/5 border-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Coût Bois</Label><Input type="number" value={costs.wood} onChange={(e) => setCosts(c => ({ ...c, wood: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" /></div>
            <div><Label>Coût Pierre</Label><Input type="number" value={costs.metal} onChange={(e) => setCosts(c => ({ ...c, metal: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" /></div>
            <div><Label>Coût Composants</Label><Input type="number" value={costs.components} onChange={(e) => setCosts(c => ({ ...c, components: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" /></div>
            <div><Label>Coût Lingots</Label><Input type="number" value={costs.metal_ingots} onChange={(e) => setCosts(c => ({ ...c, metal_ingots: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" /></div>
            <div><Label>Coût Énergie</Label><Input type="number" value={costs.energy} onChange={(e) => setCosts(c => ({ ...c, energy: parseInt(e.target.value) }))} className="bg-white/5 border-white/20" /></div>
            <div><Label>Temps (sec)</Label><Input type="number" value={time} onChange={(e) => setTime(parseInt(e.target.value))} className="bg-white/5 border-white/20" /></div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-2">Statistiques</h4>
            {stats.map(stat => (
              <div key={stat.id} className="flex items-end gap-2 mb-2">
                <div className="flex-1">
                  <Label className="text-xs">Clé</Label>
                  <select
                    value={stat.key}
                    onChange={(e) => handleStatChange(stat.id, 'key', e.target.value)}
                    className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white text-sm"
                  >
                    <option value="">Sélectionner une clé</option>
                    {statKeys.map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Valeur</Label>
                  <Input value={stat.value} onChange={(e) => handleStatChange(stat.id, 'value', e.target.value)} className="bg-white/5 border-white/20" />
                </div>
                <Button variant="destructive" size="icon" onClick={() => removeStat(stat.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button onClick={addStat} variant="outline" className="mt-2 w-full">Ajouter une statistique</Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LevelFormModal;