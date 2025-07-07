import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Item, ZoneItem, ZoneItemEditorProps } from '@/types/admin';

const ZoneItemEditor = ({ zone, onBack }: ZoneItemEditorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [spawnChances, setSpawnChances] = useState<Map<number, number>>(new Map());
  const [initialZoneItems, setInitialZoneItems] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsRes, zoneItemsRes] = await Promise.all([
          supabase.from('items').select('*'),
          supabase.from('zone_items').select('*').eq('zone_id', zone.id)
        ]);

        if (itemsRes.error) throw itemsRes.error;
        if (zoneItemsRes.error) throw zoneItemsRes.error;

        setItems(itemsRes.data || []);
        setInitialZoneItems(zoneItemsRes.data || []);

        const chancesMap = new Map<number, number>();
        (zoneItemsRes.data || []).forEach(zi => {
          chancesMap.set(zi.item_id, zi.spawn_chance);
        });
        setSpawnChances(chancesMap);

      } catch (error: any) {
        showError("Erreur lors du chargement des données.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [zone.id]);

  const handleChanceChange = (itemId: number, chance: string) => {
    const newChances = new Map(spawnChances);
    const value = parseInt(chance, 10);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      newChances.set(itemId, value);
    } else if (chance === '') {
      newChances.delete(itemId);
    }
    setSpawnChances(newChances);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const itemsToUpsert: ZoneItem[] = [];
    const itemIdsToDelete: number[] = [];

    // Déterminer les upserts
    spawnChances.forEach((chance, itemId) => {
      if (chance > 0) {
        itemsToUpsert.push({ zone_id: zone.id, item_id: itemId, spawn_chance: chance });
      }
    });

    // Déterminer les suppressions
    initialZoneItems.forEach(initialItem => {
      const currentChance = spawnChances.get(initialItem.item_id);
      if (currentChance === undefined || currentChance === 0) {
        itemIdsToDelete.push(initialItem.item_id);
      }
    });

    try {
      const promises = [];
      if (itemsToUpsert.length > 0) {
        promises.push(supabase.from('zone_items').upsert(itemsToUpsert));
      }
      if (itemIdsToDelete.length > 0) {
        promises.push(supabase.from('zone_items').delete().eq('zone_id', zone.id).in('item_id', itemIdsToDelete));
      }

      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res.error) throw res.error;
      });

      showSuccess("Probabilités de spawn mises à jour !");
      // Mettre à jour l'état initial pour la prochaine sauvegarde
      const { data: newZoneItems } = await supabase.from('zone_items').select('*').eq('zone_id', zone.id);
      setInitialZoneItems(newZoneItems || []);

    } catch (error: any) {
      showError("Erreur lors de la sauvegarde.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800/50 border-gray-700 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Édition de la zone : {zone.type}</CardTitle>
            <CardDescription className="text-gray-400">Définissez les probabilités d'apparition des objets (0-100%).</CardDescription>
          </div>
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-md">
                <Label htmlFor={`item-${item.id}`} className="text-base">
                  {item.name}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`item-${item.id}`}
                    type="number"
                    min="0"
                    max="100"
                    value={spawnChances.get(item.id) || ''}
                    onChange={(e) => handleChanceChange(item.id, e.target.value)}
                    className="w-24 bg-gray-800 border-gray-600 text-white text-right"
                    placeholder="0"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving || loading} className="w-full bg-green-600 hover:bg-green-700">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sauvegarder les changements
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ZoneItemEditor;