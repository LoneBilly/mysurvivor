import React, { useState, useEffect, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BuildingLevel } from '@/types/admin';
import { showError } from '@/utils/toast';

interface LevelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (levelData: Partial<BuildingLevel>) => void;
  buildingType: string;
  levelData?: BuildingLevel | null;
  existingLevels: number[];
}

const LevelFormModal = ({ isOpen, onClose, onSave, buildingType, levelData, existingLevels }: LevelFormModalProps) => {
  const [level, setLevel] = useState<Partial<BuildingLevel>>({});
  const [statsJson, setStatsJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (levelData) {
        setLevel(levelData);
        setStatsJson(JSON.stringify(levelData.stats || {}, null, 2));
      } else {
        const nextLevel = Math.max(0, ...existingLevels.filter(l => l !== levelData?.level)) + 1;
        setLevel({ level: nextLevel, building_type: buildingType });
        setStatsJson('{}');
      }
      setJsonError('');
    }
  }, [isOpen, levelData, existingLevels, buildingType]);

  const handleStatsChange = (value: string) => {
    setStatsJson(value);
    try {
      JSON.parse(value);
      setJsonError('');
    } catch (e) {
      setJsonError('JSON invalide');
    }
  };

  const handleInputChange = (field: keyof BuildingLevel, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setLevel(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (jsonError) {
      showError('Veuillez corriger le JSON dans les statistiques.');
      return;
    }
    if (!level.level || (existingLevels.includes(level.level) && level.level !== levelData?.level)) {
      showError("Ce numéro de niveau est déjà utilisé ou est invalide.");
      return;
    }
    const finalLevelData = { ...level, stats: JSON.parse(statsJson || '{}') };
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
            <Input type="number" value={level.level || ''} onChange={(e) => handleInputChange('level', e.target.value)} required min="1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Coût Bois</Label><Input type="number" value={level.upgrade_cost_wood || ''} onChange={(e) => handleInputChange('upgrade_cost_wood', e.target.value)} placeholder="0" /></div>
            <div><Label>Coût Pierre</Label><Input type="number" value={level.upgrade_cost_metal || ''} onChange={(e) => handleInputChange('upgrade_cost_metal', e.target.value)} placeholder="0" /></div>
            <div><Label>Coût Composants</Label><Input type="number" value={level.upgrade_cost_components || ''} onChange={(e) => handleInputChange('upgrade_cost_components', e.target.value)} placeholder="0" /></div>
            <div><Label>Temps (secondes)</Label><Input type="number" value={level.upgrade_time_seconds || ''} onChange={(e) => handleInputChange('upgrade_time_seconds', e.target.value)} placeholder="0" /></div>
          </div>
          <div>
            <Label>Statistiques (JSON)</Label>
            <Textarea value={statsJson} onChange={(e) => handleStatsChange(e.target.value)} rows={8} className="font-mono text-sm" />
            {jsonError && <p className="text-red-400 text-sm mt-1">{jsonError}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!!jsonError}>Sauvegarder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LevelFormModal;