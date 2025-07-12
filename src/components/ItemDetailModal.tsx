import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/SafeDialog";
import { Button } from "@/components/ui/button";
import ItemIcon from "./ItemIcon";
import { InventoryItem } from "@/types/game";
import { cn } from "@/lib/utils";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onUse: () => void;
  onDropOne: () => void;
  onDropAll: () => void;
}

const ItemDetailModal = ({ isOpen, onClose, item, onUse, onDropOne, onDropAll }: ItemDetailModalProps) => {
  if (!item) return null;

  const useActionText = item.items?.use_action_text || 'Utiliser';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-700/50 border-slate-600 flex-shrink-0 relative p-1">
              <ItemIcon iconName={item.items?.signedIconUrl || item.items?.icon} alt={item.items?.name || 'Objet'} />
            </div>
            <div>
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
                {item.items?.name}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {item.items?.description && (
            <p className="text-gray-300">{item.items.description}</p>
          )}
          <p className="text-gray-400">Quantité: <span className="font-bold text-white">{item.quantity}</span></p>
        </div>
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={onUse} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
            {useActionText}
          </Button>
          <div className="flex w-full gap-2">
            <Button onClick={onDropOne} variant="destructive" className="flex-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
              Jeter x1
            </Button>
            <Button onClick={onDropAll} variant="destructive" className="flex-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
              Jeter tout
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailModal;