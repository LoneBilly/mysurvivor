import { useState, FormEvent, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Edit, Wrench, PlusCircle, Trash2, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import * as LucideIcons from "lucide-react";
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ActionModal from '../ActionModal';

interface BuildingDefinition {
  type: string;
  name: string;
  icon: string | null;
  build_time_seconds: number;
  cost_energy: number;
  cost_wood: number;
  cost_metal: number;
  cost_components: number;
}

interface BuildingLevel {
  id?: number;
  building_type: string;
  level: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_time_seconds: number;
  stats: object;
}

interface BuildingManagerProps {
  buildings: BuildingDefinition[];
  onBuildingsUpdate: () => void;
}

const getIconComponent = (iconName: string | null) => {
  if (!iconName) return Wrench;
  const Icon = (LucideIcons as any)[iconName];
  return Icon && typeof Icon.render === 'function' ? Icon : Wrench;
};

const BuildingLevelFormModal = ({
  isOpen,
  onClose,
  onSave,
  levelData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (level: Partial<BuildingLevel>) => void;
  levelData: Partial<BuildingLevel>;
}) => {
  const [level, setLevel] = useState<Partial<BuildingLevel>>(levelData);
  const [statsString, setStatsString] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);

  useEffect(() => {
    setLevel(levelData);
    setStatsString(JSON.stringify(levelData.stats || {}, null, 2));
    setIsJsonValid(true);
  }, [levelData, isOpen]);

  const handleStatsChange = (value: string) => {
    setStatsString(value);
    try {
      JSON.parse(value);
      setIsJsonValid(true);
    } catch (e) {
      setIsJsonValid(false);
    }
  };

  const handleSave = () => {
    if (!isJsonValid) {
      showError("Le JSON des statistiques est invalide.");
      return;
    }
    onSave({ ...level, stats: JSON.parse(statsString) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/80 backdrop-blur-md border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Niveau {level.level}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Coût Bois</Label><Input type="number" value={level.upgrade_cost_wood || 0} onChange={(e) => setLevel(p => ({...p, upgrade_cost_wood: parseInt(e.target.value, 10)}))} /></div>
            <div><Label>Coût Pierre</Label><Input type="number" value={level.upgrade_cost_metal || 0} onChange={(e) => setLevel(p => ({...p, upgrade_cost_metal: parseInt(e.target.value, 10)}))} /></div>
            <div><Label>Coût Composants</Label><Input type="number" value={level.upgrade_cost_components || 0} onChange={(e) => setLevel(p => ({...p, upgrade_cost_components: parseInt(e.target.value, 10)}))} /></div>
            <div><Label>Temps (s)</Label><Input type="number" value={level.upgrade_time_seconds || 0} onChange={(e) => setLevel(p => ({...p, upgrade_time_seconds: parseInt(e.target.value, 10)}))} /></div>
          </div>
          <div>
            <Label>Statistiques (JSON)</Label>
            <Textarea value={statsString} onChange={(e) => handleStatsChange(e.target.value)} rows={8} className={!isJsonValid ? 'border-red-500' : ''} />
            {!isJsonValid && <p className="text-red-400 text-sm mt-1">JSON invalide</p>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!isJsonValid}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BuildingFormModal = ({
  isOpen,
  onClose,
  building,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  building: BuildingDefinition | null;
  onSave: () => void;
}) => {
  const [editingBuilding, setEditingBuilding] = useState<Partial<BuildingDefinition> | null>(null);
  const [levels, setLevels] = useState<BuildingLevel[]>([]);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<BuildingLevel> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingBuilding(building ? { ...building } : { name: '', type: '', icon: '', build_time_seconds: 60, cost_energy: 0, cost_wood: 0, cost_metal: 0, cost_components: 0 });
      if (building) {
        fetchLevels(building.type);
      } else {
        setLevels([]);
      }
    }
  }, [isOpen, building]);

  const fetchLevels = async (buildingType: string) => {
    const { data, error } = await supabase.from('building_levels').select('*').eq('building_type', buildingType).order('level');
    if (error) showError("Erreur de chargement des niveaux.");
    else setLevels(data || []);
  };

  const handleInputChange = (field: keyof BuildingDefinition, value: string) => {
    if (!editingBuilding) return;
    const isNumeric = !['name', 'icon', 'type'].includes(field);
    setEditingBuilding({ ...editingBuilding, [field]: isNumeric ? parseInt(value, 10) || 0 : value });
  };

  const handleSaveBuilding = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    setLoading(true);
    const { error } = building
      ? await supabase.from('building_definitions').update(editingBuilding).eq('type', building.type)
      : await supabase.from('building_definitions').insert(editingBuilding as BuildingDefinition);
    
    if (error) showError(error.message);
    else {
      showSuccess(`Bâtiment ${building ? 'mis à jour' : 'créé'}.`);
      onSave();
      onClose();
    }
    setLoading(false);
  };

  const handleSaveLevel = async (levelData: Partial<BuildingLevel>) => {
    if (!editingBuilding?.type) return;
    const payload = { ...levelData, building_type: editingBuilding.type };
    const { error } = await supabase.from('building_levels').upsert(payload);
    if (error) showError(error.message);
    else {
      showSuccess("Niveau sauvegardé.");
      fetchLevels(editingBuilding.type);
      setIsLevelModalOpen(false);
    }
  };

  const handleDeleteLevel = async (levelId: number) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce niveau ?")) {
      const { error } = await supabase.from('building_levels').delete().eq('id', levelId);
      if (error) showError(error.message);
      else {
        showSuccess("Niveau supprimé.");
        if (editingBuilding?.type) fetchLevels(editingBuilding.type);
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <DialogTitle>{building ? `Modifier ${building.name}` : 'Créer un bâtiment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBuilding} className="flex-grow overflow-y-auto space-y-4 p-1">
            <Card>
              <CardHeader><CardTitle>Informations de base</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div><Label>Type (ID unique)</Label><Input value={editingBuilding?.type || ''} onChange={(e) => handleInputChange('type', e.target.value)} disabled={!!building} required /></div>
                <div><Label>Nom</Label><Input value={editingBuilding?.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} required /></div>
                <div><Label>Icône</Label><Input value={editingBuilding?.icon || ''} onChange={(e) => handleInputChange('icon', e.target.value)} /></div>
                <div><Label>Temps (s)</Label><Input type="number" value={editingBuilding?.build_time_seconds || 0} onChange={(e) => handleInputChange('build_time_seconds', e.target.value)} /></div>
                <div><Label>Coût Énergie</Label><Input type="number" value={editingBuilding?.cost_energy || 0} onChange={(e) => handleInputChange('cost_energy', e.target.value)} /></div>
                <div><Label>Coût Bois</Label><Input type="number" value={editingBuilding?.cost_wood || 0} onChange={(e) => handleInputChange('cost_wood', e.target.value)} /></div>
                <div><Label>Coût Pierre</Label><Input type="number" value={editingBuilding?.cost_metal || 0} onChange={(e) => handleInputChange('cost_metal', e.target.value)} /></div>
                <div><Label>Coût Composants</Label><Input type="number" value={editingBuilding?.cost_components || 0} onChange={(e) => handleInputChange('cost_components', e.target.value)} /></div>
              </CardContent>
            </Card>
            {building && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Niveaux d'amélioration</CardTitle>
                  <Button type="button" size="sm" onClick={() => { setEditingLevel({ level: (levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 1) + 1, stats: {} }); setIsLevelModalOpen(true); }}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {levels.map(level => (
                    <div key={level.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                      <p className="font-bold">Niveau {level.level}</p>
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => { setEditingLevel(level); setIsLevelModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => handleDeleteLevel(level.id!)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </form>
          <DialogFooter>
            <Button type="submit" form="building-form" onClick={handleSaveBuilding} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingLevel && (
        <BuildingLevelFormModal
          isOpen={isLevelModalOpen}
          onClose={() => setIsLevelModalOpen(false)}
          levelData={editingLevel}
          onSave={handleSaveLevel}
        />
      )}
    </>
  );
};

const BuildingManager = ({ buildings, onBuildingsUpdate }: BuildingManagerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingDefinition | null>(null);
  const isMobile = useIsMobile();

  const handleEdit = (building: BuildingDefinition) => {
    setEditingBuilding(building);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBuilding(null);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2"><Wrench /> Gestion des Bâtiments</h2>
          <Button onClick={handleCreate}><PlusCircle className="w-4 h-4 mr-2" />Créer</Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isMobile ? (
            <div className="p-4 space-y-3">
              {buildings.map(building => {
                const Icon = getIconComponent(building.icon);
                return (
                  <div key={building.type} onClick={() => handleEdit(building)} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3"><Icon className="w-6 h-6" /><p className="font-bold text-white">{building.name}</p></div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(building); }}><Edit className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm"><TableHead>Nom</TableHead><TableHead>Temps</TableHead><TableHead>Énergie</TableHead><TableHead>Bois</TableHead><TableHead>Pierre</TableHead><TableHead>Composants</TableHead><TableHead className="w-[100px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {buildings.map(building => (
                  <TableRow key={building.type} className="border-gray-700">
                    <TableCell className="font-medium flex items-center gap-2">{(() => { const Icon = getIconComponent(building.icon); return <Icon className="w-5 h-5" />; })()}{building.name}</TableCell>
                    <TableCell>{building.build_time_seconds}s</TableCell><TableCell>{building.cost_energy}</TableCell><TableCell>{building.cost_wood}</TableCell><TableCell>{building.cost_metal}</TableCell><TableCell>{building.cost_components}</TableCell>
                    <TableCell><Button variant="outline" size="sm" onClick={() => handleEdit(building)}><Edit className="w-4 h-4 mr-2" /> Modifier</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <BuildingFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} building={editingBuilding} onSave={onBuildingsUpdate} />
    </>
  );
};

export default BuildingManager;