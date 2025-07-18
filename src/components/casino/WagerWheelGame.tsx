import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Coins, ArrowLeft } from 'lucide-react';
import { Wheel } from 'react-custom-roulette';

interface WagerWheelGameProps {
  credits: number;
  onUpdate: () => void;
  onBack: () => void;
}

const wheelData = [
  { option: 'Perte Totale', style: { backgroundColor: '#dc2626' } }, // red-600
  { option: 'Petite Perte', style: { backgroundColor: '#f97316' } }, // orange-500
  { option: 'Remboursé', style: { backgroundColor: '#6b7280' } }, // gray-500
  { option: 'Double Gain', style: { backgroundColor: '#2563eb' } }, // blue-600
  { option: 'Jackpot!', style: { backgroundColor: '#eab308' } }, // yellow-500
];

const WagerWheelGame = ({ credits, onUpdate, onBack }: WagerWheelGameProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

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

    const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: amount });
    
    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      const prizeIndex = wheelData.findIndex(d => d.option === data.label);
      setPrizeNumber(prizeIndex >= 0 ? prizeIndex : 0);
      setMustSpin(true);

      // The toast and update will be handled by onStopSpinning
      setTimeout(() => {
        const netChange = data.winnings - data.bet;
        if (netChange > 0) showSuccess(`Vous avez gagné ${netChange} crédits !`);
        else if (netChange < 0) showError(`Vous avez perdu ${Math.abs(netChange)} crédits.`);
        else showInfo("Vous avez récupéré votre mise.");
        onUpdate();
      }, 5500); // Delay toast to match animation
    }
  };

  return (
    <div className="py-4 space-y-4">
      <Button variant="ghost" onClick={onBack} className="absolute top-4 left-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
      <div className="flex items-center justify-center mt-10">
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={wheelData}
          onStopSpinning={() => {
            setMustSpin(false);
            setLoading(false);
          }}
          backgroundColors={['#374151', '#1f2937']}
          textColors={['#ffffff']}
          outerBorderColor="#4b5563"
          radiusLineColor="#4b5563"
          pointerProps={{
            style: {
              fill: '#eab308',
              stroke: '#ca8a04',
              strokeWidth: 2,
            }
          }}
        />
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