import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, PlusCircle, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Item } from '@/types/admin';

interface CampfireConfig {
  id: number;
  base_wood_consumption_per_minute: number;
}

interface CampfireFuel {
  id: number;
  item_id: number;
  multiplier: number;
  items: { name: string };
}

const CampfireManager = ({ allItems }: { allItems: Item[] }) => {
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newFuel, setNewFuel] = useState<{ item_id: string; multiplier: string }>({ item_id: '', multiplier: '1.0' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [configRes, fuelsRes] = await Promise.all([
      supabase.from('campfire_config').select('*').single(),
      supabase.from('campfire_fuels').select('*, items(name)')
    ]);

    if (configRes.error) showError("Erreur de chargement de la configuration.");
    else setConfig(configRes.data);

    if (fuelsRes.error) showError("Erreur de chargement des combustibles.");
    else setFuels(fuelsRes.data as CampfireFuel[]);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (config) {
      setConfig({ ...config, base_wood_consumption_per_minute: Number(e.target.value) });
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    const { error } = await supabase.from('campfire_config').update({ base_wood_consumption_per_minute: config.base_wood_consumption_per_minute }).eq('id', config.id);
    if (error) showError("Erreur de sauvegarde.");
    else showSuccess("Configuration sauvegardée.");
    setIsSaving(false);
  };

  const handleAddFuel = async () => {
    if (!newFuel.item_id || !newFuel.multiplier) {
      showError("Veuillez sélectionner un objet et un multiplicateur.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from('campfire_fuels').insert({ item_id: Number(newFuel.item_id), multiplier: parseFloat(newFuel.multiplier) });
    if (error) showError("Erreur d'ajout.");
    else {
      showSuccess("Combustible ajouté.");
      setNewFuel({ item_id: '', multiplier: '1.0' });
      fetchData();
    }
    setIsSaving(false);
  };

  const handleDeleteFuel = async (fuelId: number) => {
    if (!window.confirm("Supprimer ce combustible ?")) return;
    const { error } = await supabase.from('campfire_fuels').delete().eq('id', fuelId);
    if (error) showError("Erreur de suppression.");
    else {
      showSuccess("Combustible supprimé.");
      fetchData();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Configuration Générale</CardTitle>
          <CardDescription>Paramètres de base du feu de camp.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-grow">
              <label htmlFor="consumption" className="text-sm font-medium text-gray-300">Consommation de bois par minute</label>
              <Input id="consumption" type="number" value={config?.base_wood_consumption_per_minute || ''} onChange={handleConfigChange} className="mt-1 bg-gray-900 border-gray-700" />
            </div>
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ml-2">Sauvegarder</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Combustibles</CardTitle>
          <CardDescription>Gérez les objets utilisables comme combustible et leur efficacité.</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{fuel.multiplier}x</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteFuel(fuel.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <select value={newFuel.item_id} onChange={(e) => setNewFuel(prev => ({...prev, item_id: e.target.value}))} className="w-full p-2 bg-gray-900 border border-gray-700 rounded">
                    <option value="">Sélectionner un objet</option>
                    {allItems.filter(item => !fuels.some(f => f.item_id === item.id)).map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.1" value={newFuel.multiplier} onChange={(e) => setNewFuel(prev => ({...prev, multiplier: e.target.value}))} className="bg-gray-900 border-gray-700" />
                </TableCell>
                <TableCell>
                  <Button onClick={handleAddFuel} disabled={isSaving}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampfireManager;