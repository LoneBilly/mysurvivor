import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Lock, Backpack } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLOTS = 50;
const UNLOCKED_SLOTS = 5;

const InventorySlot = ({ locked, item }: { locked: boolean; item?: any }) => {
  return (
    <div
      className={cn(
        "relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200",
        locked
          ? "bg-black/20 border-white/10 cursor-not-allowed"
          : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/30",
        item && "bg-sky-400/20 border-sky-400/40"
      )}
    >
      {locked && <Lock className="w-5 h-5 text-gray-500" />}
      {/* Lorsqu'un objet est présent, il sera rendu ici */}
    </div>
  );
};

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full bg-gray-900/50 backdrop-blur-lg text-white border border-white/20 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-center mb-4">
          <Package className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Inventaire
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Gérez vos objets et ressources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 max-h-[60vh]">
          {/* Backpack Slot */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/20">
              <Backpack className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-xs text-gray-400 font-mono">Sac à dos</p>
          </div>

          {/* Main Inventory */}
          <ScrollArea className="flex-1">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 h-full">
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {Array.from({ length: TOTAL_SLOTS }).map((_, index) => (
                  <InventorySlot key={index} locked={index >= UNLOCKED_SLOTS} />
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;