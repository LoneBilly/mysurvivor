import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Search, Plus } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { showSuccess, showError } from '@/utils/toast';
import { Item, ZoneItem, ZoneItemEditorProps } from '@/types/admin';
import IconPickerModal from './IconPickerModal';
import ItemFormModal from './ItemFormModal';

const ZoneItemEditor = ({ zone, onBack }: ZoneItemEditorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [spawnChances, setSpawnChances] = useState<Map<number, number>>(new Map());
  const initialZoneItemsRef = useRef<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneName, setZoneName] = useState(zone.type);
  const initialZoneNameRef = useRef(zone.type);
  const [zoneIcon, setZoneIcon] = useState(zone.icon);
  const initialZoneIconRef = useRef(zone.icon);

  const [searchTerm, setSearchTerm] = useState('');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const handleSaveProbabilities = useCallback(async () => {
    const initialChances = new Map(initialZoneItemsRef.current.map(i => [i.item_id, i.spawn_chance]));
    const currentChances = new Map<number, number>();
    for (const [key, value] of spawnChances.entries()) {
      if (value > 0) {
        currentChances.set(key, value);
      }
    }

    let areMapsEqual = initialChances.size === currentChances.size;
    if (areMapsEqual) {
      for (const [key, value] of initialChances.entries()) {
        if (currentChances.get(key) !== value) {
          areMapsEqual = false;
          break;
        }
      }
    }

    if (areMapsEqual) {
      return;
    }

    const itemsToUpsert: ZoneItem[] = [];
    const itemIdsToDelete: number[] = [];

    for (const [itemId, chance] of currentChances.entries()) {
      if (initialChances.get(itemId) !== chance) {
        itemsToUpsert.push({ zone_id: zone.id, item_id: itemId, spawn_chance: chance });
      }
    }

    for (const [itemId] of initialChances.entries()) {
      if (!currentChances.has(itemId)) {
        itemIdsToDelete.push(itemId);
      }
    }

    try {
      const promises = [];
      if (itemsToUpsert.length > 0) {
        promises.push(supabase.from('zone_items').upsert(itemsToUpsert, { onConflict: 'zone_id,item_id' }));
      }
      if (itemIdsToDelete.length > 0) {
        promises.push(supabase.from('zone_items').delete().eq('zone_id', zone.id).in('item_id', itemIdsToDelete));
      }
      
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        for (const res of results) { if (res.error) throw res.error; }
        showSuccess("Probabilités sauvegardées.");
      }

      initialZoneItemsRef.current = Array.from(currentChances.entries()).map(([itemId, chance]) => ({
        zone_id: zone.id,
        item_id: itemId,
        spawn_chance: chance
      }));

    } catch (error: any) {
      showError("Erreur de sauvegarde des probabilités.");
      console.error(error);
    }
  }, [zone.id, spawnChances]);

  const handleZoneNameSave = async () => {
    if (zoneName === initialZoneNameRef.current) return;

    const { error } = await supabase.from('map_layout').update({ type: zoneName }).eq('id', zone.id);

    if (error) {
      showError("Erreur de mise à jour du nom.");
      setZoneName(initialZoneNameRef.current);
    } else {
      showSuccess("Nom de la zone mis à jour.");
      initialZoneNameRef.current = zoneName;
    }
  };

  const handleZoneIconSave = async (iconName: string) => {
    if (iconName === initialZoneIconRef.current) return;

    const { error } = await supabase.from('map_layout').update({ icon: iconName }).eq('id', zone.id);

    if (error) {
      showError("Erreur de mise à jour de l'icône.");
      setZoneIcon(initialZoneIconRef.current);
    } else {
      showSuccess("Icône de la zone mise à jour.");
      setZoneIcon(iconName);
      initialZoneIconRef.current = iconName;
    }
  };

  const fetchItemsAndZoneItems = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, zoneItemsRes] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('zone_items').select('*').eq('zone_id', zone.id)
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (zoneItemsRes.error) throw itemsRes.error;

      const sortedItems = (itemsRes.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setItems(sortedItems);
      
      const initialData = zoneItemsRes.data || [];
      initialZoneItemsRef.current = initialData;
      const chancesMap = new Map<number, number>();
      initialData.forEach(zi => chancesMap.set(zi.item_id, zi.spawn_chance));
      setSpawnChances(chancesMap);

    } catch (error: any) {
      showError("Erreur de chargement.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [zone.id]);

  useEffect(() => {
    fetchItemsAndZoneItems();
  }, [zone.id, fetchItemsAndZoneItems]);

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

  const handleEditItem = (itemToEdit: Item) => {
    setEditingItem(itemToEdit);
    setIsItemFormModalOpen(true);
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setIsItemFormModalOpen(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Correction ici : Vérifie si zoneIcon est une chaîne valide et existe dans LucideIcons
  const CurrentIconComponent = zoneIcon && typeof zoneIcon === 'string' && (LucideIcons as any)[zoneIcon]
    ? (LucideIcons as any)[zoneIcon]
    : LucideIcons.Map; // Icône par défaut si l'icône de la zone est invalide ou nulle

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800/50 border-gray-700 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <div className="flex items-baseline gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsIconPickerOpen(true)} className="p-0 h-auto w-auto text-gray-300 hover:text-white">
                  {CurrentIconComponent && <CurrentIconComponent className="w-6 h-6" />}
                </Button>
                <Input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  onBlur={handleZoneNameSave}
                  className="text-2xl font-bold bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-gray-500 p-0 h-auto"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un objet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900/50 border-gray-600 pl-10"
          />
          <Button onClick={handleCreateItem} variant="outline" size="icon" className="bg-gray-700 border-gray-600 hover:bg-gray-600">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
            {filteredItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-md">
                <Button variant="link" onClick={() => handleEditItem(item)} className="p-0 h-auto text-base text-white hover:text-blue-400">
                  {item.name}
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    id={`item-${item.id}`}
                    type="number"
                    min="0" max="100"
                    value={spawnChances.get(item.id) || ''}
                    onChange={(e) => handleChanceChange(item.id, e.target.value)}
                    onBlur={handleSaveProbabilities}
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

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentIcon={zoneIcon}
        onSelectIcon={handleZoneIconSave}
      />

      <ItemFormModal
        isOpen={isItemFormModalOpen}
        onClose={() => setIsItemFormModalOpen(false)}
        item={editingItem}
        onSave={fetchItemsAndZoneItems}
      />
    </Card>
  );
};

export default ZoneItemEditor;