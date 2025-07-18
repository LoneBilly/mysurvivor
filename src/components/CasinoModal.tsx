import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { Loader2, Dice5, Coins, Palette, ArrowLeft, CircleDot, Dices } from 'lucide-react';
import CreditsInfo from './CreditsInfo';
import { cn } from '@/lib/utils';
import Wheel, { Segment } from './Wheel';

interface GameProps {
  credits: number;
  onUpdate: () => void;
  onBack: () => void;
}

const wagerWheelSegments: Segment[] = [
  { label: 'Jackpot!', color: '#facc15' }, // gold-400
  { label: 'Double Gain', color: '#4ade80' }, // green-400
  { label: 'Remboursé', color: '#9ca3af' }, // gray-400
  { label: 'Petite Perte', color: '#fb923c' }, // orange-400
  { label: 'Perte Totale', color: '#f87171' }, // red-400
];

const WagerWheelGame = ({ credits, onUpdate, onBack }: GameProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ label: string; winnings: number; bet: number } | null>(null);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState<number | null>(null);
  const resultDataRef = useRef<any>(null);

  const onStopSpinning = () => {
    setMustSpin(false);
    setLoading(false);
    if (resultDataRef.current) {
      const data = resultDataRef.current;
      setResult(data);
      if (data.winnings > data.bet) {
        showSuccess(`Vous avez gagné ${data.winnings} crédits !`);
      } else if (data.winnings > 0) {
        showInfo(`Vous avez récupéré ${data.winnings} crédits.`);
      } else {
        showError(`Vous avez perdu ${data.bet} crédits.`);
      }
      onUpdate();
    }
  };

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
    resultDataRef.current = null;

    const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: amount });
    
    if (error) {
      setLoading(false);
      showError(error.message);
      return;
    }

    resultDataRef.current = data;
    const index = wagerWheelSegments.findIndex(s => s.label === data.label);
    setPrizeNumber(index);
    setMustSpin(true);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="absolute top-4 left-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
      <div className="h-64 flex items-center justify-center">
        <Wheel segments={wagerWheelSegments} mustStartSpinning={mustSpin} prizeNumber={prizeNumber} onStopSpinning={onStopSpinning} />
      </div>
      <div className="h-10 text-center flex items-center justify-center">
        {result && <div className="text-center"><p className="font-bold">{result.label}</p><p className="text-lg">{result.winnings > 0 ? `+${result.winnings}` : `-${result.bet}`} <Coins className="inline w-5 h-5" /></p></div>}
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

const colorRouletteSegments: Segment[] = Array.from({ length: 20 }).map((_, i) => {
  if (i === 9 || i === 19) return { label: '', color: '#22c55e' }; // green-500 (10%)
  if (i % 2 === 0) return { label: '', color: '#ef4444' }; // red-500 (45%)
  return { label: '', color: '#3b82f6' }; // blue-500 (45%)
});

const ColorRouletteGame = ({ credits, onUpdate, onBack }: GameProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [selectedColor, setSelectedColor] = useState<'red' | 'blue' | 'green' | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ win: boolean; winnings: number; bet: number; winning_color: string } | null>(null);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState<number | null>(null);
  const resultDataRef = useRef<any>(null);

  const onStopSpinning = () => {
    setMustSpin(false);
    setLoading(false);
    if (resultDataRef.current) {
      const data = resultDataRef.current;
      setResult(data);
      if (data.win) {
        showSuccess(`Vous avez gagné ${data.winnings} crédits !`);
      } else {
        showError(`Vous avez perdu ${data.bet} crédits.`);
      }
      onUpdate();
    }
  };

  const handlePlay = async (color: 'red' | 'blue' | 'green') => {
    setSelectedColor(color);
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
    resultDataRef.current = null;

    const { data, error } = await supabase.rpc('play_color_roulette', { p_bet_amount: amount, p_color_choice: color });

    if (error) {
      setLoading(false);
      showError(error.message);
      return;
    }

    resultDataRef.current = data;
    const colorMap: { [key: string]: string } = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e' };
    const winningColorHex = colorMap[data.winning_color];
    const possibleIndices = colorRouletteSegments.map((s, i) => s.color === winningColorHex ? i : -1).filter(i => i !== -1);
    const randomIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
    setPrizeNumber(randomIndex);
    setMustSpin(true);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="absolute top-4 left-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
      <div className="h-64 flex items-center justify-center">
        <Wheel segments={colorRouletteSegments} mustStartSpinning={mustSpin} prizeNumber={prizeNumber} onStopSpinning={onStopSpinning} />
      </div>
      <div className="h-10 text-center flex items-center justify-center">
        {result && <div className={cn("text-center", result.win ? "text-green-400" : "text-red-400")}><p>La roue s'arrête sur <span className="font-bold" style={{ color: result.winning_color }}>{result.winning_color.toUpperCase()}</span></p><p className="text-lg">{result.win ? `+${result.winnings}` : `-${result.bet}`} <Coins className="inline w-5 h-5" /></p></div>}
      </div>
      <div>
        <Label htmlFor="bet-amount-color" className="text-sm font-medium text-white font-mono">Montant du pari</Label>
        <div className="relative mt-1">
          <Input id="bet-amount-color" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="pl-8 bg-white/5 border-white/20" placeholder="0" disabled={loading} />
          <Coins className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => handlePlay('red')} disabled={loading || !betAmount} className="bg-red-600 hover:bg-red-700">{loading && selectedColor === 'red' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Miser'}</Button>
        <Button onClick={() => handlePlay('blue')} disabled={loading || !betAmount} className="bg-blue-600 hover:bg-blue-700">{loading && selectedColor === 'blue' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Miser'}</Button>
        <Button onClick={() => handlePlay('green')} disabled={loading || !betAmount} className="bg-green-600 hover:bg-green-700">{loading && selectedColor === 'green' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Miser'}</Button>
      </div>
    </div>
  );
};

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
}

const CasinoModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits }: CasinoModalProps) => {
  const [view, setView] = useState<'selection' | 'wager_wheel' | 'color_roulette'>('selection');

  useEffect(() => {
    if (!isOpen) {
      setView('selection');
    }
  }, [isOpen]);

  const games = [
    { id: 'wager_wheel', name: 'Wager Wheel', description: 'Tournez la roue pour connaître votre sort.', icon: Dice5, component: WagerWheelGame, available: true },
    { id: 'color_roulette', name: 'Roulette de Couleur', description: 'Misez sur une couleur et gagnez gros.', icon: Palette, component: ColorRouletteGame, available: true },
    { id: 'numbered_roulette', name: 'Roulette Numérotée', description: 'Misez sur un ou plusieurs numéros.', icon: CircleDot, available: false },
    { id: 'dice_blackjack', name: 'Dice Blackjack', description: 'Approchez-vous de 21 sans dépasser.', icon: Dices, available: false },
  ];

  const renderContent = () => {
    const activeGame = games.find(g => g.id === view);
    if (activeGame && activeGame.component) {
      const GameComponent = activeGame.component;
      return <GameComponent credits={credits} onUpdate={onUpdate} onBack={() => setView('selection')} />;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        {games.map(game => (
          <Button
            key={game.id}
            variant="outline"
            className="h-auto p-4 flex flex-col items-start text-left bg-white/5 border-white/20 hover:bg-white/10 disabled:opacity-50"
            onClick={() => game.available ? setView(game.id as any) : showInfo("Ce jeu sera bientôt disponible !")}
            disabled={!game.available}
          >
            <game.icon className="w-6 h-6 mb-2" />
            <p className="font-bold">{game.name}</p>
            <p className="text-xs text-gray-400">{game.description}</p>
            {!game.available && <p className="text-xs text-yellow-400 mt-2">Bientôt disponible</p>}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700"
      >
        <DialogHeader className="text-center">
          <Dice5 className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Casino</DialogTitle>
          <DialogDescription className="sr-only">Tentez votre chance !</DialogDescription>
          <CreditsInfo credits={credits} className="mt-1" onClick={onPurchaseCredits} />
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default CasinoModal;