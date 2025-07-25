import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BaseConstruction } from "@/types/game";
import BuildingUpgrade from "./BuildingUpgrade";
import { Wrench } from "lucide-react";

interface BuildingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: (silent?: boolean) => Promise<void>;
  onUpgradeComplete?: () => void;
}

const BuildingUpgradeModal = ({ isOpen, onClose, construction, onUpdate, onUpgradeComplete }: BuildingUpgradeModalProps) => {
  if (!construction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Wrench className="w-8 h-8 text-white mx-auto mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
            Améliorer: {construction.type}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
            Niveau actuel: {construction.level}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <BuildingUpgrade construction={construction} onUpdate={onUpdate} onClose={onClose} onUpgradeComplete={onUpgradeComplete} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingUpgradeModal;