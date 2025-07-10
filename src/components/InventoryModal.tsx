import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Backpack, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLOTS = 50;
const DEFAULT_UNLOCKED_SLOTS = 5;

const InventorySlot = ({ locked }: { locked: boolean }) => {
  return (
    <div
      className={cn(
        "relative aspect-square flex items-center justify-center rounded-lg border transition-colors",
        locked
          ? "bg-black/30 border-white/10 cursor-not-allowed"
          : "bg-white/10 border-white/20 hover:bg-white/20"
      )}
    >
      {locked && <Lock className="w-5 h-5 text-gray-500" />}
    </div>
  );
};

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full bg-gray-900/50 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="text-center mb-4">
          <Package className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire</DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Gérez vos objets et votre équipement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Backpack Slot */}
          <div className="md:w-1/4 flex flex-col items-center gap-2">
            <p className="font-mono text-sm text-gray-400">Sac à dos</p>
            <div className="w-24 h-24 aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5">
              <Backpack className="w-10 h-10 text-gray-500" />
            </div>
          </div>

          {/* Main Inventory */}
          <div className="flex-1">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: TOTAL_SLOTS }).map((_, index) => (
                <InventorySlot key={index} locked={index >= DEFAULT_UNLOCKED_SLOTS} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;