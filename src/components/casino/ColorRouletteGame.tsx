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
  { option: 'Rouge', style: { backgroundColor: '#b91c1c' } },
  { option: 'Bleu', style: { backgroundColor: '#1d4ed8' } },
  { option: 'Rouge', style: { backgroundColor: '#b91c1c' } },
  { option: 'Bleu', style: { backgroundColor: '#1d4ed8' } },
  { option: 'Rouge', style: { backgroundColor: '#b91c1c' } },
  { option: 'Bleu', style: { backgroundColor: '#1d4ed8' } },
  { option: 'Vert', style: { backgroundColor: '#15803d', textColor: '#f0fdf4' } },
  { option: 'Rouge', style: { backgroundColor: '#b91c1c' } },
  { option: 'Bleu', style: { backgroundColor: '#1d4ed8' } },
  { option: 'Rouge', style: { backgroundColor: '#b91c1c' } },
];

const colorMap: Record<Color, string> = {
  red: 'Rouge',
  blue: 'Bleu',
  green: 'Vert',
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
      const winningOption = colorMap[data.winning_color as Color];
      const possibleIndexes = colorWheelData.map((d, i) => d.option === winningOption ? i : -1).filter(i => i !== -1);
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
    <div className="py-4 space-y-3">
      <Button variant="ghost" onClick={onBack} className="absolute top-4 left-4 h-8 px-2"><ArrowLeft className="w-4 h-4 mr-1" /> Retour</Button>
      <div className="relative w-64 h-64 mx-auto my-2">
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={colorWheelData}
          onStopSpinning={() => {
            setMustSpin(false);
            setLoading(false);
          }}
          backgroundColors={['#374151', '#1f2937']}
          textColors={['#ffffff']}
          outerBorderColor="#4b5563"
          outerBorderWidth={5}
          innerBorderColor="#4b5563"
          innerBorderWidth={5}
          radiusLineColor="#4b5563"
          radiusLineWidth={2}
          fontSize={12}
          spinDuration={0.8}
        />
      </div>
      <div>
        <Label className="text-sm font-medium text-white font-mono">Couleur</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <Button onClick={() => setSelectedColor('red')} className={cn("bg-red-700 hover:bg-red-600", selectedColor === 'red' && "ring-2 ring-offset-2 ring-offset-slate-800 ring-white")}>x2</Button>
          <Button onClick={() => setSelectedColor('blue')} className={cn("bg-blue-700 hover:bg-blue-600", selectedColor === 'blue' && "ring-2 ring-offset-2 ring-offset-slate-800 ring-white")}>x2</Button>
          <Button onClick={() => setSelectedColor('green')} className={cn("bg-green-700 hover:bg-green-600", selectedColor === 'green' && "ring-2 ring-offset-2 ring-offset-slate-800 ring-white")}>x5</Button>
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