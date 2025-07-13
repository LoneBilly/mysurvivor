import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onUse: () => void;
  onDropOne: () => void;
  onDropAll: () => void;
  source?: 'inventory' | 'chest';
  onTransfer?: (item: InventoryItem, quantity: number, source: 'inventory' | 'chest') => void;
}

const ItemDetailModal = ({ isOpen, onClose, item, onUse, onDropOne, onDropAll, source, onTransfer }: ItemDetailModalProps) => {
  const { getIconUrl } = useGame();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  const handleTransferClick = () => {
    if (onTransfer && source) {
      onTransfer(item, quantity, source);
    }
  };

  const useActionText = item.items?.use_action_text || 'Utiliser';
  const iconUrl = getIconUrl(item.items?.icon || null);
  const canUse = source !== 'chest';
  const canTransfer = !!onTransfer;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-sonner-toast]')) {
            e.preventDefault();
          }
        }}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6"
      >
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              <ItemIcon iconName={iconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
            </div>
            <div>
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
                {item.items?.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Détails et actions pour l'objet {item.items?.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {item.items?.description && (
            <p className="text-gray-300">{item.items.description}</p>
          )}
          <p className="text-gray-400">Quantité: <span className="font-bold text-white">{item.quantity}</span></p>
        </div>

        {canTransfer && (
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity-slider">Quantité à transférer</Label>
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
            <Button onClick={handleTransferClick} className="w-full">
              Transférer {quantity} {source === 'inventory' ? 'vers le coffre' : "vers l'inventaire"}
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={onUse} disabled={!canUse} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
            {useActionText}
          </Button>
          <div className="flex w-full gap-2">
            <Button onClick={onDropOne} variant="destructive" className="flex-1 rounded-lg bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
              Jeter x1
            </Button>
            <Button onClick={onDropAll} variant="destructive" className="flex-1 rounded-lg bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
              Jeter tout
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailModal;