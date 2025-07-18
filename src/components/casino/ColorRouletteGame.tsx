import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wheel } from 'react-custom-roulette';

interface ColorRouletteGameProps {
  credits: number;
  onUpdate: () => void;
  onBack: () => void;
}

type Color = 'red' | 'blue' | 'green';

const colorWheelData = [
  { style: { backgroundColor: '#b91c1c' } }, // red-700
  { style: { backgroundColor: '#1d4ed8' } }, // blue-700
  { style: { backgroundColor: '#b91c1c' } },
  { style: { backgroundColor: '#1d4ed8' } },
  { style: { backgroundColor: '#b91c1c' } },
  { style: { backgroundColor: '#1d4ed8' } },
  { style: { backgroundColor: '#15803d' } }, // green-700
  { style: { backgroundColor: '#b91c1c' } },
  { style: { backgroundColor: '#1d4ed8' } },
  { style: { backgroundColor: '#b91c1c' } },
];

const colorMap: Record<Color, string> = {
  red: '#b91c1c',
  blue: '#1d4ed8',
  green: '#15803d',
};

const ColorRouletteGame = ({ credits, onUpdate, onBack }: ColorRouletteGameProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [loading, setLoading] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const handlePlay = async () => {
    if (!selectedColor) {
      showError("Veuillez choisir une couleur.");
      return;
    }
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

    const { data, error } = await supabase.rpc('play_color_roulette', { p_bet_amount: amount, p_color_choice: selectedColor });
    
    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      const winningColorHex = colorMap[data.winning_color as Color];
      const possibleIndexes = colorWheelData.map((d, i) => d.style.backgroundColor === winningColorHex ? i : -1).filter(i => i !== -1);
      const prizeIndex = possibleIndexes[Math.floor(Math.random() * possibleIndexes.length)];
      
      setPrizeNumber(prizeIndex);
      setMustSpin(true);

      setTimeout(() => {
        if (data.win) showSuccess(`Gagné ! Vous remportez ${data.winnings} crédits.`);
        else showError(`Perdu... La couleur était ${data.winning_color}.`);
        onUpdate();
      }, 8500);
    }
  };

  return (
    <div className="py-4 space-y-4">
      <Button variant="ghost" onClick={onBack} className="absolute top-4 left-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
      <div className="flex items-center justify-center my-4 h-64">
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={colorWheelData}
          onStopSpinning={() => {
            setMustSpin(false);
            setLoading(false);
          }}
          textColors={['transparent']}
          outerBorderColor="#4b5563"
          outerBorderWidth={5}
          radiusLineColor="#4b5563"
          radiusLineWidth={1}
          spinDuration={0.8}
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
        <Label className="text-sm font-medium text-white font-mono">Couleur</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <Button onClick={() => setSelectedColor('red')} className={cn("bg-red-500 hover:bg-red-600", selectedColor === 'red' && "ring-2 ring-offset-2 ring-offset-slate-800 ring-white")}>x2</Button>
          <Button onClick={() => setSelectedColor('blue')} className={cn("bg-blue-500 hover:bg-blue-600", selectedColor === 'blue' && "ring-2 ring-offset-2 ring-offset-slate-800 ring-white")}>x2</Button>
          <Button onClick={() => setSelectedColor('green')} className={cn("bg-green-500 hover:bg-green-600", selectedColor === 'green' && "ring-2 ring-offset-2 ring-offset-slate-800 ring-white")}>x5</Button>
        </div>
      </div>
      <div>
        <Label htmlFor="bet-amount-color" className="text-sm font-medium text-white font-mono">Montant du pari</Label>
        <div className="relative mt-1">
          <Input id="bet-amount-color" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="pl-8 bg-white/5 border-white/20" placeholder="0" disabled={loading} />
          <Coins className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
        </div>
      </div>
      <Button onClick={handlePlay} disabled={loading || !betAmount || !selectedColor} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lancer la roulette'}
      </Button>
    </div>
  );
};

export default ColorRouletteGame;