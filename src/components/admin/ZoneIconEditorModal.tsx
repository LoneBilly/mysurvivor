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
import { IconPicker } from './IconPicker';

interface ZoneIconEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string | null;
  onSave: (iconName: string) => void;
}

const ZoneIconEditorModal = ({ isOpen, onClose, currentIcon, onSave }: ZoneIconEditorModalProps) => {
  const [iconName, setIconName] = useState(currentIcon || '');

  useEffect(() => {
    if (isOpen) {
      setIconName(currentIcon || '');
    }
  }, [currentIcon, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(iconName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Modifier l'icône
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Choisissez une icône dans la liste.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <IconPicker value={iconName} onChange={setIconName} />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
              Sauvegarder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneIconEditorModal;