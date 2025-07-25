import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

// NOTE: Nous récupérons dynamiquement les icônes du dossier public/assets/icons.
const iconModules = import.meta.glob('/public/assets/icons/*');
const allIconFiles = Object.keys(iconModules).map(path => path.split('/').pop() ?? '');
// CORRECTION : Nous filtrons les fichiers non pertinents comme les placeholders ou les fichiers cachés.
const iconList = allIconFiles.filter(filename => filename && !filename.startsWith('.') && filename !== '.emptyFolderPlaceholder');

interface Item {
  id?: number;
  name: string;
  description: string;
  icon: string;
}

interface ItemFormModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<Item>) => void;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({ item, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Item>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [iconExists, setIconExists] = useState(false);
  const [isValidatingIcon, setIsValidatingIcon] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(item || {});
    }
  }, [item, isOpen]);

  useEffect(() => {
    const icon = formData.icon;
    if (icon) {
      setIsValidatingIcon(true);
      const url = `/assets/icons/${icon}`;
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setPreviewUrl(url);
        setIconExists(true);
        setIsValidatingIcon(false);
      };
      img.onerror = () => {
        setPreviewUrl(null);
        setIconExists(false);
        setIsValidatingIcon(false);
      };
    } else {
      setPreviewUrl(null);
      setIconExists(false);
    }
  }, [formData.icon]);

  const handleSave = () => {
    onSave(formData);
  };

  const handleIconChange = (icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{item ? "Modifier l'objet" : "Créer un nouvel objet"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-gray-300 font-mono">Nom</Label>
            <Input 
              id="name" 
              value={formData.name || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              className="mt-1 bg-gray-800 border-gray-600" 
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-gray-300 font-mono">Description</Label>
            <Input 
              id="description" 
              value={formData.description || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              className="mt-1 bg-gray-800 border-gray-600" 
            />
          </div>
          <div>
            <Label htmlFor="icon" className="text-gray-300 font-mono">Icône</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                {isValidatingIcon ? <Loader2 className="w-5 h-5 animate-spin" /> :
                previewUrl && iconExists ? <img src={previewUrl} alt="Prévisualisation" className="w-full h-full object-contain p-1" /> :
                <span className="text-xs text-gray-400">...</span>}
              </div>
              <Select value={formData.icon} onValueChange={handleIconChange}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Choisir une icône" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                  {iconList.map((iconFile) => (
                    <SelectItem key={iconFile} value={iconFile}>
                      {iconFile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Annuler</Button>
          <Button onClick={handleSave}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemFormModal;