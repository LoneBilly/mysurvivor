import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2 } from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null; // Optional, for editing existing items
  onSave: () => void; // Callback to refresh item list
}

const itemTypes = ['resource', 'tool', 'consumable', 'weapon', 'armor', 'material', 'other'];

const ItemFormModal = ({ isOpen, onClose, item, onSave }: ItemFormModalProps) => {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [type, setType] = useState(item?.type || '');
  const [stackable, setStackable] = useState(item?.stackable ?? true);
  const [loading, setLoading] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);

  const debouncedName = useDebounce(name, 500);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setType(item.type);
      setStackable(item.stackable);
    } else {
      setName('');
      setDescription('');
      setType('');
      setStackable(true);
    }
    setNameExists(false); // Reset on modal open/item change
  }, [item, isOpen]);

  useEffect(() => {
    const checkItemName = async () => {
      if (!debouncedName || debouncedName === item?.name) { // Don't check if name is empty or unchanged for editing
        setNameExists(false);
        setCheckingName(false);
        return;
      }

      setCheckingName(true);
      const { data, error } = await supabase
        .from('items')
        .select('id')
        .ilike('name', debouncedName)
        .limit(1);

      if (error) {
        console.error("Error checking item name:", error);
        setNameExists(false);
      } else {
        setNameExists(data && data.length > 0);
      }
      setCheckingName(false);
    };

    if (isOpen) { // Only check when modal is open
      checkItemName();
    }
  }, [debouncedName, item?.name, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (nameExists && name !== item?.name) { // Prevent saving if name exists and it's not the current item's name
      showError("Un objet avec ce nom existe déjà.");
      setLoading(false);
      return;
    }

    const itemData = { name, description, type, stackable };
    let error = null;

    if (item) {
      // Update existing item
      const { error: updateError } = await supabase
        .from('items')
        .update(itemData)
        .eq('id', item.id);
      error = updateError;
    } else {
      // Create new item
      const { error: insertError } = await supabase
        .from('items')
        .insert(itemData);
      error = insertError;
    }

    if (error) {
      showError(`Erreur lors de la sauvegarde de l'objet: ${error.message}`);
      console.error("Save item error:", error);
    } else {
      showSuccess(`Objet ${item ? 'mis à jour' : 'créé'} avec succès !`);
      onSave();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900/80 backdrop-blur-sm border border-gray-700 text-white rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{item ? 'Modifier l\'objet' : 'Créer un nouvel objet'}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {item ? 'Mettez à jour les détails de cet objet.' : 'Ajoutez un nouvel objet au jeu.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3 bg-gray-800 border-gray-600 text-white"
                required
                disabled={loading}
              />
              {checkingName && <Loader2 className="w-4 h-4 animate-spin text-gray-400 col-start-5" />}
              {nameExists && debouncedName !== item?.name && !checkingName && (
                <p className="col-span-4 text-right text-red-400 text-sm">Ce nom existe déjà !</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3 bg-gray-800 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select value={type} onValueChange={setType} disabled={loading}>
                <SelectTrigger className="col-span-3 bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {itemTypes.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stackable" className="text-right">
                Empilable
              </Label>
              <Checkbox
                id="stackable"
                checked={stackable}
                onCheckedChange={(checked) => setStackable(!!checked)}
                className="col-span-3 border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || nameExists && name !== item?.name || !name.trim() || !type.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {item ? 'Sauvegarder les modifications' : 'Créer l\'objet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;