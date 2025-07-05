import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: string[];
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inventaire</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {inventory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Votre inventaire est vide
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {inventory.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-100 rounded-lg border border-gray-200 text-center"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;