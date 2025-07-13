import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { InventoryItem } from "@/types/game";
import ItemIcon from "./ItemIcon";
import { useGame } from "@/contexts/GameContext";

interface QuantitySliderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onConfirm: (quantity: number) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
}

const QuantitySliderModal = ({ isOpen, onClose, item, onConfirm, title, description, confirmLabel = "Confirmer" }: QuantitySliderModalProps) => {
  const { getIconUrl } = useGame();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && item) {
      setQuantity(item.quantity > 1 ? 1 : item.quantity);
    }
  }, [isOpen, item]);

  if (!item) return null;

  const handleConfirm = () => {
    onConfirm(quantity);
    onClose();
  };

  const iconUrl = getIconUrl(item.items?.icon || null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
            <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
              <ItemIcon iconName={iconUrl || item.items?.icon} alt={item.items?.name || ''} />
            </div>
            <div className="flex-grow">
              <p className="font-bold">{item.items?.name}</p>
              <p className="text-xs text-gray-400">En stock: {item.quantity}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="quantity-slider">Quantité</label>
              <span className="font-mono text-lg font-bold">{quantity}</span>
            </div>
            <Slider
              id="quantity-slider"
              value={[quantity]}
              onValueChange={(value) => setQuantity(value[0])}
              min={1}
              max={item.quantity}
              step={1}
              disabled={item.quantity <= 1}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuantitySliderModal;