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
import { Label } from "@/components/ui/label";
import * as LucideIcons from "lucide-react";
import { IconCombobox } from './IconCombobox';

interface ZoneIconEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string | null;
  onSave: (iconName: string) => void;
}

const ZoneIconEditorModal = ({ isOpen, onClose, currentIcon, onSave }: ZoneIconEditorModalProps) => {
  const [iconName, setIconName] = useState(currentIcon || '');
  const [previewIcon, setPreviewIcon] = useState<React.ElementType | null>(null);

  useEffect(() => {
    setIconName(currentIcon || '');
  }, [currentIcon, isOpen]);

  useEffect(() => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent && typeof IconComponent.render === 'function') {
      setPreviewIcon(() => IconComponent);
    } else {
      setPreviewIcon(null);
    }
  }, [iconName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(iconName);
    onClose();
  };

  const IconPreview = previewIcon || LucideIcons.HelpCircle;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Modifier l'icône
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Saisissez un nom d'icône Lucide React.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/20 rounded-lg">
                <IconPreview className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <Label htmlFor="icon-name" className="text-gray-300 font-mono">
                  Nom de l'icône
                </Label>
                <IconCombobox value={iconName} onChange={setIconName} />
              </div>
            </div>
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