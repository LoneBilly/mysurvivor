import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HeartCrack, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";

interface RespawnModalProps {
  isOpen: boolean;
  onRespawn: () => void;
}

const RespawnModal = ({ isOpen, onRespawn }: RespawnModalProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6">
        <DialogHeader className="items-center text-center">
          <HeartCrack className="w-16 h-16 text-red-500 mb-4" />
          <DialogTitle className="text-3xl font-bold">Vous êtes mort</DialogTitle>
          <DialogDescription className="text-lg text-gray-300">
            La survie est un combat de tous les instants. Ne baissez pas les bras.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <Button onClick={onRespawn} className="w-full text-lg py-6 flex items-center gap-2">
            <ShieldCheck />
            Réapparaître
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RespawnModal;