import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: () => void;
}

const ItemFormModal = ({ isOpen, onClose, item, onSave }: ItemFormModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Items divers');
  const [stackable, setStackable] = useState(true);
  const [iconPath, setIconPath] = useState('');
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setDescription(item?.description || '');
      setType(item?.type || 'Items divers');
      setStackable(item?.stackable ?? true);
      setIconPath(item?.icon || '');

      const fetchAvailableIcons = async () => {
        const { data: bucketFiles, error: bucketError } = await supabase.storage.from('icons').list();
        if (bucketError) {
          showError("Erreur de chargement des icônes.");
          return;
        }
        const allIconFileNames = bucketFiles?.map(file => file.name) || [];

        const { data: items, error: itemsError } = await supabase.from('items').select('icon');
        if (itemsError) {
          showError("Erreur de chargement des objets.");
          return;
        }
        const usedIconPaths = new Set(items?.map(i => i.icon).filter(Boolean));
        
        if (item?.icon) {
          usedIconPaths.delete(item.icon);
        }

        const available = allIconFileNames.filter(name => !usedIconPaths.has(name));
        setAvailableIcons(available);
      };

      fetchAvailableIcons();
    }
  }, [isOpen, item]);

  const handleSave = async () => {
    if (!name || !type) {
      showError("Le nom et le type sont requis.");
      return;
    }

    const itemData = {
      name,
      description,
      type,
      stackable,
      icon: iconPath || null,
    };

    let error;
    if (item) {
      ({ error } = await supabase.from('items').update(itemData).eq('id', item.id));
    } else {
      ({ error } = await supabase.from('items').insert([itemData]));
    }

    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess(`Objet ${item ? 'mis à jour' : 'créé'}.`);
      onSave();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{item ? 'Modifier' : 'Créer'} un objet</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-white/5 border-white/20" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 bg-white/5 border-white/20" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ressources">Ressources</SelectItem>
                <SelectItem value="Armes">Armes</SelectItem>
                <SelectItem value="Nourriture">Nourriture</SelectItem>
                <SelectItem value="Soins">Soins</SelectItem>
                <SelectItem value="Items divers">Items divers</SelectItem>
                <SelectItem value="Items craftés">Items craftés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="icon">Icône</Label>
            <Popover open={isIconPopoverOpen} onOpenChange={setIsIconPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isIconPopoverOpen}
                  className="w-full justify-between bg-white/5 border-white/20 hover:bg-white/10 hover:text-white"
                >
                  {iconPath || "Sélectionner une icône..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher une icône..." />
                  <CommandEmpty>Aucune icône trouvée.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {availableIcons.map((icon) => (
                      <CommandItem
                        key={icon}
                        value={icon}
                        onSelect={(currentValue) => {
                          setIconPath(currentValue === iconPath ? "" : currentValue);
                          setIsIconPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            iconPath === icon ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {icon}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="stackable" checked={stackable} onCheckedChange={(checked) => setStackable(Boolean(checked))} />
            <Label htmlFor="stackable">Empilable</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;