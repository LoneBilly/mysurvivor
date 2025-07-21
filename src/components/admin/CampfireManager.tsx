import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Save, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Item } from '@/types/admin';

interface CampfireFuel {
  id: number;
  item_id: number;
  multiplier: number;
  items: { name: string };
}

const CampfireManager = ({ allItems }: { allItems: Item[] }) => {
  const [consumptionRate, setConsumptionRate] = useState(1);
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Partial<CampfireFuel> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [configRes, fuelsRes] = await Promise.all([
      supabase.from('campfire_config').select('*').limit(1).single(),
      supabase.from('campfire_fuels').select('*, items(name)')
    ]);

    if (configRes.error || fuelsRes.error) {
      showError("Erreur de chargement des données du feu de camp.");
    } else {
      setConsumptionRate(configRes.data.base_wood_consumption_per_minute);
      setFuels(fuelsRes.data as any[] || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = async () => {
    const { error } = await supabase.from('campfire_config').update({ base_wood_consumption_per_minute: consumptionRate }).eq('id', 1);
    if (error) showError("Erreur de sauvegarde.");
    else showSuccess("Configuration sauvegardée.");
  };

  const handleSaveFuel = async () => {
    if (!isEditing || !isEditing.item_id || !isEditing.multiplier) return;
    const { error } = await supabase.from('campfire_fuels').upsert({ id: isEditing.id, item_id: isEditing.item_id, multiplier: isEditing.multiplier }, { onConflict: 'item_id' });
    if (error) showError("Erreur de sauvegarde du combustible.");
    else {
      showSuccess("Combustible sauvegardé.");
      setIsEditing(null);
      fetchData();
    }
  };

  const handleDeleteFuel = async (fuelId: number) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce combustible ?")) {
      const { error } = await supabase.from('campfire_fuels').delete().eq('id', fuelId);
      if (error) showError("Erreur de suppression.");
      else {
        showSuccess("Combustible supprimé.");
        fetchData();
      }
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle>Configuration Générale</CardTitle>
          <CardDescription>Définissez la vitesse de combustion de base du feu de camp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Consommation de bois par minute</Label>
            <Input type="number" value={consumptionRate} onChange={(e) => setConsumptionRate(Number(e.target.value))} />
          </div>
          <Button onClick={handleSaveConfig}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/50 border-gray-700 flex flex-col">
        <CardHeader>
          <CardTitle>Gestion des Combustibles</CardTitle>
          <CardDescription>Le bois a un multiplicateur de 1.0. Les autres sont relatifs.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Objet</TableHead>
                <TableHead>Multiplicateur</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuels.map(fuel => (
                <TableRow key={fuel.id}>
                  <TableCell>{fuel.items.name}</TableCell>
                  <TableCell>{fuel.multiplier}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setIsEditing(fuel)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteFuel(fuel.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={() => setIsEditing({})} className="mt-4 w-full"><PlusCircle className="w-4 h-4 mr-2" />Ajouter un combustible</Button>
        </CardContent>
      </Card>

      {isEditing && (
        <Dialog open={!!isEditing} onOpenChange={() => setIsEditing(null)}>
          <DialogContent className="bg-slate-800/90 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>{isEditing.id ? 'Modifier' : 'Ajouter'} un combustible</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Objet</Label>
                <select
                  value={isEditing.item_id || ''}
                  onChange={(e) => setIsEditing(prev => ({ ...prev, item_id: Number(e.target.value) }))}
                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded"
                  disabled={!!isEditing.id}
                >
                  <option value="">Sélectionner un objet</option>
                  {allItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Multiplicateur</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={isEditing.multiplier || 1.0}
                  onChange={(e) => setIsEditing(prev => ({ ...prev, multiplier: Number(e.target.value) }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(null)}>Annuler</Button>
              <Button onClick={handleSaveFuel}>Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CampfireManager;