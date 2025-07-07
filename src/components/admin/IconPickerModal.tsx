import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string | null;
  onSelectIcon: (iconName: string) => void;
}

const allLucideIcons = Object.keys(LucideIcons).filter(name => name !== 'createReactComponent' && name !== 'default');

const IconPickerModal = ({ isOpen, onClose, currentIcon, onSelectIcon }: IconPickerModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return allLucideIcons;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allLucideIcons.filter(iconName =>
      iconName.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm]);

  const handleSelect = (iconName: string) => {
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Choisir une icône</DialogTitle>
          <DialogDescription className="text-gray-400">
            Recherchez et sélectionnez une icône pour cette zone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Rechercher une icône..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 bg-gray-700 border-gray-600 text-white"
          />
          <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 p-4 bg-gray-900/50">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {filteredIcons.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                if (!IconComponent) return null;
                return (
                  <Button
                    key={iconName}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSelect(iconName)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 h-auto w-auto aspect-square rounded-md",
                      "hover:bg-gray-700/70 text-gray-300",
                      currentIcon === iconName && "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    <IconComponent className="w-6 h-6 mb-1" />
                    <span className="text-[10px] text-center break-all leading-tight">{iconName}</span>
                  </Button>
                );
              })}
              {filteredIcons.length === 0 && (
                <p className="col-span-full text-center text-gray-500">Aucune icône trouvée.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconPickerModal;