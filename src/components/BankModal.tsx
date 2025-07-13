import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Landmark, Coins } from 'lucide-react';
import { Slider } from './ui/slider';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  bankBalance: number;
  onUpdate: () => void;
}

const BankModal = ({ isOpen, onClose, credits, bankBalance, onUpdate }: BankModalProps) => {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('deposit');

  const maxAmount = activeTab === 'deposit' ? credits : bankBalance;
  const withdrawalFee = activeTab === 'withdraw' ? Math.floor(amount * 0.05) : 0;
  const netAmount = amount - withdrawalFee;

  const handleTransaction = async () => {
    if (amount <= 0) {
      showError("Le montant doit être positif.");
      return;
    }
    setLoading(true);
    const rpcName = activeTab === 'deposit' ? 'deposit_credits' : 'withdraw_credits';
    const { error } = await supabase.rpc(rpcName, { p_amount: amount });
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Transaction réussie !");
      onUpdate();
      setAmount(0);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <Landmark className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle>Banque Centrale</DialogTitle>
          <DialogDescription>Déposez et retirez vos crédits en toute sécurité.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-around my-4 text-center">
          <div>
            <p className="text-sm text-gray-400">En main</p>
            <p className="text-lg font-bold flex items-center justify-center gap-1">{credits} <Coins size={16} /></p>
          </div>
          <div>
            <p className="text-sm text-gray-400">En banque</p>
            <p className="text-lg font-bold flex items-center justify-center gap-1">{bankBalance} <Coins size={16} /></p>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">Déposer</TabsTrigger>
            <TabsTrigger value="withdraw">Retirer</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="space-y-4 pt-4">
            <Input type="number" placeholder="Montant à déposer" value={amount || ''} onChange={e => setAmount(Math.min(Number(e.target.value), maxAmount))} />
            <Slider value={[amount]} onValueChange={([val]) => setAmount(val)} max={maxAmount} step={1} />
            <Button onClick={handleTransaction} disabled={loading || amount <= 0} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Déposer ${amount} crédits`}
            </Button>
          </TabsContent>
          <TabsContent value="withdraw" className="space-y-4 pt-4">
            <Input type="number" placeholder="Montant à retirer" value={amount || ''} onChange={e => setAmount(Math.min(Number(e.target.value), maxAmount))} />
            <Slider value={[amount]} onValueChange={([val]) => setAmount(val)} max={maxAmount} step={1} />
            <div className="text-sm text-center text-gray-400">
              <p>Frais de retrait (5%): {withdrawalFee} crédits</p>
              <p>Vous recevrez: <span className="font-bold text-white">{netAmount} crédits</span></p>
            </div>
            <Button onClick={handleTransaction} disabled={loading || amount <= 0} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Retirer ${amount} crédits`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BankModal;