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
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onUse: () => void;
  onDropOne: () => void;
  onDropAll: () => void;
  source?: 'inventory' | 'chest';
  onTransfer?: (item: InventoryItem, quantity: number, source: 'inventory' | 'chest') => void;
  onSplit?: (item: InventoryItem, quantity: number) => void;
  onUpdate?: () => void;
}

const ItemDetailModal = ({ isOpen, onClose, item, onUse, onDropOne, onDropAll, source, onTransfer, onSplit, onUpdate }: ItemDetailModalProps) => {
  const { getIconUrl } = useGame();
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [splitQuantity, setSplitQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setTransferQuantity(1);
      setSplitQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  const handleTransferClick = () => {
    if (onTransfer && source) {
      onTransfer(item, transferQuantity, source);
    }
  };

  const handleSplitClick = () => {
    if (onSplit) {
      onSplit(item, splitQuantity);
    }
  };

  const handleReadBlueprint = async () => {
    const { error } = await supabase.rpc('read_blueprint', { p_inventory_id: item.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Blueprint appris !");
      if (onUpdate) onUpdate();
      onClose();
    }
  };

  const useActionText = item.items?.use_action_text;
  const isBlueprint = useActionText === 'Lire';
  const iconUrl = getIconUrl(item.items?.icon || null);
  const canUse = source !== 'chest' && useActionText;
  const canTransfer = !!onTransfer;
  const canSplit = source === 'inventory' && item.quantity > 1 && onSplit;

  const handleUseClick = () => {
    if (isBlueprint) {
      handleReadBlueprint();
    } else {
      onUse();
    }
  };

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
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="quantity-slider">Quantité à transférer</Label>
              <span className="font-mono text-lg font-bold">{transferQuantity}</span>
            </div>
            <Slider
              id="quantity-slider"
              value={[transferQuantity]}
              onValueChange={(value) => setTransferQuantity(value[0])}
              min={1}
              max={item.quantity}
              step={1}
              disabled={item.quantity <= 1}
            />
            <Button onClick={handleTransferClick} className="w-full">
              Transférer {transferQuantity} {source === 'inventory' ? 'vers le coffre' : "vers l'inventaire"}
            </Button>
          </div>
        )}

        {canSplit && (
          <div className="w-full space-y-4 rounded-lg bg-slate-700/50 p-4 my-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="split-quantity-slider">Quantité à séparer</Label>
              <span className="font-mono text-lg font-bold">{splitQuantity}</span>
            </div>
            <Slider
              id="split-quantity-slider"
              value={[splitQuantity]}
              onValueChange={(value) => setSplitQuantity(value[0])}
              min={1}
              max={item.quantity - 1}
              step={1}
              disabled={item.quantity <= 1}
            />
            <Button onClick={handleSplitClick} className="w-full">
              Séparer la pile
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 pt-4 border-t border-slate-700">
          {canUse && (
            <Button onClick={handleUseClick} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
              {useActionText}
            </Button>
          )}
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