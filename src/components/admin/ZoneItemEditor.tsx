import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Item, Zone, ZoneItem } from '@/types/admin';
import { PlusCircle, Trash2 } from 'lucide-react';
import ItemIcon from '../ItemIcon';
import { getPublicIconUrl } from '@/utils/imageUrls';

interface ZoneItemEditorProps {
  zone: Zone;
  allItems: Item[];
  onUpdate: () => void;
}

const ZoneItemEditor = ({ zone, allItems, onUpdate }: ZoneItemEditorProps) => {
  const [zoneItems, setZoneItems] = useState<ZoneItem[]>(zone.zone_items || []);
  const [filter, setFilter] = useState('');
  const [interactionType, setInteractionType] = useState<'Ressource' | 'Action' | 'Non défini'>(zone.interaction_type as any);

  useEffect(() => {
    setZoneItems(zone.zone_items || []);
    setInteractionType(zone.interaction_type as any);
  }, [zone]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase()) &&
      !zoneItems.some(zi => zi.item_id === item.id)
    );
  }, [filter, allItems, zoneItems]);

  const handleAddItem = async (item: Item) => {
    const spawnChance = prompt(`Chance d'apparition pour ${item.name} (en %):`, '50');
    const maxQuantity = prompt(`Quantité maximale pour ${item.name}:`, '1');

    if (spawnChance && maxQuantity) {
      const { data, error } = await supabase
        .from('zone_items')
        .insert({
          zone_id: zone.id,
          item_id: item.id,
          spawn_chance: parseInt(spawnChance, 10),
          max_quantity: parseInt(maxQuantity, 10),
        })
        .select('*, items(name, icon)')
        .single();

      if (error) {
        showError(`Erreur: ${error.message}`);
      } else {
        showSuccess(`${item.name} ajouté à la zone.`);
        setZoneItems([...zoneItems, data as ZoneItem]);
        onUpdate();
      }
    }
  };

  const handleRemoveItem = async (zoneItemId: number) => {
    if (confirm("Êtes-vous sûr de vouloir retirer cet objet de la zone ?")) {
      const { error } = await supabase.from('zone_items').delete().eq('id', zoneItemId);
      if (error) {
        showError(`Erreur: ${error.message}`);
      } else {
        showSuccess("Objet retiré de la zone.");
        setZoneItems(zoneItems.filter(zi => zi.id !== zoneItemId));
        onUpdate();
      }
    }
  };

  const handleInteractionTypeSave = async (newType: 'Ressource' | 'Action' | 'Non défini') => {
    setInteractionType(newType);
    const { error } = await supabase
      .from('map_layout')
      .update({ interaction_type: newType })
      .eq('id', zone.id);

    if (error) {
      showError(`Erreur: ${error.message}`);
      setInteractionType(zone.interaction_type as any); // Revert on error
    } else {
      showSuccess("Type d'interaction mis à jour.");
      onUpdate();
    }
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4">Éditeur d'objets pour: {zone.type} ({zone.x}, {zone.y})</h3>
      
      <div className="mb-4">
        <Label className="text-sm font-medium text-gray-400">Type d'interaction</Label>
        <select
          value={interactionType}
          onChange={(e) => handleInteractionTypeSave(e.target.value as 'Ressource' | 'Action' | 'Non défini')}
          className="w-full mt-1 bg-gray-900/50 border-gray-600 px-3 h-10 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="Non défini">Non défini</option>
          <option value="Ressource">Ressource</option>
          <option value="Action">Action</option>
        </select>
      </div>

      {interactionType !== 'Action' && (
        <>
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Objets dans la zone</h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {zoneItems.length > 0 ? zoneItems.map(zi => (
                <div key={zi.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <ItemIcon iconName={getPublicIconUrl(zi.items.icon)} alt={zi.items.name} />
                    <span className="text-sm">{zi.items.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">Chance: {zi.spawn_chance}%</span>
                    <span className="text-xs text-gray-400">Max: {zi.max_quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(zi.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )) : <p className="text-sm text-gray-500">Aucun objet dans cette zone.</p>}
            </div>
          </div>

          <div className="flex-grow flex flex-col">
            <h4 className="font-semibold mb-2">Ajouter un objet</h4>
            <Input
              type="text"
              placeholder="Filtrer les objets..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mb-2"
            />
            <div className="flex-grow overflow-y-auto space-y-2 pr-2">
              {filteredItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <ItemIcon iconName={getPublicIconUrl(item.icon)} alt={item.name} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleAddItem(item)}>
                    <PlusCircle className="w-4 h-4 text-green-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ZoneItemEditor;