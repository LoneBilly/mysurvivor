import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Coins, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WagerWheelGameProps {
  credits: number;
  onUpdate: () => void;
  onBack: () => void;
}

const WagerWheelGame = ({ credits, onUpdate, onBack }: WagerWheelGameProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; winnings: number; bet: number; label: string } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

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
    setIsSpinning(true);
    setResult(null);

    const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: amount });
    
    setTimeout(() => {
      setIsSpinning(false);
      setLoading(false);
      if (error) {
        showError(error.message);
      } else {
        setResult(data);
        const netChange = data.winnings - data.bet;
        if (netChange > 0) {
          showSuccess(`Vous avez gagné ${netChange} crédits !`);
        } else if (netChange < 0) {
          showError(`Vous avez perdu ${Math.abs(netChange)} crédits.`);
        } else {
          showInfo("Vous avez récupéré votre mise.");
        }
        onUpdate();
      }
    }, 1500);
  };

  const getResultDisplay = () => {
    if (!result) return <p className="text-gray-400">Placez votre pari</p>;

    const netChange = result.winnings - result.bet;
    let colorClass = '';

    if (netChange > 0) colorClass = 'text-green-400';
    else if (netChange < 0) colorClass = 'text-red-400';
    else colorClass = 'text-yellow-400';

    return (
      <div className={cn("text-center", colorClass)}>
        <p>{result.label}</p>
        <p className="text-lg">{netChange >= 0 ? `+${netChange}`: netChange} <Coins className="inline w-5 h-5" /></p>
      </div>
    );
  };

  return (
    <div className="py-4 space-y-4">
      <Button variant="ghost" onClick={onBack} className="absolute top-4 left-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
      <div className="h-24 bg-black/20 rounded-lg flex items-center justify-center text-2xl font-bold mt-10">
        {isSpinning ? <Loader2 className="w-8 h-8 animate-spin" /> : getResultDisplay()}
      </div>
      <div>
        <Label htmlFor="bet-amount" className="text-sm font-medium text-white font-mono">Montant du pari</Label>
        <div className="relative mt-1">
          <Input id="bet-amount" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="pl-8 bg-white/5 border-white/20" placeholder="0" disabled={loading} />
          <Coins className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
        </div>
      </div>
      <Button onClick={handlePlay} disabled={loading || !betAmount} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lancer la roue'}
      </Button>
    </div>
  );
};

export default WagerWheelGame;