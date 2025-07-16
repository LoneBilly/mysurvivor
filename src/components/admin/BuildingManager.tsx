import { useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, Edit, Wrench } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import * as LucideIcons from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';

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

const BuildingManager = () => {
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingDefinition | null>(null);
  const isMobile = useIsMobile();

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('building_definitions').select('*').order('name');
    if (error) {
      showError("Impossible de charger les bâtiments.");
    } else {
      setBuildings(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const handleEdit = (building: BuildingDefinition) => {
    setEditingBuilding({ ...building });
    setIsModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;

    setLoading(true);
    const { type, ...updateData } = editingBuilding;
    const { error } = await supabase.from('building_definitions').update(updateData).eq('type', type);
    
    if (error) {
      showError("Erreur lors de la mise à jour.");
    } else {
      showSuccess("Bâtiment mis à jour.");
      setIsModalOpen(false);
      fetchBuildings();
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof BuildingDefinition, value: string) => {
    if (!editingBuilding) return;
    const isNumeric = ['build_time_seconds', 'cost_energy', 'cost_wood', 'cost_metal', 'cost_components'].includes(field);
    setEditingBuilding({
      ...editingBuilding,
      [field]: isNumeric ? parseInt(value, 10) || 0 : value,
    });
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Wrench;
    const Icon = (LucideIcons as any)[iconName];
    return Icon && typeof Icon.render === 'function' ? Icon : Wrench;
  };

  if (loading && !buildings.length) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex-grow overflow-y-auto">
          {isMobile ? (
            <div className="p-4 space-y-3">
              {buildings.map(building => {
                const Icon = getIconComponent(building.icon);
                return (
                  <div key={building.type} onClick={() => handleEdit(building)} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6" />
                        <p className="font-bold text-white">{building.name}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(building); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-300">
                      <p>Temps: {building.build_time_seconds}s</p>
                      <p>Énergie: {building.cost_energy}</p>
                      <p>Bois: {building.cost_wood}</p>
                      <p>Pierre: {building.cost_metal}</p>
                      <p>Composants: {building.cost_components}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead>Nom</TableHead>
                  <TableHead>Temps</TableHead>
                  <TableHead>Énergie</TableHead>
                  <TableHead>Bois</TableHead>
                  <TableHead>Pierre</TableHead>
                  <TableHead>Composants</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map(building => (
                  <TableRow key={building.type} className="border-gray-700">
                    <TableCell className="font-medium flex items-center gap-2">
                      {(() => { const Icon = getIconComponent(building.icon); return <Icon className="w-5 h-5" />; })()}
                      {building.name}
                    </TableCell>
                    <TableCell>{building.build_time_seconds}s</TableCell>
                    <TableCell>{building.cost_energy}</TableCell>
                    <TableCell>{building.cost_wood}</TableCell>
                    <TableCell>{building.cost_metal}</TableCell>
                    <TableCell>{building.cost_components}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(building)}>
                        <Edit className="w-4 h-4 mr-2" /> Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {editingBuilding && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
            <DialogHeader>
              <DialogTitle>Modifier {editingBuilding.name}</DialogTitle>
              <DialogDescription>Ajustez les coûts et le temps de construction.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="py-4 grid grid-cols-2 gap-4">
              <div><Label>Nom</Label><Input value={editingBuilding.name} onChange={(e) => handleInputChange('name', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <div><Label>Icône</Label><Input value={editingBuilding.icon || ''} onChange={(e) => handleInputChange('icon', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <div><Label>Temps (s)</Label><Input type="number" value={editingBuilding.build_time_seconds} onChange={(e) => handleInputChange('build_time_seconds', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <div><Label>Coût Énergie</Label><Input type="number" value={editingBuilding.cost_energy} onChange={(e) => handleInputChange('cost_energy', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <div><Label>Coût Bois</Label><Input type="number" value={editingBuilding.cost_wood} onChange={(e) => handleInputChange('cost_wood', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <div><Label>Coût Pierre</Label><Input type="number" value={editingBuilding.cost_metal} onChange={(e) => handleInputChange('cost_metal', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <div><Label>Coût Composants</Label><Input type="number" value={editingBuilding.cost_components} onChange={(e) => handleInputChange('cost_components', e.target.value)} className="bg-white/5 border-white/20" /></div>
              <DialogFooter className="col-span-2 mt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BuildingManager;