import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapCell } from "@/types/game";
import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell;
}

const MarketModal = ({ isOpen, onClose, zone }: MarketModalProps) => {
  const navigate = useNavigate();

  const goToMarket = () => {
    navigate('/game/market');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{zone.id_name || zone.type}</DialogTitle>
          <DialogDescription>
            Achetez et vendez des objets avec d'autres survivants.
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <p>Bienvenue au marché. Prêt à faire des affaires ?</p>
        </div>
        <DialogFooter>
          <Button onClick={goToMarket} className="w-full">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Accéder au marché
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarketModal;