import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, ArrowLeft, Search, Plus, PackagePlus, Percent } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { showSuccess, showError } from '@/utils/toast';
import { Item, ZoneItem, ZoneItemEditorProps } from '@/types/admin';
import IconPickerModal from './IconPickerModal';
import ItemFormModal from './ItemFormModal';

const ZoneItemEditor = ({ zone, onBack }: ZoneItemEditorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [spawnChances, setSpawnChances] = useState<Map<number, number>>(new Map());
  const [spawnQuantities, setSpawnQuantities] = useState<Map<number, number>>(new Map());
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

  const handleSaveItemSettings = useCallback(async (itemId: number) => {
    const chance = spawnChances.get(itemId) || 0;
    const quantity = spawnQuantities.get(itemId) || 1;

    const initialItem = initialZoneItemsRef.current.find(i => i.item_id === itemId);
    const initialChance = initialItem?.spawn_chance ?? 0;
    const initialQuantity = initialItem?.max_quantity ?? 1;

    if (chance === initialChance && quantity === initialQuantity) {
      return; // No changes
    }

    try {
      if (chance > 0) {
        const { error } = await supabase.from('zone_items').upsert({
          zone_id: zone.id,
          item_id: itemId,
          spawn_chance: chance,
          max_quantity: quantity
        }, { onConflict: 'zone_id,item_id' });
        if (error) throw error;
      } else if (initialChance > 0) {
        const { error } = await supabase.from('zone_items').delete().eq('zone_id', zone.id).eq('item_id', itemId);
        if (error) throw error;
      }
      
      const newItemRef = [...initialZoneItemsRef.current];
      const index = newItemRef.findIndex(i => i.item_id === itemId);
      if (chance > 0) {
        const updatedItemData = { zone_id: zone.id, item_id: itemId, spawn_chance: chance, max_quantity: quantity };
        if (index > -1) {
          newItemRef[index] = { ...newItemRef[index], ...updatedItemData };
        } else {
          newItemRef.push(updatedItemData);
        }
      } else if (index > -1) {
        newItemRef.splice(index, 1);
      }
      initialZoneItemsRef.current = newItemRef;

      showSuccess("Paramètres de l'objet sauvegardés.");
    } catch (error: any) {
      showError("Erreur de sauvegarde.");
      console.error(error);
    }
  }, [zone.id, spawnChances, spawnQuantities]);

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
      if (zoneItemsRes.error) throw zoneItemsRes.error;

      const sortedItems = (itemsRes.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setItems(sortedItems);
      
      const initialData = zoneItemsRes.data || [];
      initialZoneItemsRef.current = initialData;
      const chancesMap = new Map<number, number>();
      const quantitiesMap = new Map<number, number>();
      initialData.forEach(zi => {
        chancesMap.set(zi.item_id, zi.spawn_chance);
        quantitiesMap.set(zi.item_id, zi.max_quantity || 1);
      });
      setSpawnChances(chancesMap);
      setSpawnQuantities(quantitiesMap);

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

  const handleQuantityChange = (itemId: number, quantity: string) => {
    const newQuantities = new Map(spawnQuantities);
    const value = parseInt(quantity, 10);
    if (!isNaN(value) && value >= 1) {
      newQuantities.set(itemId, value);
    } else if (quantity === '') {
      newQuantities.set(itemId, 1);
    }
    setSpawnQuantities(newQuantities);
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

  const CurrentIconComponent = zoneIcon ? (LucideIcons as any)[zoneIcon] : LucideIcons.Map;

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
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      min="1"
                      value={spawnQuantities.get(item.id) || ''}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      onBlur={() => handleSaveItemSettings(item.id)}
                      className="w-20 bg-gray-800 border-gray-600 text-white text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      min="0" max="100"
                      value={spawnChances.get(item.id) || ''}
                      onChange={(e) => handleChanceChange(item.id, e.target.value)}
                      onBlur={() => handleSaveItemSettings(item.id)}
                      className="w-20 bg-gray-800 border-gray-600 text-white text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </div>
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