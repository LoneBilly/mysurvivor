"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import CreditsInfo from "./CreditsInfo";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CasinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onUpdate: () => void;
  onPurchaseCredits: () => void;
}

const outcomes = [
    { label: "Perte Totale", multiplier: 0, color: "bg-gray-700/50 border-gray-600" },
    { label: "Petite Perte", multiplier: 0.5, color: "bg-yellow-700/50 border-yellow-600" },
    { label: "Remboursé", multiplier: 1, color: "bg-blue-700/50 border-blue-600" },
    { label: "Double Gain", multiplier: 2, color: "bg-green-600/50 border-green-500" },
    { label: "Jackpot!", multiplier: 5, color: "bg-purple-600/50 border-purple-500" },
];

const getOutcomeByLabel = (label: string) => outcomes.find(o => o.label === label) || outcomes[0];

const CasinoModal = ({ isOpen, onClose, credits, onUpdate, onPurchaseCredits }: CasinoModalProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ winnings: number; label: string } | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [currentDisplay, setCurrentDisplay] = useState(outcomes[2]);

  const handlePlay = async () => {
    if (credits < betAmount) {
      showError(`Crédits insuffisants pour parier ${betAmount}.`);
      return;
    }

    setIsSpinning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('play_casino_game', { p_bet_amount: betAmount });
      if (error) throw new Error(error.message);
      
      // Start animation
      let spinCount = 0;
      const totalSpins = 30;
      const spinInterval = setInterval(() => {
        setCurrentDisplay(outcomes[Math.floor(Math.random() * outcomes.length)]);
        spinCount++;
        if (spinCount >= totalSpins) {
          clearInterval(spinInterval);
          setCurrentDisplay(getOutcomeByLabel(data.label));
          setTimeout(() => {
            setResult(data);
            setIsSpinning(false);
            onUpdate();
          }, 500);
        }
      }, 100 + spinCount * 5); // Slows down over time

    } catch (error: any) {
      showError(`Erreur au casino: ${error.message}`);
      setIsSpinning(false);
    }
  };

  const handleClose = () => {
    if (isSpinning) return;
    setResult(null);
    onClose();
  };

  const betOptions = [10, 50, 100, 500];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Casino de la Zone</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col items-center gap-2 text-center">
              <span>Tentez votre chance ! Le gain est déterminé par un multiplicateur.</span>
              <CreditsInfo credits={credits} onClick={onPurchaseCredits} />
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className={cn(
            "h-40 w-full rounded-lg text-2xl font-bold relative flex flex-col items-center justify-center text-center p-4 border-2 transition-all duration-100",
            isSpinning ? currentDisplay.color : result ? getOutcomeByLabel(result.label).color : "bg-black/20 border-gray-700"
          )}>
            {isSpinning ? (
              <>
                <p className="text-lg sm:text-xl drop-shadow-md">{currentDisplay.label}</p>
                <p className="text-2xl sm:text-4xl font-bold drop-shadow-md">x{currentDisplay.multiplier}</p>
              </>
            ) : result ? (
              <>
                <p className="text-lg">Vous avez gagné</p>
                <p className="text-4xl font-bold text-yellow-400 animate-pulse">{result.winnings} crédits</p>
                <p className="text-sm text-gray-300">({result.label})</p>
              </>
            ) : (
              <p className="text-gray-400">Placez votre pari.</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Montant du pari :</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {betOptions.map((amount) => (
                <Button
                  key={amount}
                  variant={betAmount === amount ? "default" : "outline"}
                  onClick={() => setBetAmount(amount)}
                  disabled={isSpinning}
                  className="flex-1"
                >
                  {amount}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handlePlay} disabled={isSpinning || credits < betAmount} className="w-full bg-green-600 hover:bg-green-700">
            {isSpinning ? <Loader2 className="w-5 h-5 animate-spin" /> : `Parier ${betAmount} crédits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CasinoModal;