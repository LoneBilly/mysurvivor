import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins } from 'lucide-react';
import { showInfo } from '@/utils/toast';

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const creditPacks = [
  { credits: 100, price: "0.99€", popular: false },
  { credits: 500, price: "4.49€", popular: true },
  { credits: 1000, price: "7.99€", popular: false },
  { credits: 5000, price: "34.99€", popular: false },
];

const PurchaseCreditsModal = ({ isOpen, onClose }: PurchaseCreditsModalProps) => {
  const handlePurchase = () => {
    showInfo("La boutique sera bientôt disponible !");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="text-center">
          <Coins className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Acheter des Crédits</DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Les crédits vous permettent d'acheter des objets au marché.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {creditPacks.map((pack, index) => (
            <div key={index} className={`p-4 rounded-lg border flex items-center justify-between ${pack.popular ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-600 bg-white/5'}`}>
              <div>
                <p className="font-bold text-lg flex items-center gap-2">{pack.credits} <Coins size={16} /></p>
                {pack.popular && <p className="text-xs text-yellow-400 font-bold">POPULAIRE</p>}
              </div>
              <Button onClick={handlePurchase} className={pack.popular ? 'bg-yellow-400 text-black hover:bg-yellow-500' : ''}>
                {pack.price}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseCreditsModal;