import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { BuildingLevel } from '@/types/game';
import LevelFormModal from './LevelFormModal';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface BuildingDefinition {
  type: string;
  name: string;
}

interface BuildingLevelEditorProps {
  building: BuildingDefinition;
  onBack: () => void;
}

const BuildingLevelEditor = ({ building, onBack }: BuildingLevelEditorProps) => {
  const [levels, setLevels] = useState<BuildingLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<BuildingLevel | null>(null);
  const isMobile = useIsMobile();

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('building_levels')
      .select('*')
      .eq('building_type', building.type)
      .order('level');
    
    if (error) showError("Erreur de chargement des niveaux.");
    else setLevels(data || []);
    setLoading(false);
  }, [building.type]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const handleAddNewLevel = () => {
    setEditingLevel(null);
    setIsModalOpen(true);
  };

  const handleEditLevel = (level: BuildingLevel) => {
    setEditingLevel(level);
    setIsModalOpen(true);
  };

  const handleSaveLevel = async (levelData: Partial<BuildingLevel>) => {
    const { id, ...dataToSave } = levelData;
    const query = id
      ? supabase.from('building_levels').update(dataToSave).eq('id', id)
      : supabase.from('building_levels').insert(dataToSave as any);

    const { error } = await query;
    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess(`Niveau ${id ? 'mis à jour' : 'créé'}.`);
      setIsModalOpen(false);
      fetchLevels();
    }
  };

  const handleDeleteLevel = async (levelId: number) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce niveau ?")) {
      const { error } = await supabase.from('building_levels').delete().eq('id', levelId);
      if (error) showError("Erreur de suppression.");
      else {
        showSuccess("Niveau supprimé.");
        fetchLevels();
      }
    }
  };

  return (
    <>
      <Card className="w-full h-full flex flex-col bg-gray-800/50 border-gray-700 text-white">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle>Niveaux pour : {building.name}</CardTitle>
              <CardDescription>Configurez les améliorations pour ce bâtiment.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewLevel}><PlusCircle className="w-4 h-4 mr-2" /> Ajouter un niveau</Button>
          </div>
          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : isMobile ? (
            <div className="space-y-4">
              {levels.map(level => (
                <div key={level.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xl font-bold">Niveau {level.level}</h4>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEditLevel(level)}><Edit className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteLevel(level.id!)} disabled={level.level === 1}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-semibold text-gray-400">Temps:</span> {level.upgrade_time_seconds}s</p>
                    <div>
                      <p className="font-semibold text-gray-400">Coûts:</p>
                      <ul className="list-disc list-inside pl-2 text-gray-300">
                        <li>Énergie: {level.upgrade_cost_energy}</li>
                        <li>Bois: {level.upgrade_cost_wood}</li>
                        <li>Pierre: {level.upgrade_cost_metal}</li>
                        <li>Composants: {level.upgrade_cost_components}</li>
                        <li>Métal: {level.upgrade_cost_metal_ingots}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-400">Stats:</p>
                      <pre className="text-xs bg-black/20 p-2 rounded-md max-w-full overflow-x-auto"><code>{JSON.stringify(level.stats, null, 2)}</code></pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Coûts</TableHead>
                  <TableHead>Temps</TableHead>
                  <TableHead>Stats (JSON)</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map(level => (
                  <TableRow key={level.id}>
                    <TableCell className="font-bold text-lg">{level.level}</TableCell>
                    <TableCell className="text-xs">
                      <p>Énergie: {level.upgrade_cost_energy}</p>
                      <p>Bois: {level.upgrade_cost_wood}</p>
                      <p>Pierre: {level.upgrade_cost_metal}</p>
                      <p>Composants: {level.upgrade_cost_components}</p>
                      <p>Métal: {level.upgrade_cost_metal_ingots}</p>
                    </TableCell>
                    <TableCell>{level.upgrade_time_seconds}s</TableCell>
                    <TableCell><pre className="text-xs bg-black/20 p-2 rounded-md max-w-xs overflow-x-auto"><code>{JSON.stringify(level.stats, null, 2)}</code></pre></TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEditLevel(level)}><Edit className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteLevel(level.id!)} disabled={level.level === 1}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <LevelFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLevel}
        buildingType={building.type}
        levelData={editingLevel}
        existingLevels={levels.map(l => l.level)}
      />
    </>
  );
};

export default BuildingLevelEditor;