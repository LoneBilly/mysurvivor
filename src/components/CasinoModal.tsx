import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Dice5, Coins } from 'lucide-react';
import CreditsInfo from './CreditsInfo';
import { cn } from '@/lib/utils';
import Wheel from './Wheel';

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
}

const wheelSegments = [
  { multiplier: 2, color: 'bg-blue-600' },
  { multiplier: 0, color: 'bg-red-600' },
  { multiplier: 1, color: 'bg-gray-500' },
  { multiplier: 0.5, color: 'bg-orange-500' },
  { multiplier: 5, color: 'bg-yellow-500' },
  { multiplier: 0, color: 'bg-red-600' },
  { multiplier: 2, color: 'bg-blue-600' },
  { multiplier: 0.5, color: 'bg-orange-500' },
  { multiplier: 1, color: 'bg-gray-500' },
  { multiplier: 0, color: 'bg-red-600' },
];

const CasinoModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits }: CasinoModalProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; winnings: number; bet: number } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setBetAmount('');
      setResult(null);
      setIsSpinning(false);
    }
  }, [isOpen]);

  const handlePlay = async () => {
    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showError("Montant du pari invalide.");
      return;
    }
    if (credits < amount) {
      showError("Crédits insuffisants.");
      return;
    }
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: amount });
    
    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      setResult(data);
      setIsSpinning(true);
      setTimeout(() => {
        setIsSpinning(false);
        setLoading(false);
        if (data.winnings > data.bet) {
          showSuccess(`Vous avez gagné ${data.winnings} crédits !`);
        } else if (data.winnings === 0) {
          showError(`Vous avez perdu ${data.bet} crédits.`);
        } else {
          showError(`Vous avez récupéré une partie de votre mise.`);
        }
        onUpdate();
      }, 6500); // Wait for wheel animation to finish
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader className="text-center">
          <Dice5 className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Casino</DialogTitle>
          <DialogDescription className="sr-only">Tentez votre chance !</DialogDescription>
          <CreditsInfo credits={credits} className="mt-1" onClick={onPurchaseCredits} />
        </DialogHeader>
        <div className="py-4 space-y-4 flex flex-col items-center">
          <Wheel segments={wheelSegments} resultMultiplier={result?.multiplier ?? null} isSpinning={isSpinning} />
          
          {!isSpinning && result && (
            <div className={cn("text-center text-xl font-bold mt-4", result.winnings > result.bet ? "text-green-400" : "text-red-400")}>
              {result.winnings > result.bet ? `Gagné: ${result.winnings}` : `Perdu: ${result.bet - result.winnings}`} <Coins className="inline w-5 h-5" />
            </div>
          )}

          <div className="w-full max-w-xs pt-4">
            <label htmlFor="bet-amount" className="text-sm font-medium text-white font-mono">Montant du pari</label>
            <div className="relative mt-1">
              <Input
                id="bet-amount"
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="pl-8 bg-white/5 border-white/20"
                placeholder="0"
                disabled={loading}
              />
              <Coins className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <Button onClick={handlePlay} disabled={loading || !betAmount} className="w-full max-w-xs">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lancer la roue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CasinoModal;