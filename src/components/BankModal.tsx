import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Coins } from 'lucide-react';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  bankBalance: number;
  onTransaction: (type: 'deposit' | 'withdraw', amount: number) => void;
  loading: boolean;
}

const BankModal = ({ isOpen, onClose, credits, bankBalance, onTransaction, loading }: BankModalProps) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const withdrawalFee = useMemo(() => {
    const amount = parseInt(withdrawAmount, 10);
    return isNaN(amount) || amount <= 0 ? 0 : Math.floor(amount * 0.05);
  }, [withdrawAmount]);

  const netWithdrawal = useMemo(() => {
    const amount = parseInt(withdrawAmount, 10);
    return isNaN(amount) || amount <= 0 ? 0 : amount - withdrawalFee;
  }, [withdrawAmount, withdrawalFee]);

  const handleDeposit = () => {
    const amount = parseInt(depositAmount, 10);
    if (!isNaN(amount) && amount > 0) {
      onTransaction('deposit', amount);
    }
  };

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!isNaN(amount) && amount > 0) {
      onTransaction('withdraw', amount);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Landmark className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Banque</DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Mettez vos crédits à l'abri.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex justify-between p-3 bg-white/5 rounded-lg">
            <span>Portefeuille:</span>
            <span className="font-bold flex items-center gap-1">{credits} <Coins size={14} /></span>
          </div>
          <div className="flex justify-between p-3 bg-white/5 rounded-lg">
            <span>En banque:</span>
            <span className="font-bold flex items-center gap-1">{bankBalance} <Coins size={14} /></span>
          </div>
        </div>
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">Déposer</TabsTrigger>
            <TabsTrigger value="withdraw">Retirer</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4 space-y-3">
            <Input type="number" placeholder="Montant à déposer" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="bg-white/10 border-white/20" />
            <Button onClick={handleDeposit} disabled={loading || !depositAmount || parseInt(depositAmount) > credits} className="w-full">
              {loading ? 'Dépôt en cours...' : 'Déposer'}
            </Button>
          </TabsContent>
          <TabsContent value="withdraw" className="mt-4 space-y-3">
            <Input type="number" placeholder="Montant à retirer" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="bg-white/10 border-white/20" />
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between"><span>Frais (5%):</span> <span>-{withdrawalFee} <Coins size={12} /></span></div>
              <div className="flex justify-between font-bold"><span>Vous recevrez:</span> <span>{netWithdrawal} <Coins size={12} /></span></div>
            </div>
            <Button onClick={handleWithdraw} disabled={loading || !withdrawAmount || parseInt(withdrawAmount) > bankBalance} className="w-full">
              {loading ? 'Retrait en cours...' : 'Retirer'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BankModal;