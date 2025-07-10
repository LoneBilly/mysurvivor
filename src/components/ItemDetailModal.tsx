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

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const ItemDetailModal = ({ isOpen, onClose, item }: ItemDetailModalProps) => {
  if (!item) return null;

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
              <DialogDescription className="text-sm text-neutral-400 font-mono mt-1 capitalize">
                {item.items?.type || 'Objet'}
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
        <DialogFooter>
          <Button onClick={onClose} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailModal;