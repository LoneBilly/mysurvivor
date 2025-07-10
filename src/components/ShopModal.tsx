import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Store, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShopModal = ({ isOpen, onClose }: ShopModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Store className="w-6 h-6" />
            Boutique
          </DialogTitle>
          <DialogDescription>
            Achetez des améliorations et des objets uniques.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Example shop item */}
          <div className="p-4 bg-white/10 rounded-lg flex flex-col">
            <h3 className="font-semibold">Emplacement d'inventaire</h3>
            <p className="text-sm text-gray-300 flex-grow">Débloque 5 emplacements d'inventaire supplémentaires.</p>
            <div className="flex justify-between items-center mt-2">
              <span className="font-bold">100 Caps</span>
              <Button size="sm" className="flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> Acheter</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShopModal;