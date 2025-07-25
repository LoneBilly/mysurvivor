import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Item } from '@/types/game';
import ItemIcon from '../ItemIcon';
import { getPublicIconUrl } from '@/utils/imageUrls';
import { Loader2 } from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: (itemData: Partial<Item>) => Promise<void>;
  loading: boolean;
}

const ItemFormModal = ({ isOpen, onClose, item, onSave, loading }: ItemFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Item>>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '',
        stackable: true,
        type: 'Items divers',
        use_action_text: '',
        effects: {},
      });
    }
  }, [item, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setFormData(prev => ({ ...prev, stackable: checked }));
    }
  };

  const handleEffectsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, effects: e.target.value as any }));
  };

  const handleSubmit = () => {
    const dataToSave = { ...formData };
    try {
      if (typeof dataToSave.effects === 'string') {
        dataToSave.effects = JSON.parse(dataToSave.effects);
      }
    } catch (e) {
      console.error("Invalid JSON for effects", e);
      // Optionally show an error to the user
      return;
    }
    onSave(dataToSave);
  };

  const iconUrl = getPublicIconUrl(formData.icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{item ? "Modifier l'objet" : "Créer un objet"}</DialogTitle>
          <DialogDescription>Remplissez les informations de l'objet.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="icon" className="text-gray-300 font-mono">Icône (nom de fichier ou URL)</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                {iconUrl && <ItemIcon iconName={iconUrl} alt={formData.name || 'Icon'} />}
              </div>
              <Input id="icon" value={formData.icon || ''} onChange={handleChange} />
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="text-gray-300 font-mono">Nom</Label>
            <Input id="name" value={formData.name || ''} onChange={handleChange} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-300 font-mono">Description</Label>
            <Textarea id="description" value={formData.description || ''} onChange={handleChange} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="type" className="text-gray-300 font-mono">Type</Label>
            <Input id="type" value={formData.type || ''} onChange={handleChange} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="use_action_text" className="text-gray-300 font-mono">Texte d'action (ex: Manger)</Label>
            <Input id="use_action_text" value={formData.use_action_text || ''} onChange={handleChange} className="mt-1" />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="stackable" checked={formData.stackable} onCheckedChange={handleCheckboxChange} />
            <Label htmlFor="stackable" className="text-gray-300 font-mono">Empilable (Stackable)</Label>
          </div>

          <div>
            <Label htmlFor="effects" className="text-gray-300 font-mono">Effets (JSON)</Label>
            <Textarea
              id="effects"
              value={typeof formData.effects === 'string' ? formData.effects : JSON.stringify(formData.effects, null, 2)}
              onChange={handleEffectsChange}
              className="mt-1 font-mono"
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;