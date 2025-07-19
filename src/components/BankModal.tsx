import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapCell } from "@/types/game";
import { usePlayerState } from "@/hooks/usePlayerState";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapCell | null;
}

const BankModal = ({ isOpen, onClose, zone }: BankModalProps) => {
  const { playerState, fetchPlayerState } = usePlayerState();
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleTransaction = async (type: 'deposit' | 'withdraw') => {
    if (amount <= 0) {
      showError("Le montant doit être positif.");
      return;
    }
    setLoading(true);
    try {
      const rpcName = type === 'deposit' ? 'deposit_credits' : 'withdraw_credits';
      const { error } = await supabase.rpc(rpcName, { p_amount: amount });
      if (error) throw error;
      showSuccess("Transaction réussie !");
      fetchPlayerState();
      setAmount(0);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!zone) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{zone.id_name || zone.type}</DialogTitle>
          <DialogDescription>
            Gérez vos crédits en toute sécurité.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-400">En poche</p>
              <p className="text-lg font-bold text-yellow-400">{playerState?.credits ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">En banque</p>
              <p className="text-lg font-bold text-yellow-400">{playerState?.bank_balance ?? 0}</p>
            </div>
          </div>
          <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit">Dépôt</TabsTrigger>
              <TabsTrigger value="withdraw">Retrait</TabsTrigger>
            </TabsList>
            <TabsContent value="deposit" className="pt-4">
              <div className="flex items-center space-x-2">
                <Input type="number" placeholder="Montant" value={amount || ''} onChange={e => setAmount(parseInt(e.target.value) || 0)} className="bg-white/5 border-white/20" />
                <Button onClick={() => handleTransaction('deposit')} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="withdraw" className="pt-4">
              <div className="flex items-center space-x-2">
                <Input type="number" placeholder="Montant" value={amount || ''} onChange={e => setAmount(parseInt(e.target.value) || 0)} className="bg-white/5 border-white/20" />
                <Button onClick={() => handleTransaction('withdraw')} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Des frais de 5% s'appliquent aux retraits.</p>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BankModal;