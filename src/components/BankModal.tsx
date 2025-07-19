import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, Landmark, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  bankBalance: number;
  onUpdate: () => void;
}

const BankModal = ({ isOpen, onClose, credits, bankBalance, onUpdate }: BankModalProps) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDepositAmount('');
      setWithdrawAmount('');
    }
  }, [isOpen]);

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showError("Montant de dépôt invalide.");
      return;
    }
    if (credits < amount) {
      showError("Crédits insuffisants.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('deposit_credits', { p_amount: amount });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`${amount} crédits déposés.`);
      onUpdate();
      setDepositAmount('');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showError("Montant de retrait invalide.");
      return;
    }
    if (bankBalance < amount) {
      showError("Fonds insuffisants en banque.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('withdraw_credits', { p_amount: amount });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Retrait effectué.`);
      onUpdate();
      setWithdrawAmount('');
    }
  };

  const withdrawalFee = Math.floor(parseInt(withdrawAmount || '0', 10) * 0.05);
  const netWithdrawal = parseInt(withdrawAmount || '0', 10) - withdrawalFee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Landmark className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Banque Centrale</DialogTitle>
          <DialogDescription>Gérez vos finances en toute sécurité.</DialogDescription>
        </DialogHeader>
        <div className="text-center my-4 p-3 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400">Solde en main</p>
          <p className="text-lg font-bold flex items-center justify-center gap-2">{credits} <Coins className="w-4 h-4 text-yellow-400" /></p>
          <p className="text-sm text-gray-400 mt-2">Solde en banque</p>
          <p className="text-lg font-bold flex items-center justify-center gap-2">{bankBalance} <Coins className="w-4 h-4 text-yellow-400" /></p>
        </div>
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit"><ArrowUpFromLine className="w-4 h-4 mr-2" />Déposer</TabsTrigger>
            <TabsTrigger value="withdraw"><ArrowDownToLine className="w-4 h-4 mr-2" />Retirer</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4 space-y-4">
            <Input type="number" placeholder="Montant à déposer" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="bg-white/5 border-white/20" />
            <Button onClick={handleDeposit} disabled={loading || !depositAmount} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Déposer'}
            </Button>
          </TabsContent>
          <TabsContent value="withdraw" className="mt-4 space-y-4">
            <Input type="number" placeholder="Montant à retirer" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="bg-white/5 border-white/20" />
            {parseInt(withdrawAmount || '0', 10) > 0 && (
              <div className="text-xs text-gray-400 text-center">
                Frais (5%): {withdrawalFee} crédits. Vous recevrez: {netWithdrawal} crédits.
              </div>
            )}
            <Button onClick={handleWithdraw} disabled={loading || !withdrawAmount} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Retirer'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BankModal;