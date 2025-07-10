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
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2 } from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  onSave: () => void;
}

const ItemFormModal = ({ isOpen, onClose, item, onSave }: ItemFormModalProps) => {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [icon, setIcon] = useState(item?.icon || '');
  const [stackable, setStackable] = useState(item?.stackable ?? true);
  const [loading, setLoading] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);

  const debouncedName = useDebounce(name, 500);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setIcon(item.icon || '');
      setStackable(item.stackable);
    } else {
      setName('');
      setDescription('');
      setIcon('');
      setStackable(true);
    }
    setNameExists(false);
  }, [item, isOpen]);

  useEffect(() => {
    const checkItemName = async () => {
      if (!debouncedName || debouncedName === item?.name) {
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

    if (isOpen) {
      checkItemName();
    }
  }, [debouncedName, item?.name, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (nameExists && name !== item?.name) {
      showError("Un objet avec ce nom existe déjà.");
      setLoading(false);
      return;
    }

    const itemData = { name, description, icon: icon || null, stackable };
    let error = null;

    if (item) {
      const { error: updateError } = await supabase
        .from('items')
        .update(itemData)
        .eq('id', item.id);
      error = updateError;
    } else {
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
      <DialogContent className="sm:max-w-md bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-none p-6">
        <DialogHeader>
          <DialogTitle className="text-black">{item ? 'Modifier l\'objet' : 'Créer un nouvel objet'}</DialogTitle>
          <DialogDescription className="text-gray-700">
            {item ? 'Mettez à jour les détails de cet objet.' : 'Ajoutez un nouvel objet au jeu.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-black">
                Nom
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3 bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                required
                disabled={loading}
              />
              {checkingName && <Loader2 className="w-4 h-4 animate-spin text-black col-start-5" />}
              {nameExists && debouncedName !== item?.name && !checkingName && (
                <p className="col-span-4 text-right text-red-500 text-sm">Ce nom existe déjà !</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right text-black">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3 bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="icon" className="text-right text-black">
                Icône
              </Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="col-span-3 bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                placeholder="Nom de l'icône Lucide"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stackable" className="text-right text-black">
                Empilable
              </Label>
              <Checkbox
                id="stackable"
                checked={stackable}
                onCheckedChange={(checked) => setStackable(!!checked)}
                className="col-span-3 border-black data-[state=checked]:bg-black data-[state=checked]:text-white rounded-none"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || (nameExists && name !== item?.name) || !name.trim()} className="rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-black text-white hover:bg-gray-800">
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