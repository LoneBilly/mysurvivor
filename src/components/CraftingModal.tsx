import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Scroll, Hammer } from "lucide-react";
import { Button } from "./ui/button";

interface CraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CraftingModal = ({ isOpen, onClose }: CraftingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Scroll className="w-6 h-6" />
            Artisanat
          </DialogTitle>
          <DialogDescription>
            Fabriquez de nouveaux objets et outils pour survivre.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Example crafting item */}
          <div className="p-4 bg-white/10 rounded-lg flex flex-col">
            <h3 className="font-semibold flex items-center gap-2"><Hammer className="w-5 h-5" /> Hache en pierre</h3>
            <p className="text-sm text-gray-300 flex-grow">Nécessite: 5 bois, 2 pierres.</p>
            <Button size="sm" className="mt-2 w-full">Fabriquer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CraftingModal;