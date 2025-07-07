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
  const [zoneName, setZoneName] = useState(zone.type || '');
  const initialZoneNameRef = useRef(zone.type || '');
  const [zoneIcon, setZoneIcon] = useState(zone.icon || 'Map');
  const initialZoneIconRef = useRef(zone.icon || 'Map');

  const [searchTerm, setSearchTerm] = useState('');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const handleSaveProbabilities = useCallback(async () => {
    // ... (code inchangé)
  }, [zone.id, spawnChances]);

  const handleZoneNameSave = useCallback(async () => {
    // ... (code inchangé)
  }, [zone.id]);

  const handleZoneIconSave = useCallback(async (iconName: string) => {
    // ... (code inchangé)
  }, [zone.id]);

  const fetchItemsAndZoneItems = useCallback(async () => {
    // ... (code inchangé)
  }, [zone.id]);

  useEffect(() => {
    fetchItemsAndZoneItems();
  }, [zone.id, fetchItemsAndZoneItems]);

  const handleChanceChange = useCallback((itemId: number, chance: string) => {
    // ... (code inchangé)
  }, []);

  const handleEditItem = useCallback((itemToEdit: Item) => {
    // ... (code inchangé)
  }, []);

  const handleCreateItem = useCallback(() => {
    // ... (code inchangé)
  }, []);

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
            {items.map(item => (
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