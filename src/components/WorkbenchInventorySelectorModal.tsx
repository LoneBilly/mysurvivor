import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import ItemIcon from "./ItemIcon";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";

interface WorkbenchInventorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: InventoryItem, quantity: number) => void;
  inventory: InventoryItem[];
}

const WorkbenchInventorySelectorModal = ({ isOpen, onClose, onSelectItem, inventory }: WorkbenchInventorySelectorModalProps) => {
  const { getIconUrl } = useGame();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedItem(null);
        setQuantity(1);
      }, 200);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedItem) {
      setQuantity(1);
    }
  }, [selectedItem]);

  const handleConfirmSelection = () => {
    if (selectedItem) {
      onSelectItem(selectedItem, quantity);
    }
  };

  const availableInventory = inventory.filter(item => item.slot_position !== null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{selectedItem ? `Choisir la quantité` : 'Choisir un objet'}</DialogTitle>
          <DialogDescription>
            {selectedItem ? `Ajustez la quantité de ${selectedItem.items?.name} à transférer.` : 'Sélectionnez un objet de votre inventaire.'}
          </DialogDescription>
        </DialogHeader>
        
        {selectedItem ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                <ItemIcon iconName={getIconUrl(selectedItem.items?.icon) || selectedItem.items?.icon} alt={selectedItem.items?.name || ''} />
              </div>
              <div className="flex-grow">
                <p className="font-bold">{selectedItem.items?.name}</p>
                <p className="text-xs text-gray-400">En stock: {selectedItem.quantity}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="quantity-slider">Quantité à transférer</Label>
                <span className="font-mono text-lg font-bold">{quantity}</span>
              </div>
              <Slider
                id="quantity-slider"
                value={[quantity]}
                onValueChange={(value) => setQuantity(value[0])}
                min={1}
                max={selectedItem.quantity}
                step={1}
                disabled={selectedItem.quantity <= 1}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>Retour</Button>
              <Button onClick={handleConfirmSelection} className="flex-1">Transférer</Button>
            </div>
          </div>
        ) : (
          <div className="py-4 max-h-[60vh] overflow-y-auto grid [grid-template-columns:repeat(auto-fill,minmax(4rem,1fr))] gap-2">
            {availableInventory.length > 0 ? (
              availableInventory.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center",
                    "bg-slate-700/50 border-slate-600",
                    "hover:bg-slate-700/80 hover:border-slate-500 cursor-pointer"
                  )}
                >
                  <div className="absolute inset-0">
                    <ItemIcon iconName={getIconUrl(item.items?.icon) || item.items?.icon} alt={item.items?.name || ''} />
                    {item.quantity > 0 && (
                      <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white" style={{ textShadow: '1px 1px 2px black' }}>
                        x{item.quantity}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-400 py-8">Votre inventaire est vide.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchInventorySelectorModal;