import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BaseConstruction } from "@/types/game";
import BuildingUpgrade from "./BuildingUpgrade";
import { Wrench } from "lucide-react";

interface BuildingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onUpdate: (silent?: boolean) => void;
}

const BuildingUpgradeModal = ({ isOpen, onClose, construction, onUpdate }: BuildingUpgradeModalProps) => {
  if (!construction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Wrench className="w-7 h-7 text-white" />
            <div>
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">
                Améliorer: {construction.type}
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-400 font-mono mt-1">
                Niveau actuel: {construction.level}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4">
          <BuildingUpgrade construction={construction} onUpdate={onUpdate} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingUpgradeModal;