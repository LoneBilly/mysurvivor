import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Lock, Backpack } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLOTS = 50;
const UNLOCKED_SLOTS = 5;

const InventorySlot = ({ locked, isBackpack = false }: { locked: boolean; isBackpack?: boolean }) => {
  return (
    <div
      className={cn(
        "relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200",
        locked
          ? "bg-black/20 border-white/10 cursor-not-allowed"
          : "bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/20",
        isBackpack && "border-yellow-400/30 bg-yellow-400/10"
      )}
    >
      {locked && <Lock className="w-1/2 h-1/2 text-white/20" />}
      {isBackpack && <Backpack className="w-1/2 h-1/2 text-yellow-400/50" />}
    </div>
  );
};

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full bg-gray-900/50 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="text-center mb-4">
          <Package className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Inventaire
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Gérez vos objets et votre équipement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Backpack Slot */}
          <div className="flex flex-col items-center gap-2">
            <p className="font-mono text-sm text-gray-400">Sac</p>
            <InventorySlot locked={false} isBackpack={true} />
          </div>

          {/* Main Inventory */}
          <div className="flex-1">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: TOTAL_SLOTS }).map((_, index) => (
                <InventorySlot key={index} locked={index >= UNLOCKED_SLOTS} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;