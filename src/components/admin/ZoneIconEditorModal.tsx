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
import * as LucideIcons from "lucide-react";

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
      <DialogContent className="sm:max-w-md bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-none p-6">
        <DialogHeader>
          <DialogTitle className="text-black">Modifier l'icône de la zone</DialogTitle>
          <DialogDescription className="text-gray-700">
            Saisissez le nom d'une icône de la librairie Lucide React.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 border-2 border-black">
                <IconPreview className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1">
                <Label htmlFor="icon-name" className="text-black">
                  Nom de l'icône
                </Label>
                <Input
                  id="icon-name"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  className="bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                  placeholder="Ex: Home, Shield, etc."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-black text-white hover:bg-gray-800">
              Sauvegarder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneIconEditorModal;