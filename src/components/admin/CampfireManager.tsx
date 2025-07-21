import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import ActionModal from '../ActionModal';

interface CampfireConfig {
  id: number;
  base_wood_consumption_per_minute: number;
}

interface CampfireFuel {
  id: number;
  item_id: number;
  multiplier: number;
}

interface CampfireManagerProps {
  allItems: Item[];
  onUpdate: () => void;
}

const CampfireManager = ({ allItems, onUpdate }: CampfireManagerProps) => {
  const [config, setConfig] = useState<CampfireConfig | null>(null);
  const [fuels, setFuels] = useState<CampfireFuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingFuel, setIsEditingFuel] = useState<Partial<CampfireFuel> | null>(null);
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; description: string }>({ isOpen: false, onConfirm: () => {}, title: '', description: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [configRes, fuelsRes] = await Promise.all([
      supabase.from('campfire_config').select('*').single(),
      supabase.from('campfire_fuels').select('*'),
    ]);

    if (configRes.error) showError("Erreur de chargement de la configuration.");
    else setConfig(configRes.data);

    if (fuelsRes.error) showError("Erreur de chargement des combustibles.");
    else setFuels(fuelsRes.data || []);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfigSave = async () => {
    if (!config) return;
    const { error } = await supabase.from('campfire_config').update({ base_wood_consumption_per_minute: config.base_wood_consumption_per_minute }).eq('id', config.id);
    if (error) showError("Erreur de sauvegarde.");
    else showSuccess("Configuration sauvegardée.");
  };

  const handleFuelSave = async () => {
    if (!isEditingFuel || !isEditingFuel.item_id) {
      showError("Veuillez sélectionner un objet.");
      return;
    }
    const { id, ...fuelData } = isEditingFuel;
    const query = id ? supabase.from('campfire_fuels').update(fuelData).eq('id', id) : supabase.from('campfire_fuels').insert(fuelData as any);
    
    const { error } = await query;
    if (error) showError("Erreur de sauvegarde du combustible.");
    else {
      showSuccess("Combustible sauvegardé.");
      setIsEditingFuel(null);
      fetchData();
    }
  };

  const handleDeleteFuel = (fuel: CampfireFuel) => {
    setActionModal({
      isOpen: true,
      title: "Confirmer la suppression",
      description: `Voulez-vous vraiment supprimer ce combustible ?`,
      onConfirm: async () => {
        const { error } = await supabase.from('campfire_fuels').delete().eq('id', fuel.id);
        if (error) showError("Erreur de suppression.");
        else {
          showSuccess("Combustible supprimé.");
          fetchData();
        }
        setActionModal({ isOpen: false, onConfirm: () => {}, title: '', description: '' });
      }
    });
  };

  const getItemName = (itemId: number) => allItems.find(item => item.id === itemId)?.name || 'Inconnu';

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Configuration du Feu de Camp</CardTitle>
          <CardDescription>Paramètres généraux du feu de camp.</CardDescription>
        </CardHeader>
        <CardContent>
          {config && (
            <div className="flex items-end gap-4">
              <div className="flex-grow">
                <Label>Consommation de bois par minute</Label>
                <Input
                  type="number"
                  value={config.base_wood_consumption_per_minute}
                  onChange={(e) => setConfig(c => c ? { ...c, base_wood_consumption_per_minute: Number(e.target.value) } : null)}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <Button onClick={handleConfigSave}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Combustibles</CardTitle>
          <CardDescription>Gérez les objets pouvant être utilisés comme combustible.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            {isEditingFuel ? (
              <div className="p-4 border border-blue-500/50 rounded-lg bg-blue-500/10 space-y-4">
                <h4 className="font-semibold">{isEditingFuel.id ? 'Modifier' : 'Ajouter'} un combustible</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Objet</Label>
                    <select
                      value={isEditingFuel.item_id || ''}
                      onChange={(e) => setIsEditingFuel(prev => ({...prev, item_id: Number(e.target.value)}))}
                      disabled={!!isEditingFuel.id}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
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
                      value={isEditingFuel.multiplier || 1}
                      onChange={(e) => setIsEditingFuel(prev => ({...prev, multiplier: Number(e.target.value)}))}
                      className="bg-gray-800 border-gray-600"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleFuelSave}>Sauvegarder</Button>
                  <Button variant="ghost" onClick={() => setIsEditingFuel(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsEditingFuel({ item_id: undefined, multiplier: 1 })}><PlusCircle className="w-4 h-4 mr-2" />Ajouter un combustible</Button>
            )}
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Objet</TableHead><TableHead>Multiplicateur</TableHead><TableHead className="w-[100px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {fuels.map(fuel => (
                <TableRow key={fuel.id}>
                  <TableCell>{getItemName(fuel.item_id)}</TableCell>
                  <TableCell>{fuel.multiplier}x</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingFuel(fuel)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteFuel(fuel)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ActionModal isOpen={actionModal.isOpen} onClose={() => setActionModal({...actionModal, isOpen: false})} {...actionModal} />
    </div>
  );
};

export default CampfireManager;