import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, ArrowLeft, Search, Plus, HelpCircle } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { showSuccess, showError } from '@/utils/toast';
import { Item, ZoneItem, ZoneItemEditorProps } from '@/types/admin';
import ZoneIconEditorModal from './ZoneIconEditorModal';
import ItemFormModal from './ItemFormModal';

const getZoneIconComponent = (iconName: string | null): React.ElementType => {
    if (!iconName) return LucideIcons.Map;
    const Icon = (LucideIcons as any)[iconName];
    if (Icon && typeof Icon.render === 'function') {
        return Icon;
    }
    return HelpCircle;
};

const ZoneItemEditor = ({ zone, onBack }: ZoneItemEditorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [zoneItemSettings, setZoneItemSettings] = useState<Map<number, { spawn_chance: number; max_quantity: number }>>(new Map());
  const initialZoneItemsRef = useRef<Map<number, { spawn_chance: number; max_quantity: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [zoneName, setZoneName] = useState(zone.type);
  const initialZoneNameRef = useRef(zone.type);
  const [zoneIcon, setZoneIcon] = useState(zone.icon);
  const initialZoneIconRef = useRef(zone.icon);

  const [searchTerm, setSearchTerm] = useState('');
  const [isIconEditorOpen, setIsIconEditorOpen] = useState(false);
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const handleSaveSettings = useCallback(async () => {
    const initialSettings = initialZoneItemsRef.current;
    const currentSettings = new Map<number, { spawn_chance: number; max_quantity: number }>();
    for (const [itemId, settings] of zoneItemSettings.entries()) {
      if (settings.spawn_chance > 0) {
        currentSettings.set(itemId, {
          spawn_chance: settings.spawn_chance,
          max_quantity: settings.max_quantity || 1,
        });
      }
    }

    let areMapsEqual = initialSettings.size === currentSettings.size;
    if (areMapsEqual) {
      for (const [key, value] of initialSettings.entries()) {
        const currentVal = currentSettings.get(key);
        if (!currentVal || currentVal.spawn_chance !== value.spawn_chance || currentVal.max_quantity !== value.max_quantity) {
          areMapsEqual = false;
          break;
        }
      }
    }

    if (areMapsEqual) return;

    const itemsToUpsert: ZoneItem[] = [];
    const itemIdsToDelete: number[] = [];

    for (const [itemId, settings] of currentSettings.entries()) {
      const initial = initialSettings.get(itemId);
      if (!initial || initial.spawn_chance !== settings.spawn_chance || initial.max_quantity !== settings.max_quantity) {
        itemsToUpsert.push({ zone_id: zone.id, item_id: itemId, spawn_chance: settings.spawn_chance, max_quantity: settings.max_quantity });
      }
    }

    for (const [itemId] of initialSettings.entries()) {
      if (!currentSettings.has(itemId)) {
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
        showSuccess("Paramètres sauvegardés.");
      }

      const newInitialSettings = new Map<number, { spawn_chance: number; max_quantity: number }>();
      currentSettings.forEach((value, key) => newInitialSettings.set(key, value));
      initialZoneItemsRef.current = newInitialSettings;

    } catch (error: any) {
      showError("Erreur de sauvegarde des paramètres.");
      console.error(error);
    }
  }, [zone.id, zoneItemSettings]);

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
      const settingsMap = new Map<number, { spawn_chance: number; max_quantity: number }>();
      initialData.forEach(zi => settingsMap.set(zi.item_id, { spawn_chance: zi.spawn_chance, max_quantity: zi.max_quantity || 1 }));
      setZoneItemSettings(settingsMap);
      initialZoneItemsRef.current = new Map(settingsMap);

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

  const handleSettingChange = (itemId: number, field: 'spawn_chance' | 'max_quantity', valueStr: string) => {
    const newSettings = new Map(zoneItemSettings);
    const value = parseInt(valueStr, 10);
    const current = newSettings.get(itemId) || { spawn_chance: 0, max_quantity: 1 };

    if (!isNaN(value) && value >= 0) {
      if (field === 'spawn_chance' && value > 100) return;
      if (field === 'max_quantity' && value === 0) return;
      
      const newEntry = { ...current, [field]: value };
      
      if (newEntry.spawn_chance > 0) {
        newSettings.set(itemId, newEntry);
      } else {
        newSettings.delete(itemId);
      }
    } else if (valueStr === '') {
      if (field === 'spawn_chance') {
        newSettings.delete(itemId);
      } else {
        const newEntry = { ...current, max_quantity: 1 };
        if (newEntry.spawn_chance > 0) {
          newSettings.set(itemId, newEntry);
        }
      }
    }
    setZoneItemSettings(newSettings);
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

  const CurrentIconComponent = getZoneIconComponent(zoneIcon);

  return (
    <Card className="w-full max-w-3xl mx-auto bg-gray-800/50 border-gray-700 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <div className="flex items-baseline gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsIconEditorOpen(true)} className="p-0 h-auto w-auto text-gray-300 hover:text-white">
                  <CurrentIconComponent className="w-6 h-6" />
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
              <div key={item.id} className="bg-gray-700/50 p-3 rounded-md">
                <Button variant="link" onClick={() => handleEditItem(item)} className="p-0 h-auto text-base text-white hover:text-blue-400 w-full justify-center mb-3 truncate">
                  {item.name}
                </Button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <Label htmlFor={`item-chance-${item.id}`} className="text-gray-400 text-sm mb-1">Chance</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`item-chance-${item.id}`}
                        type="number"
                        inputMode="numeric"
                        min="0" max="100"
                        value={zoneItemSettings.get(item.id)?.spawn_chance || ''}
                        onChange={(e) => handleSettingChange(item.id, 'spawn_chance', e.target.value)}
                        onBlur={handleSaveSettings}
                        className="w-20 bg-gray-800 border-gray-600 text-white text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <Label htmlFor={`item-quantity-${item.id}`} className="text-gray-400 text-sm mb-1">Quantité</Label>
                    <Input
                      id={`item-quantity-${item.id}`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={zoneItemSettings.get(item.id)?.max_quantity || '1'}
                      onChange={(e) => handleSettingChange(item.id, 'max_quantity', e.target.value)}
                      onBlur={handleSaveSettings}
                      className="w-20 bg-gray-800 border-gray-600 text-white text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ZoneIconEditorModal
        isOpen={isIconEditorOpen}
        onClose={() => setIsIconEditorOpen(false)}
        currentIcon={zoneIcon}
        onSave={handleZoneIconSave}
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