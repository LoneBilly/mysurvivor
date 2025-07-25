import React, { useState, useEffect, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BuildingLevel } from '@/types/game';
import { showError } from '@/utils/toast';
import { PlusCircle, Trash2 } from 'lucide-react';

interface LevelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (levelData: Partial<BuildingLevel>) => void;
  buildingType: string;
  levelData?: BuildingLevel | null;
  existingLevels: number[];
}

const PREDEFINED_STATS = [
  { key: 'storage_slots', label: 'Slots de stockage (Coffre)', type: 'number' },
  { key: 'crafting_speed_modifier_percentage', label: 'Vitesse de fabrication % (Établi, Forge)', type: 'number' },
  { key: 'damage', label: 'Dégâts (Pièges, Tourelles)', type: 'number' },
  { key: 'health', label: 'Points de vie (Murs, etc.)', type: 'number' },
  { key: 'energy_regen_per_second', label: 'Régénération d\'énergie/sec (Lit)', type: 'number' },
];

const LevelFormModal = ({ isOpen, onClose, onSave, buildingType, levelData, existingLevels }: LevelFormModalProps) => {
  const [level, setLevel] = useState<Partial<BuildingLevel>>({});
  const [statsList, setStatsList] = useState<{ id: number; key: string; value: any }[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (levelData) {
        setLevel(levelData);
        const initialStats = levelData.stats || {};
        const statsArray = Object.entries(initialStats).map(([key, value], index) => ({
          id: index,
          key,
          value,
        }));
        setStatsList(statsArray);
      } else {
        const nextLevel = Math.max(0, ...existingLevels.filter(l => l !== levelData?.level)) + 1;
        setLevel({ level: nextLevel, building_type: buildingType });
        setStatsList([]);
      }
    }
  }, [isOpen, levelData, existingLevels, buildingType]);

  const handleInputChange = (field: keyof BuildingLevel, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setLevel(prev => ({ ...prev, [field]: numValue }));
    } else if (value === '') {
      setLevel(prev => ({ ...prev, [field]: 0 }));
    }
  };

  const handleAddStat = () => {
    setStatsList(prev => [...prev, { id: Date.now(), key: '', value: '' }]);
  };

  const handleStatChange = (id: number, field: 'key' | 'value', newValue: any) => {
    setStatsList(prev => prev.map(stat => {
      if (stat.id === id) {
        const newStat = { ...stat, [field]: newValue };
        if (field === 'key') {
          newStat.value = 0;
        }
        return newStat;
      }
      return stat;
    }));
  };

  const handleRemoveStat = (id: number) => {
    setStatsList(prev => prev.filter(stat => stat.id !== id));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!level.level || (existingLevels.includes(level.level) && level.level !== levelData?.level)) {
      showError("Ce numéro de niveau est déjà utilisé ou est invalide.");
      return;
    }
    
    const finalStats = statsList.reduce((acc, stat) => {
      if (stat.key.trim() !== '') {
        const value = Number(stat.value);
        if (!isNaN(value)) {
          acc[stat.key] = value;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    const finalLevelData = { ...level, stats: finalStats };
    onSave(finalLevelData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{levelData ? `Modifier le Niveau ${levelData.level}` : 'Ajouter un Niveau'}</DialogTitle>
          <DialogDescription>Définissez les coûts et les statistiques pour ce niveau.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label>Niveau</Label>
            <Input type="number" value={level.level || ''} onChange={(e) => handleInputChange('level', e.target.value)} required min="1" disabled={levelData?.level === 1} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Coût Énergie</Label><Input type="number" value={level.upgrade_cost_energy || ''} onChange={(e) => handleInputChange('upgrade_cost_energy', e.target.value)} placeholder="0" /></div>
            <div><Label>Temps (secondes)</Label><Input type="number" value={level.upgrade_time_seconds || ''} onChange={(e) => handleInputChange('upgrade_time_seconds', e.target.value)} placeholder="0" /></div>
            <div><Label>Coût Bois</Label><Input type="number" value={level.upgrade_cost_wood || ''} onChange={(e) => handleInputChange('upgrade_cost_wood', e.target.value)} placeholder="0" /></div>
            <div><Label>Coût Pierre</Label><Input type="number" value={level.upgrade_cost_metal || ''} onChange={(e) => handleInputChange('upgrade_cost_metal', e.target.value)} placeholder="0" /></div>
            <div><Label>Coût Composants</Label><Input type="number" value={level.upgrade_cost_components || ''} onChange={(e) => handleInputChange('upgrade_cost_components', e.target.value)} placeholder="0" /></div>
            <div><Label>Coût Métal (lingots)</Label><Input type="number" value={level.upgrade_cost_metal_ingots || ''} onChange={(e) => handleInputChange('upgrade_cost_metal_ingots', e.target.value)} placeholder="0" /></div>
          </div>
          <div>
            <Label>Statistiques</Label>
            <div className="space-y-2 rounded-lg border border-slate-700 p-3">
              {statsList.map((stat) => (
                <div key={stat.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Clé</Label>
                    <select
                      value={stat.key}
                      onChange={(e) => handleStatChange(stat.id, 'key', e.target.value)}
                      className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg text-white text-sm"
                    >
                      <option value="" disabled>Choisir une stat...</option>
                      {PREDEFINED_STATS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Valeur</Label>
                    <Input
                      type="number"
                      value={stat.value || ''}
                      onChange={(e) => handleStatChange(stat.id, 'value', e.target.value)}
                      className="bg-white/5 border-white/20"
                      disabled={!stat.key}
                    />
                  </div>
                  <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveStat(stat.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddStat} className="w-full mt-2">
                <PlusCircle className="w-4 h-4 mr-2" /> Ajouter une statistique
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Sauvegarder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LevelFormModal;