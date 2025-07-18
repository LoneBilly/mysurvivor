import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Coins, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorRouletteGameProps {
  credits: number;
  onUpdate: () => void;
  onBack: () => void;
}

type Color = 'red' | 'blue' | 'green';

const ColorRouletteGame = ({ credits, onUpdate, onBack }: ColorRouletteGameProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ win: boolean; winnings: number; bet: number; winning_color: Color } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

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
    setIsSpinning(true);
    setResult(null);

    const { data, error } = await supabase.rpc('play_color_roulette', { p_bet_amount: amount, p_color_choice: selectedColor });
    
    setTimeout(() => {
      setIsSpinning(false);
      setLoading(false);
      if (error) {
        showError(error.message);
      } else {
        setResult(data);
        if (data.win) {
          showSuccess(`Gagné ! Vous remportez ${data.winnings} crédits.`);
        } else {
          showError(`Perdu... La couleur était ${data.winning_color}.`);
        }
        onUpdate();
      }
    }, 1500);
  };

  const getResultDisplay = () => {
    if (!result) return <p className="text-gray-400">Choisissez une couleur et misez</p>;
    
    const colorClasses = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
    };

    return (
      <div className="flex flex-col items-center gap-2">
        <p>La roue s'arrête sur...</p>
        <div className={cn("w-10 h-10 rounded-full", colorClasses[result.winning_color])} />
        <p className={cn("font-bold", result.win ? "text-green-400" : "text-red-400")}>
          {result.win ? `Gagné ! (+${result.winnings - result.bet})` : "Perdu..."}
        </p>
      </div>
    );
  };

  return (
    <div className="py-4 space-y-4">
      <Button variant="ghost" onClick={onBack} className="absolute top-4 left-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
      <div className="h-24 bg-black/20 rounded-lg flex items-center justify-center text-lg font-bold mt-10">
        {isSpinning ? <Loader2 className="w-8 h-8 animate-spin" /> : getResultDisplay()}
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