import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Item } from '@/types/game';
import DynamicIcon from '../DynamicIcon';

// Cette liste est un exemple. Dans une application réelle, elle proviendrait d'un service ou serait générée à partir des assets.
const MOCK_ICON_LIST = [
  'Axe', 'Shield', 'Sword', 'Heart', 'Package', 'CookingPot', 'Bone', 'Apple', '.emptyfolderplaceholder', 'BrickWall', 'Box', 'Hammer'
];

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Partial<Item> | null;
  onSave: (item: Partial<Item>) => void;
}

const ItemFormModal = ({ isOpen, onClose, item, onSave }: ItemFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Item>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(item || {});
    }
  }, [isOpen, item]);

  const handleChange = (field: keyof Item, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  // On filtre le placeholder pour qu'il n'apparaisse pas dans la liste
  const iconOptions = MOCK_ICON_LIST.filter(icon => icon !== '.emptyfolderplaceholder');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{item?.id ? "Modifier l'objet" : "Créer un objet"}</DialogTitle>
          <DialogDescription>Remplissez les détails de l'objet. Cliquez sur sauvegarder lorsque vous avez terminé.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Le sélecteur d'icône est maintenant en premier */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">
              Icône
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Select value={formData.icon || ''} onValueChange={(value) => handleChange('icon', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une icône" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={iconName} className="w-4 h-4" />
                        <span>{iconName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.icon && <DynamicIcon name={formData.icon} className="w-8 h-8 p-1 border rounded-md" />}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nom
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Annuler</Button>
          <Button onClick={handleSubmit}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;