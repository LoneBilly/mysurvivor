import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Home, Hammer, Wrench } from "lucide-react";
import { Button } from "./ui/button";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BaseModal = ({ isOpen, onClose }: BaseModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Home className="w-6 h-6" />
            Gestion de la Base
          </DialogTitle>
          <DialogDescription>
            Améliorez et gérez les constructions de votre base.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-white/10 rounded-lg">
            <h3 className="font-semibold flex items-center gap-2"><Hammer className="w-5 h-5" /> Atelier</h3>
            <p className="text-sm text-gray-300">Niveau 2 - Permet de fabriquer des outils avancés.</p>
            <Button size="sm" className="mt-2">Améliorer</Button>
          </div>
          <div className="p-4 bg-white/10 rounded-lg">
            <h3 className="font-semibold flex items-center gap-2"><Wrench className="w-5 h-5" /> Établi</h3>
            <p className="text-sm text-gray-300">Niveau 1 - Permet de réparer des objets.</p>
            <Button size="sm" className="mt-2">Améliorer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BaseModal;