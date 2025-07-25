import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { icons } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DynamicIcon from '@/components/DynamicIcon';

// NOTE: This is a minimal definition. Ideally, it should be imported from a shared types file.
interface Item {
  id?: number;
  name: string;
  description: string;
  icon: string;
  stackable: boolean;
  type: string;
  use_action_text: string | null;
}

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<Item>) => void;
  item: Partial<Item> | null;
}

const toPascalCase = (str: string) => str.replace(/(^\w|-\w)/g, (text) => text.replace(/-/, "").toUpperCase());

const iconNames = Object.keys(icons).map(toPascalCase).sort();

const ItemFormModal: React.FC<ItemFormModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [stackable, setStackable] = useState(true);
  const [type, setType] = useState('Items divers');
  const [useActionText, setUseActionText] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setDescription(item.description || '');
      setIcon(item.icon || '');
      setStackable(item.stackable ?? true);
      setType(item.type || 'Items divers');
      setUseActionText(item.use_action_text || '');
    } else {
      // Reset form for new item
      setName('');
      setDescription('');
      setIcon('');
      setStackable(true);
      setType('Items divers');
      setUseActionText('');
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedItem: Partial<Item> = {
      ...item,
      name,
      description,
      icon,
      stackable,
      type,
      use_action_text: useActionText || null,
    };
    onSave(savedItem);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{item ? "Modifier l'item" : "Créer un item"}</DialogTitle>
          <DialogDescription>Remplissez les détails de l'item ci-dessous.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="icon" className="text-center">Icône</Label>
              <div className="w-20 h-20 bg-slate-700/50 rounded-md flex items-center justify-center border border-slate-600">
                {icon ? <DynamicIcon name={icon} className="w-10 h-10 text-white" /> : <LucideIcons.Package className="w-10 h-10 text-gray-500" />}
              </div>
            </div>
            <div className="flex-grow space-y-4">
              <div>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger id="icon" className="w-full bg-white/5 border-white/20">
                    <SelectValue placeholder="Choisir une icône" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {iconNames.map(iconName => (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <DynamicIcon name={iconName} className="w-4 h-4" />
                          {iconName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Nom de l'item</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white/5 border-white/20" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/20" />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Input id="type" value={type} onChange={(e) => setType(e.target.value)} required className="bg-white/5 border-white/20" />
          </div>

          <div>
            <Label htmlFor="useActionText">Texte d'action (ex: Manger)</Label>
            <Input id="useActionText" value={useActionText} onChange={(e) => setUseActionText(e.target.value)} placeholder="Laisser vide si non utilisable" className="bg-white/5 border-white/20" />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="stackable" checked={stackable} onCheckedChange={(checked) => setStackable(Boolean(checked))} />
            <Label htmlFor="stackable">Empilable (stackable)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit">Sauvegarder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;