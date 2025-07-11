import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, CreditCard } from 'lucide-react';
import { showSuccess } from "@/utils/toast";

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const creditPacks = [
  { amount: 100, price: "1.00€" },
  { amount: 500, price: "4.50€" },
  { amount: 1000, price: "8.00€" },
  { amount: 5000, price: "35.00€" },
];

const BuyCreditsModal = ({ isOpen, onClose }: BuyCreditsModalProps) => {
  const handlePurchase = (amount: number) => {
    showSuccess(`L'intégration du paiement n'est pas encore disponible. Achat de ${amount} crédits simulé.`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-mono">Acheter des Crédits</DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Soutenez le développement du jeu et obtenez un avantage !
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {creditPacks.map((pack) => (
            <Button
              key={pack.amount}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center justify-center space-y-2 bg-white/5 hover:bg-white/10"
              onClick={() => handlePurchase(pack.amount)}
            >
              <div className="flex items-center space-x-2">
                <Coins className="w-8 h-8 text-yellow-400" />
                <span className="text-3xl font-bold">{pack.amount}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <CreditCard className="w-4 h-4" />
                <span>{pack.price}</span>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCreditsModal;