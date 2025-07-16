import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InventoryItem } from "@/types/game";
import { useGame } from "@/contexts/GameContext";
import ItemIcon from "./ItemIcon";
import { cn } from "@/lib/utils";

interface WorkbenchInventorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: InventoryItem) => void;
  inventory: InventoryItem[];
}

const WorkbenchInventorySelectorModal = ({ isOpen, onClose, onSelectItem, inventory }: WorkbenchInventorySelectorModalProps) => {
  const { getIconUrl } = useGame();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Choisir un objet</DialogTitle>
          <DialogDescription>Sélectionnez un objet de votre inventaire à placer dans l'établi.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {inventory.length > 0 ? (
            inventory.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
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
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchInventorySelectorModal;