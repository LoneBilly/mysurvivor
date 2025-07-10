import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TreasureChest, MapIcon } from "lucide-react";
import { Button } from "./ui/button";

interface ExplorationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  loot: { name: string; quantity: number }[];
}

const ExplorationResultModal = ({ isOpen, onClose, zoneName, loot }: ExplorationResultModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MapIcon className="w-6 h-6" />
            Exploration Terminée
          </DialogTitle>
          <DialogDescription>
            Résultats de votre exploration de: {zoneName}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2"><TreasureChest className="w-5 h-5" /> Butin trouvé:</h3>
          <ul className="list-disc list-inside pl-2 text-gray-300">
            {loot.map((item, index) => (
              <li key={index}>{item.name} x{item.quantity}</li>
            ))}
          </ul>
        </div>
        <Button onClick={onClose} className="w-full mt-6">Fermer</Button>
      </DialogContent>
    </Dialog>
  );
};

export default ExplorationResultModal;