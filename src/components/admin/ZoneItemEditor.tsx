import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Search } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Item, ZoneItem, ZoneItemEditorProps } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';

const ZoneItemEditor = ({ zone, onBack }: ZoneItemEditorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [spawnChances, setSpawnChances] = useState<Map<number, number>>(new Map());
  const [initialZoneItems, setInitialZoneItems] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const debouncedSpawnChances = useDebounce(spawnChances, 1500);
  const isInitialMount = useRef(true);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const itemsToUpsert: ZoneItem[] = [];
    const itemIdsToDelete: number[] = [];
    const newInitialItemsState: ZoneItem[] = [];

    const initialChances = new Map(initialZoneItems.map(i => [i.item_id, i.spawn_chance]));
    const allItemIds = new Set([...initialChances.keys(), ...spawnChances.keys()]);

    allItemIds.forEach(itemId => {
      const initialChance = initialChances.get(itemId);
      const currentChance = spawnChances.get(itemId);

      if (currentChance !== undefined && currentChance > 0) {
        if (currentChance !== initialChance) {
          itemsToUpsert.push({ zone_id: zone.id, item_id: itemId, spawn_chance: currentChance });
        }
        newInitialItemsState.push({ zone_id: zone.id, item_id: itemId, spawn_chance: currentChance });
      } else {
        if (initialChance !== undefined) {
          itemIdsToDelete.push(itemId);
        }
      }
    });

    if (itemsToUpsert.length === 0 && itemIdsToDelete.length === 0) {
      setIsSaving(false);
      return;
    }

    try {
      const promises = [];
      if (itemsToUpsert.length > 0) promises.push(supabase.from('zone_items').upsert(itemsToUpsert));
      if (itemIdsToDelete.length > 0) promises.push(supabase.from('zone_items').delete().eq('zone_id', zone.id).in('item_id', itemIdsToDelete));
      
      const results = await Promise.all(promises);
      for (const res of results) { if (res.error) throw res.error; }

      setInitialZoneItems(newInitialItemsState);
      showSuccess("Probabilités sauvegardées.");
    } catch (error: any) {
      showError("Erreur de sauvegarde des probabilités.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [zone.id, spawnChances, initialZoneItems]);

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

        const sortedItems = (itemsRes.data || []).sort((a, b) => a.name.localeCompare(b.name));
        setItems(sortedItems);
        
        const initialData = zoneItemsRes.data || [];
        setInitialZoneItems(initialData);
        const chancesMap = new Map<number, number>();
        initialData.forEach(zi => chancesMap.set(zi.item_id, zi.spawn_chance));
        setSpawnChances(chancesMap);

      } catch (error: any) {
        showError("Erreur de chargement.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [zone.id]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    handleSave();
  }, [debouncedSpawnChances, handleSave]);

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

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800/50 border-gray-700 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle className="text-2xl">Édition de la zone : {zone.type}</CardTitle>
              <CardDescription className="text-gray-400">Modifiez les probabilités d'apparition des objets (0-100%).</CardDescription>
            </div>
          </div>
          <div className="text-sm text-gray-400 h-6">
            {isSaving && <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde...</div>}
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un objet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900/50 border-gray-600 pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
            {filteredItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-md">
                <label htmlFor={`item-${item.id}`} className="text-base">{item.name}</label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`item-${item.id}`}
                    type="number"
                    min="0" max="100"
                    value={spawnChances.get(item.id) || ''}
                    onChange={(e) => handleChanceChange(item.id, e.target.value)}
                    className="w-24 bg-gray-800 border-gray-600 text-white text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ZoneItemEditor;