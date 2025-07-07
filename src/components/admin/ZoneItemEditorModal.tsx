import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MapCell, Item } from '@/types/game';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

interface ZoneItemEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cell: MapCell | null;
}

const ZoneItemEditorModal = ({ isOpen, onClose, cell }: ZoneItemEditorModalProps) => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [zoneItems, setZoneItems] = useState<{ [itemId: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !cell) return;

    const fetchData = async () => {
      setLoading(true);
      
      // 1. Fetch all available items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*');
      
      if (itemsError) {
        showError("Impossible de charger la liste des objets.");
        setLoading(false);
        return;
      }
      setAllItems(itemsData || []);

      // 2. Fetch items currently associated with this zone
      const { data: zoneItemsData, error: zoneItemsError } = await supabase
        .from('zone_items')
        .select('item_id, spawn_chance')
        .eq('zone_id', cell.id);

      if (zoneItemsError) {
        showError("Impossible de charger les objets de la zone.");
      } else {
        const initialChances = (zoneItemsData || []).reduce((acc, item) => {
          acc[item.item_id] = item.spawn_chance;
          return acc;
        }, {} as { [itemId: number]: number });
        setZoneItems(initialChances);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [isOpen, cell]);

  const handleChanceChange = (itemId: number, chance: string) => {
    const value = parseInt(chance, 10);
    if (isNaN(value) || value < 0) {
      setZoneItems(prev => ({ ...prev, [itemId]: 0 }));
    } else if (value > 100) {
      setZoneItems(prev => ({ ...prev, [itemId]: 100 }));
    } else {
      setZoneItems(prev => ({ ...prev, [itemId]: value }));
    }
  };

  const handleSaveChanges = async () => {
    if (!cell) return;
    setIsSaving(true);

    const itemsToUpsert = Object.entries(zoneItems)
      .filter(([, chance]) => chance > 0)
      .map(([itemId, chance]) => ({
        zone_id: cell.id,
        item_id: parseInt(itemId, 10),
        spawn_chance: chance,
      }));

    const itemsToDelete = Object.entries(zoneItems)
      .filter(([, chance]) => chance === 0)
      .map(([itemId]) => parseInt(itemId, 10));

    let hasError = false;

    if (itemsToUpsert.length > 0) {
      const { error: upsertError } = await supabase.from('zone_items').upsert(itemsToUpsert);
      if (upsertError) {
        showError("Erreur lors de la sauvegarde des objets.");
        console.error(upsertError);
        hasError = true;
      }
    }

    if (itemsToDelete.length > 0 && !hasError) {
      const { error: deleteError } = await supabase
        .from('zone_items')
        .delete()
        .eq('zone_id', cell.id)
        .in('item_id', itemsToDelete);
      
      if (deleteError) {
        showError("Erreur lors de la suppression d'objets.");
        console.error(deleteError);
        hasError = true;
      }
    }

    if (!hasError) {
      showSuccess("Objets de la zone mis à jour !");
      onClose();
    }
    
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Éditeur d'objets pour : {cell?.type}</DialogTitle>
          <DialogDescription>
            Définissez la probabilité d'apparition (en %) pour chaque objet dans cette zone.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-96 pr-4">
            <div className="space-y-4 py-2">
              {allItems.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`item-${item.id}`} className="flex-1 truncate">
                    {item.name}
                  </Label>
                  <div className="flex items-center gap-2 w-32">
                    <Input
                      id={`item-${item.id}`}
                      type="number"
                      min="0"
                      max="100"
                      value={zoneItems[item.id] || 0}
                      onChange={(e) => handleChanceChange(item.id, e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white w-20"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSaveChanges} disabled={loading || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneItemEditorModal;