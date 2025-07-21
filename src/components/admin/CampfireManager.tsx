import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';

interface CampfireFuel {
  id: number;
  item_id: number;
  multiplier: number;
  items: { name: string };
}

const CampfireManager = ({ allItems }: { allItems: Item[] }) => {
  const [consumption, setConsumption] = useState(1);
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newFuel, setNewFuel] = useState<{ item_id: string; multiplier: string }>({ item_id: '', multiplier: '1.0' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [configRes, fuelsRes] = await Promise.all([
      supabase.from('campfire_config').select('*').limit(1).single(),
      supabase.from('campfire_fuels').select('*, items(name)')
    ]);

    if (configRes.error || fuelsRes.error) {
      showError("Erreur de chargement de la configuration.");
    } else {
      setConsumption(configRes.data?.base_wood_consumption_per_minute || 1);
      setFuels(fuelsRes.data as CampfireFuel[] || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = async () => {
    const { error } = await supabase.from('campfire_config').update({ base_wood_consumption_per_minute: consumption }).eq('id', 1);
    if (error) showError("Erreur de sauvegarde.");
    else showSuccess("Configuration sauvegardée.");
  };

  const handleAddFuel = async () => {
    if (!newFuel.item_id) {
      showError("Veuillez sélectionner un objet.");
      return;
    }
    const { error } = await supabase.from('campfire_fuels').insert({
      item_id: Number(newFuel.item_id),
      multiplier: Number(newFuel.multiplier)
    });
    if (error) {
      showError("Erreur: cet objet est peut-être déjà un combustible.");
    } else {
      showSuccess("Combustible ajouté.");
      setIsAdding(false);
      setNewFuel({ item_id: '', multiplier: '1.0' });
      fetchData();
    }
  };

  const handleDeleteFuel = async (id: number) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce combustible ?")) {
      const { error } = await supabase.from('campfire_fuels').delete().eq('id', id);
      if (error) showError("Erreur de suppression.");
      else {
        showSuccess("Combustible supprimé.");
        fetchData();
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <div className="space-y-6 p-4">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Configuration Générale</CardTitle>
          <CardDescription>Paramètres de base du feu de camp.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="flex-grow">
            <Label htmlFor="consumption">Consommation de bois par minute</Label>
            <Input id="consumption" type="number" value={consumption} onChange={(e) => setConsumption(Number(e.target.value))} className="mt-1" />
          </div>
          <Button onClick={handleSaveConfig}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Combustibles Autorisés</CardTitle>
          <CardDescription>Gérez les objets pouvant être utilisés comme combustible et leur efficacité.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Objet</TableHead>
                <TableHead>Multiplicateur (vs Bois)</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuels.map(fuel => (
                <TableRow key={fuel.id}>
                  <TableCell>{fuel.items.name}</TableCell>
                  <TableCell>{fuel.multiplier}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteFuel(fuel.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {isAdding && (
                <TableRow>
                  <TableCell>
                    <select value={newFuel.item_id} onChange={(e) => setNewFuel(prev => ({ ...prev, item_id: e.target.value }))} className="w-full p-2 bg-gray-900 border border-gray-600 rounded">
                      <option value="">Sélectionner un objet</option>
                      {allItems.filter(item => !fuels.some(f => f.item_id === item.id)).map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.1" value={newFuel.multiplier} onChange={(e) => setNewFuel(prev => ({ ...prev, multiplier: e.target.value }))} />
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" onClick={handleAddFuel}>Ajouter</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>X</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="mt-4">
              <PlusCircle className="w-4 h-4 mr-2" /> Ajouter un combustible
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CampfireManager;